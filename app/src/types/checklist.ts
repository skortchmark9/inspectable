export interface ChecklistDefinition {
  id: string;
  name: string;
  categories: ChecklistCategory[];
}

export interface ChecklistCategory {
  id: string;
  name: string;
  keywords: string[];
}

export interface AssignedCategory {
  definition: ChecklistCategory;
  assignedItems: any[]; // Will be InspectionItem[] when imported
}