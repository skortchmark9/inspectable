export interface InspectionItem {
  id: string;
  photoUri: string;
  audioUri: string;
  label: string;
  suggestedLabel?: string;
  audioTranscription?: string;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  backendId?: string; // ID from backend database
  equipmentType?: string; // Equipment type from backend
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
  suggested_label?: string;
  audio_transcription?: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  equipment_type?: string;
  notes?: string;
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