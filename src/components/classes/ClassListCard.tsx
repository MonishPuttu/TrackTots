import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, ChevronRight } from 'lucide-react-native';

import { COLORS, CLASS_COLORS } from '../../constants';

interface ClassListCardProps {
  id: string;
  name: string;
  locationName: string;
  scheduleText: string;
  category: string;
  color: string;
  onPress: () => void;
}

export default function ClassListCard({
  name,
  locationName,
  scheduleText,
  category,
  color,
  onPress,
}: ClassListCardProps) {
  const classColor = CLASS_COLORS[color as keyof typeof CLASS_COLORS] || COLORS.primary;

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'music':
        return '#8B5CF6';
      case 'sports':
        return '#10B981';
      case 'academic':
        return '#3B82F6';
      case 'arts':
        return '#EC4899';
      default:
        return COLORS.gray[500];
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.colorBand, { backgroundColor: classColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.className} numberOfLines={1}>{name}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(category) + '20' }]}>
            <Text style={[styles.categoryText, { color: getCategoryColor(category) }]}>
              {category}
            </Text>
          </View>
        </View>
        <View style={styles.locationRow}>
          <MapPin size={14} color={COLORS.gray[400]} />
          <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
        </View>
        <Text style={styles.scheduleText}>{scheduleText}</Text>
      </View>
      <ChevronRight size={20} color={COLORS.gray[400]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  colorBand: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.gray[500],
    flex: 1,
  },
  scheduleText: {
    fontSize: 12,
    color: COLORS.gray[400],
  },
});
