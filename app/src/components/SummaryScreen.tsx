import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { InspectionItem } from '../types';
import { DEFAULT_CHECKLIST } from '../constants/Config';
import { ChecklistItem } from './ChecklistItem';
import { authManager } from '../services/api';

interface SummaryScreenProps {
  inspectionItems: InspectionItem[];
  onComplete: () => void;
  onBack: () => void;
  onSignOut?: () => void;
  onDebugBackend?: () => void;
}

export function SummaryScreen({ inspectionItems, onComplete, onBack, onSignOut, onDebugBackend }: SummaryScreenProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const completedChecklistItems = new Set(
    inspectionItems.map(item => 
      item.label.toLowerCase()
    )
  );

  const checklistCompletion = DEFAULT_CHECKLIST.map(item => ({
    ...item,
    isCompleted: completedChecklistItems.has(item.name.toLowerCase()),
  }));

  const requiredIncomplete = checklistCompletion.filter(
    item => item.required && !item.isCompleted
  );

  const renderInspectionItem = (item: InspectionItem) => {
    const isExpanded = expandedItems.has(item.id);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.inspectionItem}
        onPress={() => toggleExpanded(item.id)}
      >
        <Image source={{ uri: item.photoUri }} style={styles.thumbnail} />
        <View style={styles.itemContent}>
          <Text style={styles.itemLabel}>{item.label}</Text>
          <Text style={styles.itemTimestamp}>
            {item.timestamp.toLocaleTimeString()}
          </Text>
          {isExpanded && item.audioTranscription && (
            <Text style={styles.transcription}>{item.audioTranscription}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Inspection Summary</Text>
        <View style={{ width: 60 }} />
      </View>

      {requiredIncomplete.length > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ {requiredIncomplete.length} required items missing
          </Text>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Captured Items ({inspectionItems.length})
          </Text>
          {inspectionItems.map(renderInspectionItem)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Checklist</Text>
          {checklistCompletion.map(item => (
            <ChecklistItem
              key={item.id}
              item={item}
              isCompleted={item.isCompleted}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
          <Text style={styles.completeButtonText}>Complete Inspection</Text>
        </TouchableOpacity>
        {onSignOut && (
          <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        )}
        {onDebugBackend && (
          <TouchableOpacity style={styles.debugButton} onPress={onDebugBackend}>
            <Text style={styles.debugButtonText}>🐛 Debug Backend</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
    marginBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAA7',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  inspectionItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemTimestamp: {
    fontSize: 14,
    color: '#666',
  },
  transcription: {
    fontSize: 14,
    color: '#444',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  completeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});