import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueueContextType, ProcessingQueue, QueueItem } from '@/types';
import { useInspection } from './InspectionContext';
import { uploadInspectionDataWithOpenAI } from '@/utils/upload';

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export function useQueue() {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
}

interface QueueProviderProps {
  children: React.ReactNode;
}

const QUEUE_STORAGE_KEY = '@processing_queue';

export function QueueProvider({ children }: QueueProviderProps) {
  const { updateInspectionItem, currentInspection } = useInspection();
  const [queue, setQueue] = useState<ProcessingQueue>({
    items: [],
    isProcessing: false,
  });

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    // Auto-process queue when items are added
    if (queue.items.length > 0 && !queue.isProcessing) {
      processQueue();
    }
  }, [queue.items]);

  const loadQueue = async () => {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (queueJson) {
        const savedQueue: ProcessingQueue = JSON.parse(queueJson);
        setQueue(savedQueue);
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const saveQueue = async (newQueue: ProcessingQueue) => {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
      setQueue(newQueue);
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  };

  const addToQueue = (itemId: string, priority: 'high' | 'normal' | 'low' = 'normal') => {
    const queueItem: QueueItem = {
      id: uuidv4(),
      itemId,
      priority,
      addedAt: new Date(),
    };

    const updatedQueue: ProcessingQueue = {
      ...queue,
      items: [...queue.items, queueItem],
    };

    saveQueue(updatedQueue);
  };

  const removeFromQueue = (itemId: string) => {
    const updatedQueue: ProcessingQueue = {
      ...queue,
      items: queue.items.filter(item => item.itemId !== itemId),
    };

    saveQueue(updatedQueue);
  };

  const processQueue = async () => {
    if (queue.isProcessing || queue.items.length === 0) {
      return;
    }

    const processingQueue: ProcessingQueue = {
      ...queue,
      isProcessing: true,
    };
    setQueue(processingQueue);

    // Sort by priority and retry time
    const sortedItems = [...queue.items].sort((a, b) => {
      // First check if items are ready to retry
      const now = new Date();
      const aReady = !a.retryAfter || a.retryAfter <= now;
      const bReady = !b.retryAfter || b.retryAfter <= now;

      if (aReady && !bReady) return -1;
      if (!aReady && bReady) return 1;
      if (!aReady && !bReady) return 0;

      // Then sort by priority
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process items one by one
    const remainingItems = [...sortedItems];
    const now = new Date();

    for (const queueItem of sortedItems) {
      // Skip items that aren't ready for retry
      if (queueItem.retryAfter && queueItem.retryAfter > now) {
        continue;
      }

      try {
        const inspectionItem = currentInspection?.items.find(item => item.id === queueItem.itemId);
        if (!inspectionItem) {
          // Item doesn't exist anymore, remove from queue
          const index = remainingItems.findIndex(item => item.id === queueItem.id);
          if (index > -1) remainingItems.splice(index, 1);
          continue;
        }

        // Update item status to processing
        await updateInspectionItem(queueItem.itemId, {
          processingStatus: 'processing',
          lastProcessingAttempt: new Date(),
        });

        // Process the item
        const result = await uploadInspectionDataWithOpenAI({
          photo: { uri: inspectionItem.photoUri },
          audio: inspectionItem.audioUri ? { uri: inspectionItem.audioUri } : undefined,
        });

        // Update item with results
        await updateInspectionItem(queueItem.itemId, {
          processingStatus: 'completed',
          tags: result.tags,
          description: result.description,
          ocr_text: result.ocr_text,
          audioTranscription: result.audioTranscription,
          suggestedLabel: result.suggestedLabel,
        });

        // Remove successfully processed item from queue
        const index = remainingItems.findIndex(item => item.id === queueItem.id);
        if (index > -1) remainingItems.splice(index, 1);

      } catch (error) {
        console.error('Failed to process queue item:', queueItem.itemId, error);

        // Update item status to failed
        await updateInspectionItem(queueItem.itemId, {
          processingStatus: 'failed',
          lastProcessingAttempt: new Date(),
          retryCount: (inspectionItem?.retryCount || 0) + 1,
        });

        // Add retry delay (exponential backoff)
        const retryCount = (inspectionItem?.retryCount || 0) + 1;
        const baseDelay = 5000; // 5 seconds
        const maxDelay = 300000; // 5 minutes
        const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
        
        const retryAfter = new Date(Date.now() + delay);
        
        // Update queue item with retry time
        const itemIndex = remainingItems.findIndex(item => item.id === queueItem.id);
        if (itemIndex > -1) {
          remainingItems[itemIndex] = { ...queueItem, retryAfter };
        }
      }
    }

    // Update queue with remaining items
    const finalQueue: ProcessingQueue = {
      items: remainingItems,
      isProcessing: false,
      lastProcessedAt: new Date(),
    };

    await saveQueue(finalQueue);
  };

  const value: QueueContextType = {
    queue,
    addToQueue,
    removeFromQueue,
    processQueue,
  };

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
}