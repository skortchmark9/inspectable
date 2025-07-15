import { useState } from 'react';
import { Inspection } from '@/types';
import { AssignedCategory } from '@/types/checklist';
import { generateInspectionPDF } from '@/utils/pdfGenerator';
import { PDFShareService } from '@/services/pdf/pdfShareService';

export interface PDFGenerationState {
  showConfirmModal: boolean;
  isGenerating: boolean;
  progress: string;
}

export interface PDFGenerationActions {
  openConfirmModal: () => void;
  closeConfirmModal: () => void;
  generatePDF: () => Promise<void>;
}

/**
 * Hook to manage PDF generation state and logic
 */
export function usePDFGeneration(
  inspection: Inspection | null,
  categories: AssignedCategory[]
): PDFGenerationState & PDFGenerationActions {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');

  const openConfirmModal = () => {
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
  };

  const generatePDF = async () => {
    if (!inspection) return;

    setShowConfirmModal(false);
    setIsGenerating(true);
    setProgress('Starting...');

    try {
      const totalPhotos = categories.reduce((sum, cat) => sum + cat.assignedItems.length, 0);
      console.log(`Starting PDF generation with ${totalPhotos} photos`);

      const pdfPath = await generateInspectionPDF(
        inspection,
        categories,
        (message, current, total) => {
          setProgress(message);
        }
      );

      console.log('PDF generated at:', pdfPath);

      // Try to share the generated PDF
      const shareResult = await PDFShareService.sharePDF(pdfPath, inspection);
      
      if (!shareResult.success) {
        PDFShareService.showErrorMessage(shareResult.error);
      }

    } catch (error) {
      console.error('PDF generation error:', error);
      PDFShareService.showErrorMessage(
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  return {
    // State
    showConfirmModal,
    isGenerating,
    progress,
    // Actions
    openConfirmModal,
    closeConfirmModal,
    generatePDF,
  };
}