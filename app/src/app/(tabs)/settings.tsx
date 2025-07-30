import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useBackgroundProcessor } from '@/contexts/BackgroundProcessorContext';
import { useInspection } from '@/contexts/InspectionContext';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { retryUploadSync, isProcessing } = useBackgroundProcessor();
  const { currentInspection } = useInspection();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleRetrySync = async () => {
    if (!currentInspection) {
      Alert.alert('No Active Inspection', 'Please select an inspection first.');
      return;
    }

    // Count pending/failed items
    const itemsArray = Object.values(currentInspection.items);
    const retryableCount = itemsArray.filter(
      item => item.processingStatus === 'failed' || item.processingStatus === 'pending'
    ).length;

    if (retryableCount === 0) {
      Alert.alert('All Synced', 'All items are already synced to the server.');
      return;
    }

    // Start retry without blocking
    retryUploadSync();
    
    // Show brief feedback and immediately reset button state
    Alert.alert(
      'Retry Started', 
      `Started retrying upload for ${retryableCount} item${retryableCount > 1 ? 's' : ''}. You can continue using the app while uploads happen in the background.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync</Text>
          <TouchableOpacity 
            style={[styles.syncButton, isProcessing && styles.processingButton]} 
            onPress={handleRetrySync}
          >
            {isProcessing ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.syncButtonText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.syncButtonText}>Retry Failed Uploads</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingButton: {
    opacity: 0.8,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});