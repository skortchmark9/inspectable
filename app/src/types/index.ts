export interface Inspection {
  id: string;
  name: string;              // Auto-generated: "Dec 15, 2024 - Location"
  location: {
    latitude: number;
    longitude: number;
    address?: string;      // Geocoded later, hardcoded for now
  };
  createdAt: Date;
  status: 'active' | 'completed';
  items: Record<string, InspectionItem>; // UUID-keyed map instead of array
}

export interface InspectionItem {
  id: string;
  inspectionId: string;
  photoUri: string;          // Local file path
  audioUri?: string;         // Local audio file
  timestamp: Date;
  
  // AI Processing Results
  tags?: string[];           // Determines categories dynamically
  description?: string;      // Full AI-generated description
  ocr_text?: string;         // Extracted text from image
  audioTranscription?: string;
  
  // Processing State
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  lastProcessingAttempt?: Date;
  retryCount: number;
  
  // Legacy fields for backwards compatibility
  label?: string;
  suggestedLabel?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed';
  backendId?: string;
  equipmentType?: string;
}

export interface ProcessingAttempt {
  timestamp: Date;
  error?: string;
  httpStatus?: number;
}

export interface QueueItem {
  id: string;
  itemId: string;
  priority: 'high' | 'normal' | 'low';
  addedAt: Date;
  retryAfter?: Date;
}

export interface ProcessingQueue {
  items: QueueItem[];
  isProcessing: boolean;
  lastProcessedAt?: Date;
}

// Context types
export interface AuthContextType {
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface InspectionContextType {
  currentInspection: Inspection | null;
  inspections: Inspection[];
  createInspection: (name: string, location: { latitude: number; longitude: number; address?: string }) => Promise<Inspection>;
  setCurrentInspection: (inspection: Inspection | null) => void;
  addInspectionItem: (item: InspectionItem) => Promise<void>;
  updateInspectionItem: (itemId: string, updates: Partial<InspectionItem>) => Promise<void>;
  deleteInspectionItem: (itemId: string) => Promise<void>;
  deleteInspection: (inspectionId: string) => Promise<void>;
}

export interface QueueContextType {
  queue: ProcessingQueue;
  addToQueue: (itemId: string, priority?: 'high' | 'normal' | 'low') => Promise<void>;
  removeFromQueue: (itemId: string) => void;
  processQueue: () => Promise<void>;
}

// Tag and categorization types
export type TagToCategoryMapping = Record<string, string>;

export interface CategoryGroup {
  name: string;
  items: InspectionItem[];
  count: number;
}

export interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
}

export interface AppState {
  isRecording: boolean;
  inspectionItems: InspectionItem[];
  audioSegments: string[];
  currentMode: 'camera' | 'summary';
  uploadQueue: string[];
}

export interface ServerResponse {
  suggestedLabel: string;
  audioTranscription: string;
  confidence: number;
}

export interface BackendInspectionItem {
  id: string;
  inspection_id: string;
  photo_url: string;
  audio_url: string;
  label: string;
  tags: string[];
  suggested_label?: string;
  audio_transcription?: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  equipment_type?: string;
  notes?: string;
  ocr_text?: string;
  description?: string;
}

export interface BackendInspection {
  id: string;
  user_id: string;
  property_address: string;
  created_at: string;
  updated_at: string;
  status: 'in_progress' | 'completed';
  metadata?: any;
}

export interface BackendInspectionListResponse {
  id: string;
  user_id: string;
  property_address: string;
  created_at: string;
  updated_at: string;
  status: 'in_progress' | 'completed';
  metadata?: any;
}

export interface BackendInspectionDetailsResponse {
  id: string;
  user_id: string;
  property_address: string;
  created_at: string;
  updated_at: string;
  status: 'in_progress' | 'completed';
  metadata?: any;
  inspection_items: BackendInspectionItem[];
}