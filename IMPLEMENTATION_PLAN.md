# Inspection App 2.0 - Implementation Plan

## Overview

This document outlines the implementation plan for upgrading the inspection app from a prototype to a production-ready offline-first application with proper navigation, categorization, and review capabilities.

### Core Principles
- **Offline-first**: All photos and data stored locally, with background sync
- **Tag-based categorization**: Categories derived from tags, not hardcoded relationships
- **Simple for v1**: Many features hardcoded initially with clear paths to enhancement
- **Speed!!!**: Camera stays active for rapid photo collection

## Architecture

### Navigation Structure
```
Bottom Tab Navigation (persistent):
├── Home      (Inspection list)
├── Inspect   (Camera capture)
├── Review    (Photo review/editing)
└── Settings  (Configuration)
```

### Data Models

```typescript
interface Inspection {
  id: string;
  name: string;              // Auto-generated: "Dec 15, 2024 - Location"
  location: {
    latitude: number;
    longitude: number;
    address?: string;      // Geocoded later, hardcoded for now
  };
  createdAt: Date;
  status: 'active' | 'completed';
  items: InspectionItem[];
}

interface InspectionItem {
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
}

// Note: No checklistItemId - categories come from tags
// Note: For now, checklist itself is presentation-only, not data model
```

## Screen Specifications

### 1. Home Screen
**Purpose**: Entry point for managing inspections

**UI Elements**:
- Header: "Inspections"
- Large "New Inspection" button
- List of inspections showing:
  - Auto-generated name (e.g., "Dec 15, 2024 - Main St")
  - Status indicator (active/completed)
  - Photo count
  - "Resume" button

**Functionality**:
- "New Inspection" → Creates inspection with:
  - Name: `${date} - ${location}` (hardcode location as "4 Main St" for now)
  - Captures current GPS coordinates
  - TODO: Later integrate geocoding API for real addresses
- Tap inspection → Resume where left off
- Active inspection ID stored in AsyncStorage

**Implementation Notes**:
- For v1: Hardcode address as "4 Main St"
- Later: Integrate reverse geocoding service
- Store GPS coords for future use

### 2. Inspect Tab - Camera Screen
**Purpose**: Continuous photo capture interface

**UI Elements**:
- Hamburger menu icon (top right) - opens progress tracker
- Recording indicator (red dot when audio recording)
- Full screen camera preview
- Bottom overlay controls:
  - Thumbnail of last photo (bottom left, appears after first capture)
  - Large shutter button (center)
  - "Done" button (bottom right) → Review tab

**Functionality**:
- Continuous capture mode (stays on camera after photo)
- Audio records continuously while on this screen
- Tap thumbnail → Quick preview (dismiss to continue)
- Photos saved locally immediately
- Queue for background processing

**Implementation Notes**:
- Focus on capture reliability
- Add guided prompts in Phase 4

### 3. Progress Tracker (Slide-out Panel)
**Purpose**: Overview of inspection progress

**Initial Implementation (Simple)**:
- Title: "Inspection Progress"
- Total photos taken: X
- Processing status: "X of Y processed"
- "View All" button → Review tab

**Future Enhancement**:
- Categorized checklist view
- Required vs optional items
- Progress by category
- Jump to specific items

**Implementation Notes**:
- Start with simple photo count
- Categories will auto-populate from tags
- Checklist structure added later

### 4. Review Tab - Overview
**Purpose**: Review and organize captured photos

**UI Elements**:
- Header: Inspection name
- Categorized sections (auto-generated from tags):
  ```
  Exterior (12 photos)
  [Grid of thumbnails]
  
  HVAC (8 photos)
  [Grid of thumbnails]
  
  Uncategorized (3 photos)
  [Grid of thumbnails]
  ```
- "Generate Report" button (bottom) - disabled until all processed

**Functionality**:
- Categories dynamically created from tags
- Photos can appear in multiple categories
- Scroll horizontally across images in category
- Blue border on pending images (AI processing not yet completed due to offline)
- Tap thumbnail → Detail view

