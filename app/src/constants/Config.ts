import { ChecklistItem } from '../types';

// Audio settings
export const AUDIO_SEGMENT_DURATION = 10000; // 10 seconds
export const MAX_AUDIO_SEGMENTS = 2;

// Camera settings  
export const PHOTO_QUALITY = 0.3; // 30% quality for fast uploads

// Server settings
export const API_ENDPOINT = 'https://myserver.com/analyze';
export const UPLOAD_TIMEOUT = 30000; // 30 seconds

// UI settings
export const MAX_LABEL_LENGTH = 100;

// Default checklist
export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', name: 'Furnace', required: true },
  { id: '2', name: 'Thermostat', required: true },
  { id: '3', name: 'Breaker Panel', required: true },
  { id: '4', name: 'Water Heater', required: true },
  { id: '5', name: 'AC Unit', required: false },
  { id: '6', name: 'Attic Insulation', required: false },
];