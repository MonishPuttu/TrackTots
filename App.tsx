import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import LocationService from './src/services/LocationService';
import NotificationService from './src/services/NotificationService';

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initialize location service and start tracking on app mount
    const initializeServices = async () => {
      try {
        // Initialize notifications
        console.log('[App] Initializing notification service...');
        await NotificationService.initialize();
        await NotificationService.scheduleAllPickupReminders();

        // Initialize location tracking
        console.log('[App] Initializing location service...');
        const hasPermission = await LocationService.initialize();
        
        if (hasPermission) {
          const instance = LocationService.getInstance();
          const started = await instance.startTracking();
          console.log('[App] Location tracking started:', started);
        } else {
          console.log('[App] Location permission not granted, tracking not started');
        }
      } catch (error) {
        console.error('[App] Error initializing services:', error);
      }
    };

    initializeServices();

    // Handle notification taps
    const notificationResponseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('[App] Notification tapped:', data);

        if (data?.type === 'pickup' && data?.classId) {
          // Navigate to the class detail
          navigationRef.current?.navigate('Classes', {
            screen: 'ClassDetail',
            params: { classId: data.classId },
          });
        } else if (data?.type === 'attendance') {
          // Navigate to attendance tab
          navigationRef.current?.navigate('Attendance');
        }
      });

    // Reschedule pickup reminders when app comes to foreground 
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          console.log('[App] App came to foreground, rescheduling pickup reminders');
          NotificationService.scheduleAllPickupReminders();
        }
        appState.current = nextAppState;
      }
    );

    return () => {
      notificationResponseSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}