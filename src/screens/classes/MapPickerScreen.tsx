import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { ArrowLeft, MapPin, Navigation, Check, Building2, Info } from 'lucide-react-native';

import { COLORS } from '../../constants';

type MapPickerRouteParams = {
  MapPicker: {
    initialLocation?: {
      latitude: number;
      longitude: number;
      locationName?: string;
      address?: string;
    };
  };
};

export default function MapPickerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MapPickerRouteParams, 'MapPicker'>>();
  const insets = useSafeAreaInsets();

  const initialLocation = route.params?.initialLocation;

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationName, setLocationName] = useState(initialLocation?.locationName || '');
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [latitude, setLatitude] = useState(
    initialLocation?.latitude ? String(initialLocation.latitude) : ''
  );
  const [longitude, setLongitude] = useState(
    initialLocation?.longitude ? String(initialLocation.longitude) : ''
  );

  const handleGetCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to get your current location.'
        );
        setIsFetchingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = currentLocation.coords.latitude;
      const lng = currentLocation.coords.longitude;

      setLatitude(String(lat));
      setLongitude(String(lng));

      // Try to get address
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (results.length > 0) {
          const result = results[0];
          const addressParts = [
            result.street,
            result.city,
            result.region,
            result.postalCode,
          ].filter(Boolean);
          
          setAddress(addressParts.join(', '));
          
          if (!locationName) {
            setLocationName(result.name || result.street || 'Current Location');
          }
        }
      } catch (geocodeError) {
        console.error('Error reverse geocoding:', geocodeError);
      }

      Alert.alert('Success', 'Current location captured!');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location. Please enter coordinates manually.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleConfirm = () => {
    if (!locationName.trim()) {
      Alert.alert('Required', 'Please enter a location name.');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude and longitude values, or use "Get Current Location".');
      return;
    }

    if (lat < -90 || lat > 90) {
      Alert.alert('Invalid Latitude', 'Latitude must be between -90 and 90.');
      return;
    }

    if (lng < -180 || lng > 180) {
      Alert.alert('Invalid Longitude', 'Longitude must be between -180 and 180.');
      return;
    }

    // Navigate back with the selected location
    navigation.navigate('AddClass', {
      selectedLocation: {
        latitude: lat,
        longitude: lng,
        locationName: locationName.trim(),
        address: address.trim(),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Location</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Info size={20} color={COLORS.info} />
            <Text style={styles.infoTitle}>Location for Check-In</Text>
          </View>
          <Text style={styles.infoText}>
            Enter the location where this class takes place. This will be used for automatic attendance tracking when you're nearby.
          </Text>
        </View>

        {/* Get Current Location Button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handleGetCurrentLocation}
          disabled={isFetchingLocation}
        >
          {isFetchingLocation ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Navigation size={20} color={COLORS.primary} />
          )}
          <Text style={styles.currentLocationText}>
            {isFetchingLocation ? 'Getting Location...' : 'Use Current Location'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or enter manually</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Location Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location Name *</Text>
            <View style={styles.inputWithIcon}>
              <Building2 size={20} color={COLORS.gray[400]} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Dance Studio, Music School"
                placeholderTextColor={COLORS.gray[400]}
                value={locationName}
                onChangeText={setLocationName}
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address (Optional)</Text>
            <View style={styles.inputWithIcon}>
              <MapPin size={20} color={COLORS.gray[400]} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 123 Main St, City"
                placeholderTextColor={COLORS.gray[400]}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          {/* Coordinates */}
          <View style={styles.coordinatesRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.coordinateInput}
                placeholder="e.g., 37.7749"
                placeholderTextColor={COLORS.gray[400]}
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.coordinateInput}
                placeholder="e.g., -122.4194"
                placeholderTextColor={COLORS.gray[400]}
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.coordinateHint}>
            Tip: Use "Use Current Location" above to automatically fill coordinates when you're at the class location.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!locationName.trim() || !latitude || !longitude) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!locationName.trim() || !latitude || !longitude}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  headerSpacer: {
    width: 40,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.info,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 20,
  },

  // Current Location Button
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 10,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.gray[500],
  },

  // Form
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[700],
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.gray[800],
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.gray[800],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  coordinateHint: {
    fontSize: 13,
    color: COLORS.gray[500],
    lineHeight: 18,
    marginTop: 4,
  },

  // Bottom
  bottomContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
