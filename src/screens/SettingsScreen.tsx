import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCircle,
  MapPin,
  Battery,
  Cloud,
  Download,
  Trash2,
  Shield,
  FileText,
  Info,
  ChevronRight,
  Moon,
  Zap,
  ZapOff,
  BatteryMedium,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { COLORS } from '../constants';
import { useAppStore } from '../store/appStore';
import LocationService from '../services/LocationService';
import database from '../database';

// ─── Battery mode configs ────────────────────────────────────────────────────
const BATTERY_MODES = [
  {
    key: 'high_accuracy' as const,
    label: 'High Accuracy',
    description: 'Updates every 30 seconds',
    icon: Zap,
    timeInterval: 30000,
    distanceInterval: 20,
  },
  {
    key: 'balanced' as const,
    label: 'Balanced',
    description: 'Updates every 1 minute',
    icon: BatteryMedium,
    timeInterval: 60000,
    distanceInterval: 50,
  },
  {
    key: 'battery_saver' as const,
    label: 'Battery Saver',
    description: 'Updates every 5 minutes',
    icon: ZapOff,
    timeInterval: 300000,
    distanceInterval: 100,
  },
];

// ─── Section header component ────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Toggle row component ────────────────────────────────────────────────────
function ToggleRow({
  icon: Icon,
  iconColor,
  label,
  sublabel,
  value,
  onValueChange,
  disabled,
}: {
  icon: any;
  iconColor: string;
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, disabled && styles.textDisabled]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.rowSublabel, disabled && styles.textDisabled]}>{sublabel}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: COLORS.gray[200], true: COLORS.primary + '80' }}
        thumbColor={value ? COLORS.primary : COLORS.gray[50]}
      />
    </View>
  );
}

