import { create } from 'zustand';

interface AppState {
  // Selected child filter
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
  
  // Location settings
  isLocationEnabled: boolean;
  setIsLocationEnabled: (enabled: boolean) => void;
  
  // Battery optimization
  batteryOptimizationMode: 'high_accuracy' | 'balanced' | 'battery_saver';
  setBatteryOptimizationMode: (mode: 'high_accuracy' | 'balanced' | 'battery_saver') => void;
  
  // UI preferences
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  selectedChildId: null,
  isLocationEnabled: false,
  batteryOptimizationMode: 'balanced',
  isDarkMode: false,
  
  // Actions
  setSelectedChildId: (id) => set({ selectedChildId: id }),
  setIsLocationEnabled: (enabled) => set({ isLocationEnabled: enabled }),
  setBatteryOptimizationMode: (mode) => set({ batteryOptimizationMode: mode }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));