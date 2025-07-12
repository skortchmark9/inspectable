import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InspectionContextType, Inspection, InspectionItem } from '@/types';

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

export function useInspection() {
  const context = useContext(InspectionContext);
  if (context === undefined) {
    throw new Error('useInspection must be used within an InspectionProvider');
  }
  return context;
}

interface InspectionProviderProps {
  children: React.ReactNode;
}

// Storage keys
const STORAGE_KEYS = {
  CURRENT_INSPECTION: '@current_inspection_id',
  INSPECTIONS_LIST: '@inspections',
  INSPECTION_PREFIX: '@inspection_', // + id
};

export function InspectionProvider({ children }: InspectionProviderProps) {
  const [currentInspection, setCurrentInspectionState] = useState<Inspection | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      // Load inspections list
      const inspectionsJson = await AsyncStorage.getItem(STORAGE_KEYS.INSPECTIONS_LIST);
      const inspectionsList: Inspection[] = inspectionsJson ? JSON.parse(inspectionsJson) : [];
      setInspections(inspectionsList);

      // Load current inspection if set
      const currentInspectionId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_INSPECTION);
      if (currentInspectionId) {
        const currentInspectionJson = await AsyncStorage.getItem(
          STORAGE_KEYS.INSPECTION_PREFIX + currentInspectionId
        );
        if (currentInspectionJson) {
          const inspection: Inspection = JSON.parse(currentInspectionJson);
          setCurrentInspectionState(inspection);
        }
      }
    } catch (error) {
      console.error('Failed to load inspections:', error);
    }
  };

  const saveInspection = async (inspection: Inspection) => {
    try {
      // Save individual inspection
      await AsyncStorage.setItem(
        STORAGE_KEYS.INSPECTION_PREFIX + inspection.id,
        JSON.stringify(inspection)
      );

      // Update inspections list
      const updatedInspections = inspections.filter(i => i.id !== inspection.id);
      updatedInspections.push(inspection);
      await AsyncStorage.setItem(STORAGE_KEYS.INSPECTIONS_LIST, JSON.stringify(updatedInspections));
      
      setInspections(updatedInspections);
    } catch (error) {
      console.error('Failed to save inspection:', error);
      throw error;
    }
  };

  const createInspection = async (
    name: string, 
    location: { latitude: number; longitude: number; address?: string }
  ): Promise<Inspection> => {
    const inspection: Inspection = {
      id: uuidv4(),
      name,
      location,
      createdAt: new Date(),
      status: 'active',
      items: [],
    };

    await saveInspection(inspection);
    return inspection;
  };

  const setCurrentInspection = async (inspection: Inspection | null) => {
    try {
      if (inspection) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_INSPECTION, inspection.id);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_INSPECTION);
      }
      setCurrentInspectionState(inspection);
    } catch (error) {
      console.error('Failed to set current inspection:', error);
      throw error;
    }
  };

  const addInspectionItem = async (item: InspectionItem) => {
    if (!currentInspection) {
      throw new Error('No current inspection set');
    }

    const updatedInspection: Inspection = {
      ...currentInspection,
      items: [...currentInspection.items, item],
    };

    await saveInspection(updatedInspection);
    setCurrentInspectionState(updatedInspection);
  };

  const updateInspectionItem = async (itemId: string, updates: Partial<InspectionItem>) => {
    if (!currentInspection) {
      throw new Error('No current inspection set');
    }

    const updatedItems = currentInspection.items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    const updatedInspection: Inspection = {
      ...currentInspection,
      items: updatedItems,
    };

    await saveInspection(updatedInspection);
    setCurrentInspectionState(updatedInspection);
  };

  const deleteInspectionItem = async (itemId: string) => {
    if (!currentInspection) {
      throw new Error('No current inspection set');
    }

    const updatedItems = currentInspection.items.filter(item => item.id !== itemId);

    const updatedInspection: Inspection = {
      ...currentInspection,
      items: updatedItems,
    };

    await saveInspection(updatedInspection);
    setCurrentInspectionState(updatedInspection);
  };

  const value: InspectionContextType = {
    currentInspection,
    inspections,
    createInspection,
    setCurrentInspection,
    addInspectionItem,
    updateInspectionItem,
    deleteInspectionItem,
  };

  return (
    <InspectionContext.Provider value={value}>
      {children}
    </InspectionContext.Provider>
  );
}