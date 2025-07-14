import { InspectionItem } from '@/types';
import { ChecklistDefinition, ChecklistCategory, AssignedCategory, SpecificItem, CategoryCompletion } from '@/types/checklist';

/**
 * Categorizes inspection items based on a checklist definition
 */
export function categorizeItemsWithChecklist(
  items: InspectionItem[], 
  checklist: ChecklistDefinition
): AssignedCategory[] {
  const categories: AssignedCategory[] = [];
  
  for (const categoryDef of checklist.categories) {
    const assignedItems = items.filter(item => 
      isItemInCategory(item, categoryDef)
    );
    
    const completion = calculateCategoryCompletion(assignedItems, categoryDef);
    
    categories.push({
      definition: categoryDef,
      assignedItems,
      completion
    });
  }
  
  return categories;
}

/**
 * Calculate which specific items are fulfilled and which are missing
 */
function calculateCategoryCompletion(assignedItems: InspectionItem[], category: ChecklistCategory): CategoryCompletion | null {
  if (!category.specificItems) {
    return null;
  }
  
  const fulfilled: SpecificItem[] = [];
  const missing: SpecificItem[] = [];
  
  for (const specificItem of category.specificItems) {
    const hasItem = assignedItems.some(item => 
      matchesSpecificItem(item, specificItem)
    );
    
    if (hasItem) {
      fulfilled.push(specificItem);
    } else {
      missing.push(specificItem);
    }
  }
  
  return { fulfilled, missing };
}

/**
 * Check if an item matches a specific required item
 */
function matchesSpecificItem(item: InspectionItem, specificItem: SpecificItem): boolean {
  const searchText = buildSearchText(item);
  
  return specificItem.keywords.some(keyword => 
    searchText.includes(keyword.toLowerCase())
  );
}

/**
 * Determines if an item belongs to a category based on keyword matching
 * First checks specific items, then falls back to general category keywords
 */
function isItemInCategory(item: InspectionItem, category: ChecklistCategory): boolean {
  const searchText = buildSearchText(item);
  
  // Check specific items first (more precise matching)
  if (category.specificItems) {
    for (const specificItem of category.specificItems) {
      if (specificItem.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      )) {
        return true;
      }
    }
  }
  
  // Fall back to general category keywords
  return category.keywords.some(keyword => 
    searchText.includes(keyword.toLowerCase())
  );
}

/**
 * Builds searchable text from item properties
 */
function buildSearchText(item: InspectionItem): string {
  const label = item.label || item.suggestedLabel || '';
  const tags = (item.tags || []).join(' ');
  const description = item.description || '';
  
  return `${label} ${tags} ${description}`.toLowerCase().trim();
}