**Implementation Notes**:
- Categories derived from tag mapping (e.g., tag "furnace" → category "HVAC")
- Start with basic tag-to-category mapping
- Later: Customizable category rules

### 5. Review Detail View
**Purpose**: Edit individual photo details

**UI Elements**:
- Large image preview (can pinch to zoom)
- Bottom sheet with:
  - Tag chips (removable)
  - "Add Tag" button → Tag selector
  - Audio player (if audio exists)
  - Audio transcription (if exists)
  - Transcription text (editable)
  - AI description (read-only)
  - OCR text (if detected)
- Actions:
  - Delete button to delete image

**Functionality**:
- Edit tags (add/remove)
- Play audio recording
- Edit transcription
- Swipe between photos
- Delete photo (with confirmation)

**Implementation Notes**:
- Curated tag list hardcoded initially
- Later: Custom tag creation
- OCR shown only if text detected

## Data Flow

### Photo Capture Flow
1. User takes photo
2. Photo saved locally immediately (never blocked)
3. Create InspectionItem with 'pending' status
4. Add to processing queue
5. Continue capturing (no interruption)
6. Background processor handles queue

### Background Processing
```typescript
// Simplified retry logic
// May want to use network access API
async function processQueueItem(item: InspectionItem) {
  const MAX_RETRIES = 10;
  const BASE_DELAY = 5000; // 5 seconds
  
  while (item.retryCount < MAX_RETRIES) {
    try {
      // Call backend API
      const result = await api.analyzeImage(item);
      
      // Update item with results
      item.tags = result.tags;
      item.description = result.description;
      item.ocr_text = result.ocr_text;
      item.processingStatus = 'completed';
      
      await storage.updateItem(item);
      break;
      
    } catch (error) {
      item.retryCount++;
      item.lastProcessingAttempt = new Date();
      await storage.updateItem(item);
      
      // Exponential backoff
      const delay = BASE_DELAY * Math.pow(2, item.retryCount - 1);
      await sleep(Math.min(delay, 300000)); // Max 5 minutes
    }
  }
}
```

### Category Mapping
```typescript
// Initial hardcoded mapping
const TAG_TO_CATEGORY = {
  // Equipment tags
  'furnace': 'HVAC',
  'ac-unit': 'HVAC',
  'water-heater': 'Plumbing',
  'electrical-panel': 'Electrical',
  
  // Location tags
  'exterior': 'Exterior',
  'interior': 'Interior',
  'basement': 'Interior',
  'attic': 'Interior',
  
  // Default
  'uncategorized': 'Other'
};

// Dynamic categorization
function categorizeItem(item: InspectionItem): string[] {
  const categories = new Set<string>();
  
  if (!item.tags || item.tags.length === 0) {
    categories.add('Uncategorized');
    return Array.from(categories);
  }
  
  item.tags.forEach(tag => {
    const category = TAG_TO_CATEGORY[tag] || 'Other';
    categories.add(category);
  });
  
  return Array.from(categories);
}
```

## Storage Strategy

### AsyncStorage Keys
```typescript
// Inspection management
const KEYS = {
  CURRENT_INSPECTION: '@current_inspection_id',
  INSPECTIONS_LIST: '@inspections',
  INSPECTION_PREFIX: '@inspection_', // + id
  PROCESSING_QUEUE: '@processing_queue',
};
```

### Queue Management
- Failed items added to processing queue
- Queue processed on:
  - App launch
  - Network reconnection
  - Manual refresh
- Items removed from queue after success

## Implementation Phases

### Phase 0: Critical Refactoring (MUST DO FIRST!)
**Goal**: Clean up codebase and establish proper architecture before new features

**Duration**: ~1 day

#### Clean Dead Code (2 hours)
1. Delete unused template files:
   - `app/(tabs)/explore.tsx` (Expo demo screen)
   - `app/(tabs)/vision.tsx` (old vision demo)
   - `components/HelloWave.tsx`
   - `components/ParallaxScrollView.tsx`
   - `components/Collapsible.tsx`
   - `components/ExternalLink.tsx`
   - `scripts/reset-project.js`
   - `utils/backendTest.ts`
   - `utils/testBackend.ts`

