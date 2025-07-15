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
  const categorizedItems = new Set<string>();
  
  // FIRST PASS: Handle specific items only (high priority matching)
  for (const categoryDef of checklist.categories) {
    const specificItemMatches: InspectionItem[] = [];
    
    if (categoryDef.specificItems) {
      for (const item of items) {
        if (!categorizedItems.has(item.id)) {
          // Check if this item matches any specific item for this category
          const matchesSpecific = categoryDef.specificItems.some(specificItem => 
            matchesSpecificItem(item, specificItem)
          );
          
          if (matchesSpecific) {
            specificItemMatches.push(item);
            categorizedItems.add(item.id);
          }
        }
      }
    }
    
    categories.push({
      definition: categoryDef,
      assignedItems: specificItemMatches,
      completion: calculateCategoryCompletion(specificItemMatches, categoryDef)
    });
  }
  
  // SECOND PASS: Handle general category keywords for remaining items
  for (let i = 0; i < categories.length; i++) {
    const categoryDef = checklist.categories[i];
    const generalMatches = items.filter(item => 
      !categorizedItems.has(item.id) && 
      categoryDef.keywords.some(keyword => {
        const tags = (item.tags || []).map(tag => tag.toLowerCase());
        return tags.includes(keyword.toLowerCase());
      })
    );
    
    // Add general matches to existing specific matches
    const allMatches = [...categories[i].assignedItems, ...generalMatches];
    generalMatches.forEach(item => categorizedItems.add(item.id));
    
    categories[i] = {
      definition: categoryDef,
      assignedItems: allMatches,
      completion: calculateCategoryCompletion(allMatches, categoryDef)
    };
  }
  
  // Add uncategorized items
  const uncategorizedItems = items.filter(item => !categorizedItems.has(item.id));
  
  if (uncategorizedItems.length > 0) {
    categories.push({
      definition: {
        id: 'uncategorized',
        name: 'Uncategorized',
        keywords: []
      },
      assignedItems: uncategorizedItems,
      completion: null
    });
  }
  
  return categories;
}

/**
 * Calculate which specific items are fulfilled and which are missing
 * For items requiring datasheets, need both appliance photo AND datasheet photo
 */
function calculateCategoryCompletion(assignedItems: InspectionItem[], category: ChecklistCategory): CategoryCompletion | null {
  if (!category.specificItems) {
    return null;
  }
  
  const fulfilled: SpecificItem[] = [];
  const missing: SpecificItem[] = [];
  
  for (const specificItem of category.specificItems) {
    if (specificItem.requireDatasheet) {
      // Need BOTH appliance photo AND datasheet photo
      const hasAppliance = assignedItems.some(item => {
        const tags = (item.tags || []).map(tag => tag.toLowerCase());
        return specificItem.keywords.some(keyword => 
          tags.includes(keyword.toLowerCase())
        ) && !tags.includes('datasheet');
      });
      
      const hasDatasheet = assignedItems.some(item => {
        const tags = (item.tags || []).map(tag => tag.toLowerCase());
        return specificItem.keywords.some(keyword => 
          tags.includes(keyword.toLowerCase())
        ) && tags.includes('datasheet');
      });
      
      if (hasAppliance && hasDatasheet) {
        fulfilled.push(specificItem);
      } else {
        missing.push(specificItem);
      }
    } else {
      // Standard single photo requirement
      const hasItem = assignedItems.some(item => 
        matchesSpecificItem(item, specificItem)
      );
      
      if (hasItem) {
        fulfilled.push(specificItem);
      } else {
        missing.push(specificItem);
      }
    }
  }
  
  return { fulfilled, missing };
}

/**
 * Check if an item matches a specific required item
 * For items requiring datasheets, matches both appliance photos AND datasheet photos
 */
function matchesSpecificItem(item: InspectionItem, specificItem: SpecificItem): boolean {
  const tags = (item.tags || []).map(tag => tag.toLowerCase());
  
  // Check if any of the keywords match
  const hasKeywordMatch = specificItem.keywords.some(keyword => 
    tags.includes(keyword.toLowerCase())
  );
  
  if (!hasKeywordMatch) {
    return false;
  }
  
  // For items requiring datasheets, match BOTH regular photos AND datasheet photos
  if (specificItem.requireDatasheet) {
    // Match if it's either:
    // 1. Appliance photo (has keyword, no datasheet tag)
    // 2. Datasheet photo (has keyword AND datasheet tag)
    return true; // If keyword matches, it's relevant to this specific item
  }
  
  return true;
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
  const tags = (item.tags || []).join(' ');
  
  return tags.toLowerCase().trim();
}