import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, MapPin, Calendar, BarChart3 } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import ChildrenScreen from '../screens/ChildrenScreen';
import ClassesScreen from '../screens/ClassesScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ReportsScreen from '../screens/ReportsScreen';

type RootTabParamList = {
  Home: undefined;
  Children: undefined;
  Classes: undefined;
  Attendance: undefined;
  Reports: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Children"
        component={ChildrenScreen}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Classes"
        component={ClassesScreen}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MapPin color={color} size={size} />,
          tabBarBadge: 8,
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <BarChart3 color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}