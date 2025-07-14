export interface ChecklistDefinition {
  id: string;
  name: string;
  categories: ChecklistCategory[];
}

export interface ChecklistCategory {
  id: string;
  name: string;
  keywords: string[];
  specificItems?: SpecificItem[];
}

export interface SpecificItem {
  id: string;
  name: string;
  keywords: string[];
  required: boolean;
}

export interface AssignedCategory {
  definition: ChecklistCategory;
  assignedItems: any[]; // Will be InspectionItem[] when imported
  completion?: CategoryCompletion;
}

export interface CategoryCompletion {
  fulfilled: SpecificItem[];
  missing: SpecificItem[];
}