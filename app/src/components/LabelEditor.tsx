import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { InspectionItem } from '../types';
import { MAX_LABEL_LENGTH } from '../constants/Config';

interface LabelEditorProps {
  item: InspectionItem;
  onSave: (label: string) => void;
  onCancel: () => void;
}

export function LabelEditor({ item, onSave, onCancel }: LabelEditorProps) {
  const [label, setLabel] = useState(item.suggestedLabel || '');
  const isLoading = item.uploadStatus === 'uploading';
  
  // Use expo-audio player
  const player = useAudioPlayer(item.audioUri ? { uri: item.audioUri } : null);
  
  console.log('LabelEditor: Audio player created with URI:', item.audioUri);
  console.log('LabelEditor: Player initial state:', {
    playing: player.playing,
    duration: player.duration
  });

  useEffect(() => {
    if (item.suggestedLabel) {
      setLabel(item.suggestedLabel);
    }
    
    // Check audio file info
    if (item.audioUri) {
      checkAudioFile();
    }
  }, [item.suggestedLabel, item.audioUri]);

  const checkAudioFile = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(item.audioUri);
      console.log('Audio file info:', {
        exists: fileInfo.exists,
        size: fileInfo.size,
        uri: fileInfo.uri,
        modificationTime: fileInfo.modificationTime
      });
      
      if (fileInfo.size === 0) {
        console.log('⚠️ Audio file is empty (0 bytes)!');
      } else {
        console.log(`✅ Audio file size: ${fileInfo.size} bytes`);
      }
    } catch (error) {
      console.error('Error checking audio file:', error);
    }
  };

  const playAudio = () => {
    try {
      if (!item.audioUri) {
        console.log('No audio URI available');
        return;
      }

      console.log('Playing audio from:', item.audioUri);
      console.log('Player state before play:', {
        playing: player.playing,
        duration: player.duration,
        currentTime: player.currentTime
      });
      
      player.play();
      
      // Check state after play
      setTimeout(() => {
        console.log('Player state after play:', {
          playing: player.playing,
          duration: player.duration,
          currentTime: player.currentTime
        });
      }, 100);
      
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  const stopAudio = () => {
    try {
      player.pause();
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const handleSave = () => {
    if (label.trim()) {
      onSave(label.trim());
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.innerContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.photoUri }} style={styles.image} />
        </View>

        <View style={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Analyzing image and audio...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.labelTitle}>Label</Text>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="Enter label"
                maxLength={MAX_LABEL_LENGTH}
                autoFocus
              />

              {item.audioTranscription && (
                <View style={styles.transcriptionContainer}>
                  <Text style={styles.transcriptionTitle}>Audio Notes</Text>
                  <Text style={styles.transcriptionText}>
                    {item.audioTranscription}
                  </Text>
                </View>
              )}

              {item.audioUri && (
                <View style={styles.audioContainer}>
                  <Text style={styles.audioTitle}>Recorded Audio</Text>
                  <TouchableOpacity 
                    style={styles.audioButton} 
                    onPress={player.playing ? stopAudio : playAudio}
                  >
                    <Text style={styles.audioButtonText}>
                      {player.playing ? '⏹ Stop' : '▶️ Play Recording'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.saveButton]} 
                  onPress={handleSave}
                  disabled={!label.trim()}
                >
                  <Text style={styles.saveButtonText}>Save & Continue</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  labelTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  transcriptionContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  transcriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  audioContainer: {
    backgroundColor: '#e8f4fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  audioButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  audioButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    marginBottom: 40,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});