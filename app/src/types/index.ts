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