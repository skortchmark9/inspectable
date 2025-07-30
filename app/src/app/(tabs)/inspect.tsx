import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  SafeAreaView,
  Text,
  AppState,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';

import { CameraScreen } from '@/components/CameraScreen';
import { useAudioRecorderCustom } from '@/hooks/useAudioRecorder';
import { useCamera } from '@/hooks/useCamera';
import { useLocation } from '@/hooks/useLocation';
import { useInspection } from '@/contexts/InspectionContext';
import { InspectionItem } from '@/types';

export default function InspectScreen() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const isFocused = useIsFocused();

  const { currentInspection, addInspectionItem } = useInspection();
  const audioRecorder = useAudioRecorderCustom();
  const camera = useCamera();
  const location = useLocation();

  // Combine tab focus and app state into single "active" state
  const isActive = isFocused && appState === 'active';

  // Track app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('App state changed to:', nextAppState);
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Single effect to manage recording based on active state
  useEffect(() => {
    // Only manage recording if we have a current inspection
    if (!currentInspection) return;
    
    console.log('Audio Effect: hasPermission:', audioRecorder.hasPermission, 'isRecording:', audioRecorder.isRecording, 'isActive:', isActive);
    
    if (isActive && audioRecorder.hasPermission && !audioRecorder.isRecording) {
      console.log('Audio Effect: Starting recording...');
      audioRecorder.startRecording();
    } else if (!isActive && audioRecorder.isRecording) {
      console.log('Audio Effect: Stopping recording (not active)...');
      audioRecorder.stopRecording(false); // Don't save when not active
    }
  }, [audioRecorder.hasPermission, isActive, currentInspection]);

  // If no current inspection, show message
  if (!currentInspection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noInspectionContainer}>
          <Text style={styles.noInspectionText}>No inspection selected</Text>
          <Text style={styles.noInspectionSubtext}>
            Please select or create an inspection from the Home tab
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = useCallback(async () => {
    if (isCapturing || !camera.hasPermission) return;

    try {
      setIsCapturing(true);
      
      // Step 1: Take photo
      const photo = await camera.takePicture();
      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }
      
      console.log('📷 Photo captured with EXIF:', photo.exif ? 'Yes' : 'No');
      if (photo.exif) {
        console.log('📷 EXIF keys:', Object.keys(photo.exif));
      }

      // Step 2: Handle audio - stop current recording and get unique URI
      let audioUri: string | undefined;
      console.log('Capture: Audio recording status:', audioRecorder.isRecording);
      if (audioRecorder.isRecording) {
        try {
          const recording = await audioRecorder.stopRecording();
          audioUri = recording?.uri;
          console.log('Capture: Audio URI captured:', audioUri);
        } catch (audioError) {
          console.error('❌ Audio capture failed:', audioError);
        }
      } else {
        console.log('Capture: No audio recording active');
      }

      // Step 3: Get location
      let currentLocation;
      try {
        currentLocation = await location.getCurrentLocation();
      } catch (locationError) {
        console.error('❌ Location failed:', locationError);
      }

      // Step 4: Create item
      const newItem: InspectionItem = {
        id: Crypto.randomUUID(),
        inspectionId: currentInspection.id,
        photoUri: photo.uri,
        audioUri,
        timestamp: new Date(),
        exifData: photo.exif,
        processingStatus: 'pending',
        retryCount: 0,
        location: currentLocation ? {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        } : undefined,
      };

      // Step 5: Add to inspection and trigger background processing
      addInspectionItem(newItem);

      // Step 6: Restart recording for next capture
      if (audioRecorder.hasPermission && !audioRecorder.isRecording) {
        console.log('Capture: Restarting audio recording...');
        audioRecorder.startRecording();
      }

    } catch (error) {
      console.error('❌ Capture error:', error);
      Alert.alert('Error', `Failed to capture photo: ${error.message}`);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, camera, audioRecorder, location, currentInspection, addInspectionItem]);

  // Get last photo from inspection items (sorted by timestamp)
  const getItemsArray = () => {
    if (!currentInspection?.items) return [];
    return Object.values(currentInspection.items).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const itemsArray = getItemsArray();
  const lastPhotoUri = itemsArray.length > 0 
    ? itemsArray[itemsArray.length - 1].photoUri 
    : null;
    

  return (
    <SafeAreaView style={styles.container}>
      <CameraScreen
        cameraRef={camera.cameraRef}
        isReady={camera.isReady && isFocused}
        setIsReady={camera.setIsReady}
        isRecording={audioRecorder.isRecording}
        onCapture={handleCapture}
        onFinishInspection={() => {}} // Not needed in new flow
        itemCount={itemsArray.length}
        isCapturing={isCapturing}
        lastPhotoUri={lastPhotoUri}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  noInspectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noInspectionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  noInspectionSubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
});