import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  SafeAreaView,
  StatusBar,
  Text,
  ActivityIndicator,
} from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { CameraScreen } from '@/components/CameraScreen';
import { LabelEditor } from '@/components/LabelEditor';
import { SummaryScreen } from '@/components/SummaryScreen';
import { useAudioRecorderCustom } from '@/hooks/useAudioRecorder';
import { useCamera } from '@/hooks/useCamera';
import { useLocation } from '@/hooks/useLocation';
import { uploadInspectionDataWithOpenAI } from '@/utils/upload';
import { saveInspectionItems, loadInspectionItems, clearInspectionItems } from '@/utils/storage';
import { InspectionItem } from '@/types';

type AppMode = 'camera' | 'editor' | 'summary';

export default function InspectionApp() {
  const [mode, setMode] = useState<AppMode>('camera');
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [currentItem, setCurrentItem] = useState<InspectionItem | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const audioRecorder = useAudioRecorderCustom();
  const camera = useCamera();
  const location = useLocation();

  // Load saved items on startup
  useEffect(() => {
    loadInspectionItems().then(items => {
      if (items.length > 0) {
        setInspectionItems(items);
      }
    });
  }, []);

  // Start/stop recording based on current mode and permissions
  useEffect(() => {
    console.log('Recording effect triggered:', { 
      mode, 
      hasPermission: audioRecorder.hasPermission,
      isRecording: audioRecorder.isRecording 
    });
    
    if (mode === 'camera' && audioRecorder.hasPermission && !audioRecorder.isRecording) {
      console.log('✅ Starting recording: camera mode + permissions + not recording');
      audioRecorder.startRecording();
    } else if (mode !== 'camera' && audioRecorder.isRecording) {
      console.log('🛑 Stopping recording: not camera mode');
      audioRecorder.stopRecording();
    } else {
      console.log('⏸️ No action needed');
    }
  }, [mode, audioRecorder.hasPermission, audioRecorder.isRecording]);

  // Save items whenever they change
  useEffect(() => {
    if (inspectionItems.length > 0) {
      saveInspectionItems(inspectionItems);
    }
  }, [inspectionItems]);

  // Camera permissions are handled in useCamera hook automatically

  const handleCapture = useCallback(async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      // Take photo
      const photo = await camera.takePicture();
      if (!photo) {
        throw new Error('Failed to capture photo');
      }

      // Get latest audio segment (stops recording to finalize file)
      const audioUri = await audioRecorder.getLatestAudioSegment() || '';

      // Get current location
      const currentLocation = await location.getCurrentLocation();

      // Create new inspection item
      const newItem: InspectionItem = {
        id: uuidv4(),
        photoUri: photo.uri,
        audioUri,
        label: '',
        suggestedLabel: 'Equipment', // Default label while upload is disabled
        timestamp: new Date(),
        location: currentLocation ? {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        } : undefined,
        uploadStatus: 'completed', // Mark as completed since no upload
      };

      setCurrentItem(newItem);
      setMode('editor');

      // Start upload with OpenAI
      uploadToServer(newItem);
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, camera, location]);

  const uploadToServer = async (item: InspectionItem) => {
    try {
      // Update status to uploading
      updateItemStatus(item.id, 'uploading');

      const response = await uploadInspectionDataWithOpenAI(
        item.photoUri,
        item.audioUri,
        {
          timestamp: item.timestamp,
          location: item.location,
        }
      );

      // Update item with server response
      setCurrentItem(prev => {
        if (prev && prev.id === item.id) {
          return {
            ...prev,
            suggestedLabel: response.suggestedLabel,
            audioTranscription: response.audioTranscription,
            uploadStatus: 'completed',
          };
        }
        return prev;
      });

      updateItemStatus(item.id, 'completed');
    } catch (error) {
      console.error('Upload error:', error);
      updateItemStatus(item.id, 'failed');
      // Could implement retry logic here
    }
  };

  const updateItemStatus = (id: string, status: InspectionItem['uploadStatus']) => {
    setInspectionItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, uploadStatus: status } : item
      )
    );
  };

  const handleSaveLabel = (label: string) => {
    if (!currentItem) return;

    const updatedItem = { ...currentItem, label };
    setInspectionItems(prev => [...prev, updatedItem]);
    
    // Clean up old audio segments, keeping only the one we used
    audioRecorder.cleanupOldSegments(updatedItem.audioUri);
    
    setCurrentItem(null);
    setMode('camera');
  };

  const handleCancelEdit = () => {
    setCurrentItem(null);
    setMode('camera');
  };

  const handleFinishInspection = () => {
    setMode('summary');
  };

  const handleCompleteInspection = async () => {
    Alert.alert(
      'Complete Inspection',
      'This will clear all inspection data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'destructive',
          onPress: async () => {
            await clearInspectionItems();
            setInspectionItems([]);
            setMode('camera');
          },
        },
      ]
    );
  };

  const handleBackFromSummary = () => {
    setMode('camera');
  };

  // Show loading while checking permissions
  if (camera.hasPermission === null) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Requesting permissions...</Text>
      </SafeAreaView>
    );
  }

  // Show error if no camera permission
  if (camera.hasPermission === false) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Camera permission is required</Text>
        <Text style={styles.errorSubtext}>Please enable camera access in Settings</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {mode === 'camera' && (
        <CameraScreen
          cameraRef={camera.cameraRef}
          isReady={camera.isReady}
          setIsReady={camera.setIsReady}
          isRecording={audioRecorder.isRecording}
          onCapture={handleCapture}
          onFinishInspection={handleFinishInspection}
          itemCount={inspectionItems.length}
          isCapturing={isCapturing}
        />
      )}

      {mode === 'editor' && currentItem && (
        <LabelEditor
          item={currentItem}
          onSave={handleSaveLabel}
          onCancel={handleCancelEdit}
        />
      )}

      {mode === 'summary' && (
        <SummaryScreen
          inspectionItems={inspectionItems}
          onComplete={handleCompleteInspection}
          onBack={handleBackFromSummary}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
