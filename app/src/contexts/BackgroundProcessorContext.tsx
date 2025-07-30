import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { useInspection } from './InspectionContext';
import { apiClient } from '@/services/api';
import { InspectionItem } from '@/types';

interface BackgroundProcessorContextType {
  update: () => void;
  isProcessing: boolean;
  retryUploadSync: () => void;
}

const BackgroundProcessorContext = createContext<BackgroundProcessorContextType | undefined>(undefined);

export function useBackgroundProcessor() {
  const context = useContext(BackgroundProcessorContext);
  if (context === undefined) {
    throw new Error('useBackgroundProcessor must be used within a BackgroundProcessorProvider');
  }
  return context;
}

interface BackgroundProcessorProviderProps {
  children: React.ReactNode;
}

export function BackgroundProcessorProvider({ children }: BackgroundProcessorProviderProps) {
  const { currentInspection, updateInspectionItem } = useInspection();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const processingItemsRef = useRef<Set<string>>(new Set());

  const maxRetries = 3;

  useEffect(() => {
    if (!currentInspection || isProcessing) return;

    const hasPending = Object.values(currentInspection.items).some(
      item => item.processingStatus === 'pending' && !processingItemsRef.current.has(item.id)
    );

    if (hasPending) {
      update();
    }
  }, [currentInspection, isProcessing]);


  const update = useCallback(() => {
    if (!currentInspection || isProcessing) {
      return;
    }

    const itemsArray = Object.values(currentInspection.items);
    const pendingItems = itemsArray.filter(
      item => item.processingStatus === 'pending' && !processingItemsRef.current.has(item.id)
    );

    if (pendingItems.length === 0) {
      return;
    }

    setIsProcessing(true);

    // Mark items as being processed
    pendingItems.forEach(item => processingItemsRef.current.add(item.id));

    // Process items in parallel
    Promise.allSettled(pendingItems.map(item => processItem(item)))
      .finally(() => {
        pendingItems.forEach(item => processingItemsRef.current.delete(item.id));
        setIsProcessing(false);
      });
  }, [currentInspection, isProcessing]);

  const processItem = useCallback(async (item: InspectionItem): Promise<void> => {
    try {
      updateInspectionItem(item.id, {
        processingStatus: 'processing',
        lastProcessingAttempt: new Date(),
      });

      if (item.backendId) {
        // Item already exists on backend - sync updates
        try {
          await apiClient.updateInspectionItem(item.backendId, {
            tags: item.tags || [],
            label: item.label,
            description: item.description,
            ocr_text: item.ocr_text,
          });

          updateInspectionItem(item.id, {
            processingStatus: 'completed',
          });
        } catch (updateError) {
          console.error('Failed to sync item updates:', updateError);
          throw updateError;
        }
      } else {
        // New item - upload to backend
        try {          
          const result = await apiClient.uploadInspectionItem(
            item.inspectionId,
            item.photoUri,
            item.audioUri || null,
            item.label || '',
            item.location,
            '',
            item.exifData
          );

          updateInspectionItem(item.id, {
            processingStatus: 'completed',
            suggestedLabel: result.suggested_label || item.label || '',
            audioTranscription: result.audio_transcription || '',
            backendId: result.id,
            tags: result.tags || [],
            description: result.description || '',
            ocr_text: result.ocr_text || '',
          });

        } catch (uploadError) {
          console.error('Failed to upload item to backend:', uploadError);
          throw uploadError; // Let the outer catch handle retry logic
        }
      }

    } catch (error) {
      console.error(`Failed to process item ${item.id}:`, error);
      handleRetry(item);
    }
  }, [updateInspectionItem]);

  const handleRetry = useCallback((item: InspectionItem): void => {
    const newRetryCount = (item.retryCount || 0) + 1;
    
    if (newRetryCount >= maxRetries) {
      updateInspectionItem(item.id, {
        processingStatus: 'failed',
        retryCount: newRetryCount,
        lastProcessingAttempt: new Date(),
      });
      console.log(`Item ${item.id} failed after ${maxRetries} retries`);
    } else {
      updateInspectionItem(item.id, {
        processingStatus: 'pending',
        retryCount: newRetryCount,
        lastProcessingAttempt: new Date(),
      });
      console.log(`Item ${item.id} will retry (attempt ${newRetryCount}/${maxRetries})`);
    }
  }, [updateInspectionItem]);

  const retryUploadSync = useCallback(() => {
    if (!currentInspection) return;

    const itemsArray = Object.values(currentInspection.items);
    const retryableItems = itemsArray.filter(
      item => (item.processingStatus === 'failed' || item.processingStatus === 'pending') && 
              !processingItemsRef.current.has(item.id)
    );

    if (retryableItems.length === 0) {
      console.log('No items to retry');
      return;
    }

    console.log(`Manually retrying ${retryableItems.length} items`);
    
    // Reset retry count for failed items
    retryableItems.forEach(item => {
      if (item.processingStatus === 'failed') {
        updateInspectionItem(item.id, {
          processingStatus: 'pending',
          retryCount: 0,
          lastProcessingAttempt: new Date(),
        });
      }
    });

    // Trigger update to process the items
    update();
  }, [currentInspection, updateInspectionItem, update]);

  const value: BackgroundProcessorContextType = {
    update,
    isProcessing,
    retryUploadSync,
  };

  return (
    <BackgroundProcessorContext.Provider value={value}>
      {children}
    </BackgroundProcessorContext.Provider>
  );
}