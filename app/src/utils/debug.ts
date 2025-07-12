// Debug utilities for development
// Only available in __DEV__ mode

import { authManager, apiClient } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function setupDebugGlobals() {
  if (__DEV__) {
    (global as any).authManager = authManager;
    (global as any).apiClient = apiClient;
    (global as any).AsyncStorage = AsyncStorage;
  }
}

// Export for console debugging
export { authManager, apiClient, AsyncStorage };