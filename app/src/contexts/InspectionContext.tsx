import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
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
            name: backendInspection.property_address,
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
            name: backendInspection.property_address,
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
            // Local inspection doesn't exist on backend - sync it
            console.log(`🔄 Local-only inspection ${localInspection.id} needs backend sync`);
            syncLocalInspectionToBackend(localInspection);
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

  const syncLocalInspectionToBackend = useCallback(async (localInspection: Inspection) => {
    try {
      console.log(`🔄 Syncing local inspection ${localInspection.id} to backend...`);
      
      // Create inspection on backend using the address from location
      const backendInspection = await apiClient.createInspection(
        localInspection.location?.address || 'Local Inspection'
      );
      
      console.log(`✅ Created backend inspection ${backendInspection.id} for local ${localInspection.id}`);
      
      // Update the local inspection with the backend ID
      setInspections(prev => prev.map(inspection => 
        inspection.id === localInspection.id 
          ? { ...inspection, id: backendInspection.id }
          : inspection
      ));
      
      // Update current inspection ID if this was the active one
      if (currentInspectionId === localInspection.id) {
        setCurrentInspectionId(backendInspection.id);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_INSPECTION, backendInspection.id);
      }
      
    } catch (error) {
      console.error(`❌ Failed to sync local inspection ${localInspection.id} to backend:`, error);
      // Keep the local inspection even if sync fails
    }
  }, [currentInspectionId]);

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

  const getStorageUsage = useCallback(async () => {
    try {
      const documentDir = FileSystem.documentDirectory;
      const cacheDir = FileSystem.cacheDirectory;
      
      console.log('📊 Storage Directories:');
      console.log('📁 Documents:', documentDir);
      console.log('📁 Cache:', cacheDir);

      const directoriesToCheck = [];
      if (documentDir) directoriesToCheck.push({ name: 'Documents', path: documentDir });
      if (cacheDir) directoriesToCheck.push({ name: 'Cache', path: cacheDir });

      // List all files in document directory recursively
      const getAllFiles = async (dir: string, allFiles: string[] = []): Promise<string[]> => {
        try {
          const files = await FileSystem.readDirectoryAsync(dir);
          for (const file of files) {
            const filePath = `${dir}${file}`;
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            
            if (fileInfo.isDirectory) {
              await getAllFiles(`${filePath}/`, allFiles);
            } else {
              allFiles.push(filePath);
            }
          }
        } catch (error) {
          console.error(`Error reading directory ${dir}:`, error);
        }
        return allFiles;
      };

      let allFiles: string[] = [];
      let totalSize = 0;
      let imageCount = 0;
      let audioCount = 0;

      // Check all directories
      for (const directory of directoriesToCheck) {
        console.log(`\n📂 Scanning ${directory.name} directory...`);
        const dirFiles = await getAllFiles(directory.path);
        allFiles = [...allFiles, ...dirFiles];
        console.log(`📁 Found ${dirFiles.length} files in ${directory.name}`);
      }

      console.log(`\n📁 Found ${allFiles.length} total files across all directories:`);
      
      for (const file of allFiles) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(file);
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
            
            const fileName = file.split('/').pop() || '';
            if (fileName.match(/\.(jpg|jpeg|png|heic|webp|bmp|gif|tiff?)$/i)) {
              imageCount++;
              console.log(`📸 Image: ${fileName} (${(fileInfo.size / 1024 / 1024).toFixed(2)}MB) - ${file}`);
            } else if (fileName.match(/\.(m4a|mp3|wav|aac|caf|amr)$/i)) {
              audioCount++;
              console.log(`🎵 Audio: ${fileName} (${(fileInfo.size / 1024 / 1024).toFixed(2)}MB) - ${file}`);
            } else {
              // Check if it might be an image file without extension (by size - images are usually larger)
              const sizeKB = fileInfo.size / 1024;
              if (sizeKB > 50 && !fileName.includes('.') && !file.includes('RCTAsyncLocalStorage')) {
                console.log(`🖼️ Possible Image (no ext): ${fileName} (${sizeKB.toFixed(2)}KB) - ${file}`);
              } else {
                // Log other files to see what we might be missing
                console.log(`📄 Other: ${fileName} (${sizeKB.toFixed(2)}KB) - ${file}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error getting file info for ${file}:`, error);
        }
      }

      console.log(`\n📊 STORAGE SUMMARY:`);
      console.log(`📱 Total Files: ${allFiles.length}`);
      console.log(`📸 Images: ${imageCount}`);
      console.log(`🎵 Audio: ${audioCount}`);
      console.log(`💾 Total Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`📁 Average per file: ${allFiles.length > 0 ? (totalSize / allFiles.length / 1024).toFixed(2) : 0}KB\n`);

    } catch (error) {
      console.error('❌ Error getting storage usage:', error);
    }
  }, []);

  const cleanupInspectionMediaFiles = useCallback(async (inspection: Inspection) => {
    console.log(`🧹 Cleaning up media files for inspection ${inspection.id}`);
    
    const items = Object.values(inspection.items || {});
    console.log(`📁 Found ${items.length} items to check for media files`);
    
    const cleanupPromises = items.map(async (item) => {
      const filesToDelete = [];
      
      // Add photo file if it exists and is a local file
      if (item.photoUri && item.photoUri.startsWith('file://')) {
        filesToDelete.push(item.photoUri);
      }
      
      // Add audio file if it exists and is a local file
      if (item.audioUri && item.audioUri.startsWith('file://')) {
        filesToDelete.push(item.audioUri);
      }
      
      // Delete each file
      for (const fileUri of filesToDelete) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(fileUri);
            console.log(`🗑️ Deleted file: ${fileUri}`);
          }
        } catch (error) {
          console.error(`❌ Failed to delete file ${fileUri}:`, error);
        }
      }
    });
    
    await Promise.all(cleanupPromises);
    console.log(`✅ Completed cleanup for inspection ${inspection.id}`);
  }, []);

  const updateInspection = useCallback(async (inspectionId: string, updates: Partial<Inspection>) => {
    console.log(`🔄 Updating inspection ${inspectionId}:`, updates);
    
    // Update local state immediately
    setInspections(prev => {
      const updated = prev.map(inspection => 
        inspection.id === inspectionId 
          ? { ...inspection, ...updates }
          : inspection
      );
      debouncedSaveToStorage(updated);
      return updated;
    });

    // Try to sync to backend if it's a name change
    if (updates.name) {
      try {
        console.log(`🔄 Syncing name change to backend for inspection ${inspectionId}`);
        await apiClient.updateInspection(inspectionId, {
          property_address: updates.name
        });
        console.log(`✅ Successfully synced name change to backend`);
      } catch (error) {
        console.error(`❌ Failed to sync name change to backend:`, error);
        // Local update already happened, so we don't throw - just warn user
        // Could show a toast/alert here if needed
      }
    }
  }, [debouncedSaveToStorage]);

  const deleteInspection = useCallback(async (inspectionId: string) => {
    // Find the inspection to get its media files before deleting
    const inspectionToDelete = inspections.find(i => i.id === inspectionId);
    
    // Check storage usage BEFORE deletion
    console.log('📊 STORAGE BEFORE DELETION:');
    await getStorageUsage();
    
    try {
      // Try to delete from backend first
      await apiClient.deleteInspection(inspectionId);
    } catch (error) {
      console.error('Failed to delete inspection from backend:', error);
      // Continue with local deletion even if backend fails
    }

    // Clean up associated media files
    if (inspectionToDelete) {
      try {
        await cleanupInspectionMediaFiles(inspectionToDelete);
      } catch (error) {
        console.error('Failed to cleanup media files:', error);
        // Continue with inspection deletion even if file cleanup fails
      }
    }

    // Check storage usage AFTER deletion
    console.log('📊 STORAGE AFTER DELETION:');
    await getStorageUsage();

    // Remove from local state
    setInspections(prev => {
      const updated = prev.filter(i => i.id !== inspectionId);
      debouncedSaveToStorage(updated);
      return updated;
    });

    // Clear current inspection if it's the one being deleted
    if (currentInspectionId === inspectionId) {
      await setCurrentInspection(null);
    }
  }, [inspections, cleanupInspectionMediaFiles, getStorageUsage, currentInspectionId, setCurrentInspection, debouncedSaveToStorage]);

  const value: InspectionContextType = {
    currentInspection,
    inspections,
    createInspection,
    setCurrentInspection,
    addInspectionItem,
    updateInspectionItem,
    updateInspection,
    deleteInspectionItem,
    deleteInspection,
    getStorageUsage,
  };

  return (
    <InspectionContext.Provider value={value}>
      {children}
    </InspectionContext.Provider>
  );
}