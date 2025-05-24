// 📍 Admin Add Intersection Page - addintersection.tsx (FINAL VERSION)

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert, StatusBar } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { useRouter } from 'expo-router';
import API_BASE_URL from '../../config';

const { width } = Dimensions.get('window');

export default function AddIntersection() {
  const router = useRouter();

  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [road1, setRoad1] = useState('');
  const [road2, setRoad2] = useState('');
  const [intersections, setIntersections] = useState<{ lat: number; lng: number; roadNames: string[] }[]>([]);

  useEffect(() => {
    fetchIntersections();
  }, []);

  const fetchIntersections = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/intersection/get-intersections`);
      const data = await response.json();
      setIntersections(data);
    } catch (error) {
      console.error('Failed to fetch intersections:', error);
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ lat: latitude, lng: longitude });
  };

  const handleSave = async () => {
    if (!selectedLocation || !road1 || !road2) {
      Alert.alert('Error', 'Please select a location and fill both road names.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/intersection/add-intersection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          roadNames: [road1, road2],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Intersection saved!');
        setSelectedLocation(null);
        setRoad1('');
        setRoad2('');
        fetchIntersections(); // 🔥 Refresh intersections after saving
      } else {
        Alert.alert('Error', data.message || 'Saving failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network request failed');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 13.9361,
          longitude: 121.6125,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={handleMapPress}
      >
        {/* EXISTING INTERSECTIONS */}
        {intersections.map((intersection, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: intersection.lat, longitude: intersection.lng }}
            pinColor="orange"
            title={`${intersection.roadNames[0]} x ${intersection.roadNames[1]}`}
          />
        ))}

        {/* NEW SELECTED LOCATION */}
        {selectedLocation && (
          <Marker
            coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }}
            pinColor="green"
            title="New Intersection"
          />
        )}
      </MapView>

      {/* Form Section */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="First Road Name"
          value={road1}
          onChangeText={setRoad1}
        />
        <TextInput
          style={styles.input}
          placeholder="Second Road Name"
          value={road2}
          onChangeText={setRoad2}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Intersection</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>⬅ Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  form: {
    position: 'absolute',
    bottom: 0,
    width: width,
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#5089A3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#DD1F1F',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
