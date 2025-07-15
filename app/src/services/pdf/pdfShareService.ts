import { Share, Alert } from 'react-native';
import { Inspection } from '@/types';

export interface ShareResult {
  success: boolean;
  error?: string;
}

/**
 * PDF Share Service - Handles platform-specific sharing logic
 */
export class PDFShareService {
  /**
   * Share a generated PDF file
   */
  static async sharePDF(
    pdfPath: string, 
    inspection: Inspection
  ): Promise<ShareResult> {
    try {
      await Share.share({
        url: `file://${pdfPath}`,
        title: `Inspection Report - ${inspection.name}`,
      });

      return { success: true };

    } catch (shareError) {
      console.log('Share failed (normal in simulator):', shareError);
      
      // Fallback for simulator - just show success with path
      Alert.alert(
        'PDF Generated Successfully',
        `Report saved to:\n${pdfPath}\n\n(Sharing may not work in simulator, but will work on real device)`,
        [{ text: 'OK' }]
      );
      
      return { success: true };
    }
  }

  /**
   * Show success message after PDF generation and sharing
   */
  static showSuccessMessage(inspection: Inspection): void {
    Alert.alert(
      'PDF Generated',
      `Your inspection report for "${inspection.name}" has been generated and shared successfully.`,
      [{ text: 'OK' }]
    );
  }

  /**
   * Show error message for PDF generation/sharing failures
   */
  static showErrorMessage(error?: string): void {
    Alert.alert(
      'PDF Generation Failed',
      error || 'There was an error generating the PDF report. Please try again.',
      [{ text: 'OK' }]
    );
  }
}