2. Remove hidden tabs from `_layout.tsx`
3. Extract debug functions to separate debug module

#### Create Core Architecture (4 hours)
1. Create context providers:
   ```typescript
   // contexts/AuthContext.tsx
   // contexts/InspectionContext.tsx
   // contexts/QueueContext.tsx
   ```

2. Update TypeScript interfaces with new models:
   ```typescript
   interface InspectionItem {
     // ... existing fields ...
     tags?: Array<{ name: string; confidence: number }>;
     processingAttempts: ProcessingAttempt[];
     queuedAt?: Date;
   }
   ```

3. Create storage helpers with proper key structure
4. Implement network status monitoring

#### Update Backend API (3 hours)
Use these Lovable prompts to update the backend:

**Prompt 1: Enhance Photo Analysis Endpoint**
```
Update the /analyze-photo endpoint in supabase/functions/ai-analysis/index.ts to return more comprehensive data for the inspection app. 

The response should include:
1. Multiple tags (array) identifying equipment/systems in the photo
2. A detailed description of what's visible (2-3 sentences)
3. OCR text if any text/labels are detected in the image
4. Keep the existing suggested_label field for backwards compatibility

Update the OpenAI prompt to analyze home inspection photos and return structured JSON with these fields:
{
  "suggested_label": "Water Heater", // existing field
  "tags": ["water-heater", "plumbing", "basement"], // new
  "description": "Gas water heater located in basement. Appears to be 40-50 gallon capacity with visible rust on bottom.", // new
  "ocr_text": "Bradford White, 50 GAL, Manufactured 2018" // new, null if no text
}

The tags should use lowercase kebab-case and focus on:
- Equipment type (furnace, water-heater, electrical-panel, ac-unit, etc.)
- Location (basement, attic, exterior, interior, garage, etc.) 
- System category (hvac, plumbing, electrical, structural, etc.)
```

**Prompt 2: Add Structured Error Responses**
```
Update all error responses in the ai-analysis function to include retry hints for the mobile app's offline queue system:

{
  "success": false,
  "error": "Error message",
  "retry_after": 5000, // milliseconds to wait before retry
  "is_retryable": true // false for bad requests, true for temporary failures
}

For OpenAI rate limits (429), set retry_after based on the Retry-After header.
For network errors (500s), set retry_after with exponential backoff hints.
For bad requests (400), set is_retryable to false.
```

**Prompt 3: Update Audio Transcription for Context**
```
Update the /transcribe-audio endpoint to include inspection context in the Whisper prompt. Add an optional 'context' parameter that can include:
- Previous transcription text
- Current equipment being inspected

This will improve transcription accuracy for technical terms and equipment names.
```

#### Restructure Navigation (2 hours)
1. Update `app/(tabs)/_layout.tsx` for 4-tab system
2. Create new tab screens:
   - `home.tsx` (inspection list)
   - `inspect.tsx` (camera)
   - `review.tsx` (photo review)
   - `settings.tsx` (configuration)
3. Move existing functionality to appropriate tabs

### Phase 1: Foundation
**Goal**: Basic navigation and data structure

1. Set up tab navigation with 4 tabs
2. Create data models and TypeScript interfaces
3. Build Home screen with inspection list
4. Implement "New Inspection" with auto-naming
5. Set up AsyncStorage helpers
6. Create basic Review screen (just show all photos)

### Phase 2: Camera Enhancement
**Goal**: Reliable offline-first capture

1. Update camera for continuous capture
2. Add thumbnail preview of last photo
3. Implement audio recording during capture
4. Create processing queue system
5. Build background retry mechanism
6. Add processing status indicators

**Key features**:
- Photos never blocked by network
- Simple retry with exponential backoff
- Visual feedback for processing state

### Phase 3: Review & Organization
**Goal**: Tag-based organization and editing

1. Implement tag-based categorization
2. Build Review overview with sections
3. Create detail view with tag editing
4. Add audio playback to detail view
5. Implement swipe navigation between photos
6. Add delete functionality

