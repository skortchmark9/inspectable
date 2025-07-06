import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { AUDIO_SEGMENT_DURATION, MAX_AUDIO_SEGMENTS } from '../constants/Config';

export function useAudioRecorderCustom() {
  console.log('useAudioRecorderCustom: Hook initialized');
  const [hasPermission, setHasPermission] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  
  // Use expo-audio's built-in hook
  const audioRecorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  console.log('audioRecorder.isRecording:', audioRecorder.isRecording);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      console.log('1. Requesting permissions...');
      const status = await AudioModule.requestRecordingPermissionsAsync();
      console.log('2. Permission status:', status);
      
      if (status.granted) {
        console.log('Audio permissions granted');
        setHasPermission(true);
      } else {
        Alert.alert('Permission Required', 'Microphone access is required');
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        console.log('No permission yet, cannot start recording');
        return;
      }

      setIsStartingRecording(true);
      console.log('3. Preparing to record...');
      await audioRecorder.prepareToRecordAsync();
      
      console.log('4. Starting recording...');
      audioRecorder.record();
      
      console.log('5. Recording started, isRecording:', audioRecorder.isRecording);
      setIsStartingRecording(false);
    } catch (error) {
      console.error('Recording failed:', error);
      setIsStartingRecording(false);
    }
  };

  const getLatestAudioSegment = async () => {
    try {
      // Stop recording to finalize the file
      if (audioRecorder.isRecording) {
        console.log('Stopping recording to finalize audio file...');
        await audioRecorder.stop();
        console.log('Recording stopped, URI available:', audioRecorder.uri);
        // Don't restart here - let the mode-based effect handle it
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
    stopRecording: () => audioRecorder.isRecording && audioRecorder.stop(),
    hasPermission,
  };
}