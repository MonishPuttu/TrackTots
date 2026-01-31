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
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  Bell,
  Check,
  ChevronDown,
  Trash2,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { COLORS, CLASS_COLORS, CATEGORIES } from '../../constants';
import database from '../../database';
import { updateClass, deleteClass, getActiveChildren } from '../../database/helpers';
import Class from '../../database/models/Class';
import Child from '../../database/models/Child';
import type { Schedule } from '../../types';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const COLOR_OPTIONS = Object.keys(CLASS_COLORS) as Array<keyof typeof CLASS_COLORS>;

type EditClassRouteParams = {
  EditClass: {
    classId: string;
    selectedLocation?: {
      latitude: number;
      longitude: number;
      locationName: string;
      address: string;
    };
  };
};

export default function EditClassScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<EditClassRouteParams, 'EditClass'>>();
  const insets = useSafeAreaInsets();
  const { classId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<{
    day: string;
    type: 'start' | 'end';
  } | null>(null);

  // Form state
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [className, setClassName] = useState('');
  const [category, setCategory] = useState('Music');
  const [selectedColor, setSelectedColor] = useState<keyof typeof CLASS_COLORS>('purple');

  // Location state
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [geofenceRadius, setGeofenceRadius] = useState('100');

  // Schedule state
  const [schedule, setSchedule] = useState<Schedule>({
    monday: { enabled: false, startTime: '09:00', endTime: '10:00', checkInWindowMinutes: 15 },
    tuesday: { enabled: false, startTime: '09:00', endTime: '10:00', checkInWindowMinutes: 15 },
    wednesday: { enabled: false, startTime: '09:00', endTime: '10:00', checkInWindowMinutes: 15 },
    thursday: { enabled: false, startTime: '09:00', endTime: '10:00', checkInWindowMinutes: 15 },
    friday: { enabled: false, startTime: '09:00', endTime: '10:00', checkInWindowMinutes: 15 },
    saturday: { enabled: false, startTime: '09:00', endTime: '10:00', checkInWindowMinutes: 15 },
    sunday: { enabled: false, startTime: '09:00', endTime: '10:00', checkInWindowMinutes: 15 },
  });

  // Instructor state
  const [instructorName, setInstructorName] = useState('');
  const [instructorPhone, setInstructorPhone] = useState('');
  const [instructorEmail, setInstructorEmail] = useState('');

  // Notification state
  const [enablePickupReminder, setEnablePickupReminder] = useState(true);
  const [pickupReminderMinutes, setPickupReminderMinutes] = useState('15');
  const [enableAttendanceNotification, setEnableAttendanceNotification] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Handle location selection from MapPicker
  useEffect(() => {
    if (route.params?.selectedLocation) {
      const loc = route.params.selectedLocation;
      setLocationName(loc.locationName);
      setLocationAddress(loc.address);
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
    }
  }, [route.params?.selectedLocation]);

  const loadData = async () => {
    try {
      // Load children
      const activeChildren = await getActiveChildren();
      setChildren(activeChildren);

      // Load class data
      const classCollection = database.get<Class>('classes');
      const classData = await classCollection.find(classId);

      // Populate form
      setSelectedChildId(classData.childId);
      setClassName(classData.name);
      setCategory(classData.category || 'Music');
      setSelectedColor((classData.color as keyof typeof CLASS_COLORS) || 'purple');
      setLocationName(classData.locationName);
      setLocationAddress(classData.locationAddress || '');
      setLatitude(classData.latitude);
      setLongitude(classData.longitude);
      setGeofenceRadius(classData.geofenceRadius?.toString() || '100');
      setSchedule(classData.schedule as Schedule || schedule);
      setInstructorName(classData.instructorName || '');
      setInstructorPhone(classData.instructorContact || '');
      setInstructorEmail(classData.instructorEmail || '');
      setEnablePickupReminder(classData.enablePickupReminder ?? true);
      setPickupReminderMinutes(classData.pickupReminderMinutes?.toString() || '15');
      setEnableAttendanceNotification(classData.enableAttendanceNotification ?? true);
    } catch (error) {
      console.error('Error loading class:', error);
      Alert.alert('Error', 'Failed to load class details.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayToggle = (dayKey: string) => {
    setSchedule((prev) => {
      const current = prev[dayKey as keyof Schedule];
      return {
        ...prev,
        [dayKey]: {
          ...current,
          enabled: !current?.enabled,
        },
      };
    });
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (!showTimePicker || !selectedDate) {
      setShowTimePicker(null);
      return;
    }

    const { day, type } = showTimePicker;
    const hours = selectedDate.getHours().toString().padStart(2, '0');
    const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day as keyof Schedule],
        [type === 'start' ? 'startTime' : 'endTime']: timeString,
      },
    }));

    if (Platform.OS === 'android') {
      setShowTimePicker(null);
    }
  };

  const parseTimeString = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const validateForm = (): boolean => {
    if (!selectedChildId) {
      Alert.alert('Required', 'Please select a child.');
      return false;
    }
    if (!className.trim()) {
      Alert.alert('Required', 'Please enter a class name.');
      return false;
    }
    if (!locationName.trim() || latitude === 0) {
      Alert.alert('Required', 'Please select a location on the map.');
      return false;
    }

    const hasEnabledDay = Object.values(schedule).some((day) => day.enabled);
    if (!hasEnabledDay) {
      Alert.alert('Required', 'Please enable at least one day in the schedule.');
      return false;
    }

    if (instructorEmail.trim() && !instructorEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await updateClass(classId, {
        childId: selectedChildId,
        name: className.trim(),
        category,
        color: selectedColor,
        locationName: locationName.trim(),
        locationAddress: locationAddress.trim() || undefined,
        latitude,
        longitude,
        geofenceRadius: parseInt(geofenceRadius, 10) || 100,
        schedule,
        instructorName: instructorName.trim() || undefined,
        instructorContact: instructorPhone.trim() || undefined,
        instructorEmail: instructorEmail.trim() || undefined,
        enablePickupReminder,
        pickupReminderMinutes: parseInt(pickupReminderMinutes, 10) || 15,
        enableAttendanceNotification,
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error updating class:', error);
      Alert.alert('Error', 'Failed to update class. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This will also delete all attendance records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClass(classId);
              // Go back to the classes list
              navigation.navigate('ClassesList');
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('Error', 'Failed to delete class.');
            }
          },
        },
      ]
    );
  };

  const handlePickLocation = () => {
    navigation.navigate('MapPicker', {
      initialLocation: { latitude, longitude, locationName, address: locationAddress },
      returnScreen: 'EditClass',
      classId,
    });
  };

  const getSelectedChild = () => {
    return children.find((c) => c.id === selectedChildId);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading class...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <ArrowLeft size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Class</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          {/* Child Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Child *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowChildPicker(!showChildPicker)}
            >
              <Text style={styles.pickerButtonText}>
                {getSelectedChild()?.name || 'Select a child'}
              </Text>
              <ChevronDown size={20} color={COLORS.gray[500]} />
            </TouchableOpacity>
            {showChildPicker && (
              <View style={styles.pickerDropdown}>
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={[
                      styles.pickerOption,
                      selectedChildId === child.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedChildId(child.id);
                      setShowChildPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        selectedChildId === child.id && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {child.name}
                    </Text>
                    {selectedChildId === child.id && (
                      <Check size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Class Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Piano Lessons"
              placeholderTextColor={COLORS.gray[400]}
              value={className}
              onChangeText={setClassName}
            />
          </View>

          {/* Category Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={styles.pickerButtonText}>{category}</Text>
              <ChevronDown size={20} color={COLORS.gray[500]} />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={styles.pickerDropdown}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pickerOption,
                      category === cat && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        category === cat && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                    {category === cat && <Check size={18} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Color Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorSelector}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: CLASS_COLORS[color] },
                    selectedColor === color && styles.colorCircleSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Check size={16} color="#FFFFFF" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <TouchableOpacity style={styles.mapPickerButton} onPress={handlePickLocation}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.mapPickerButtonText}>
              {locationName || 'Pick on Map'}
            </Text>
          </TouchableOpacity>

          {locationName ? (
            <View style={styles.locationDetails}>
              <Text style={styles.locationName}>{locationName}</Text>
              {locationAddress ? (
                <Text style={styles.locationAddress}>{locationAddress}</Text>
              ) : null}
              <Text style={styles.coordinates}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Geofence Radius (meters)</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor={COLORS.gray[400]}
              value={geofenceRadius}
              onChangeText={setGeofenceRadius}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Clock size={20} color={COLORS.gray[600]} />
            <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          </View>

          {DAYS.map(({ key, label }) => {
            const daySchedule = schedule[key as keyof Schedule];
            const isEnabled = daySchedule?.enabled ?? false;
            return (
              <View key={key} style={styles.dayRow}>
                <TouchableOpacity
                  style={styles.dayToggle}
                  onPress={() => handleDayToggle(key)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isEnabled && styles.checkboxChecked,
                    ]}
                  >
                    {isEnabled && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.dayLabel}>{label}</Text>
                </TouchableOpacity>

                {isEnabled && (
                  <View style={styles.timeRow}>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowTimePicker({ day: key, type: 'start' })}
                    >
                      <Text style={styles.timeButtonText}>
                        {formatTime(daySchedule?.startTime || '09:00')}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.timeSeparator}>to</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowTimePicker({ day: key, type: 'end' })}
                    >
                      <Text style={styles.timeButtonText}>
                        {formatTime(daySchedule?.endTime || '10:00')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Instructor Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <User size={20} color={COLORS.gray[600]} />
            <Text style={styles.sectionTitle}>Instructor Info (Optional)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Instructor name"
              placeholderTextColor={COLORS.gray[400]}
              value={instructorName}
              onChangeText={setInstructorName}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Phone size={16} color={COLORS.gray[500]} />
              <Text style={styles.label}>Phone</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor={COLORS.gray[400]}
              value={instructorPhone}
              onChangeText={setInstructorPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Mail size={16} color={COLORS.gray[500]} />
              <Text style={styles.label}>Email</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={COLORS.gray[400]}
              value={instructorEmail}
              onChangeText={setInstructorEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Bell size={20} color={COLORS.gray[600]} />
            <Text style={styles.sectionTitle}>Notification Settings</Text>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enable pickup reminders</Text>
            <Switch
              value={enablePickupReminder}
              onValueChange={setEnablePickupReminder}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {enablePickupReminder && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Minutes before class ends</Text>
              <TextInput
                style={styles.input}
                placeholder="15"
                placeholderTextColor={COLORS.gray[400]}
                value={pickupReminderMinutes}
                onChangeText={setPickupReminderMinutes}
                keyboardType="number-pad"
              />
            </View>
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Auto-attendance notifications</Text>
            <Switch
              value={enableAttendanceNotification}
              onValueChange={setEnableAttendanceNotification}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={parseTimeString(
            schedule[showTimePicker.day as keyof Schedule]?.[
              showTimePicker.type === 'start' ? 'startTime' : 'endTime'
            ] || '09:00'
          )}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

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

  // Section
  section: {
    padding: 20,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.gray[100],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 16,
  },

  // Input
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.gray[800],
  },

  // Picker
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    padding: 14,
  },
  pickerButtonText: {
    fontSize: 15,
    color: COLORS.gray[800],
  },
  pickerDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  pickerOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 15,
    color: COLORS.gray[800],
  },
  pickerOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Color Selector
  colorSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // Map Picker
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  mapPickerButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primary,
  },
  locationDetails: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 12,
    color: COLORS.gray[400],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Schedule
  dayRow: {
    marginBottom: 12,
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayLabel: {
    fontSize: 15,
    color: COLORS.gray[800],
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 36,
    gap: 8,
  },
  timeButton: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: 14,
    color: COLORS.gray[800],
  },
  timeSeparator: {
    fontSize: 14,
    color: COLORS.gray[500],
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  toggleLabel: {
    fontSize: 15,
    color: COLORS.gray[800],
    flex: 1,
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
