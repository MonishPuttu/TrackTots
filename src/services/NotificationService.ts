import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import database from '../database';
import type Class from '../database/models/Class';
import type Child from '../database/models/Child';
import type { Schedule, DaySchedule } from '../types';

/**
 * NotificationService handles push notifications for:
 * - Pickup reminders (when class is about to end)
 * - Auto-attendance confirmations (when attendance is auto-marked)
 */
class NotificationService {
  private static initialized = false;

  /**
   * Initialize notification permissions and configure handler
   */
  static async initialize(): Promise<boolean> {
    console.log('[NotificationService] Initializing...');

    // Set notification handler (controls how notifications appear when app is foregrounded)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        'TrackTots uses notifications to remind you about pickups and confirm when attendance is automatically marked. You can enable notifications in your device settings.',
        [{ text: 'OK' }]
      );
      console.log('[NotificationService] Permission denied');
      return false;
    }

    // Android-specific notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'TrackTots',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    NotificationService.initialized = true;
    console.log('[NotificationService] Initialized successfully');
    return true;
  }

  /**
   * Schedule a pickup reminder for a specific class
   * Fires at (endTime - pickupReminderMinutes)
   */
  static async schedulePickupReminder(classItem: Class): Promise<string | null> {
    if (!classItem.enablePickupReminder) {
      return null;
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()] as keyof Schedule;

    let schedule: Schedule;
    try {
      schedule = JSON.parse(classItem.scheduleJson || '{}');
    } catch {
      console.warn(`[NotificationService] Failed to parse schedule for class "${classItem.name}"`);
      return null;
    }

    const todaySchedule: DaySchedule | undefined = schedule[today];

    if (!todaySchedule || !todaySchedule.enabled) {
      return null;
    }

    // Parse endTime (HH:mm)
    const [endHours, endMinutes] = todaySchedule.endTime.split(':').map(Number);
    const reminderMinutes = classItem.pickupReminderMinutes ?? 15;

    // Calculate trigger time
    const triggerDate = new Date();
    triggerDate.setHours(endHours, endMinutes, 0, 0);
    triggerDate.setMinutes(triggerDate.getMinutes() - reminderMinutes);

    // Don't schedule if trigger time is in the past
    if (triggerDate.getTime() <= Date.now()) {
      console.log(
        `[NotificationService] Pickup reminder for "${classItem.name}" is in the past, skipping`
      );
      return null;
    }

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Pickup Reminder 🏫',
          body: `Time to pick up from ${classItem.name}!`,
          data: { classId: classItem.id, type: 'pickup' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      console.log(
        `[NotificationService] Scheduled pickup reminder for "${classItem.name}" at ${triggerDate.toLocaleTimeString()} (id: ${identifier})`
      );
      return identifier;
    } catch (error) {
      console.error(`[NotificationService] Failed to schedule pickup reminder:`, error);
      return null;
    }
  }

  /**
   * Send an immediate attendance confirmation notification
   */
  static async sendAttendanceConfirmation(
    classItem: Class,
    childName: string
  ): Promise<string | null> {
    if (!classItem.enableAttendanceNotification) {
      console.log(
        `[NotificationService] Attendance notifications disabled for "${classItem.name}"`
      );
      return null;
    }

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Attendance Marked ✓',
          body: `${childName} is now marked present for ${classItem.name}`,
          data: { classId: classItem.id, type: 'attendance' },
          sound: 'default',
        },
        trigger: null, // Immediate
      });

      console.log(
        `[NotificationService] Sent attendance confirmation for "${classItem.name}" (${childName})`
      );
      return identifier;
    } catch (error) {
      console.error(`[NotificationService] Failed to send attendance confirmation:`, error);
      return null;
    }
  }

  /**
   * Schedule pickup reminders for all of today's active classes
   */
  static async scheduleAllPickupReminders(): Promise<number> {
    console.log('[NotificationService] Scheduling all pickup reminders...');

    // Cancel existing scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];

    try {
      // Get all active classes
      const allClasses = await database
        .get<Class>('classes')
        .query(
          Q.where('is_active', true),
          Q.where('enable_pickup_reminder', true)
        )
        .fetch();

      let scheduledCount = 0;

      for (const classItem of allClasses) {
        // Check if class runs today
        try {
          const schedule: Schedule = JSON.parse(classItem.scheduleJson || '{}');
          const todaySchedule = schedule[today as keyof Schedule];

          if (!todaySchedule?.enabled) {
            continue;
          }
        } catch {
          continue;
        }

        const id = await NotificationService.schedulePickupReminder(classItem);
        if (id) {
          scheduledCount++;
        }
      }

      console.log(
        `[NotificationService] Scheduled ${scheduledCount} pickup reminder(s) for today`
      );
      return scheduledCount;
    } catch (error) {
      console.error('[NotificationService] Error scheduling pickup reminders:', error);
      return 0;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[NotificationService] All scheduled notifications cancelled');
    } catch (error) {
      console.error('[NotificationService] Error cancelling notifications:', error);
    }
  }

  /**
   * Fetch the child name for a given class
   */
  static async getChildNameForClass(classItem: Class): Promise<string> {
    try {
      const child = await database.get<Child>('children').find(classItem.childId);
      return child.name;
    } catch (error) {
      console.error('[NotificationService] Error fetching child name:', error);
      return 'Your child';
    }
  }
}

export default NotificationService;
