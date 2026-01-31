import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Search, Filter, Plus, BookOpen } from 'lucide-react-native';

import { ClassListCard } from '../components/classes';
import { COLORS, CATEGORIES } from '../constants';
import { getAllActiveClasses, getActiveChildren } from '../database/helpers';
import type Class from '../database/models/Class';
import type Child from '../database/models/Child';
import type { Schedule } from '../types';

interface ClassWithChild {
  id: string;
  childId: string;
  name: string;
  locationName: string;
  category: string;
  color: string;
  schedule: Schedule;
  childName: string;
}

interface SectionData {
  title: string;
  childId: string;
  data: ClassWithChild[];
}

export default function ClassesScreen() {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [classes, setClasses] = useState<ClassWithChild[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChildFilter, setSelectedChildFilter] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [allClasses, allChildren] = await Promise.all([
        getAllActiveClasses(),
        getActiveChildren(),
      ]);

      // Map child names to classes - explicitly extract needed properties
      const childMap = new Map(allChildren.map((c) => [c.id, c.name]));
      const classesWithChildren: ClassWithChild[] = allClasses.map((cls) => ({
        id: cls.id,
        childId: cls.childId,
        name: cls.name,
        locationName: cls.locationName,
        category: cls.category,
        color: cls.color,
        schedule: cls.schedule, // Access the getter properly
        childName: childMap.get(cls.childId) || 'Unknown',
      }));

      setClasses(classesWithChildren);
      setChildren(allChildren);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  }, []);

  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      await loadData();
      setIsLoading(false);
    };
    initLoad();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // Filter and group classes
  const filteredSections = useMemo(() => {
    let filtered = classes;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((cls) =>
        cls.name.toLowerCase().includes(query) ||
        cls.locationName.toLowerCase().includes(query)
      );
    }

    // Filter by child
    if (selectedChildFilter) {
      filtered = filtered.filter((cls) => cls.childId === selectedChildFilter);
    }

    // Filter by category
    if (selectedCategoryFilter) {
      filtered = filtered.filter(
        (cls) => cls.category.toLowerCase() === selectedCategoryFilter.toLowerCase()
      );
    }

    // Group by child
    const grouped = new Map<string, ClassWithChild[]>();
    filtered.forEach((cls) => {
      const existing = grouped.get(cls.childId) || [];
      existing.push(cls);
      grouped.set(cls.childId, existing);
    });

    const sections: SectionData[] = [];
    grouped.forEach((data, childId) => {
      const childName = data[0]?.childName || 'Unknown';
      sections.push({
        title: `${childName}'s Classes (${data.length})`,
        childId,
        data,
      });
    });

    return sections;
  }, [classes, searchQuery, selectedChildFilter, selectedCategoryFilter]);

  const getScheduleText = (cls: ClassWithChild) => {
    const schedule = cls.schedule;
    if (!schedule || typeof schedule !== 'object') return 'No schedule set';
    
    const days: string[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

    let firstTime = '';
    dayKeys.forEach((day, index) => {
      const daySchedule = schedule[day];
      if (daySchedule?.enabled) {
        days.push(dayNames[index]);
        if (!firstTime && daySchedule.startTime) {
          firstTime = daySchedule.startTime;
        }
      }
    });

    if (days.length === 0) return 'No schedule set';
    return `${days.join(', ')} - ${firstTime || 'Time TBD'}`;
  };

  const handleAddClass = () => {
    navigation.navigate('AddClass');
  };

  const handleClassPress = (classId: string) => {
    navigation.navigate('ClassDetail', { classId });
  };

  const handleFilterChip = (type: 'child' | 'category', value: string | null) => {
    if (type === 'child') {
      setSelectedChildFilter((prev) => (prev === value ? null : value));
    } else {
      setSelectedCategoryFilter((prev) => (prev === value ? null : value));
    }
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderClassItem = ({ item }: { item: ClassWithChild }) => (
    <ClassListCard
      id={item.id}
      name={item.name}
      locationName={item.locationName}
      scheduleText={getScheduleText(item)}
      category={item.category}
      color={item.color}
      onPress={() => handleClassPress(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <BookOpen size={48} color={COLORS.gray[300]} />
      </View>
      {searchQuery || selectedChildFilter || selectedCategoryFilter ? (
        <>
          <Text style={styles.emptyTitle}>No Classes Found</Text>
          <Text style={styles.emptySubtitle}>
            No classes match your current filters
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>No Classes Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first class to start tracking attendance
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddClass}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Add First Class</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  const totalClasses = filteredSections.reduce((sum, section) => sum + section.data.length, 0);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search classes..."
            placeholderTextColor={COLORS.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={COLORS.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsContainer}
        contentContainerStyle={styles.chipsContent}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            !selectedChildFilter && !selectedCategoryFilter && styles.chipActive,
          ]}
          onPress={() => {
            setSelectedChildFilter(null);
            setSelectedCategoryFilter(null);
          }}
        >
          <Text
            style={[
              styles.chipText,
              !selectedChildFilter && !selectedCategoryFilter && styles.chipTextActive,
            ]}
          >
            All Classes
          </Text>
        </TouchableOpacity>

        {children.map((child) => (
          <TouchableOpacity
            key={child.id}
            style={[
              styles.chip,
              selectedChildFilter === child.id && styles.chipActive,
            ]}
            onPress={() => handleFilterChip('child', child.id)}
          >
            <Text
              style={[
                styles.chipText,
                selectedChildFilter === child.id && styles.chipTextActive,
              ]}
            >
              {child.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.chipDivider} />

        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.chip,
              selectedCategoryFilter === category && styles.chipActive,
            ]}
            onPress={() => handleFilterChip('category', category)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategoryFilter === category && styles.chipTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add New Class</Text>
      </TouchableOpacity>

      {/* Classes List */}
      <SectionList
        sections={filteredSections}
        renderItem={renderClassItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          totalClasses === 0 && styles.emptyListContent,
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
        stickySectionHeadersEnabled={false}
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

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.gray[800],
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },

  // Filter Chips
  chipsContainer: {
    maxHeight: 50,
  },
  chipsContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.gray[300],
    marginHorizontal: 8,
    alignSelf: 'center',
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },

  // Section Header
  sectionHeader: {
    paddingVertical: 12,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[700],
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