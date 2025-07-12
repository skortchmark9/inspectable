import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';

interface LastInspection {
  id: string;
  property_address: string;
  created_at: string;
  itemCount?: number;
}

interface InspectionSelectScreenProps {
  onInspectionSelected: (inspectionId: string) => void;
}

export default function InspectionSelectScreen({ onInspectionSelected }: InspectionSelectScreenProps) {
  const [lastInspection, setLastInspection] = useState<LastInspection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLast, setIsLoadingLast] = useState(true);
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(true);

  useEffect(() => {
    loadLastInspection();
    loadInspectionsFromServer();
  }, []);

  const loadLastInspection = async () => {
    try {
      const lastInspectionData = await AsyncStorage.getItem('lastInspection');
      if (lastInspectionData) {
        const inspection = JSON.parse(lastInspectionData);
        setLastInspection(inspection);
        console.log('📋 Found last inspection in storage:', inspection);
      } else {
        console.log('📋 No previous inspection found in storage');
      }
    } catch (error) {
      console.error('Error loading last inspection:', error);
    } finally {
      setIsLoadingLast(false);
    }
  };

  const loadInspectionsFromServer = async () => {
    try {
      console.log('🌐 Fetching inspections from server...');
      setIsLoadingFromServer(true);
      const inspections = await apiClient.getInspections();
      console.log('📋 Server inspections:', inspections);
      
      if (inspections && inspections.length > 0) {
        // Get the most recent inspection
        const mostRecent = inspections[0]; // Already sorted by created_at desc
        
        try {
          // Get detailed inspection info including items
          console.log('📊 Fetching details for inspection:', mostRecent.id);
          const detailedInspection = await apiClient.getInspection(mostRecent.id);
          
          const lastInspectionData = {
            id: mostRecent.id,
            property_address: mostRecent.property_address,
            created_at: mostRecent.created_at,
            itemCount: detailedInspection.items ? detailedInspection.items.length : 0,
          };
          
          setLastInspection(lastInspectionData);
          await AsyncStorage.setItem('lastInspection', JSON.stringify(lastInspectionData));
          console.log('✅ Updated last inspection from server with item count:', lastInspectionData.itemCount);
        } catch (detailError) {
          console.error('❌ Failed to get inspection details, using basic info:', detailError);
          
          // Fallback to basic info without item count
          const lastInspectionData = {
            id: mostRecent.id,
            property_address: mostRecent.property_address,
            created_at: mostRecent.created_at,
            itemCount: 0,
          };
          
          setLastInspection(lastInspectionData);
          await AsyncStorage.setItem('lastInspection', JSON.stringify(lastInspectionData));
        }
      } else {
        console.log('📋 No inspections found on server');
      }
    } catch (error) {
      console.error('❌ Failed to load inspections from server:', error);
      // Don't show error to user - local storage fallback is fine
    } finally {
      setIsLoadingFromServer(false);
    }
  };

  const handleNewInspection = async () => {
    setIsLoading(true);
    try {
      console.log('🆕 Creating new inspection...');
      const inspection = await apiClient.createInspection('Property Address');
      console.log('✅ New inspection created:', inspection);
      
      // Save as last inspection
      const lastInspectionData = {
        id: inspection.id,
        property_address: inspection.property_address,
        created_at: inspection.created_at,
        itemCount: 0,
      };
      await AsyncStorage.setItem('lastInspection', JSON.stringify(lastInspectionData));
      
      onInspectionSelected(inspection.id);
    } catch (error: any) {
      console.error('❌ Failed to create inspection:', error);
      Alert.alert(
        'Error',
        `Failed to create new inspection: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeInspection = async () => {
    if (!lastInspection) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Resuming inspection:', lastInspection.id);
      
      // Verify inspection still exists
      const inspection = await apiClient.getInspection(lastInspection.id);
      console.log('✅ Inspection verified:', inspection);
      
      onInspectionSelected(lastInspection.id);
    } catch (error: any) {
      console.error('❌ Failed to resume inspection:', error);
      
      // Inspection might not exist anymore, offer to create new one
      Alert.alert(
        'Inspection Not Found',
        'The previous inspection could not be found. Would you like to start a new inspection?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'New Inspection', 
            onPress: () => {
              // Clear the invalid last inspection
              AsyncStorage.removeItem('lastInspection');
              setLastInspection(null);
              handleNewInspection();
            }
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Unknown date';
    }
  };

  if (isLoadingLast || isLoadingFromServer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {isLoadingFromServer ? 'Loading inspections...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Home Inspection</Text>
        <Text style={styles.subtitle}>Choose an inspection to continue</Text>

        {lastInspection && (
          <View style={styles.lastInspectionCard}>
            <Text style={styles.cardTitle}>Last Inspection</Text>
            <Text style={styles.cardAddress}>{lastInspection.property_address}</Text>
            <Text style={styles.cardDate}>{formatDate(lastInspection.created_at)}</Text>
            {lastInspection.itemCount !== undefined && (
              <Text style={styles.cardItems}>{lastInspection.itemCount} items captured</Text>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.resumeButton]}
              onPress={handleResumeInspection}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Resume Last Inspection</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.newButton]}
          onPress={handleNewInspection}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start New Inspection</Text>
          )}
        </TouchableOpacity>

        {!lastInspection && (
          <Text style={styles.noInspectionText}>
            No previous inspections found. Start your first inspection above.
          </Text>
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
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
  },
  lastInspectionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardAddress: {
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
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resumeButton: {
    backgroundColor: '#007AFF',
  },
  newButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  noInspectionText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});