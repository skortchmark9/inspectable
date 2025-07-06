import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChecklistItem as ChecklistItemType } from '../types';

interface ChecklistItemProps {
  item: ChecklistItemType;
  isCompleted: boolean;
}

export function ChecklistItem({ item, isCompleted }: ChecklistItemProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}>
        {isCompleted && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.label, isCompleted && styles.labelCompleted]}>
        {item.name}
      </Text>
      {item.required && !isCompleted && (
        <Text style={styles.requiredBadge}>Required</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  labelCompleted: {
    color: '#999',
  },
  requiredBadge: {
    backgroundColor: '#FFE0B2',
    color: '#F57C00',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});