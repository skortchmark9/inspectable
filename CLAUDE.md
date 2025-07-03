# Inspection App Architecture

## Overview
A React Native/Expo app for field inspections that captures photos with associated audio context. The app continuously records audio in the background, and when a photo is taken, it pairs the last 5-10 seconds of audio with the image for AI-powered labeling.

## Core Technical Components

### 1. Audio Recording System
**Challenge**: Continuous background audio recording with circular buffer
**Solution**: 
- Use `expo-av` Audio API with configurable segment recording (default: 10 seconds)
- Maintain a 2-segment rolling buffer (20 seconds total coverage)
- When capture is triggered, send the most recent complete segment
- **Audio recording only while app is in foreground** (simplifies permissions and implementation)
- No concatenation needed - one audio file per capture

**Implementation approach**:
```typescript
// Configuration
const AUDIO_SEGMENT_DURATION = 10000; // 10 seconds, configurable
const MAX_SEGMENTS = 2; // Rolling buffer of 2 segments

// Simple segment management
const audioSegments: string[] = []; // URIs to audio files
```

### 2. Camera System
- Use `expo-camera` for photo capture
- Low resolution for fast uploads
- Optimize for speed - single tap to capture
- Handle permissions gracefully
- Store photos in memory as base64 or URIs

### 3. Data Models

```typescript
interface InspectionItem {
  id: string;          // UUID
  photoUri: string;    // Local URI or base64
  audioUri: string;    // Local URI to audio file
  label: string;       // User-editable label
  suggestedLabel?: string; // From server
  audioTranscription?: string; // From server - what was said
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
}

interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
}

interface AppState {
  isRecording: boolean;
  inspectionItems: InspectionItem[];
  audioSegments: string[];
  currentMode: 'camera' | 'summary';
  uploadQueue: string[]; // IDs of items to retry
}
```

### 4. State Management
- Use React Context or top-level useState
- Manage: audio recording state, camera state, inspection items, UI mode
- Basic persistence with AsyncStorage for session data
- Simple upload retry queue (not full offline mode)

### 5. Server Integration
**Upload endpoint**: `POST https://myserver.com/analyze`
**Payload**: multipart/form-data with:
- `photo`: image file
- `audio`: audio file (up to 10 seconds)
- `metadata`: JSON with timestamp, location

**Response**:
```json
{
  "suggestedLabel": "Furnace nameplate",
  "audioTranscription": "Looking at the furnace model number, it's a Carrier 58STA",
  "confidence": 0.85
}
```

### 6. UI Flow

1. **Camera Screen** (default)
   - Full-screen camera preview
   - Large capture button at bottom
   - Audio recording indicator (shows it's actively recording)
   - "Finish Inspection" button

2. **Post-Capture Flow**
   - Show thumbnail of captured photo
   - Display suggested label (loading state while uploading)
   - Show audio transcription below label (grayed out, read-only)
   - Editable text input for label
   - "Save & Continue" button (returns to camera)

3. **Summary Screen**
   - List of all captured items with thumbnails
   - Each item shows:
     - Photo thumbnail
     - Label
     - Audio transcription (expandable)
     - Timestamp
   - Checklist comparison showing:
     - ✓ Captured items
     - ⚠️ Missing required items
   - "Export" or "Complete" action

### 7. Key Technical Decisions

**Audio Buffer Management**:
- Record in configurable segments (default: 10 seconds) while app is active
- Maintain 2-segment rolling buffer (20 seconds total coverage)
- On capture, send the most recent complete segment
- No concatenation needed - one file per capture

**Quick Implementation Choices**:
- Hardcoded checklist items for now
- Low photo quality for fast uploads
- Basic session persistence (AsyncStorage)
- Simple upload retry queue (but not full offline mode)
- Configurable audio segment duration via constant

**Memory Management**:
- Low resolution photos
- Clean up audio segments after successful upload
- Limit to 2 audio segments in memory

**Error Handling**:
- Network failures: queue uploads for retry
- Permission denials: graceful degradation
- Audio recording failures: allow photo-only mode

### 8. File Structure
```
app/
├── App.tsx                 # Main entry point
├── components/
│   ├── CameraScreen.tsx    # Camera UI and controls
│   ├── LabelEditor.tsx     # Post-capture label editing
│   ├── SummaryScreen.tsx   # Inspection summary
│   └── ChecklistItem.tsx   # Checklist item component
├── hooks/
│   ├── useAudioRecorder.ts # Audio recording logic
│   ├── useCamera.ts        # Camera logic
│   └── useLocation.ts      # Location tracking
├── utils/
│   ├── audioBuffer.ts      # Circular buffer implementation
│   ├── upload.ts           # Server communication
│   └── storage.ts          # Local data management
├── types/
│   └── index.ts            # TypeScript interfaces
└── constants/
    └── index.ts            # API URLs, checklist items

app/with-google-vision/     # User's playground - DO NOT MODIFY
```

### 9. Implementation Priority
1. Basic camera + photo capture
2. Audio recording with buffer (foreground only)
3. Upload and labeling flow with transcription display
4. Summary screen with checklist
5. Polish: location, better UI, error handling

### 10. Hardcoded Checklist (Default)
```typescript
const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', name: 'Furnace', required: true },
  { id: '2', name: 'Thermostat', required: true },
  { id: '3', name: 'Breaker Panel', required: true },
  { id: '4', name: 'Water Heater', required: true },
  { id: '5', name: 'AC Unit', required: false },
  { id: '6', name: 'Attic Insulation', required: false },
];
```

### 11. Configuration Constants
```typescript
// Audio settings
export const AUDIO_SEGMENT_DURATION = 10000; // 10 seconds
export const AUDIO_QUALITY = Audio.RECORDING_OPTIONS_PRESET_LOW_QUALITY;

// Camera settings  
export const PHOTO_QUALITY = 0.3; // 30% quality for fast uploads

// Server settings
export const API_ENDPOINT = 'https://myserver.com/analyze';
export const UPLOAD_TIMEOUT = 30000; // 30 seconds

// UI settings
export const MAX_LABEL_LENGTH = 100;
```

### 12. Testing Approach
- Test with mock server endpoint first
- Simulate various permission scenarios
- Test memory limits with many captures
- Verify audio buffer behavior
- Test transcription display and editing flows
- Test upload retry mechanism

### 13. Future Enhancements
- Offline mode with full queue management
- Voice annotations (separate from ambient audio)
- Drawing/markup on photos
- Export to PDF report with transcriptions
- Integration with inspection databases
- Search/filter by transcription content
- Configurable checklists from server