import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Users, MapPin, Calendar, BarChart3 } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import ChildrenScreen from '../screens/ChildrenScreen';
import { AddChildScreen, EditChildScreen, ChildDetailScreen } from '../screens/children';
import ClassesScreen from '../screens/ClassesScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ReportsScreen from '../screens/ReportsScreen';

// Stack param lists
type ChildrenStackParamList = {
  ChildrenList: undefined;
  AddChild: undefined;
  EditChild: { childId: string };
  ChildDetail: { childId: string };
};

// Tab param list
type RootTabParamList = {
  Home: undefined;
  ChildrenTab: undefined;
  ClassesTab: undefined;
  Attendance: undefined;
  Reports: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const ChildrenStack = createNativeStackNavigator<ChildrenStackParamList>();

// Children Stack Navigator
function ChildrenStackNavigator() {
  return (
    <ChildrenStack.Navigator screenOptions={{ headerShown: false }}>
      <ChildrenStack.Screen name="ChildrenList" component={ChildrenScreen} />
      <ChildrenStack.Screen name="AddChild" component={AddChildScreen} />
      <ChildrenStack.Screen name="EditChild" component={EditChildScreen} />
      <ChildrenStack.Screen name="ChildDetail" component={ChildDetailScreen} />
    </ChildrenStack.Navigator>
  );
}

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
        headerShown: false,
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
        name="ChildrenTab"
        component={ChildrenStackNavigator}
        options={{
          title: 'Children',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ClassesTab"
        component={ClassesScreen}
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MapPin color={color} size={size} />,
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