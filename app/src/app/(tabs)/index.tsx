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
import AuthScreen from '@/components/AuthScreen';
import InspectionSelectScreen from '@/components/InspectionSelectScreen';
import { useAudioRecorderCustom } from '@/hooks/useAudioRecorder';
import { useCamera } from '@/hooks/useCamera';
import { useLocation } from '@/hooks/useLocation';
import { uploadInspectionDataWithOpenAI } from '@/utils/upload';
import { saveInspectionItems, loadInspectionItems, clearInspectionItems } from '@/utils/storage';
import { InspectionItem } from '@/types';
import { authManager, apiClient } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppMode = 'inspection-select' | 'camera' | 'editor' | 'summary';

// Export for debugging in console
if (__DEV__) {
  (global as any).authManager = authManager;
  (global as any).apiClient = apiClient;
  (global as any).AsyncStorage = AsyncStorage;
}

export default function InspectionApp() {
  const [mode, setMode] = useState<AppMode>('inspection-select');
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [currentItem, setCurrentItem] = useState<InspectionItem | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentInspectionId, setCurrentInspectionId] = useState<string | null>(null);

  const audioRecorder = useAudioRecorderCustom();
  const camera = useCamera();
  const location = useLocation();

  // Check authentication and load saved items on startup
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    console.log('🔐 Checking authentication status...');
    try {
      const email = await authManager.getCurrentUser();
      console.log('📧 Stored email:', email);
      
      // Validate the token with Supabase
      const isValid = await authManager.validateToken();
      
      if (isValid) {
        console.log('✅ Authentication valid, setting authenticated state');
        setIsAuthenticated(true);
        // Don't automatically create inspection - let user choose
      } else {
        console.log('❌ Authentication invalid or missing');
        // Clear any invalid token
        await authManager.signOut();
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('💥 Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const createNewInspection = async () => {
    try {
      console.log('🏠 Creating new inspection session...');
      const inspection = await apiClient.createInspection('Property Address');
      console.log('✅ Inspection created:', inspection);
      setCurrentInspectionId(inspection.id);
    } catch (error: any) {
      console.error('❌ Failed to create inspection:', error);
      Alert.alert(
        'Backend Connection Error', 
        `Unable to connect to backend server. Error: ${error.message}\n\nPlease check that the backend is deployed on Lovable.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleAuthSuccess = async () => {
    setIsAuthenticated(true);
    // Don't automatically create inspection - user will choose
  };

  const handleInspectionSelected = (inspectionId: string) => {
    console.log('📋 Inspection selected:', inspectionId);
    setCurrentInspectionId(inspectionId);
    setMode('camera');
  };

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
    console.log('🚀 Starting upload to server for item:', item.id);
    console.log('📋 Current inspection ID:', currentInspectionId);
    
    try {
      // Update status to uploading
      updateItemStatus(item.id, 'uploading');

      if (!currentInspectionId) {
        throw new Error('No inspection session active');
      }

      console.log('📤 Uploading with data:', {
        inspectionId: currentInspectionId,
        hasPhoto: !!item.photoUri,
        hasAudio: !!item.audioUri,
        label: item.label,
      });

      // Upload to backend
      const response = await apiClient.uploadInspectionItem(
        currentInspectionId,
        item.photoUri,
        item.audioUri,
        item.label || 'Equipment',
        item.location,
        item.audioTranscription
      );

      console.log('✅ Upload successful, response:', response);

      // Update item with server response
      setCurrentItem(prev => {
        if (prev && prev.id === item.id) {
          return {
            ...prev,
            suggestedLabel: response.suggested_label || response.suggestedLabel,
            audioTranscription: response.audio_transcription || response.audioTranscription,
            uploadStatus: 'completed',
          };
        }
        return prev;
      });

      updateItemStatus(item.id, 'completed');
    } catch (error: any) {
      console.error('💥 Upload error:', error);
      console.error('💥 Error stack:', error.stack);
      updateItemStatus(item.id, 'failed');
      
      Alert.alert(
        'Upload Failed',
        `Unable to upload inspection item. Error: ${error.message}\n\nThe backend may not be properly configured.`,
        [{ text: 'OK' }]
      );
    }
  };

  const updateItemStatus = (id: string, status: InspectionItem['uploadStatus']) => {
    setInspectionItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, uploadStatus: status } : item
      )
    );
  };

  const handleSaveLabel = async (label: string) => {
    if (!currentItem) return;

    const updatedItem = { ...currentItem, label };
    setInspectionItems(prev => [...prev, updatedItem]);
    
    // Clean up old audio segments, keeping only the one we used
    audioRecorder.cleanupOldSegments(updatedItem.audioUri);
    
    // Update the last inspection item count
    try {
      const lastInspectionData = await AsyncStorage.getItem('lastInspection');
      if (lastInspectionData) {
        const lastInspection = JSON.parse(lastInspectionData);
        lastInspection.itemCount = (lastInspection.itemCount || 0) + 1;
        await AsyncStorage.setItem('lastInspection', JSON.stringify(lastInspection));
      }
    } catch (error) {
      console.error('Error updating item count:', error);
    }
    
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
            await AsyncStorage.removeItem('lastInspection');
            setInspectionItems([]);
            setCurrentInspectionId(null);
            setMode('inspection-select');
          },
        },
      ]
    );
  };

  const handleBackFromSummary = () => {
    setMode('camera');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authManager.signOut();
            await AsyncStorage.removeItem('lastInspection');
            setIsAuthenticated(false);
            setCurrentInspectionId(null);
            setInspectionItems([]);
            setMode('inspection-select');
          },
        },
      ]
    );
  };

  // Debug function to test backend
  const handleDebugBackend = async () => {
    const { printDebugInfo } = await import('@/utils/backendTest');
    const { testInspectionItemsEndpoint, testInspectionsEndpoint } = await import('@/utils/testBackend');
    
    console.log('🐛 === STARTING COMPREHENSIVE BACKEND DEBUG ===');
    await printDebugInfo();
    
    console.log('\n🐛 === TESTING SPECIFIC ENDPOINTS ===');
    await testInspectionsEndpoint();
    await testInspectionItemsEndpoint();
    
    console.log('🐛 === DEBUG COMPLETE ===');
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

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
      
      {mode === 'inspection-select' && (
        <InspectionSelectScreen
          onInspectionSelected={handleInspectionSelected}
        />
      )}

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
          onSignOut={handleSignOut}
          onDebugBackend={handleDebugBackend}
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
