import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, Dimensions, ScrollView, TextInput, Alert, FlatList, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
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
const DEFAULT_DRAWER_HEIGHT = 400;
const MAX_DRAWER_HEIGHT = height * 0.8;

interface Category {
  id: string;
  title: string;
  items: InspectionItem[];
  maxItems: number;
}

export default function ReviewScreen() {
  const { currentInspection, updateInspectionItem, deleteInspectionItem } = useInspection();
  const [selectedPhoto, setSelectedPhoto] = useState<InspectionItem | null>(null);
  const colorScheme = useColorScheme();
  const [editingTags, setEditingTags] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTag, setCustomTag] = useState('');
  
  // Common suggested tags
  const suggestedTags = ['Window', 'Door', 'Wall', 'Ceiling', 'Floor', 'Electrical', 'Plumbing', 'HVAC', 'Exterior', 'Interior'];
  const insets = useSafeAreaInsets();
  
  // Theme-aware colors
  const isDark = colorScheme === 'dark';
  const colors = {
    background: isDark ? '#000000' : '#f8f9fa',
    headerBackground: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#ffffff' : '#333333',
    secondaryText: isDark ? '#8e8e93' : '#666666',
    border: isDark ? '#38383a' : '#e0e0e0',
  };
  
  const drawerHeight = useSharedValue(DEFAULT_DRAWER_HEIGHT);
  const startHeight = useSharedValue(DEFAULT_DRAWER_HEIGHT);

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
    setShowCustomInput(false);
    setCustomTag('');
    // Reset drawer height when selecting a photo
    drawerHeight.value = withSpring(DEFAULT_DRAWER_HEIGHT, { damping: 20, stiffness: 100 });
  };

  const closeDrawer = () => {
    setSelectedPhoto(null);
    setEditingTags(false);
    setShowCustomInput(false);
    setCustomTag('');
  };

  const handleDeletePhoto = () => {
    if (!selectedPhoto || !currentInspection) return;
    
    Alert.alert(
      'Delete Inspection Item',
      'Are you sure you want to delete this entire inspection item? This will remove the photo, audio, and all associated data.',
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

  const getCurrentTags = (): string[] => {
    if (!selectedPhoto || !currentInspection) return [];
    // Get fresh data from the inspection context instead of stale selectedPhoto
    const freshItem = currentInspection.items[selectedPhoto.id];
    return freshItem?.tags || [];
  };

  const addTag = (tag: string) => {
    if (!selectedPhoto || !tag.trim()) {
      console.log('❌ Cannot add tag - no photo or empty tag:', { selectedPhoto: !!selectedPhoto, tag });
      return;
    }
    
    const currentTags = getCurrentTags();
    if (currentTags.includes(tag)) {
      console.log('❌ Tag already exists:', tag);
      return; // Don't add duplicates
    }
    
    console.log('✅ Adding tag:', tag);
    console.log('Current tags:', currentTags);
    
    const newTags = [...currentTags, tag.trim()];
    console.log('New tags array:', newTags);
    
    updateInspectionItem?.(selectedPhoto.id, {
      tags: newTags,
      processingStatus: 'pending',
      lastProcessingAttempt: new Date(),
    });
  };

  const removeTag = (tagToRemove: string) => {
    if (!selectedPhoto) return;
    
    const currentTags = getCurrentTags();
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    updateInspectionItem?.(selectedPhoto.id, {
      tags: newTags,
      processingStatus: 'pending',
      lastProcessingAttempt: new Date(),
    });
  };

  const handleAddCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim());
      setCustomTag('');
      setShowCustomInput(false);
    }
  };

  const toggleTagEditing = () => {
    setEditingTags(!editingTags);
    setShowCustomInput(false);
    setCustomTag('');
  };

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      startHeight.value = drawerHeight.value;
    },
    onActive: (event) => {
      // Don't allow dragging when editing tags or custom input is shown
      if (editingTags || showCustomInput) return;
      
      const newHeight = startHeight.value - event.translationY;
      drawerHeight.value = Math.max(MIN_DRAWER_HEIGHT, Math.min(MAX_DRAWER_HEIGHT, newHeight));
    },
    onEnd: (event) => {
      // Don't allow closing when editing tags or custom input is shown
      if (editingTags || showCustomInput) return;
      
      const finalHeight = startHeight.value - event.translationY;
      
      // Only close if dragged down significantly AND with some velocity
      const shouldClose = event.translationY > 50 && event.velocityY > 200;
      
      if (shouldClose) {
        drawerHeight.value = withSpring(0, { damping: 20, stiffness: 100 });
        runOnJS(closeDrawer)();
      } else {
        // Snap back to appropriate height
        if (finalHeight < 200) {
          drawerHeight.value = withSpring(MIN_DRAWER_HEIGHT, { damping: 20, stiffness: 100 });
        } else {
          drawerHeight.value = withSpring(Math.min(finalHeight, MAX_DRAWER_HEIGHT), { damping: 20, stiffness: 100 });
        }
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

  const renderCategory = (category: Category, colors: any) => {
    const slots = Array.from({ length: category.maxItems }, (_, index) => 
      category.items[index] || null
    );

    return (
      <View key={category.id} style={styles.categoryContainer}>
        <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
          <Text style={[styles.inspectionName, { color: colors.text }]}>{currentInspection.name}</Text>
          <TouchableOpacity style={styles.headerReportButton}>
            <Text style={styles.headerReportText}>Create Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
          >
            {categories.map(category => renderCategory(category, colors))}
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
                  <Animated.View style={[styles.dragHandle, { backgroundColor: colors.headerBackground, borderColor: colors.border }]}>
                    <View style={styles.handleBar} />
                  </Animated.View>
                </PanGestureHandler>
                
                <View style={[styles.drawerContent, { backgroundColor: colors.headerBackground, borderColor: colors.border }]}>
                <View style={styles.drawerLeftColumn}>
                  <View style={styles.drawerPhoto}>
                    <Image 
                      source={{ uri: selectedPhoto.photoUri }} 
                      style={styles.drawerImage}
                      resizeMode="cover"
                    />
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={handleDeletePhoto}
                  >
                    <Text style={styles.deleteText}>🗑️ Delete Item</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.drawerDetails}>
                  <View style={styles.tagsSection}>
                    <View style={styles.tagsHeader}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags:</Text>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={toggleTagEditing}
                      >
                        <Text style={styles.editButtonText}>{editingTags ? 'Done' : 'Edit'}</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Current Tags */}
                    <View style={styles.chipsContainer}>
                      {getCurrentTags().map((tag, index) => (
                        <View key={index} style={styles.chip}>
                          <Text style={styles.chipText}>{tag}</Text>
                          {editingTags && (
                            <TouchableOpacity 
                              style={styles.chipRemove}
                              onPress={() => removeTag(tag)}
                            >
                              <Text style={styles.chipRemoveText}>×</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      {getCurrentTags().length === 0 && (
                        <Text style={[styles.noTagsText, { color: colors.secondaryText }]}>No tags</Text>
                      )}
                    </View>

                    {/* Suggested Tags (when editing) */}
                    {editingTags && (
                      <View style={styles.suggestedSection}>
                        <Text style={[styles.suggestedTitle, { color: colors.secondaryText }]}>Suggested:</Text>
                        <View style={styles.chipsContainer}>
                          {suggestedTags
                            .filter(tag => !getCurrentTags().includes(tag))
                            .slice(0, 6)
                            .map((tag, index) => (
                            <TouchableOpacity 
                              key={index} 
                              style={styles.suggestedChip}
                              onPress={() => addTag(tag)}
                            >
                              <Text style={styles.suggestedChipText}>+ {tag}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        
                        {/* Custom Tag Input */}
                        {showCustomInput ? (
                          <View style={styles.customInputRow}>
                            <TextInput
                              style={[styles.customInput, { 
                                backgroundColor: colors.headerBackground, 
                                borderColor: colors.border,
                                color: colors.text 
                              }]}
                              value={customTag}
                              onChangeText={setCustomTag}
                              placeholder="Custom tag"
                              placeholderTextColor={colors.secondaryText}
                              autoFocus
                              onSubmitEditing={handleAddCustomTag}
                              returnKeyType="done"
                            />
                            <TouchableOpacity onPress={handleAddCustomTag} style={styles.addCustomButton}>
                              <Text style={styles.addCustomButtonText}>Add</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={styles.addCustomChip}
                            onPress={() => setShowCustomInput(true)}
                          >
                            <Text style={styles.addCustomChipText}>+ Custom</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                  
                  {selectedPhoto.audioTranscription && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Audio Transcript:</Text>
                      <ScrollView style={styles.textScrollView} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.sectionText, { color: colors.secondaryText }]}>
                          {selectedPhoto.audioTranscription}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
                  
                  {selectedPhoto.description && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Full Description:</Text>
                      <ScrollView style={styles.textScrollView} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.sectionText, { color: colors.secondaryText }]}>
                          {selectedPhoto.description}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
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
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  headerReportButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerReportText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  drawerLeftColumn: {
    width: 120,
    marginRight: 16,
  },
  drawerPhoto: {
    width: 120,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  drawerImage: {
    width: '100%',
    height: '100%',
  },
  drawerDetails: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  tagsSection: {
    marginBottom: 12,
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  chipText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  chipRemove: {
    marginLeft: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noTagsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  suggestedSection: {
    marginTop: 8,
  },
  suggestedTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  suggestedChip: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  suggestedChipText: {
    fontSize: 12,
    color: '#666',
  },
  addCustomChip: {
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  addCustomChipText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: '#fff',
  },
  addCustomButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addCustomButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 12,
  },
  textScrollView: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignSelf: 'stretch',
  },
  deleteText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
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