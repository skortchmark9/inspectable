import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, Dimensions, ScrollView, TextInput, Alert, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedGestureHandler, withSpring, runOnJS } from 'react-native-reanimated';
import { useInspection } from '@/contexts/InspectionContext';
import { InspectionItem } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = 80;
const ITEM_HEIGHT = Math.round(ITEM_WIDTH * (4/3)); // 4:3 aspect ratio for phone photos
const ITEMS_PER_ROW = 5;
const MIN_DRAWER_HEIGHT = 180;
const MAX_DRAWER_HEIGHT = height * 0.7;

interface Category {
  id: string;
  title: string;
  items: InspectionItem[];
  maxItems: number;
}

export default function ReviewScreen() {
  const { currentInspection, updateInspectionItem, deleteInspectionItem } = useInspection();
  const [selectedPhoto, setSelectedPhoto] = useState<InspectionItem | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [tempTags, setTempTags] = useState('');
  const insets = useSafeAreaInsets();
  
  const drawerHeight = useSharedValue(240);
  const startHeight = useSharedValue(240);

  const categorizeItems = (items: InspectionItem[]): Category[] => {
    const homeExteriorKeywords = ['furnace', 'exterior', 'siding', 'roof', 'foundation'];
    const fuelSwitchingKeywords = ['dryer', 'gas', 'electric', 'switch', 'fuel'];
    
    const homeExterior: InspectionItem[] = [];
    const fuelSwitching: InspectionItem[] = [];
    const supplemental: InspectionItem[] = [];
    
    items.forEach(item => {
      const label = (item.label || item.suggestedLabel || '').toLowerCase();
      const tags = (item.tags || []).map(tag => tag.toLowerCase()).join(' ');
      const searchText = `${label} ${tags}`.trim();
      
      if (homeExteriorKeywords.some(keyword => searchText.includes(keyword))) {
        homeExterior.push(item);
      } else if (fuelSwitchingKeywords.some(keyword => searchText.includes(keyword))) {
        fuelSwitching.push(item);
      } else {
        supplemental.push(item);
      }
    });
    
    return [
      { id: 'home-exterior', title: 'Home Exterior', items: homeExterior, maxItems: 10 },
      { id: 'fuel-switching', title: 'Fuel Switching - Missing Dryer Label', items: fuelSwitching, maxItems: 10 },
      { id: 'supplemental', title: 'Supplemental', items: supplemental, maxItems: 10 },
    ];
  };

  if (!currentInspection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Inspection Selected</Text>
          <Text style={styles.emptySubtitle}>Go to Home to create or select an inspection</Text>
        </View>
      </SafeAreaView>
    );
  }

  const items = Object.values(currentInspection.items || {});
  const categories = categorizeItems(items);

  const handlePhotoPress = (photo: InspectionItem) => {
    setSelectedPhoto(photo);
    setEditingTags(false);
    setTempTags('');
    // Reset drawer height when selecting a photo
    drawerHeight.value = withSpring(240, { damping: 20, stiffness: 100 });
  };

  const closeDrawer = () => {
    setSelectedPhoto(null);
    setEditingTags(false);
    setTempTags('');
  };

  const handleDeletePhoto = () => {
    if (!selectedPhoto || !currentInspection) return;
    
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteInspectionItem?.(selectedPhoto.id);
            closeDrawer();
          }
        }
      ]
    );
  };

  const handleEditTags = () => {
    if (!selectedPhoto) return;
    
    if (editingTags) {
      // Save tags - offline-first approach
      console.log('🏷️ Saving tags...');
      console.log('tempTags:', tempTags);
      const tags = tempTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      console.log('parsed tags:', tags);
      console.log('selectedPhoto.backendId:', selectedPhoto.backendId);
      
      updateInspectionItem?.(selectedPhoto.id, {
        tags: tags,
        processingStatus: 'pending', // Mark for background sync
        lastProcessingAttempt: new Date(),
      });
      
      console.log('✅ Tags updated locally');
      setEditingTags(false);
      setTempTags('');
    } else {
      // Start editing
      const currentTags = (selectedPhoto as any).tags || [];
      console.log('📝 Starting to edit tags:', currentTags);
      setTempTags(currentTags.join(', '));
      setEditingTags(true);
    }
  };

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      startHeight.value = drawerHeight.value;
    },
    onActive: (event) => {
      // Don't allow dragging when editing tags
      if (editingTags) return;
      
      const newHeight = startHeight.value - event.translationY;
      drawerHeight.value = Math.max(MIN_DRAWER_HEIGHT, Math.min(MAX_DRAWER_HEIGHT, newHeight));
    },
    onEnd: (event) => {
      // Don't allow closing when editing tags
      if (editingTags) return;
      
      const finalHeight = startHeight.value - event.translationY;
      
      // If dragged down significantly or at minimum height, close the drawer
      if (event.translationY > 100 || finalHeight <= MIN_DRAWER_HEIGHT + 20) {
        drawerHeight.value = withSpring(0, { damping: 20, stiffness: 100 });
        runOnJS(closeDrawer)();
      } else {
        drawerHeight.value = withSpring(drawerHeight.value, { damping: 20, stiffness: 100 });
      }
    },
  });

  const animatedDrawerStyle = useAnimatedStyle(() => {
    return {
      height: drawerHeight.value,
    };
  });

  const renderCategoryItem = (item: InspectionItem | null, index: number, category: Category) => {
    if (!item) {
      return (
        <View key={`empty-${category.id}-${index}`} style={styles.emptySlot}>
          <Text style={styles.emptySlotText}>+</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        key={item.id}
        style={[
          styles.categoryItem,
          selectedPhoto?.id === item.id && styles.selectedItem
        ]}
        onPress={() => handlePhotoPress(item)}
      >
        <Image 
          source={{ uri: item.photoUri }} 
          style={styles.categoryItemImage}
          resizeMode="cover"
        />
        {item.processingStatus === 'pending' && (
          <View style={styles.processingBadge}>
            <Text style={styles.processingText}>⏳</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCategoryHorizontalItem = ({ item, index }: { item: InspectionItem | null; index: number }, category: Category) => {
    return renderCategoryItem(item, index, category);
  };

  const renderCategory = (category: Category) => {
    const slots = Array.from({ length: category.maxItems }, (_, index) => 
      category.items[index] || null
    );

    return (
      <View key={category.id} style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{category.title}</Text>
        <FlatList
          data={slots}
          renderItem={({ item, index }) => renderCategoryHorizontalItem({ item, index }, category)}
          keyExtractor={(item, index) => item?.id || `empty-${category.id}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryItems}
        />
      </View>
    );
  };


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Review / Adjustments</Text>
          <Text style={styles.inspectionName}>{currentInspection.name}</Text>
        </View>

        <View style={styles.contentContainer}>
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
          >
            {categories.map(renderCategory)}
            
            <TouchableOpacity style={styles.createReportButton}>
              <Text style={styles.createReportText}>Create Report</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Bottom Drawer for Photo Details */}
          {selectedPhoto && (
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
              style={{ flex: 0 }}
            >
              <Animated.View style={[styles.drawerContainer, animatedDrawerStyle]}>
                <PanGestureHandler onGestureEvent={panGestureHandler}>
                  <Animated.View style={styles.dragHandle}>
                    <View style={styles.handleBar} />
                  </Animated.View>
                </PanGestureHandler>
                
                <View style={styles.drawerContent}>
                <View style={styles.drawerPhoto}>
                  <Image 
                    source={{ uri: selectedPhoto.photoUri }} 
                    style={styles.drawerImage}
                    resizeMode="cover"
                  />
                </View>
                
                <View style={styles.drawerDetails}>
                  <View style={styles.tagsSection}>
                    <Text style={styles.sectionTitle}>Tags:</Text>
                    {editingTags ? (
                      <TextInput
                        style={styles.tagInput}
                        value={tempTags}
                        onChangeText={setTempTags}
                        placeholder="window, exterior, wall"
                        autoFocus
                        onSubmitEditing={handleEditTags}
                        onBlur={handleEditTags}
                        returnKeyType="done"
                      />
                    ) : (
                      <View style={styles.tagsRow}>
                        <Text style={styles.tagsText}>
                          {(selectedPhoto as any).tags?.join(', ') || selectedPhoto.label || 'No tags'}
                        </Text>
                        <TouchableOpacity 
                          style={styles.addButton}
                          onPress={handleEditTags}
                        >
                          <Text style={styles.addButtonText}>⊕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  {selectedPhoto.audioTranscription && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Audio Transcript:</Text>
                      <Text style={styles.sectionText} numberOfLines={2}>
                        {selectedPhoto.audioTranscription}
                      </Text>
                    </View>
                  )}
                  
                  {selectedPhoto.description && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Full Description:</Text>
                      <Text style={styles.sectionText} numberOfLines={2}>
                        {selectedPhoto.description}
                      </Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={handleDeletePhoto}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
            </KeyboardAvoidingView>
          )}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  inspectionName: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  categoryContainer: {
    marginBottom: 30,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryItems: {
    paddingLeft: 20,
    gap: 10,
  },
  categoryItem: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
    marginRight: 10,
  },
  selectedItem: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  categoryItemImage: {
    width: '100%',
    height: '100%',
  },
  emptySlot: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d0d0d0',
    borderStyle: 'dashed',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  emptySlotText: {
    fontSize: 24,
    color: '#999',
    fontWeight: '300',
  },
  createReportButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  createReportText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  processingBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 10,
  },
  // Drawer Styles
  drawerContainer: {
    backgroundColor: 'transparent',
  },
  dragHandle: {
    height: 40,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderBottomWidth: 0,
    paddingVertical: 10,
  },
  handleBar: {
    width: 60,
    height: 6,
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  drawerContent: {
    backgroundColor: 'white',
    padding: 20,
    flex: 1,
    flexDirection: 'row',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#007AFF',
  },
  drawerPhoto: {
    width: 120,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginRight: 16,
  },
  drawerImage: {
    width: '100%',
    height: '100%',
  },
  drawerDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  tagsSection: {
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagsText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  tagInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#ff3333',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});