**Hardcoded elements**:
- Curated tag list (no custom tags yet)
- Fixed tag-to-category mapping
- Categories auto-generated from tags

### Phase 4: Progress & Guidance
**Goal**: Inspection guidance and progress tracking

1. Add progress tracker slide-out
2. Implement checklist data structure
3. Add "Next: [Item]" prompts to camera
4. Create category-based progress view
5. Add required vs optional indicators

**Future considerations**:
- Checklist templates
- Custom categories
- Guided inspection flow

### Phase 5: Export & Polish
**Goal**: Report generation and UX polish

1. Simple PDF report generation
2. Loading states and error handling
3. Network status indicators
4. Offline mode messaging
5. Animation and transitions

**Future enhancements**:
- Custom report templates
- Email integration
- Cloud backup

## Backend Integration Notes

### Current Backend Structure
The backend is built with Lovable and uses:
- Supabase for database and auth
- Supabase Edge Functions for API endpoints
- OpenAI for image analysis and audio transcription

### Mobile App Integration
- Keep 1:1 API calls (no batch processing for now)
- Mobile app handles retry logic and queuing
- Backend provides retry hints in error responses
- Use existing auth flow with Supabase

### Future Backend Enhancements
After initial launch, consider:
- Webhook for processing completion notifications
- Inspection report generation endpoint
- Tag management API
- Analytics dashboard for inspection history

## Technical Considerations

### Offline-First Principles
1. **Never block on network**: All actions work offline
2. **Queue and retry**: Failed requests queued for later
3. **Visual feedback**: Show sync status clearly
4. **Conflict resolution**: Last write wins for now

### Performance Optimization
1. **Lazy loading**: Load images on demand
2. **Thumbnail generation**: Create small previews
3. **Batch operations**: Process queue in batches
4. **Memory management**: Clear old inspection data

### Error Handling
1. **Network errors**: Queue for retry
2. **Storage errors**: Alert user, prevent data loss
3. **Camera errors**: Graceful fallback
4. **API errors**: Show partial data

## Future Enhancements

### Near-term (After Tuesday)
1. Real geocoding for addresses
2. Custom tags beyond curated list
3. Checklist templates
4. Export configuration options
5. Cloud sync

### Long-term
1. Multi-user collaboration
2. Offline maps integration
3. Voice commands
4. Drawing on photos
5. Integration with inspection software
6. Historical comparisons

## 🚀 CURRENT STATUS (Updated)

### ✅ **COMPLETED - Phase 0 & Phase 1**

**Phase 0: Critical Refactoring**
- ✅ Cleaned all dead template code
- ✅ Restructured navigation for 4-tab system 
- ✅ Created context providers (Auth, Inspection, Queue)
- ✅ Updated TypeScript interfaces with new data models
- ✅ Fixed API integration issues

**Phase 1: Foundation** 
- ✅ Tab navigation working with dynamic enable/disable
- ✅ Home screen with full inspection list functionality
- ✅ Backend integration for loading/creating inspections
- ✅ "New Inspection" with auto-naming working
- ✅ Proper auth flow with existing AuthScreen
- ✅ AsyncStorage + backend data sync

### ✅ **COMPLETED - Phase 2 (Partial)**
- ✅ Camera capture working with new context system
- ✅ Audio recording during capture
- ✅ Photos saved locally + backend integration
- ✅ Processing queue system implemented
- ✅ Background retry mechanism with exponential backoff
- ✅ Clean separation: Home → Inspect → Review flow

### ✅ **COMPLETED - Phase 3**
- ✅ Review screen with tag-based categorization (hardcoded categories for now)
- ✅ Photo detail drawer with tag editing via chips interface
- ✅ Backend integration - tags are being returned from API
- ✅ Audio transcription and full description display
- ✅ Real-time tag updates with offline-first sync
- ✅ Delete functionality for inspection items
- ✅ Dark mode support throughout review interface
- ✅ Component refactoring (PhotoDetailDrawer, TagEditor extracted)

