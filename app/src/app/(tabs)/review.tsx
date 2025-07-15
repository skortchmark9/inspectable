import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, Dimensions, ScrollView, FlatList, useColorScheme, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import { useInspection } from '@/contexts/InspectionContext';
import { InspectionItem } from '@/types';
import { AssignedCategory, ChecklistCategory, SpecificItem } from '@/types/checklist';
import { PRE_INSPECTION_CHECKLIST } from '@/constants/checklists';
import { categorizeItemsWithChecklist } from '@/utils/categorization';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PhotoDetailDrawer from '@/components/PhotoDetailDrawer';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = 80;
const ITEM_HEIGHT = Math.round(ITEM_WIDTH * (4/3)); // 4:3 aspect ratio for phone photos
const MIN_DRAWER_HEIGHT = 180;
const DEFAULT_DRAWER_HEIGHT = 400;
const MAX_DRAWER_HEIGHT = height * 0.8;


export default function ReviewScreen() {
  const { currentInspection, updateInspectionItem, deleteInspectionItem } = useInspection();
  const [selectedPhoto, setSelectedPhoto] = useState<InspectionItem | null>(null);
  const colorScheme = useColorScheme();
  const [editingTags, setEditingTags] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showInfoFor, setShowInfoFor] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<InspectionItem | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
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

  const items = Object.values(currentInspection.items || {})
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const categories = categorizeItemsWithChecklist(items, PRE_INSPECTION_CHECKLIST);

  const handlePhotoPress = (photo: InspectionItem, categoryId?: string) => {
    const wasDrawerClosed = !selectedPhoto;
    setSelectedPhoto(photo);
    setEditingTags(false);
    setShowCustomInput(false);
    
    // Only reset drawer height if no photo was previously selected (drawer was closed)
    if (wasDrawerClosed) {
      drawerHeight.value = withSpring(DEFAULT_DRAWER_HEIGHT, { damping: 20, stiffness: 100 });
      
      // Simple approach: if selecting from bottom categories, scroll down
      if (categoryId === 'supplemental' || categoryId === 'fuel-switching') {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    }
  };

  const closeDrawer = () => {
    setSelectedPhoto(null);
    setEditingTags(false);
    setShowCustomInput(false);
  };

  const handleDeletePhoto = () => {
    if (!selectedPhoto) return;
    deleteInspectionItem?.(selectedPhoto.id);
    closeDrawer();
  };

  const renderCategoryItem = (item: InspectionItem, index: number, assignedCategory: AssignedCategory) => {
    return (
      <TouchableOpacity 
        key={item.id}
        style={[
          styles.categoryItem,
          selectedPhoto?.id === item.id && styles.selectedItem
        ]}
        onPress={() => handlePhotoPress(item, assignedCategory.definition.id)}
        onLongPress={() => setFullscreenImage(item)}
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


  const renderCategoryInfo = (definition: ChecklistCategory, colors: any) => {
    const isExpanded = showInfoFor === definition.id;
    
    return (
      <TouchableOpacity 
        style={styles.infoIcon}
        onPress={() => setShowInfoFor(isExpanded ? null : definition.id)}
      >
        <Text style={[styles.infoText, { color: colors.secondaryText }]}>ⓘ</Text>
      </TouchableOpacity>
    );
  };

  const renderSpecificItem = (item: SpecificItem, isFulfilled: boolean, colors: any) => {
    return (
      <View key={item.id} style={styles.specificItemRow}>
        <Text style={[
          styles.specificItemIcon, 
          { color: isFulfilled ? '#28a745' : (item.required ? '#dc3545' : colors.secondaryText) }
        ]}>
          {isFulfilled ? '✓' : (item.required ? '!' : '○')}
        </Text>
        <View style={styles.specificItemContent}>
          <Text style={[
            styles.specificItemText, 
            { 
              color: isFulfilled ? colors.text : colors.secondaryText,
              textDecorationLine: isFulfilled ? 'line-through' : 'none'
            }
          ]}>
            {item.name}
          </Text>
          {item.requireDatasheet && (
            <Text style={[styles.datasheetIcon, { color: colors.secondaryText }]}>
              📋
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderCategory = (assignedCategory: AssignedCategory, colors: any) => {
    const { definition, assignedItems, completion } = assignedCategory;
    const isEmpty = assignedItems.length === 0;
    const hasSpecificItems = definition.specificItems && definition.specificItems.length > 0;

    return (
      <View 
        key={definition.id} 
        style={styles.categoryContainer}
      >
        <View style={styles.categoryHeader}>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>
            {definition.name}{assignedItems.length > 0 ? ` (${assignedItems.length})` : ''}
          </Text>
          {renderCategoryInfo(definition, colors)}
        </View>
        
        {showInfoFor === definition.id && (
          <View style={styles.keywordsContainer}>
            <Text style={[styles.keywordsLabel, { color: colors.secondaryText }]}>
              Looking for tags:
            </Text>
            <Text style={[styles.keywordsList, { color: colors.text }]}>
              {definition.keywords.join(', ')}
            </Text>
          </View>
        )}
        
        {/* Show specific items breakdown */}
        {hasSpecificItems && completion && (
          <View style={styles.specificItemsContainer}>
            {completion.missing.filter(item => item.required).map(item => 
              renderSpecificItem(item, false, colors)
            )}
            {completion.fulfilled.map(item => 
              renderSpecificItem(item, true, colors)
            )}
            {completion.missing.filter(item => !item.required).map(item => 
              renderSpecificItem(item, false, colors)
            )}
          </View>
        )}
        
        {isEmpty && !hasSpecificItems ? (
          <View style={styles.emptyCategory}>
            <Text style={[styles.emptyCategoryText, { color: colors.secondaryText }]}>
              No photos yet. Looking for: {definition.keywords.slice(0, 3).join(', ')}
              {definition.keywords.length > 3 ? '...' : ''}
            </Text>
          </View>
        ) : assignedItems.length > 0 ? (
          <FlatList
            data={assignedItems}
            renderItem={({ item, index }) => renderCategoryItem(item, index, assignedCategory)}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryItems}
          />
        ) : null}
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
            ref={scrollViewRef}
            style={styles.content} 
            showsVerticalScrollIndicator={false}
          >
            {categories.map(category => renderCategory(category, colors))}
          </ScrollView>

          {/* Photo Detail Drawer */}
          {selectedPhoto && (
            <PhotoDetailDrawer
              selectedPhoto={selectedPhoto}
              currentInspection={currentInspection}
              colors={colors}
              drawerHeight={drawerHeight}
              startHeight={startHeight}
              editingTags={editingTags}
              showCustomInput={showCustomInput}
              onClose={closeDrawer}
              onDelete={handleDeletePhoto}
              onUpdateTags={updateInspectionItem}
              setEditingTags={setEditingTags}
              setShowCustomInput={setShowCustomInput}
              MIN_DRAWER_HEIGHT={MIN_DRAWER_HEIGHT}
              MAX_DRAWER_HEIGHT={MAX_DRAWER_HEIGHT}
            />
          )}
        </View>

        {/* Fullscreen Image Modal */}
        <Modal
          visible={fullscreenImage !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullscreenImage(null)}
        >
          <View style={styles.fullscreenContainer}>
            <TouchableOpacity 
              style={styles.fullscreenBackdrop}
              onPress={() => setFullscreenImage(null)}
            >
              <SafeAreaView style={styles.fullscreenContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setFullscreenImage(null)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                
                {fullscreenImage && (
                  <Image
                    source={{ uri: fullscreenImage.photoUri }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                )}
                
                {fullscreenImage && (
                  <View style={styles.fullscreenInfo}>
                    <Text style={styles.fullscreenLabel}>
                      {fullscreenImage.label || 'Unlabeled Photo'}
                    </Text>
                    {(fullscreenImage.tags || []).length > 0 && (
                      <Text style={styles.fullscreenTags}>
                        Tags: {(fullscreenImage.tags || []).join(', ')}
                      </Text>
                    )}
                  </View>
                )}
              </SafeAreaView>
            </TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    marginBottom: 20,
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
    paddingBottom: 40,
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoIcon: {
    padding: 4,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '400',
  },
  emptyCategory: {
    marginBottom: 8,
  },
  emptyCategoryText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  keywordsContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  keywordsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  keywordsList: {
    fontSize: 12,
    lineHeight: 16,
  },
  specificItemsContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  specificItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  specificItemIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    width: 16,
  },
  specificItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specificItemText: {
    fontSize: 14,
    flex: 1,
  },
  datasheetIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullscreenBackdrop: {
    flex: 1,
  },
  fullscreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  fullscreenInfo: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 12,
  },
  fullscreenLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fullscreenTags: {
    color: '#ccc',
    fontSize: 14,
  },
});