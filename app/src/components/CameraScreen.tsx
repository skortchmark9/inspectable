import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import { InspectionItem } from '../types';

interface CameraScreenProps {
  cameraRef: React.RefObject<CameraView>;
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
  isRecording: boolean;
  onCapture: () => void;
  onFinishInspection: () => void;
  itemCount: number;
  isCapturing: boolean;
  lastPhotoUri?: string | null;
}

export function CameraScreen({
  cameraRef,
  isReady,
  setIsReady,
  isRecording,
  onCapture,
  onFinishInspection,
  itemCount,
  isCapturing,
  lastPhotoUri,
}: CameraScreenProps) {
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setIsReady(true)}
      />
      
      {/* Overlay positioned absolutely on top of camera */}
      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <View style={styles.recordingIndicator}>
            {isRecording && (
              <>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording Audio</Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={styles.finishButton}
            onPress={onFinishInspection}
            disabled={itemCount === 0}
          >
            <Text style={styles.finishButtonText}>
              Finish ({itemCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.bottomContainer}>
        {/* Thumbnail in bottom left */}
        <View style={styles.thumbnailContainer}>
          {lastPhotoUri && (
            <TouchableOpacity style={styles.thumbnail}>
              <Image source={{ uri: lastPhotoUri }} style={styles.thumbnailImage} />
            </TouchableOpacity>
          )}
        </View>

        {/* Capture button in center */}
        <TouchableOpacity
          style={[
            styles.captureButton,
            isCapturing && styles.captureButtonDisabled,
          ]}
          onPress={onCapture}
          disabled={isCapturing || !isReady}
        >
          {isCapturing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>

        {/* Spacer for layout balance */}
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    pointerEvents: 'auto',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 14,
  },
  finishButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    pointerEvents: 'auto',
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ddd',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  spacer: {
    width: 80,
    height: 80,
  },
});