### ❌ **TODO - Phase 4 & 5**
- ⏸️ Progress tracker slide-out
- ⏸️ Automatic category generation from AI tags (currently using hardcoded mapping)
- ⏸️ Report generation
- ⏸️ Custom tag creation beyond suggested tags

## 🎯 **Current Working State**

### **Navigation Flow (✅ Working)**
1. **Home Tab**: Login → List inspections → Create/Resume → Navigate to Inspect
2. **Inspect Tab**: Camera capture → Label editing → Auto-queue processing
3. **Review Tab**: Enabled when inspection selected (needs implementation)
4. **Settings Tab**: Placeholder

### **Key Features Working**
- ✅ **Authentication**: Full login flow with backend integration
- ✅ **Inspection Management**: Create, list, resume inspections with backend sync
- ✅ **Camera Capture**: Photo + audio capture with local storage
- ✅ **Processing Queue**: Background AI processing with retry logic
- ✅ **Review & Organization**: Tag-based photo categorization with editing interface
- ✅ **Tag Management**: Chips-based tag editing with suggested and custom tags
- ✅ **Offline Support**: Local storage with backend sync for all operations
- ✅ **UX Polish**: Dark mode support, theme-aware UI, component architecture

### **Context Architecture (✅ Implemented)**
```typescript
// Working context system
AuthContext     → Login state, token management
InspectionContext → Inspection CRUD, backend sync  
QueueContext    → Background processing, retry logic
```

### **Data Flow (✅ Working)**
```
Home Screen → Create/Resume Inspection → Set Current Inspection
     ↓
Inspect Tab → Camera Capture → Add to Inspection → Queue Processing
     ↓  
Review Tab → Tag-based organization → Tag editing → Real-time sync
```

## 🔧 **Technical Learnings**

### **What Worked Well**
1. **Context-based architecture** - Clean separation of concerns
2. **Offline-first design** - Local storage with backend sync prevents data loss
3. **Progressive enhancement** - App works offline, syncs when online
4. **Tab-based navigation** - Dynamic enable/disable provides clear UX

### **Key Fixes Applied**
1. **Auth API mismatch** - Fixed `getAuthStatus()` → `validateToken()` + proper error handling
2. **Metro cache issues** - File renames required Metro restart
3. **Component prop mismatches** - CameraScreen required specific props for `setIsReady`
4. **Excessive logging** - Cleaned up development logs for production readiness
5. **UX confusion** - Distinguished "current inspection" vs "in progress status"

### **Backend Integration Notes**
- **Current**: Uses existing Supabase backend with OpenAI integration
- **API calls**: All working (createInspection, getInspections, analyzePhoto, transcribeAudio)
- **Enhancement ready**: Lovable prompts prepared for tag-based AI analysis
- **1:1 approach**: No batch processing, mobile handles retry logic

## 🎯 **Next Steps**

### **Immediate (This Week)**
1. **Implement Review screen** with tag-based categorization
2. **Apply backend AI enhancements** using prepared Lovable prompts
3. **Add basic tag editing** in photo detail view

### **Short-term (Next Week)**  
1. Progress tracker slide-out
2. Report generation (simple PDF)
3. Enhanced error handling and loading states

### **Architecture Decisions**
- ✅ **Context over Redux** - Simpler for this use case
- ✅ **Local-first storage** - Better offline experience
- ✅ **Tab navigation** - Clearer than modal navigation
- ✅ **1:1 API calls** - Simpler than batch processing
- ✅ **Expo managed workflow** - Faster development cycle

## Success Criteria for Tuesday

### Must Have (✅ COMPLETED)
- ✅ Tab navigation working
- ✅ Create and list inspections  
- ✅ Continuous camera capture
- ✅ Photos saved offline
- ✅ Background tag processing (queue implemented)
- ⏳ Basic review screen (stub exists)
- ⏳ Tag-based categories (backend enhancement needed)

### Nice to Have 
- ⏸️ Progress tracker
- ✅ Audio recording/playbook (working)
- ⏳ Full tag editing (basic implementation needed)
- ⏸️ Simple report export

### Can Wait
- Checklist prompts
- Custom tags  
- Advanced categorization
- Polished animations