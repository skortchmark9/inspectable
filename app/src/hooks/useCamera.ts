import { useState, useRef, useEffect } from 'react';
import { CameraView, CameraType, CameraCapturedPicture, useCameraPermissions } from 'expo-camera';
import { Alert } from 'react-native';
import { PHOTO_QUALITY } from '../constants/Config';

export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const requestPermissions = async () => {
    try {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to use this app.');
      }
      return result.granted;
    } catch (error) {
      console.error('Failed to request camera permissions:', error);
      return false;
    }
  };

  const takePicture = async (): Promise<CameraCapturedPicture | null> => {
    if (!cameraRef.current || !isReady) {
      return null;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: PHOTO_QUALITY,
        base64: false,
        exif: true,
      });
      return photo;
    } catch (error) {
      console.error('Failed to take picture:', error);
      return null;
    }
  };

  return {
    cameraRef,
    hasPermission: permission?.granted ?? null,
    isReady,
    setIsReady,
    requestPermissions,
    takePicture,
  };
}