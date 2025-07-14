import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { InspectionItem } from '@/types';

interface TagEditorProps {
  selectedPhoto: InspectionItem;
  colors: {
    text: string;
    secondaryText: string;
    headerBackground: string;
    border: string;
  };
  editingTags: boolean;
  showCustomInput: boolean;
  onUpdateTags: (itemId: string, updates: any) => void;
  setEditingTags: (editing: boolean) => void;
  setShowCustomInput: (show: boolean) => void;
}

// Common suggested tags
const suggestedTags = ['Window', 'Door', 'Wall', 'Ceiling', 'Floor', 'Electrical', 'Plumbing', 'HVAC', 'Exterior', 'Interior'];

export default function TagEditor({
  selectedPhoto,
  colors,
  editingTags,
  showCustomInput,
  onUpdateTags,
  setEditingTags,
  setShowCustomInput,
}: TagEditorProps) {
  const [customTag, setCustomTag] = useState('');

  const getCurrentTags = (): string[] => {
    // Get fresh data from props instead of stale selectedPhoto
    return selectedPhoto?.tags || [];
  };

  const addTag = (tag: string) => {
    if (!selectedPhoto || !tag.trim()) return;
    
    const currentTags = getCurrentTags();
    if (currentTags.includes(tag)) return; // Don't add duplicates
    
    const newTags = [...currentTags, tag.trim()];
    onUpdateTags(selectedPhoto.id, {
      tags: newTags,
      processingStatus: 'pending',
      lastProcessingAttempt: new Date(),
    });
  };

  const removeTag = (tagToRemove: string) => {
    if (!selectedPhoto) return;
    
    const currentTags = getCurrentTags();
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    onUpdateTags(selectedPhoto.id, {
      tags: newTags,
      processingStatus: 'pending',
      lastProcessingAttempt: new Date(),
    });
  };

  const handleAddCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim());
      setCustomTag('');
      setShowCustomInput(false);
    }
  };

  const toggleTagEditing = () => {
    setEditingTags(!editingTags);
    setShowCustomInput(false);
    setCustomTag('');
  };

  return (
    <View style={styles.tagsSection}>
      <View style={styles.tagsHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags:</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={toggleTagEditing}
        >
          <Text style={styles.editButtonText}>{editingTags ? 'Done' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Current Tags */}
      <View style={styles.chipsContainer}>
        {getCurrentTags().map((tag, index) => (
          <View key={index} style={styles.chip}>
            <Text style={styles.chipText}>{tag}</Text>
            {editingTags && (
              <TouchableOpacity 
                style={styles.chipRemove}
                onPress={() => removeTag(tag)}
              >
                <Text style={styles.chipRemoveText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {getCurrentTags().length === 0 && (
          <Text style={[styles.noTagsText, { color: colors.secondaryText }]}>No tags</Text>
        )}
      </View>

      {/* Suggested Tags (when editing) */}
      {editingTags && (
        <View style={styles.suggestedSection}>
          <Text style={[styles.suggestedTitle, { color: colors.secondaryText }]}>Suggested:</Text>
          <View style={styles.chipsContainer}>
            {suggestedTags
              .filter(tag => !getCurrentTags().includes(tag))
              .slice(0, 6)
              .map((tag, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.suggestedChip}
                onPress={() => addTag(tag)}
              >
                <Text style={styles.suggestedChipText}>+ {tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Custom Tag Input */}
          {showCustomInput ? (
            <View style={styles.customInputRow}>
              <TextInput
                style={[styles.customInput, { 
                  backgroundColor: colors.headerBackground, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={customTag}
                onChangeText={setCustomTag}
                placeholder="Custom tag"
                placeholderTextColor={colors.secondaryText}
                autoFocus
                onSubmitEditing={handleAddCustomTag}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={handleAddCustomTag} style={styles.addCustomButton}>
                <Text style={styles.addCustomButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addCustomChip}
              onPress={() => setShowCustomInput(true)}
            >
              <Text style={styles.addCustomChipText}>+ Custom</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tagsSection: {
    marginBottom: 12,
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  chipText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  chipRemove: {
    marginLeft: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noTagsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  suggestedSection: {
    marginTop: 8,
  },
  suggestedTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  suggestedChip: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  suggestedChipText: {
    fontSize: 12,
    color: '#666',
  },
  addCustomChip: {
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  addCustomChipText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: '#fff',
  },
  addCustomButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addCustomButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});