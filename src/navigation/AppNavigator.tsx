import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, MapPin, Calendar, BarChart3 } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import ChildrenScreen from '../screens/ChildrenScreen';
import { AddChildScreen, EditChildScreen, ChildDetailScreen } from '../screens/children';
import ClassesScreen from '../screens/ClassesScreen';
import { AddClassScreen, EditClassScreen, ClassDetailScreen, MapPickerScreen } from '../screens/classes';
import AttendanceScreen from '../screens/AttendanceScreen';
import { ManualAttendanceScreen, DayDetailScreen } from '../screens/attendance';
import ReportsScreen from '../screens/ReportsScreen';
import { ExportReportScreen } from '../screens/reports';

// Stack param lists
type ChildrenStackParamList = {
  ChildrenList: undefined;
  AddChild: undefined;
  EditChild: { childId: string };
  ChildDetail: { childId: string };
};

type ClassesStackParamList = {
  ClassesList: undefined;
  AddClass: { childId?: string; selectedLocation?: LocationParam };
  EditClass: { classId: string; selectedLocation?: LocationParam };
  ClassDetail: { classId: string };
  MapPicker: { initialLocation?: LocationParam; returnScreen?: string; classId?: string };
};

type AttendanceStackParamList = {
  AttendanceList: undefined;
  ManualAttendance: { preselectedDate?: string; preselectedClassId?: string };
  DayDetail: { date: string };
};

type ReportsStackParamList = {
  ReportsDashboard: undefined;
  ExportReport: undefined;
};

type LocationParam = {
  latitude: number;
  longitude: number;
  locationName: string;
  address: string;
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
const ClassesStack = createNativeStackNavigator<ClassesStackParamList>();
const AttendanceStack = createNativeStackNavigator<AttendanceStackParamList>();
const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();

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

// Classes Stack Navigator
function ClassesStackNavigator() {
  return (
    <ClassesStack.Navigator screenOptions={{ headerShown: false }}>
      <ClassesStack.Screen name="ClassesList" component={ClassesScreen} />
      <ClassesStack.Screen name="AddClass" component={AddClassScreen} />
      <ClassesStack.Screen name="EditClass" component={EditClassScreen} />
      <ClassesStack.Screen name="ClassDetail" component={ClassDetailScreen} />
      <ClassesStack.Screen name="MapPicker" component={MapPickerScreen} />
    </ClassesStack.Navigator>
  );
}

// Attendance Stack Navigator
function AttendanceStackNavigator() {
  return (
    <AttendanceStack.Navigator screenOptions={{ headerShown: false }}>
      <AttendanceStack.Screen name="AttendanceList" component={AttendanceScreen} />
      <AttendanceStack.Screen name="ManualAttendance" component={ManualAttendanceScreen} />
      <AttendanceStack.Screen name="DayDetail" component={DayDetailScreen} />
    </AttendanceStack.Navigator>
  );
}

// Reports Stack Navigator
function ReportsStackNavigator() {
  return (
    <ReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <ReportsStack.Screen name="ReportsDashboard" component={ReportsScreen} />
      <ReportsStack.Screen name="ExportReport" component={ExportReportScreen} />
    </ReportsStack.Navigator>
  );
}

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
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
        component={ClassesStackNavigator}
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceStackNavigator}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <BarChart3 color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}