import { API_ENDPOINT, UPLOAD_TIMEOUT } from '../constants/Config';
import { ServerResponse } from '../types';
import { analyzeImage, transcribeAudio } from './openai';

export async function uploadInspectionData(
  photoUri: string,
  audioUri: string,
  metadata: {
    timestamp: Date;
    location?: { latitude: number; longitude: number };
  }
): Promise<ServerResponse> {
  const formData = new FormData();
  
  // Add photo
  formData.append('photo', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);
  
  // Add audio
  // formData.append('audio', {
  //   uri: audioUri,
  //   type: 'audio/m4a',
  //   name: 'audio.m4a',
  // } as any);
  
  // Add metadata
  formData.append('metadata', JSON.stringify(metadata));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data: ServerResponse = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Upload timeout');
    }
    
    throw error;
  }
}

export async function uploadInspectionDataWithOpenAI(
  photoUri: string,
  audioUri: string,
  metadata: {
    timestamp: Date;
    location?: { latitude: number; longitude: number };
  }
): Promise<ServerResponse> {
  try {
    // For now, we'll use base64 from photo URI since we need it for OpenAI
    // In a real implementation, you'd get this from the camera capture
    const photoResponse = await fetch(photoUri);
    const photoBlob = await photoResponse.blob();
    const photoBase64 = await blobToBase64(photoBlob);
    
    // Analyze image with OpenAI Vision
    const suggestedLabel = await analyzeImage(photoBase64);
    
    // Transcribe audio with OpenAI Whisper (if audio URI is provided)
    let audioTranscription = 'No audio recorded';
    if (audioUri && audioUri !== '') {
      try {
        audioTranscription = await transcribeAudio(audioUri);
      } catch (error) {
        console.error('Audio transcription failed:', error);
        audioTranscription = 'Audio transcription failed';
      }
    }

    return {
      suggestedLabel,
      audioTranscription,
      confidence: 0.85, // Mock confidence score
    };
  } catch (error: any) {
    console.error('OpenAI upload error:', error);
    
    // Return fallback response on error
    return {
      suggestedLabel: 'Equipment',
      audioTranscription: 'Analysis failed',
      confidence: 0.1,
    };
  }
}

// Helper function to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data:image/jpeg;base64, prefix
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}