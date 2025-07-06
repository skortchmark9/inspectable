import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation(currentLocation);
        } catch (error) {
          console.error('Failed to get location:', error);
        }
      }
    })();
  }, []);

  const getCurrentLocation = async () => {
    if (permissionStatus !== 'granted') {
      return null;
    }

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
      return currentLocation;
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  };

  return {
    location,
    permissionStatus,
    getCurrentLocation,
  };
}