// ─── Tappable row component ──────────────────────────────────────────────────
function TappableRow({
  icon: Icon,
  iconColor,
  label,
  sublabel,
  onPress,
  rightElement,
  disabled,
}: {
  icon: any;
  iconColor: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
        <Icon size={20} color={disabled ? COLORS.gray[400] : iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, disabled && styles.textDisabled]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.rowSublabel, disabled && styles.textDisabled]}>{sublabel}</Text>
        ) : null}
      </View>
      {rightElement ?? <ChevronRight size={20} color={COLORS.gray[400]} />}
    </TouchableOpacity>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider() {
  return <View style={styles.divider} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Zustand store
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const isLocationEnabled = useAppStore((s) => s.isLocationEnabled);
  const setIsLocationEnabled = useAppStore((s) => s.setIsLocationEnabled);
  const batteryOptimizationMode = useAppStore((s) => s.batteryOptimizationMode);
  const setBatteryOptimizationMode = useAppStore((s) => s.setBatteryOptimizationMode);

  // Local state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pickupRemindersEnabled, setPickupRemindersEnabled] = useState(true);
  const [attendanceAlertsEnabled, setAttendanceAlertsEnabled] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showBatteryPicker, setShowBatteryPicker] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');

  // ── Calculate cache size on mount ──────────────────────────────────────────
  useEffect(() => {
    estimateCacheSize();
  }, []);

  const estimateCacheSize = async () => {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) {
        setCacheSize('Unknown');
        return;
      }
      const info = await FileSystem.getInfoAsync(cacheDir);
      if (info.exists && 'size' in info && info.size) {
        const mb = (info.size / (1024 * 1024)).toFixed(1);
        setCacheSize(`${mb} MB`);
      } else {
        setCacheSize('< 1 MB');
      }
    } catch {
      setCacheSize('Unknown');
    }
  };

  // ── Location tracking toggle ───────────────────────────────────────────────
  const handleLocationToggle = useCallback(
    async (enabled: boolean) => {
      const instance = LocationService.getInstance();

      if (enabled) {
        const started = await instance.startTracking();
        if (started) {
          setIsLocationEnabled(true);
        } else {
          Alert.alert(
            'Permission Required',
            'Location permissions are needed for background tracking. Please grant them in your device settings.'
          );
        }
      } else {
        Alert.alert(
          'Disable Tracking?',
          'Disabling background tracking will prevent automatic attendance marking. You can still mark attendance manually.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await instance.stopTracking();
                setIsLocationEnabled(false);
              },
            },
          ]
        );
      }
    },
    [setIsLocationEnabled]
  );

  // ── Battery mode change ────────────────────────────────────────────────────
  const handleBatteryModeChange = useCallback(
    async (mode: 'high_accuracy' | 'balanced' | 'battery_saver') => {
      setBatteryOptimizationMode(mode);
      setShowBatteryPicker(false);

      // Restart tracking with new interval if currently tracking
      if (isLocationEnabled) {
        const instance = LocationService.getInstance();
        await instance.stopTracking();

        // Brief delay to let the task unregister
        await new Promise((resolve) => setTimeout(resolve, 500));

        await instance.startTracking();
        console.log(`[Settings] Restarted tracking with ${mode} mode`);
      }
    },
    [isLocationEnabled, setBatteryOptimizationMode]
  );

  // ── Backup data ────────────────────────────────────────────────────────────
  const handleBackup = useCallback(async () => {
    setIsBackingUp(true);

    try {
      // Collect data from all tables
      const children = await database.get('children').query().fetch();
      const classes = await database.get('classes').query().fetch();
      const attendanceRecords = await database.get('attendance_records').query().fetch();
      const geofenceEvents = await database.get('geofence_events').query().fetch();

      const backupData = {
        exportDate: new Date().toISOString(),
        appName: 'TrackTots',
        version: '1.0.0',
        data: {
          children: children.map((r) => ({ ...r._raw })),
          classes: classes.map((r) => ({ ...r._raw })),
          attendanceRecords: attendanceRecords.map((r) => ({ ...r._raw })),
          geofenceEvents: geofenceEvents.map((r) => ({ ...r._raw })),
        },
        summary: {
          childrenCount: children.length,
          classesCount: classes.length,
          attendanceRecordsCount: attendanceRecords.length,
          geofenceEventsCount: geofenceEvents.length,
        },
      };

      const json = JSON.stringify(backupData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `TrackTots_Backup_${timestamp}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export TrackTots Backup',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Backup Created', `Backup saved to:\n${filePath}`);
      }
    } catch (error) {
      console.error('[Settings] Backup error:', error);
      Alert.alert('Backup Failed', 'An error occurred while creating the backup.');
    } finally {
      setIsBackingUp(false);
    }
  }, []);

  // ── Clear cache ────────────────────────────────────────────────────────────
  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache?',
      'This will remove temporary files. Your data will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const cacheDir = FileSystem.cacheDirectory;
              if (cacheDir) {
                const contents = await FileSystem.readDirectoryAsync(cacheDir);
                for (const file of contents) {
                  await FileSystem.deleteAsync(`${cacheDir}${file}`, {
                    idempotent: true,
                  });
                }
              }
              setCacheSize('0 MB');
              Alert.alert('Done', 'Cache cleared successfully.');
            } catch (error) {
              console.error('[Settings] Clear cache error:', error);
              Alert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  }, []);

  // ── Get current battery mode config ────────────────────────────────────────
  const currentBatteryMode = BATTERY_MODES.find((m) => m.key === batteryOptimizationMode)!;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─────────────────────────────────────────────────────────────────
            SECTION 1: GENERAL
        ───────────────────────────────────────────────────────────────── */}
        <SectionHeader title="GENERAL" />
        <View style={styles.card}>
          <ToggleRow
            icon={Bell}
            iconColor={COLORS.primary}
            label="Notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />

          {notificationsEnabled && (
            <>
              <Divider />
              <ToggleRow
                icon={BellRing}
                iconColor={COLORS.warning}
                label="Pickup Reminders"
                sublabel="Remind before class ends"
                value={pickupRemindersEnabled}
                onValueChange={setPickupRemindersEnabled}
              />
              <Divider />
              <ToggleRow
                icon={CheckCircle}
                iconColor={COLORS.success}
                label="Auto-Attendance Alerts"
                sublabel="Notify when attendance is auto-marked"
                value={attendanceAlertsEnabled}
                onValueChange={setAttendanceAlertsEnabled}
              />
            </>
          )}

          <Divider />
          <ToggleRow
            icon={Moon}
            iconColor={COLORS.secondary}
            label="Dark Mode"
            value={isDarkMode}
            onValueChange={toggleDarkMode}
          />
        </View>

        {/* ─────────────────────────────────────────────────────────────────
            SECTION 2: LOCATION & TRACKING
        ───────────────────────────────────────────────────────────────── */}
        <SectionHeader title="LOCATION & TRACKING" />
        <View style={styles.card}>
          <ToggleRow
            icon={MapPin}
            iconColor={COLORS.success}
            label="Background Location Tracking"
            sublabel={isLocationEnabled ? 'Tracking active' : 'Tracking disabled'}
            value={isLocationEnabled}
            onValueChange={handleLocationToggle}
          />

          <Divider />

          {/* Battery mode selector */}
          <TappableRow
            icon={Battery}
            iconColor="#F59E0B"
            label="Battery Mode"
            sublabel={currentBatteryMode.description}
            onPress={() => setShowBatteryPicker((v) => !v)}
            rightElement={
              <View style={styles.batteryBadge}>
                <Text style={styles.batteryBadgeText}>{currentBatteryMode.label}</Text>
              </View>
            }
          />

          {/* Battery mode picker (inline) */}
          {showBatteryPicker && (
            <View style={styles.batteryPickerContainer}>
              {BATTERY_MODES.map((mode) => {
                const isSelected = mode.key === batteryOptimizationMode;
                return (
                  <TouchableOpacity
                    key={mode.key}
                    style={[styles.batteryOption, isSelected && styles.batteryOptionSelected]}
                    onPress={() => handleBatteryModeChange(mode.key)}
                    activeOpacity={0.7}
                  >
                    <mode.icon
                      size={18}
                      color={isSelected ? COLORS.primary : COLORS.gray[500]}
                    />
                    <View style={styles.batteryOptionText}>
                      <Text
                        style={[
                          styles.batteryOptionLabel,
                          isSelected && styles.batteryOptionLabelSelected,
                        ]}
                      >
                        {mode.label}
                      </Text>
                      <Text style={styles.batteryOptionDesc}>{mode.description}</Text>
                    </View>
                    {isSelected && <CheckCircle size={18} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ─────────────────────────────────────────────────────────────────
            SECTION 3: DATA & SYNC
        ───────────────────────────────────────────────────────────────── */}
        <SectionHeader title="DATA & SYNC" />
        <View style={styles.card}>
          <TappableRow
            icon={Cloud}
            iconColor={COLORS.gray[400]}
            label="Cloud Sync"
            sublabel="Coming soon"
            disabled
            rightElement={
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            }
          />

          <Divider />

          <TappableRow
            icon={Download}
            iconColor={COLORS.primary}
            label="Backup Data"
            sublabel="Export all data as JSON"
            onPress={handleBackup}
            rightElement={
              isBackingUp ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>Create Backup</Text>
                </View>
              )
            }
          />

          <Divider />

          <TappableRow
            icon={Trash2}
            iconColor={COLORS.danger}
            label="Clear Cache"
            sublabel={cacheSize}
            onPress={handleClearCache}
            rightElement={<ChevronRight size={20} color={COLORS.gray[400]} />}
          />
        </View>

        {/* ─────────────────────────────────────────────────────────────────
            SECTION 4: ACCOUNT
        ───────────────────────────────────────────────────────────────── */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.card}>
          <TappableRow
            icon={Shield}
            iconColor={COLORS.secondary}
            label="Privacy Policy"
            onPress={() =>
              Alert.alert('Privacy Policy', 'Privacy policy will open in a browser in a future release.')
            }
          />

          <Divider />

          <TappableRow
            icon={FileText}
            iconColor={COLORS.info}
            label="Terms of Service"
            onPress={() =>
              Alert.alert(
                'Terms of Service',
                'Terms of service will open in a browser in a future release.'
              )
            }
          />

          <Divider />

          <TappableRow
            icon={Info}
            iconColor={COLORS.gray[600]}
            label="About"
            onPress={() =>
              Alert.alert(
                'TrackTots',
                [
                  'Version 1.0.0 (Build 1)',
                  '',
                  'Track your child\'s class attendance automatically using geolocation.',
                  '',
                  'Built with:',
                  '• React Native / Expo',
                  '• WatermelonDB',
                  '• expo-location',
                  '• expo-notifications',
                  '• react-native-maps',
                  '• Zustand',
                  '',
                  '© 2026 TrackTots',
                ].join('\n')
              )
            }
          />
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>TrackTots v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
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

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray[500],
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  // ── Row ────────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray[800],
  },
  rowSublabel: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  textDisabled: {
    color: COLORS.gray[400],
  },

  // ── Divider ────────────────────────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.gray[200],
    marginLeft: 64,
  },

  // ── Battery picker ─────────────────────────────────────────────────────────
  batteryBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  batteryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  batteryPickerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  batteryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.gray[50],
    gap: 12,
  },
  batteryOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  batteryOptionText: {
    flex: 1,
    gap: 2,
  },
  batteryOptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[700],
  },
  batteryOptionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  batteryOptionDesc: {
    fontSize: 12,
    color: COLORS.gray[500],
  },

  // ── Badges ─────────────────────────────────────────────────────────────────
  comingSoonBadge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray[400],
  },
  actionBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footerText: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.gray[400],
    marginTop: 28,
  },
});
