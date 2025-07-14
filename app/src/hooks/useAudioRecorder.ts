import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Alert } from 'react-native';
import { AUDIO_SEGMENT_DURATION, MAX_AUDIO_SEGMENTS } from '../constants/Config';

export function useAudioRecorderCustom() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  
  // Use expo-audio's built-in hook
  const audioRecorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      console.log('Audio: Requesting permissions...');
      const status = await AudioModule.requestRecordingPermissionsAsync();
      console.log('Audio: Permission status:', status);
      
      if (status.granted) {
        console.log('Audio: Permissions granted');
        setHasPermission(true);
      } else {
        console.log('Audio: Permissions denied');
        Alert.alert('Permission Required', 'Microphone access is required');
      }
    } catch (error) {
      console.error('Audio permission failed:', error);
    }
  };

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        console.log('Audio: No permission, cannot start recording');
        return;
      }

      console.log('Audio: Starting recording...');
      console.log('Audio: Recorder ID before start:', audioRecorder.id);
      console.log('Audio: Recorder URI before start:', audioRecorder.uri);
      setIsStartingRecording(true);
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsStartingRecording(false);
      console.log('Audio: Recording started successfully');
      console.log('Audio: Recorder ID after start:', audioRecorder.id);
      console.log('Audio: Recorder URI after start:', audioRecorder.uri);
    } catch (error) {
      console.error('Recording failed:', error);
      setIsStartingRecording(false);
    }
  };

  const getLatestAudioSegment = async () => {
    try {
      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      }
      return audioRecorder.uri || null;
    } catch (error) {
      console.error('Error getting audio segment:', error);
      return null;
    }
  };

  const cleanupOldSegments = () => {
    // Simplified - do nothing for now
  };

  return {
    isRecording: audioRecorder.isRecording || isStartingRecording,
    getLatestAudioSegment,
    cleanupOldSegments,
    startRecording,
    stopRecording: async () => {
      if (audioRecorder.isRecording) {
        console.log('Audio: Stopping recording...');
        console.log('Audio: Recorder ID before stop:', audioRecorder.id);
        console.log('Audio: Recorder URI before stop:', audioRecorder.uri);
        await audioRecorder.stop();
        console.log('Audio: Recording stopped, URI:', audioRecorder.uri);
        console.log('Audio: Recorder ID after stop:', audioRecorder.id);
        
        // Copy to unique filename to prevent overwriting
        if (audioRecorder.uri) {
          try {
            const uniqueId = Crypto.randomUUID();
            const extension = audioRecorder.uri.split('.').pop() || 'm4a';
            const uniqueFilename = `recording-${uniqueId}.${extension}`;
            const uniqueUri = `${FileSystem.documentDirectory}${uniqueFilename}`;
            
            console.log('Audio: Copying to unique file:', uniqueUri);
            await FileSystem.copyAsync({
              from: audioRecorder.uri,
              to: uniqueUri
            });
            console.log('Audio: File copied successfully to:', uniqueUri);
            return { uri: uniqueUri };
          } catch (copyError) {
            console.error('Audio: Failed to copy file:', copyError);
            // Fall back to original URI if copy fails
            return { uri: audioRecorder.uri };
          }
        }
        
        return { uri: audioRecorder.uri };
      }
      console.log('Audio: Not recording, nothing to stop');
      return null;
    },
    hasPermission,
  };
}