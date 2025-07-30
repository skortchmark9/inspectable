import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useInspection } from '@/contexts/InspectionContext';
import { useLocation } from '@/hooks/useLocation';
import { Inspection } from '@/types';

export default function HomeScreen() {
  const { currentInspection, inspections, createInspection, setCurrentInspection, deleteInspection } = useInspection();
  const location = useLocation();
  const [isCreating, setIsCreating] = useState(false);

  const handleNewInspection = async () => {
    setIsCreating(true);
    try {
      console.log('🆕 Creating new inspection...');
      
      // Get current location
      const currentLocation = location.location;
      let address = 'Unknown Location';
      
      if (currentLocation?.coords) {
        // Try to get actual address from coordinates
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
          
          if (reverseGeocode && reverseGeocode.length > 0) {
            const addr = reverseGeocode[0];
            // Build a proper address string from the components (street only)
            const addressParts = [];
            if (addr.streetNumber) addressParts.push(addr.streetNumber);
            if (addr.street) addressParts.push(addr.street);
            if (!addressParts.length && addr.name) addressParts.push(addr.name);
            
            address = addressParts.join(' ') || addr.formattedAddress || 'Unknown Location';
          }
        } catch (geocodeError) {
          console.warn('Failed to reverse geocode:', geocodeError);
          // Fall back to coordinate string if reverse geocoding fails
          address = `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`;
        }
      }
      
      const inspectionLocation = currentLocation?.coords 
        ? { 
            latitude: currentLocation.coords.latitude, 
            longitude: currentLocation.coords.longitude,
            address
          }
        : { 
            latitude: 37.7749, 
            longitude: -122.4194, // Default to SF if no location available
            address: 'San Francisco, CA' 
          };

      // Generate inspection name: "Dec 15, 2024 - Location"
      const date = new Date();
      const inspectionName = `${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })} - ${inspectionLocation.address}`;
      
      const inspection = await createInspection(inspectionName, inspectionLocation);
      console.log('✅ New inspection created:', inspection);
      
      // Set as current inspection
      await setCurrentInspection(inspection);
      
      // Navigate to inspect tab
      router.push('/(tabs)/inspect');
    } catch (error: any) {
      console.error('❌ Failed to create inspection:', error);
      Alert.alert(
        'Error',
        `Failed to create new inspection: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleResumeInspection = async (inspection: Inspection) => {
    try {
      console.log('🔄 Resuming inspection:', inspection.id);
      await setCurrentInspection(inspection);
      
      // Navigate to inspect tab
      router.push('/(tabs)/inspect');
    } catch (error: any) {
      console.error('❌ Failed to resume inspection:', error);
      Alert.alert(
        'Error',
        `Failed to resume inspection: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeleteInspection = (inspection: Inspection) => {
    Alert.alert(
      'Delete Inspection',
      `Are you sure you want to delete "${inspection.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInspection(inspection.id);
            } catch (error: any) {
              console.error('❌ Failed to delete inspection:', error);
              Alert.alert(
                'Error',
                `Failed to delete inspection: ${error.message}`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Unknown date';
    }
  };

  const renderInspectionItem = ({ item }: { item: Inspection }) => {
    const isCurrentInspection = currentInspection?.id === item.id;
    
    return (
      <View style={[
        styles.inspectionCard,
        isCurrentInspection && styles.currentInspectionCard
      ]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {item.status === 'active' ? 'In Progress' : 'Completed'}
          </Text>
          {isCurrentInspection && (
            <Text style={styles.currentTag}>CURRENT</Text>
          )}
        </View>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.cardItems}>
          {Object.keys(item.items || {}).length} items captured
        </Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.primaryButton,
              isCurrentInspection ? styles.continueButton : styles.resumeButton
            ]}
            onPress={() => handleResumeInspection(item)}
          >
            <Text style={styles.buttonText}>
              {isCurrentInspection ? 'Continue' : 
               item.status === 'active' ? 'Resume' : 'View'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleDeleteInspection(item)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Inspections</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.newButton]}
          onPress={handleNewInspection}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>New Inspection</Text>
          )}
        </TouchableOpacity>

        {inspections.length > 0 ? (
          <FlatList
            data={inspections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
            renderItem={renderInspectionItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No inspections yet. Create your first inspection above.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  list: {
    flex: 1,
    marginTop: 16,
  },
  inspectionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  currentInspectionCard: {
    borderColor: '#34C759',
    borderWidth: 2,
    backgroundColor: '#1e2a1e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  currentTag: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDate: {
    color: '#999',
    fontSize: 14,
    marginBottom: 4,
  },
  cardItems: {
    color: '#999',
    fontSize: 14,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
  },
  resumeButton: {
    backgroundColor: '#007AFF',
  },
  continueButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
  },
  newButton: {
    backgroundColor: '#34C759',
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});