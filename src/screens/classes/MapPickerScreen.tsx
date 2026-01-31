import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { ArrowLeft, MapPin, Navigation, Check } from 'lucide-react-native';

import { COLORS } from '../../constants';

type MapPickerRouteParams = {
  MapPicker: {
    initialLocation?: {
      latitude: number;
      longitude: number;
      locationName?: string;
      address?: string;
    };
    onLocationSelect: (location: {
      latitude: number;
      longitude: number;
      locationName: string;
      address: string;
    }) => void;
  };
};

export default function MapPickerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MapPickerRouteParams, 'MapPicker'>>();
  const mapRef = useRef<MapView>(null);

  const initialLocation = route.params?.initialLocation;

  const [isLoading, setIsLoading] = useState(true);
  const [markerPosition, setMarkerPosition] = useState({
    latitude: initialLocation?.latitude || 37.78825,
    longitude: initialLocation?.longitude || -122.4324,
  });
  const [locationName, setLocationName] = useState(initialLocation?.locationName || '');
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [region, setRegion] = useState<Region>({
    latitude: initialLocation?.latitude || 37.78825,
    longitude: initialLocation?.longitude || -122.4324,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show your current location on the map.'
        );
        setIsLoading(false);
        return;
      }

      // Get current location if no initial location provided
      if (!initialLocation) {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const newPosition = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };

        setMarkerPosition(newPosition);
        setRegion({
          ...newPosition,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        // Try to get address
        await reverseGeocode(newPosition.latitude, newPosition.longitude);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location.');
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
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
          setLocationName(result.name || result.street || 'Selected Location');
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setMarkerPosition(coordinate);
    reverseGeocode(coordinate.latitude, coordinate.longitude);
  };

  const handleMarkerDragEnd = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setMarkerPosition(coordinate);
    reverseGeocode(coordinate.latitude, coordinate.longitude);
  };

  const handleGoToCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newPosition = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setMarkerPosition(newPosition);
      mapRef.current?.animateToRegion({
        ...newPosition,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      await reverseGeocode(newPosition.latitude, newPosition.longitude);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not get your current location.');
    }
  };

  const handleConfirm = () => {
    if (!locationName.trim()) {
      Alert.alert('Required', 'Please enter a location name.');
      return;
    }

    // Navigate back with the selected location
    navigation.navigate('AddClass', {
      selectedLocation: {
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
        locationName: locationName.trim(),
        address: address.trim(),
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick Location</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          <Marker
            coordinate={markerPosition}
            draggable
            onDragEnd={handleMarkerDragEnd}
          />
        </MapView>

        {/* Current Location Button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handleGoToCurrentLocation}
        >
          <Navigation size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Location Details Card */}
      <View style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <MapPin size={20} color={COLORS.primary} />
          <Text style={styles.detailsTitle}>Selected Location</Text>
        </View>

        <TextInput
          style={styles.locationNameInput}
          placeholder="Enter location name (e.g., Music School)"
          placeholderTextColor={COLORS.gray[400]}
          value={locationName}
          onChangeText={setLocationName}
        />

        <View style={styles.coordinatesRow}>
          <Text style={styles.coordinatesLabel}>Coordinates:</Text>
          <Text style={styles.coordinatesValue}>
            {markerPosition.latitude.toFixed(6)}, {markerPosition.longitude.toFixed(6)}
          </Text>
        </View>

        {address ? (
          <View style={styles.addressRow}>
            <Text style={styles.addressLabel}>Address:</Text>
            <Text style={styles.addressValue}>{address}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
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

  // Map
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  currentLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  locationNameInput: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.gray[800],
    marginBottom: 12,
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  coordinatesLabel: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginRight: 8,
  },
  coordinatesValue: {
    fontSize: 13,
    color: COLORS.gray[700],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginRight: 8,
  },
  addressValue: {
    fontSize: 13,
    color: COLORS.gray[700],
    flex: 1,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
