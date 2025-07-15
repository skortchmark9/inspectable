import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Inspection } from '@/types';
import { AssignedCategory } from '@/types/checklist';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';
import PDFGenerationModal from './PDFGenerationModal';
import PDFProgressModal from './PDFProgressModal';

interface PDFGenerationButtonProps {
  inspection: Inspection | null;
  categories: AssignedCategory[];
  colors: {
    background: string;
    text: string;
    secondaryText: string;
    border: string;
  };
}

export default function PDFGenerationButton({
  inspection,
  categories,
  colors
}: PDFGenerationButtonProps) {
  const {
    showConfirmModal,
    isGenerating,
    progress,
    openConfirmModal,
    closeConfirmModal,
    generatePDF,
  } = usePDFGeneration(inspection, categories);

  if (!inspection) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.button, isGenerating && styles.buttonDisabled]}
        onPress={openConfirmModal}
        disabled={isGenerating}
      >
        <Text style={styles.buttonText}>
          Create Report
        </Text>
      </TouchableOpacity>

      <PDFGenerationModal
        visible={showConfirmModal}
        inspection={inspection}
        categories={categories}
        onConfirm={generatePDF}
        onCancel={closeConfirmModal}
        colors={colors}
      />

      <PDFProgressModal
        visible={isGenerating}
        progress={progress}
        colors={colors}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});