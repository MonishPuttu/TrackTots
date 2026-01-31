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
import { ArrowLeft, Info, Check, X, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Q } from '@nozbe/watermelondb';

import { StatusButton } from '../../components/attendance';
import { COLORS } from '../../constants';
import database from '../../database';
import { getActiveChildren, getAllActiveClasses } from '../../database/helpers';
import type Child from '../../database/models/Child';
import type Class from '../../database/models/Class';
import type AttendanceRecord from '../../database/models/AttendanceRecord';

type ManualAttendanceRouteParams = {
  ManualAttendance: {
    preselectedDate?: string;
    preselectedClassId?: string;
  };
};

type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';

export default function ManualAttendanceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ManualAttendanceRouteParams, 'ManualAttendance'>>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);

  // Form state
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>(route.params?.preselectedClassId || '');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (route.params?.preselectedDate) {
      return new Date(route.params.preselectedDate);
    }
    return new Date();
  });
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Filter classes by selected child
    if (selectedChildId) {
      const childClasses = allClasses.filter(c => c.childId === selectedChildId);
      setFilteredClasses(childClasses);
      
      // Reset class selection if previously selected class doesn't belong to new child
      if (selectedClassId && !childClasses.find(c => c.id === selectedClassId)) {
        setSelectedClassId('');
      }
    } else {
      setFilteredClasses([]);
      setSelectedClassId('');
    }
  }, [selectedChildId, allClasses]);

  const loadData = async () => {
    try {
      const [childrenData, classesData] = await Promise.all([
        getActiveChildren(),
        getAllActiveClasses(),
      ]);

      setChildren(childrenData);
      setAllClasses(classesData);

      // If preselected class, find and set the child
      if (route.params?.preselectedClassId) {
        const preselectedClass = classesData.find(c => c.id === route.params?.preselectedClassId);
        if (preselectedClass) {
          setSelectedChildId(preselectedClass.childId);
        }
      } else if (childrenData.length > 0) {
        setSelectedChildId(childrenData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (date) {
      setCheckInTime(date);
    }
  };

  const validateForm = (): boolean => {
    if (!selectedChildId) {
      Alert.alert('Required', 'Please select a child.');
      return false;
    }
    if (!selectedClassId) {
      Alert.alert('Required', 'Please select a class.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

      // Check if record already exists for this class/date
      const existingRecords = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('class_id', selectedClassId),
          Q.where('date', dateString)
        )
        .fetch();

      if (existingRecords.length > 0) {
        // Update existing record
        await database.write(async () => {
          await existingRecords[0].update(record => {
            record.status = status;
            record.wasAutomatic = false;
            record.detectionMethod = 'manual';
            record.parentVerified = true;
            if (checkInTime) {
              record.checkInTime = checkInTime.getTime();
            }
            if (notes.trim()) {
              record.notes = notes.trim();
            }
          });
        });
      } else {
        // Create new record directly (markAttendance only works for today)
        await database.write(async () => {
          await database.get<AttendanceRecord>('attendance_records').create(record => {
            record.classId = selectedClassId;
            record.date = dateString;
            record.status = status;
            record.wasAutomatic = false;
            record.detectionMethod = 'manual';
            record.parentVerified = true;
            if (checkInTime) {
              record.checkInTime = checkInTime.getTime();
            }
            if (notes.trim()) {
              record.notes = notes.trim();
            }
          });
        });
      }

      Alert.alert('Success', 'Attendance record saved successfully.');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving attendance:', error);
      Alert.alert('Error', 'Failed to save attendance record. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const getSelectedChild = () => children.find(c => c.id === selectedChildId);
  const getSelectedClass = () => filteredClasses.find(c => c.id === selectedClassId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Manual Entry</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Info size={20} color={COLORS.info} />
            <Text style={styles.infoTitle}>Manual Entry</Text>
          </View>
          <Text style={styles.infoText}>
            Use this to mark attendance when automatic tracking didn't work or for past dates.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Select Child */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Child *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowChildPicker(!showChildPicker)}
            >
              <Text style={styles.pickerButtonText}>
                {getSelectedChild()?.name || 'Select a child'}
              </Text>
            </TouchableOpacity>
            {showChildPicker && (
              <View style={styles.pickerDropdown}>
                {children.map(child => (
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
                    <Text style={[
                      styles.pickerOptionText,
                      selectedChildId === child.id && styles.pickerOptionTextSelected,
                    ]}>
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

          {/* Select Class */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Class *</Text>
            <TouchableOpacity
              style={[styles.pickerButton, !selectedChildId && styles.pickerButtonDisabled]}
              onPress={() => selectedChildId && setShowClassPicker(!showClassPicker)}
              disabled={!selectedChildId}
            >
              <Text style={[
                styles.pickerButtonText,
                !selectedChildId && styles.pickerButtonTextDisabled,
              ]}>
                {getSelectedClass()?.name || (selectedChildId ? 'Select a class' : 'Select a child first')}
              </Text>
            </TouchableOpacity>
            {showClassPicker && (
              <View style={styles.pickerDropdown}>
                {filteredClasses.length > 0 ? (
                  filteredClasses.map(cls => (
                    <TouchableOpacity
                      key={cls.id}
                      style={[
                        styles.pickerOption,
                        selectedClassId === cls.id && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedClassId(cls.id);
                        setShowClassPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        selectedClassId === cls.id && styles.pickerOptionTextSelected,
                      ]}>
                        {cls.name}
                      </Text>
                      {selectedClassId === cls.id && (
                        <Check size={18} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.pickerEmpty}>
                    <Text style={styles.pickerEmptyText}>No classes for this child</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerButtonText}>{formatDate(selectedDate)}</Text>
            </TouchableOpacity>
          </View>

          {/* Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status *</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusRow}>
                <StatusButton
                  status="present"
                  isSelected={status === 'present'}
                  onPress={() => setStatus('present')}
                />
                <StatusButton
                  status="absent"
                  isSelected={status === 'absent'}
                  onPress={() => setStatus('absent')}
                />
              </View>
              <View style={styles.statusRow}>
                <StatusButton
                  status="excused"
                  isSelected={status === 'excused'}
                  onPress={() => setStatus('excused')}
                />
                <StatusButton
                  status="late"
                  isSelected={status === 'late'}
                  onPress={() => setStatus('late')}
                />
              </View>
            </View>
          </View>

          {/* Check-in Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Check-in Time (Optional)</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={18} color={COLORS.gray[500]} />
              <Text style={[styles.pickerButtonText, { marginLeft: 8 }]}>
                {checkInTime ? formatTime(checkInTime) : 'Not set'}
              </Text>
            </TouchableOpacity>
            {checkInTime && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setCheckInTime(null)}
              >
                <Text style={styles.clearButtonText}>Clear time</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes about this attendance..."
              placeholderTextColor={COLORS.gray[400]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={checkInTime || new Date()}
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
            <Text style={styles.saveButtonText}>Save Entry</Text>
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
  headerSpacer: {
    width: 40,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.info,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 20,
  },

  // Form
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[700],
  },

  // Picker
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    padding: 14,
  },
  pickerButtonDisabled: {
    backgroundColor: COLORS.gray[100],
  },
  pickerButtonText: {
    fontSize: 15,
    color: COLORS.gray[800],
  },
  pickerButtonTextDisabled: {
    color: COLORS.gray[400],
  },
  pickerDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
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
  pickerEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  pickerEmptyText: {
    fontSize: 14,
    color: COLORS.gray[500],
  },

  // Status Grid
  statusGrid: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // Clear Button
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  clearButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Notes
  notesInput: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.gray[800],
    minHeight: 100,
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
