import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';

interface PDFProgressModalProps {
  visible: boolean;
  progress: string;
  colors: {
    background: string;
    text: string;
    secondaryText: string;
  };
}

export default function PDFProgressModal({ 
  visible, 
  progress,
  colors 
}: PDFProgressModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Generating PDF Report
          </Text>
          <Text style={[styles.message, { color: colors.secondaryText }]}>
            {progress}
          </Text>
          <View style={styles.spinner}>
            <Text style={styles.spinnerText}>⏳</Text>
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
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    maxWidth: 300,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  spinner: {
    alignItems: 'center',
  },
  spinnerText: {
    fontSize: 24,
  },
});