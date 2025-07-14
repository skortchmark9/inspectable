import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useAnimatedGestureHandler, withSpring, runOnJS } from 'react-native-reanimated';
import { InspectionItem } from '@/types';
import TagEditor from './TagEditor';

interface PhotoDetailDrawerProps {
  selectedPhoto: InspectionItem;
  currentInspection: any;
  colors: {
    background: string;
    headerBackground: string;
    text: string;
    secondaryText: string;
    border: string;
  };
  drawerHeight: any;
  startHeight: any;
  editingTags: boolean;
  showCustomInput: boolean;
  onClose: () => void;
  onDelete: () => void;
  onUpdateTags: (itemId: string, updates: any) => void;
  setEditingTags: (editing: boolean) => void;
  setShowCustomInput: (show: boolean) => void;
  MIN_DRAWER_HEIGHT: number;
  MAX_DRAWER_HEIGHT: number;
}

export default function PhotoDetailDrawer({
  selectedPhoto,
  currentInspection,
  colors,
  drawerHeight,
  startHeight,
  editingTags,
  showCustomInput,
  onClose,
  onDelete,
  onUpdateTags,
  setEditingTags,
  setShowCustomInput,
  MIN_DRAWER_HEIGHT,
  MAX_DRAWER_HEIGHT,
}: PhotoDetailDrawerProps) {
  
  // Get fresh item data from inspection context
  const freshItem = currentInspection?.items[selectedPhoto.id] || selectedPhoto;
  
  const handleDeletePhoto = () => {
    Alert.alert(
      'Delete Inspection Item',
      'Are you sure you want to delete this entire inspection item? This will remove the photo, audio, and all associated data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        }
      ]
    );
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
      const shouldClose = event.translationY > 50 && event.velocityY > 50;
      
      if (shouldClose) {
        drawerHeight.value = withSpring(0, { damping: 20, stiffness: 100 });
        runOnJS(onClose)();
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

  return (
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
            <TagEditor 
              selectedPhoto={freshItem}
              colors={colors}
              editingTags={editingTags}
              showCustomInput={showCustomInput}
              onUpdateTags={onUpdateTags}
              setEditingTags={setEditingTags}
              setShowCustomInput={setShowCustomInput}
            />
            
            {freshItem.audioTranscription && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Audio Transcript:</Text>
                <ScrollView style={styles.textScrollView} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.sectionText, { color: colors.secondaryText }]}>
                    {freshItem.audioTranscription}
                  </Text>
                </ScrollView>
              </View>
            )}
            
            {freshItem.description && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Full Description:</Text>
                <ScrollView style={styles.textScrollView} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.sectionText, { color: colors.secondaryText }]}>
                    {freshItem.description}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
});