import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
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
      setIsStartingRecording(true);
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsStartingRecording(false);
      console.log('Audio: Recording started successfully');
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
        await audioRecorder.stop();
        console.log('Audio: Recording stopped, URI:', audioRecorder.uri);
        return { uri: audioRecorder.uri };
      }
      console.log('Audio: Not recording, nothing to stop');
      return null;
    },
    hasPermission,
  };
}