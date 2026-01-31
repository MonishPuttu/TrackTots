import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Plus, Users } from 'lucide-react-native';

import { ChildCard } from '../components/children';
import { COLORS } from '../constants';
import {
  getActiveChildren,
  getChildClasses,
  getClassAttendance,
} from '../database/helpers';
import type Child from '../database/models/Child';

interface ChildWithStats {
  child: Child;
  classCount: number;
  attendanceRate: number;
}

export default function ChildrenScreen() {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [childrenWithStats, setChildrenWithStats] = useState<ChildWithStats[]>([]);

  const loadChildren = useCallback(async () => {
    try {
      const children = await getActiveChildren();
      
      // Calculate stats for each child
      const childrenData: ChildWithStats[] = await Promise.all(
        children.map(async (child) => {
          const classes = await getChildClasses(child.id);
          const classCount = classes.length;
          
          // Calculate attendance rate
          let totalRecords = 0;
          let attendedRecords = 0;
          
          const now = new Date();
          const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
          
          for (const cls of classes) {
            const records = await getClassAttendance(cls.id, startOfMonth, endOfMonth);
            totalRecords += records.length;
            attendedRecords += records.filter(
              (r) => r.status === 'present' || r.status === 'late'
            ).length;
          }
          
          const attendanceRate = totalRecords > 0
            ? Math.round((attendedRecords / totalRecords) * 100)
            : 0;
          
          return { child, classCount, attendanceRate };
        })
      );
      
      setChildrenWithStats(childrenData);
    } catch (error) {
      console.error('Error loading children:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      await loadChildren();
      setIsLoading(false);
    };
    initLoad();
  }, [loadChildren]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadChildren();
    }, [loadChildren])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChildren();
    setIsRefreshing(false);
  }, [loadChildren]);

  const handleAddChild = () => {
    navigation.navigate('AddChild');
  };

  const handleChildPress = (childId: string) => {
    navigation.navigate('ChildDetail', { childId });
  };

  const handleEditChild = (childId: string) => {
    navigation.navigate('EditChild', { childId });
  };

  const renderChildItem = ({ item }: { item: ChildWithStats }) => (
    <ChildCard
      id={item.child.id}
      name={item.child.name}
      age={item.child.age}
      classCount={item.classCount}
      attendanceRate={item.attendanceRate}
      avatarUri={item.child.avatarUri}
      onPress={() => handleChildPress(item.child.id)}
      onEdit={() => handleEditChild(item.child.id)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Users size={48} color={COLORS.gray[300]} />
      </View>
      <Text style={styles.emptyTitle}>No Children Yet</Text>
      <Text style={styles.emptySubtitle}>
        Add your first child to start tracking their class attendance
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddChild}>
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Add Your First Child</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading children...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerIconContainer}>
          <Users size={24} color={COLORS.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Your Children</Text>
          <Text style={styles.headerSubtitle}>
            {childrenWithStats.length} active {childrenWithStats.length === 1 ? 'child' : 'children'}
          </Text>
        </View>
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddChild}>
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add New Child</Text>
      </TouchableOpacity>

      {/* Children List */}
      <FlatList
        data={childrenWithStats}
        renderItem={renderChildItem}
        keyExtractor={(item) => item.child.id}
        contentContainerStyle={[
          styles.listContent,
          childrenWithStats.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
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
    color: COLORS.gray[500],
  },

  // Header Card
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 2,
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // List
  listContent: {
    padding: 20,
    paddingTop: 12,
  },
  emptyListContent: {
    flex: 1,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
