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
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { ArrowLeft, Navigation, Check } from 'lucide-react-native';

import { COLORS } from '../../constants';
import LocationService from '../../services/LocationService';

type MapPickerRouteParams = {
  MapPicker: {
    initialLocation?: {
      latitude: number;
      longitude: number;
      locationName?: string;
      address?: string;
    };
    returnScreen?: string;
  };
};

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const getLeafletHTML = (lat: number, lng: number, accuracy: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${lat}, ${lng}], 16);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
    
    var circle = null;
    if (${accuracy} > 0) {
      circle = L.circle([${lat}, ${lng}], {
        radius: ${accuracy},
        color: 'rgba(59, 130, 246, 0.5)',
        fillColor: 'rgba(59, 130, 246, 0.2)',
        fillOpacity: 0.3,
      }).addTo(map);
    }

    function sendLocation(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'locationSelected',
        latitude: lat,
        longitude: lng,
      }));
    }

    marker.on('dragend', function(e) {
      var pos = e.target.getLatLng();
      sendLocation(pos.lat, pos.lng);
      if (circle) circle.setLatLng(pos);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      sendLocation(e.latlng.lat, e.latlng.lng);
      if (circle) circle.setLatLng(e.latlng);
    });

    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'moveTo') {
          var latlng = L.latLng(data.latitude, data.longitude);
          map.setView(latlng, 16);
          marker.setLatLng(latlng);
          if (circle) {
            circle.setLatLng(latlng);
            if (data.accuracy > 0) circle.setRadius(data.accuracy);
          } else if (data.accuracy > 0) {
            circle = L.circle(latlng, {
              radius: data.accuracy,
              color: 'rgba(59, 130, 246, 0.5)',
              fillColor: 'rgba(59, 130, 246, 0.2)',
              fillOpacity: 0.3,
            }).addTo(map);
          }
        }
      } catch(e) {}
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
  <\/script>
</body>
</html>
`;

export default function MapPickerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MapPickerRouteParams, 'MapPicker'>>();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const initialLocation = route.params?.initialLocation;
  const returnScreen = route.params?.returnScreen || 'AddClass';

  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationName, setLocationName] = useState(initialLocation?.locationName || '');
  const [location, setLocation] = useState<LocationData | null>(
    initialLocation
      ? {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          accuracy: 0,
        }
      : null
  );
  const [mapReady, setMapReady] = useState(false);

  const defaultLat = initialLocation?.latitude ?? 37.7749;
  const defaultLng = initialLocation?.longitude ?? -122.4194;

  useEffect(() => {
    if (!initialLocation) {
      fetchCurrentLocation();
    } else {
      setIsLoadingLocation(false);
    }
  }, []);

  const fetchCurrentLocation = async () => {
    setIsFetchingLocation(true);
    setIsLoadingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to auto-detect your current location. You can still pick a location on the map manually.'
        );
        setIsLoadingLocation(false);
        setIsFetchingLocation(false);
        return;
      }

      const instance = LocationService.getInstance();
      const currentLocation = await instance.getCurrentLocation();

      if (currentLocation) {
        const { latitude, longitude, accuracy } = currentLocation.coords;

        setLocation({
          latitude,
          longitude,
          accuracy: accuracy || 0,
        });

        if (mapReady && webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: 'moveTo',
              latitude,
              longitude,
              accuracy: accuracy || 0,
            })
          );
        }

        try {
          const results = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (results.length > 0 && !locationName) {
            const result = results[0];
            const addressParts = [result.street, result.city].filter(Boolean);
            setLocationName(addressParts.join(', ') || result.name || 'Current Location');
          }
        } catch (geocodeError) {
          console.warn('Reverse geocoding failed:', geocodeError);
        }
      } else {
        Alert.alert(
          'Location Error',
          'Could not get your current location. Please pick a location on the map manually.'
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location.');
    } finally {
      setIsLoadingLocation(false);
      setIsFetchingLocation(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    Keyboard.dismiss();
    await fetchCurrentLocation();
  };

  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const result = results[0];
        const addressParts = [result.street, result.city].filter(Boolean);
        const newName = addressParts.join(', ') || result.name || '';
        if (newName) {
          setLocationName(newName);
        }
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        setLocation((prev) => ({
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: prev?.accuracy || 0,
        }));
        reverseGeocodeLocation(data.latitude, data.longitude);
      }
    } catch (e) {
      console.warn('Failed to parse WebView message:', e);
    }
  };

  const handleConfirm = () => {
    if (!locationName.trim()) {
      Alert.alert('Required', 'Please enter a location name.');
      return;
    }

    if (!location) {
      Alert.alert('Required', 'Please select a location on the map.');
      return;
    }

    navigation.navigate(returnScreen, {
      selectedLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: locationName.trim(),
        address: locationName.trim(),
        accuracy: location.accuracy,
      },
    });
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy < 20) return COLORS.success;
    if (accuracy <= 50) return '#F59E0B';
    return COLORS.danger;
  };

  const getAccuracyBackgroundColor = (accuracy: number): string => {
    if (accuracy < 20) return '#DCFCE7';
    if (accuracy <= 50) return '#FEF3C7';
    return '#FEE2E2';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick Location</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Map View */}
      <View style={styles.mapWrapper}>
        {isLoadingLocation && !location && !mapReady ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{
              html: getLeafletHTML(
                location?.latitude ?? defaultLat,
                location?.longitude ?? defaultLng,
                location?.accuracy ?? 0
              ),
            }}
            style={styles.map}
            onMessage={handleWebViewMessage}
            onLoad={() => setMapReady(true)}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading map...</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Bottom Info Card */}
      <View style={[styles.infoCard, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handleUseCurrentLocation}
          disabled={isFetchingLocation}
        >
          {isFetchingLocation ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Navigation size={20} color={COLORS.primary} />
          )}
          <Text style={styles.currentLocationText}>
            {isFetchingLocation ? 'Getting Location...' : '📍 Use Current Location'}
          </Text>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Dance Studio, Music School"
            placeholderTextColor={COLORS.gray[400]}
            value={locationName}
            onChangeText={setLocationName}
          />
        </View>

        {location && (
          <View style={styles.coordinatesContainer}>
            <View style={styles.coordinatesRow}>
              <Text style={styles.coordinatesLabel}>Coordinates:</Text>
              <Text style={styles.coordinatesValue}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
            </View>

            {location.accuracy > 0 && (
              <View style={styles.accuracyRow}>
                <Text style={styles.accuracyLabel}>Accuracy:</Text>
                <View
                  style={[
                    styles.accuracyBadge,
                    { backgroundColor: getAccuracyBackgroundColor(location.accuracy) },
                  ]}
                >
                  <Text
                    style={[styles.accuracyBadgeText, { color: getAccuracyColor(location.accuracy) }]}
                  >
                    ±{Math.round(location.accuracy)}m
                  </Text>
                </View>
              </View>
            )}

            {location.accuracy > 50 && (
              <Text style={styles.warningText}>
                ⚠️ Low accuracy. Move to an open area for better GPS signal.
              </Text>
            )}
          </View>
        )}

        <Text style={styles.hintText}>
          Tap on the map or drag the marker to adjust the location
        </Text>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!locationName.trim() || !location) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!locationName.trim() || !location}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    zIndex: 10,
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
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray[600],
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    gap: 16,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: 10,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[700],
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray[800],
  },
  coordinatesContainer: {
    gap: 8,
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coordinatesLabel: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  coordinatesValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[800],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accuracyLabel: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  accuracyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accuracyBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 13,
    color: '#D97706',
    marginTop: 4,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
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
