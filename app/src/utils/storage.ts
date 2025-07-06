import AsyncStorage from '@react-native-async-storage/async-storage';
import { InspectionItem } from '../types';

const STORAGE_KEY = 'inspection_items';

export async function saveInspectionItems(items: InspectionItem[]): Promise<void> {
  try {
    const jsonValue = JSON.stringify(items);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (error) {
    console.error('Failed to save inspection items:', error);
  }
}

export async function loadInspectionItems(): Promise<InspectionItem[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue != null) {
      const items = JSON.parse(jsonValue);
      // Convert date strings back to Date objects
      return items.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to load inspection items:', error);
    return [];
  }
}

export async function clearInspectionItems(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear inspection items:', error);
  }
}