import { InspectionItem } from '@/types';
import { ChecklistDefinition, ChecklistCategory, AssignedCategory } from '@/types/checklist';

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
    
    categories.push({
      definition: categoryDef,
      assignedItems
    });
  }
  
  return categories;
}

/**
 * Determines if an item belongs to a category based on keyword matching
 */
function isItemInCategory(item: InspectionItem, category: ChecklistCategory): boolean {
  const searchText = buildSearchText(item);
  
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