import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InspectionContextType, Inspection, InspectionItem } from '@/types';
import { apiClient } from '@/services/api';
import { useAuth } from './AuthContext';

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
};

export function InspectionProvider({ children }: InspectionProviderProps) {
  const [currentInspectionId, setCurrentInspectionId] = useState<string | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const loadingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated } = useAuth();

  // Derive currentInspection from inspections array
  const currentInspection = React.useMemo(() => {
    return currentInspectionId 
      ? inspections.find(inspection => inspection.id === currentInspectionId) || null
      : null;
  }, [currentInspectionId, inspections]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    } 
    loadInspections();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isAuthenticated]);

  const loadInspections = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const [inspectionsJson, savedCurrentInspectionId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.INSPECTIONS_LIST),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_INSPECTION)
      ]);

      const localInspections: Inspection[] = inspectionsJson ? JSON.parse(inspectionsJson) : [];
      
      setInspections(localInspections);
      if (savedCurrentInspectionId) {
        setCurrentInspectionId(savedCurrentInspectionId);
      }

      loadInspectionsFromBackend();
    } catch (error) {
      console.error('Failed to load inspections:', error);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const loadInspectionsFromBackend = useCallback(async () => {
    try {
      const backendInspections = await apiClient.getInspections();
      
      if (!backendInspections?.length) return;

      const inspectionPromises = backendInspections.map(async (backendInspection) => {
        try {
          const detailedInspection = await apiClient.getInspection(backendInspection.id);
          
          const inspection: Inspection = {
            id: backendInspection.id,
            name: `${new Date(backendInspection.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })} - ${backendInspection.property_address}`,
            location: {              
              latitude: backendInspection.metadata?.latitude || 37.7749, // Try metadata or default
              longitude: backendInspection.metadata?.longitude || -122.4194,
              address: backendInspection.property_address,
            },
            createdAt: new Date(backendInspection.created_at),
            status: backendInspection.status === 'completed' ? 'completed' : 'active',
            items: (detailedInspection.inspection_items || []).reduce((acc: Record<string, InspectionItem>, item: any) => {
              const inspectionItem: InspectionItem = {
                id: item.id,
                inspectionId: backendInspection.id,
                photoUri: item.photo_url || '',
                audioUri: item.audio_url,
                timestamp: new Date(item.timestamp),
                tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []),
                description: item.description || item.notes,
                ocr_text: item.ocr_text,
                processingStatus: 'completed',
                retryCount: 0,
                // Legacy fields for compatibility
                label: item.label,
                suggestedLabel: item.suggested_label,
                audioTranscription: item.audio_transcription,
                uploadStatus: 'completed',
                backendId: item.id,
              };
              acc[item.id] = inspectionItem;
              return acc;
            }, {}),
          };
          
          return inspection;
        } catch (detailError) {
          console.error('Failed to load details for inspection:', backendInspection.id, detailError);
          return {
            id: backendInspection.id,
            name: `${new Date(backendInspection.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })} - ${backendInspection.property_address}`,
            location: {
              latitude: backendInspection.metadata?.latitude || 37.7749,
              longitude: backendInspection.metadata?.longitude || -122.4194,
              address: backendInspection.property_address,
            },
            createdAt: new Date(backendInspection.created_at),
            status: backendInspection.status === 'completed' ? 'completed' : 'active',
            items: {},
          } as Inspection;
        }
      });

      const convertedInspections = await Promise.all(inspectionPromises);
      
      // Merge with existing local data to preserve pending items
      setInspections(prev => {
        const merged = [...convertedInspections];
        
        // For each local inspection, check if we need to preserve local-only items
        prev.forEach(localInspection => {
          const backendMatch = merged.find(bi => bi.id === localInspection.id);
          
          if (backendMatch) {
            // Merge items: preserve local items that haven't been uploaded
            const localItems = Object.values(localInspection.items || {});
            const pendingItems = localItems.filter(item => 
              !item.backendId && (item.processingStatus === 'pending' || item.processingStatus === 'processing' || item.processingStatus === 'failed')
            );
            
            // Add pending local items to the backend inspection
            pendingItems.forEach(item => {
              console.log(`🔄 Preserving local pending item ${item.id} in inspection ${localInspection.id}`);
              backendMatch.items[item.id] = item;
            });
          } else {
            // Local inspection doesn't exist on backend - keep it
            //@SAM MAYBE WE SHOULD SYNC IT THEN
            console.log(`🔄 Preserving local-only inspection ${localInspection.id}`);
            merged.push(localInspection);
          }
        });
        
        debouncedSaveToStorage(merged);
        return merged;
      });
    } catch (error) {
      console.error('❌ Failed to load inspections from backend:', error);
    }
  }, []);

  const debouncedSaveToStorage = useCallback((inspectionsToSave: Inspection[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.INSPECTIONS_LIST, JSON.stringify(inspectionsToSave));
      } catch (error) {
        console.error('Failed to save inspections to storage:', error);
      }
    }, 500);
  }, []);

  const saveInspection = useCallback((inspection: Inspection) => {
    setInspections(prev => {
      const updated = prev.filter(i => i.id !== inspection.id);
      updated.push(inspection);
      debouncedSaveToStorage(updated);
      return updated;
    });
  }, [debouncedSaveToStorage]);

  const createInspection = useCallback(async (
    name: string, 
    location: { latitude: number; longitude: number; address?: string }
  ): Promise<Inspection> => {
    try {
      const backendInspection = await apiClient.createInspection(location.address || 'Property Address');
      const inspection: Inspection = {
        id: backendInspection.id,
        name,
        location,
        createdAt: new Date(backendInspection.created_at),
        status: 'active',
        items: {},
      };
      saveInspection(inspection);
      return inspection;
    } catch (error) {
      console.error('Failed to create inspection on backend:', error);
      const localInspection: Inspection = {
        id: Crypto.randomUUID(),
        name,
        location,
        createdAt: new Date(),
        status: 'active',
        items: {},
      };
      saveInspection(localInspection);
      return localInspection;
    }
  }, [saveInspection]);

  const setCurrentInspection = useCallback(async (inspection: Inspection | null) => {
    try {
      if (inspection) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_INSPECTION, inspection.id);
        setCurrentInspectionId(inspection.id);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_INSPECTION);
        setCurrentInspectionId(null);
      }
    } catch (error) {
      console.error('Failed to set current inspection:', error);
      throw error;
    }
  }, []);

  const addInspectionItem = useCallback((item: InspectionItem) => {
    if (!currentInspectionId) {
      throw new Error('No current inspection set');
    }

    setInspections(prev => {
      const inspection = prev.find(i => i.id === currentInspectionId);
      if (!inspection) {
        throw new Error('Current inspection not found');
      }

      const updated = prev.map(i => {
        if (i.id === currentInspectionId) {
          return {
            ...i,
            items: {
              ...i.items,
              [item.id]: item
            }
          };
        }
        return i;
      });
      
      debouncedSaveToStorage(updated);
      return updated;
    });
  }, [currentInspectionId, debouncedSaveToStorage]);

  const updateInspectionItem = useCallback((itemId: string, updates: Partial<InspectionItem>) => {
    if (!currentInspectionId) {
      throw new Error('No current inspection set');
    }

    setInspections(prev => {
      const inspection = prev.find(i => i.id === currentInspectionId);
      if (!inspection || !inspection.items[itemId]) {
        console.error(`Item ${itemId} not found in inspection ${currentInspectionId}`);
        return prev;
      }

      const updated = prev.map(i => {
        if (i.id === currentInspectionId) {
          return {
            ...i,
            items: {
              ...i.items,
              [itemId]: { ...i.items[itemId], ...updates }
            }
          };
        }
        return i;
      });
      
      debouncedSaveToStorage(updated);
      return updated;
    });
  }, [currentInspectionId, debouncedSaveToStorage]);

  const deleteInspectionItem = useCallback((itemId: string) => {
    if (!currentInspectionId) {
      throw new Error('No current inspection set');
    }

    setInspections(prev => {
      const updated = prev.map(i => {
        if (i.id === currentInspectionId) {
          const { [itemId]: _, ...remainingItems } = i.items;
          return {
            ...i,
            items: remainingItems
          };
        }
        return i;
      });
      
      debouncedSaveToStorage(updated);
      return updated;
    });
  }, [currentInspectionId, debouncedSaveToStorage]);

  const deleteInspection = useCallback(async (inspectionId: string) => {
    try {
      // Try to delete from backend first
      await apiClient.deleteInspection(inspectionId);
    } catch (error) {
      console.error('Failed to delete inspection from backend:', error);
      // Continue with local deletion even if backend fails
    }

    // Remove from local state
    // @SAM WE ALSO NEED TO DELETE ASSOCIATED AUDIO / PHOTOS  
    setInspections(prev => {
      const updated = prev.filter(i => i.id !== inspectionId);
      debouncedSaveToStorage(updated);
      return updated;
    });

    // Clear current inspection if it's the one being deleted
    if (currentInspectionId === inspectionId) {
      await setCurrentInspection(null);
    }
  }, [currentInspectionId, setCurrentInspection, debouncedSaveToStorage]);

  const value: InspectionContextType = {
    currentInspection,
    inspections,
    createInspection,
    setCurrentInspection,
    addInspectionItem,
    updateInspectionItem,
    deleteInspectionItem,
    deleteInspection,
  };

  return (
    <InspectionContext.Provider value={value}>
      {children}
    </InspectionContext.Provider>
  );
}