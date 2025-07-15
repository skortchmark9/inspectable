import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Inspection } from '@/types';
import { AssignedCategory } from '@/types/checklist';

interface PDFGenerationModalProps {
  visible: boolean;
  inspection: Inspection | null;
  categories: AssignedCategory[];
  onConfirm: () => void;
  onCancel: () => void;
  colors: {
    background: string;
    text: string;
    secondaryText: string;
    border: string;
  };
}

export default function PDFGenerationModal({
  visible,
  inspection,
  categories,
  onConfirm,
  onCancel,
  colors
}: PDFGenerationModalProps) {
  const insets = useSafeAreaInsets();

  if (!inspection) return null;

  const totalPhotos = categories.reduce((sum, cat) => sum + cat.assignedItems.length, 0);
  const categoriesWithPhotos = categories.filter(cat => cat.assignedItems.length > 0);
  const completedRequirements = categories.reduce((sum, cat) => {
    if (!cat.completion) return sum;
    return sum + cat.completion.fulfilled.filter(item => item.required).length;
  }, 0);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modalContent, 
          { backgroundColor: colors.background, borderColor: colors.border }
        ]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Generate PDF Report
          </Text>
          
          <Text style={[styles.inspectionName, { color: colors.text }]}>
            {inspection.name}
          </Text>
          
          <View style={styles.summaryContainer}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Report will include:
            </Text>
            
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>
                Total Photos:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {totalPhotos}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>
                Categories:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {categoriesWithPhotos.length}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>
                Completed Requirements:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {completedRequirements}
              </Text>
            </View>
          </View>

          <View style={[styles.warningContainer, { borderColor: colors.border }]}>
            <Text style={[styles.warningText, { color: colors.secondaryText }]}>
              ⚠️ PDF generation may take 30-60 seconds with {totalPhotos} photos
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>
                Generate PDF
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  inspectionName: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningContainer: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});