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
import { useAuth } from '@/contexts/AuthContext';
import { useInspection } from '@/contexts/InspectionContext';
import { useLocation } from '@/hooks/useLocation';
import { Inspection } from '@/types';
import AuthScreen from '@/components/AuthScreen';

export default function HomeScreen() {
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const { currentInspection, inspections, createInspection, setCurrentInspection } = useInspection();
  const location = useLocation();
  const [isCreating, setIsCreating] = useState(false);

  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen 
        onAuthSuccess={() => {
          // Auth success is automatically handled by AuthContext
          // The component will re-render when isAuthenticated becomes true
        }} 
      />
    );
  }

  const handleNewInspection = async () => {
    setIsCreating(true);
    try {
      console.log('🆕 Creating new inspection...');
      
      // Get current location
      const currentLocation = location.location;
      const inspectionLocation = currentLocation 
        ? { 
            latitude: currentLocation.latitude, 
            longitude: currentLocation.longitude,
            address: '4 Main St' // Hardcoded for now as per plan
          }
        : { 
            latitude: 37.7749, 
            longitude: -122.4194, // Default to SF
            address: '4 Main St' 
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
        <Text style={styles.cardItems}>{item.items.length} items captured</Text>
        
        <TouchableOpacity
          style={[
            styles.button, 
            isCurrentInspection ? styles.continueButton : styles.resumeButton
          ]}
          onPress={() => handleResumeInspection(item)}
        >
          <Text style={styles.buttonText}>
            {isCurrentInspection ? 'Continue' : 
             item.status === 'active' ? 'Resume' : 'View'}
          </Text>
        </TouchableOpacity>
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
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeButton: {
    backgroundColor: '#007AFF',
  },
  continueButton: {
    backgroundColor: '#34C759',
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