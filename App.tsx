import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import LocationService from './src/services/LocationService';

export default function App() {
  useEffect(() => {
    // Initialize location service and start tracking on app mount
    const initializeLocationTracking = async () => {
      try {
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
        console.error('[App] Error initializing location tracking:', error);
      }
    };

    initializeLocationTracking();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}