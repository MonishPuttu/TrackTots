import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  Camera,
  Calendar,
  User,
  FileText,
  Trash2,
  X,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { COLORS } from '../../constants';
import { getChildById, updateChild, deleteChild } from '../../database/helpers';
import type Child from '../../database/models/Child';

type EditChildRouteParams = {
  EditChild: {
    childId: string;
  };
};

export default function EditChildScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EditChildRouteParams, 'EditChild'>>();
  const { childId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [originalChild, setOriginalChild] = useState<Child | null>(null);

  useEffect(() => {
    loadChild();
  }, [childId]);

  const loadChild = async () => {
    try {
      const child = await getChildById(childId);
      if (child) {
        setOriginalChild(child);
        
        // Parse name and nickname if combined
        const nameMatch = child.name.match(/^(.+?)\s*\((.+)\)$/);
        if (nameMatch) {
          setName(nameMatch[1].trim());
          setNickname(nameMatch[2].trim());
        } else {
          setName(child.name);
        }
        
        if (child.dateOfBirth) {
          setDateOfBirth(new Date(child.dateOfBirth));
        }
        setNotes(child.notes || '');
        setAvatarUri(child.avatarUri || null);
      }
    } catch (error) {
      console.error('Error loading child:', error);
      Alert.alert('Error', 'Failed to load child data.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handlePickAvatar = () => {
    Alert.alert('Coming Soon', 'Avatar picker will be available in a future update.');
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter the child\'s name.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const displayName = nickname.trim() 
        ? `${name.trim()} (${nickname.trim()})` 
        : name.trim();

      await updateChild(childId, {
        name: displayName,
        dateOfBirth: dateOfBirth ? dateOfBirth.getTime() : undefined,
        avatarUri: avatarUri || undefined,
        notes: notes.trim() || undefined,
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error updating child:', error);
      Alert.alert('Error', 'Failed to update child. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Child?',
      `Are you sure you want to delete ${name}? This will also remove all their class enrollments and attendance records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteChild(childId);
              // Navigate back twice (past the edit screen to the list)
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting child:', error);
              Alert.alert('Error', 'Failed to delete child. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleCancel = () => {
    const hasChanges = 
      name !== (originalChild?.name || '') ||
      notes !== (originalChild?.notes || '') ||
      (dateOfBirth?.getTime() || null) !== (originalChild?.dateOfBirth || null);

    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const getInitials = () => {
    if (!name.trim()) return '?';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading child data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <ArrowLeft size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Child</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 size={22} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <View style={styles.cameraIconContainer}>
              <Camera size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Name Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <User size={18} color={COLORS.gray[600]} />
              <Text style={styles.label}>Name *</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter child's full name"
              placeholderTextColor={COLORS.gray[400]}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Nickname Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <User size={18} color={COLORS.gray[600]} />
              <Text style={styles.label}>Nickname</Text>
              <Text style={styles.optional}>(optional)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter nickname"
              placeholderTextColor={COLORS.gray[400]}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="words"
            />
          </View>

          {/* Date of Birth Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Calendar size={18} color={COLORS.gray[600]} />
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.optional}>(optional)</Text>
            </View>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[
                styles.dateText,
                !dateOfBirth && styles.placeholderText
              ]}>
                {dateOfBirth 
                  ? `${formatDate(dateOfBirth)} (${calculateAge(dateOfBirth)} years old)`
                  : 'Select date of birth'}
              </Text>
              {dateOfBirth && (
                <TouchableOpacity 
                  onPress={() => setDateOfBirth(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={COLORS.gray[400]} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(2000, 0, 1)}
            />
          )}

          {/* Notes Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <FileText size={18} color={COLORS.gray[600]} />
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.optional}>(optional)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional notes about your child..."
              placeholderTextColor={COLORS.gray[400]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Delete Section */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleDelete}>
            <Trash2 size={18} color={COLORS.danger} />
            <Text style={styles.dangerButtonText}>Delete This Child</Text>
          </TouchableOpacity>
          <Text style={styles.dangerHint}>
            This will permanently remove the child and all their associated classes and attendance records.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={handleCancel}
          disabled={isSaving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray[500],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  deleteButton: {
    padding: 8,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: COLORS.gray[50],
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray[600],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray[500],
  },

  // Form
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginLeft: 8,
  },
  optional: {
    fontSize: 13,
    color: COLORS.gray[400],
    marginLeft: 6,
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.gray[800],
  },
  textArea: {
    minHeight: 100,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.gray[800],
    flex: 1,
  },
  placeholderText: {
    color: COLORS.gray[400],
  },

  // Danger Section
  dangerSection: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
    marginBottom: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger,
    marginLeft: 8,
  },
  dangerHint: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Bottom Buttons
  bottomButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
