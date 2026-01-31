import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Download,
  FileText,
  BarChart3,
  Users,
  Check,
  ChevronDown,
} from 'lucide-react-native';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Q } from '@nozbe/watermelondb';

import { COLORS } from '../../constants';
import database from '../../database';
import { getActiveChildren, getAllActiveClasses } from '../../database/helpers';
import type Child from '../../database/models/Child';
import type Class from '../../database/models/Class';
import type AttendanceRecord from '../../database/models/AttendanceRecord';
import type { Schedule } from '../../types';

type ReportType = 'summary' | 'detailed' | 'child_progress';
type DateRange = 'this_month' | 'last_month' | 'this_year';
type ExportFormat = 'pdf' | 'csv';

interface IncludeOptions {
  attendanceCalendar: boolean;
  statisticsCharts: boolean;
  classDetails: boolean;
  notesComments: boolean;
}

export default function ExportReportScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Data state
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [includeOptions, setIncludeOptions] = useState<IncludeOptions>({
    attendanceCalendar: true,
    statisticsCharts: true,
    classDetails: true,
    notesComments: false,
  });
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

  const reportTypes: { value: ReportType; label: string }[] = [
    { value: 'summary', label: 'Attendance Summary' },
    { value: 'detailed', label: 'Detailed Class Report' },
    { value: 'child_progress', label: 'Child Progress Report' },
  ];

  const dateRanges: { value: DateRange; label: string }[] = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_year', label: 'This Year' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allChildren = await getActiveChildren();
      setChildren(allChildren);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRangeDates = useCallback((): { start: Date; end: Date } => {
    const now = new Date();
    switch (dateRange) {
      case 'this_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
      case 'last_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
        };
      case 'this_year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31),
        };
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: now,
        };
    }
  }, [dateRange]);

  const formatDateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSelectedChildName = () => {
    if (!selectedChildId) return 'All Children';
    return children.find(c => c.id === selectedChildId)?.name || 'All Children';
  };

  const getSelectedDateRangeLabel = () => {
    return dateRanges.find(d => d.value === dateRange)?.label || 'This Month';
  };

  const toggleIncludeOption = (option: keyof IncludeOptions) => {
    setIncludeOptions(prev => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  const generateReport = async () => {
    setIsGenerating(true);

    try {
      const { start, end } = getDateRangeDates();
      const startStr = formatDateString(start);
      const endStr = formatDateString(end);

      // Fetch all necessary data
      const allClasses = await getAllActiveClasses();
      const filteredClasses = selectedChildId
        ? allClasses.filter(c => c.childId === selectedChildId)
        : allClasses;

      if (filteredClasses.length === 0) {
        Alert.alert('No Data', 'No classes found for the selected filters.');
        setIsGenerating(false);
        return;
      }

      // Fetch attendance records
      const classIds = filteredClasses.map(c => c.id);
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('class_id', Q.oneOf(classIds)),
          Q.where('date', Q.gte(startStr)),
          Q.where('date', Q.lte(endStr))
        )
        .fetch();

      // Build report content
      let reportContent = '';

      if (exportFormat === 'csv') {
        reportContent = await generateCSVReport(filteredClasses, records, start, end);
      } else {
        reportContent = await generateTextReport(filteredClasses, records, start, end);
      }

      // Save and share file using legacy expo-file-system API
      const fileName = exportFormat === 'csv' 
        ? 'TrackTots_Report.csv' 
        : 'TrackTots_Report.txt';
      
      const filePath = cacheDirectory + fileName;
      await writeAsStringAsync(filePath, reportContent);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: exportFormat === 'csv' ? 'text/csv' : 'text/plain',
          dialogTitle: 'Share TrackTots Report',
        });
      } else {
        Alert.alert('Success', 'Report saved successfully!');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTextReport = async (
    classes: Class[],
    records: AttendanceRecord[],
    startDate: Date,
    endDate: Date
  ): Promise<string> => {
    const lines: string[] = [];
    const divider = '='.repeat(50);
    const subDivider = '-'.repeat(50);

    // Header
    lines.push(divider);
    lines.push('           TRACKTOTS ATTENDANCE REPORT');
    lines.push(divider);
    lines.push('');
    lines.push(`Report Type: ${reportTypes.find(r => r.value === reportType)?.label}`);
    lines.push(`Date Range: ${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`);
    lines.push(`Child Filter: ${getSelectedChildName()}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push(divider);

    // Calculate overall statistics
    const presentRecords = records.filter(r => r.status === 'present' || r.status === 'late');
    const absentRecords = records.filter(r => r.status === 'absent');
    const excusedRecords = records.filter(r => r.status === 'excused');

    // Calculate scheduled days
    let totalScheduled = 0;
    const classScheduledMap = new Map<string, number>();

    for (const cls of classes) {
      const schedule = cls.schedule as Schedule;
      if (!schedule) continue;

      let classScheduled = 0;
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (schedule[dayName as keyof Schedule]?.enabled) {
          classScheduled++;
          totalScheduled++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      classScheduledMap.set(cls.id, classScheduled);
    }

    const attendanceRate = totalScheduled > 0 
      ? Math.round((presentRecords.length / totalScheduled) * 100) 
      : 0;

    // Summary section (always included)
    lines.push('');
    lines.push('OVERALL SUMMARY');
    lines.push(subDivider);
    lines.push(`Total Scheduled Classes: ${totalScheduled}`);
    lines.push(`Present: ${presentRecords.length}`);
    lines.push(`Absent: ${absentRecords.length}`);
    lines.push(`Excused: ${excusedRecords.length}`);
    lines.push(`Attendance Rate: ${attendanceRate}%`);
    lines.push('');

    if (includeOptions.classDetails) {
      lines.push(divider);
      lines.push('CLASS BREAKDOWN');
      lines.push(subDivider);

      for (const cls of classes) {
        const classRecords = records.filter(r => r.classId === cls.id);
        const classPresent = classRecords.filter(r => r.status === 'present' || r.status === 'late').length;
        const classScheduled = classScheduledMap.get(cls.id) || 0;
        const classRate = classScheduled > 0 ? Math.round((classPresent / classScheduled) * 100) : 0;

        lines.push('');
        lines.push(`📚 ${cls.name}`);
        lines.push(`   Category: ${cls.category}`);
        lines.push(`   Location: ${cls.locationName}`);
        lines.push(`   Scheduled: ${classScheduled} | Present: ${classPresent} | Rate: ${classRate}%`);

        // For detailed report, show date-by-date attendance
        if (reportType === 'detailed' && classRecords.length > 0) {
          lines.push('   ' + '-'.repeat(40));
          lines.push('   Attendance History:');
          
          const sortedRecords = classRecords.sort((a, b) => a.date.localeCompare(b.date));
          for (const record of sortedRecords) {
            const statusIcon = record.status === 'present' ? '✓' : 
                              record.status === 'late' ? '⏰' :
                              record.status === 'excused' ? '📋' : '✗';
            lines.push(`   ${record.date}: ${statusIcon} ${record.status.toUpperCase()}`);
            
            if (includeOptions.notesComments && record.notes) {
              lines.push(`      Note: ${record.notes}`);
            }
          }
        }
      }
      lines.push('');
    }

    // Child Progress Report
    if (reportType === 'child_progress') {
      lines.push(divider);
      lines.push('CHILD PROGRESS');
      lines.push(subDivider);

      const childrenToReport = selectedChildId 
        ? children.filter(c => c.id === selectedChildId)
        : children;

      for (const child of childrenToReport) {
        const childClasses = classes.filter(c => c.childId === child.id);
        
        if (childClasses.length === 0) continue;

        lines.push('');
        lines.push(`👶 ${child.name}`);
        lines.push(`   Classes Enrolled: ${childClasses.length}`);

        let childPresent = 0;
        let childScheduled = 0;

        for (const cls of childClasses) {
          const classRecords = records.filter(r => r.classId === cls.id);
          const present = classRecords.filter(r => r.status === 'present' || r.status === 'late').length;
          const scheduled = classScheduledMap.get(cls.id) || 0;

          childPresent += present;
          childScheduled += scheduled;

          const rate = scheduled > 0 ? Math.round((present / scheduled) * 100) : 0;
          lines.push(`   • ${cls.name}: ${present}/${scheduled} (${rate}%)`);
        }

        const overallRate = childScheduled > 0 
          ? Math.round((childPresent / childScheduled) * 100) 
          : 0;
        lines.push(`   Overall Attendance: ${overallRate}%`);
      }
      lines.push('');
    }

    if (includeOptions.statisticsCharts) {
      lines.push(divider);
      lines.push('STATISTICS');
      lines.push(subDivider);
      
      // Status distribution
      lines.push('');
      lines.push('Status Distribution:');
      const total = records.length || 1;
      lines.push(`  Present:  ${createTextBar(presentRecords.length, total)} ${presentRecords.length}`);
      lines.push(`  Absent:   ${createTextBar(absentRecords.length, total)} ${absentRecords.length}`);
      lines.push(`  Excused:  ${createTextBar(excusedRecords.length, total)} ${excusedRecords.length}`);
      lines.push('');
    }

    // Footer
    lines.push(divider);
    lines.push('End of Report');
    lines.push('Generated by TrackTots');
    lines.push(divider);

    return lines.join('\n');
  };

  const createTextBar = (value: number, max: number): string => {
    const width = 20;
    const filled = max > 0 ? Math.round((value / max) * width) : 0;
    return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
  };

  const generateCSVReport = async (
    classes: Class[],
    records: AttendanceRecord[],
    startDate: Date,
    endDate: Date
  ): Promise<string> => {
    const lines: string[] = [];

    // CSV Header
    lines.push('Date,Class Name,Category,Child,Status,Check-in Time,Notes');

    // Sort records by date
    const sortedRecords = records.sort((a, b) => a.date.localeCompare(b.date));

    for (const record of sortedRecords) {
      const cls = classes.find(c => c.id === record.classId);
      if (!cls) continue;

      const child = children.find(c => c.id === cls.childId);
      const checkInTime = record.checkInTime 
        ? new Date(record.checkInTime).toLocaleTimeString() 
        : '';
      const notes = record.notes ? `"${record.notes.replace(/"/g, '""')}"` : '';

      lines.push([
        record.date,
        `"${cls.name}"`,
        cls.category,
        child?.name || 'Unknown',
        record.status,
        checkInTime,
        notes,
      ].join(','));
    }

    return lines.join('\n');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Report</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <FileText size={24} color={COLORS.primary} />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Export Report</Text>
            <Text style={styles.infoCardSubtitle}>
              Customize and download your attendance report
            </Text>
          </View>
        </View>

        {/* Report Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Report Type</Text>
          <View style={styles.radioGroup}>
            {reportTypes.map(type => (
              <TouchableOpacity
                key={type.value}
                style={styles.radioButton}
                onPress={() => setReportType(type.value)}
              >
                <View style={[
                  styles.radioCircle,
                  reportType === type.value && styles.radioCircleSelected,
                ]}>
                  {reportType === type.value && (
                    <View style={styles.radioCircleInner} />
                  )}
                </View>
                <Text style={[
                  styles.radioLabel,
                  reportType === type.value && styles.radioLabelSelected,
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date Range</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              setShowDateRangePicker(!showDateRangePicker);
              setShowChildPicker(false);
            }}
          >
            <Text style={styles.pickerButtonText}>{getSelectedDateRangeLabel()}</Text>
            <ChevronDown size={20} color={COLORS.gray[500]} />
          </TouchableOpacity>
          {showDateRangePicker && (
            <View style={styles.dropdownMenu}>
              {dateRanges.map(range => (
                <TouchableOpacity
                  key={range.value}
                  style={[
                    styles.dropdownItem,
                    dateRange === range.value && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setDateRange(range.value);
                    setShowDateRangePicker(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    dateRange === range.value && styles.dropdownItemTextSelected,
                  ]}>
                    {range.label}
                  </Text>
                  {dateRange === range.value && (
                    <Check size={16} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Child Filter Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Include Children</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              setShowChildPicker(!showChildPicker);
              setShowDateRangePicker(false);
            }}
          >
            <Users size={18} color={COLORS.gray[600]} />
            <Text style={styles.pickerButtonText}>{getSelectedChildName()}</Text>
            <ChevronDown size={20} color={COLORS.gray[500]} />
          </TouchableOpacity>
          {showChildPicker && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  !selectedChildId && styles.dropdownItemSelected,
                ]}
                onPress={() => {
                  setSelectedChildId(null);
                  setShowChildPicker(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  !selectedChildId && styles.dropdownItemTextSelected,
                ]}>
                  All Children
                </Text>
                {!selectedChildId && <Check size={16} color={COLORS.primary} />}
              </TouchableOpacity>
              {children.map(child => (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    styles.dropdownItem,
                    selectedChildId === child.id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedChildId(child.id);
                    setShowChildPicker(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedChildId === child.id && styles.dropdownItemTextSelected,
                  ]}>
                    {child.name}
                  </Text>
                  {selectedChildId === child.id && (
                    <Check size={16} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Include Options Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Include in Report</Text>
          <View style={styles.toggleGroup}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Attendance Calendar</Text>
              <Switch
                value={includeOptions.attendanceCalendar}
                onValueChange={() => toggleIncludeOption('attendanceCalendar')}
                trackColor={{ false: COLORS.gray[200], true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Statistics & Charts</Text>
              <Switch
                value={includeOptions.statisticsCharts}
                onValueChange={() => toggleIncludeOption('statisticsCharts')}
                trackColor={{ false: COLORS.gray[200], true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Class Details</Text>
              <Switch
                value={includeOptions.classDetails}
                onValueChange={() => toggleIncludeOption('classDetails')}
                trackColor={{ false: COLORS.gray[200], true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Notes & Comments</Text>
              <Switch
                value={includeOptions.notesComments}
                onValueChange={() => toggleIncludeOption('notesComments')}
                trackColor={{ false: COLORS.gray[200], true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Export Format Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Export Format</Text>
          <View style={styles.formatButtonsRow}>
            <TouchableOpacity
              style={[
                styles.formatButton,
                exportFormat === 'pdf' && styles.formatButtonSelected,
              ]}
              onPress={() => setExportFormat('pdf')}
            >
              <FileText 
                size={20} 
                color={exportFormat === 'pdf' ? COLORS.primary : COLORS.gray[500]} 
              />
              <Text style={[
                styles.formatButtonText,
                exportFormat === 'pdf' && styles.formatButtonTextSelected,
              ]}>
                PDF
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.formatButton,
                exportFormat === 'csv' && styles.formatButtonSelected,
              ]}
              onPress={() => setExportFormat('csv')}
            >
              <BarChart3 
                size={20} 
                color={exportFormat === 'csv' ? COLORS.primary : COLORS.gray[500]} 
              />
              <Text style={[
                styles.formatButtonText,
                exportFormat === 'csv' && styles.formatButtonTextSelected,
              ]}>
                CSV
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Generate Button */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={generateReport}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Download size={20} color="#FFFFFF" />
          )}
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generating...' : 'Generate & Download'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray[600],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
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
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  infoCardSubtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 12,
  },

  // Radio Group
  radioGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 15,
    color: COLORS.gray[700],
  },
  radioLabelSelected: {
    fontWeight: '500',
    color: COLORS.gray[800],
  },

  // Picker Button
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    padding: 16,
    gap: 8,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.gray[700],
  },

  // Dropdown Menu
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  dropdownItemSelected: {
    backgroundColor: '#EBF5FF',
  },
  dropdownItemText: {
    fontSize: 15,
    color: COLORS.gray[700],
  },
  dropdownItemTextSelected: {
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Toggle Group
  toggleGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  toggleLabel: {
    fontSize: 15,
    color: COLORS.gray[700],
  },

  // Format Buttons
  formatButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    padding: 16,
    gap: 8,
  },
  formatButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EBF5FF',
  },
  formatButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  formatButtonTextSelected: {
    color: COLORS.primary,
  },

  // Bottom Button Container
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
