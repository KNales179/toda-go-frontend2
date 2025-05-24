// 📍 Admin Add Road Page - addroad.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Switch, Alert } from 'react-native';
import MapView, { Marker, Polyline, MapPressEvent } from 'react-native-maps';
import { useRouter } from 'expo-router';
import API_BASE_URL from '../../config';

const { width, height } = Dimensions.get('window');

export default function AddRoad() {
  const router = useRouter();
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [roadName, setRoadName] = useState('');
  const [oneWay, setOneWay] = useState(false);

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    if (!startPoint) {
      setStartPoint({ lat: latitude, lng: longitude });
    } else if (!endPoint) {
      setEndPoint({ lat: latitude, lng: longitude });
    } else {
      // Reset if both are already selected
      setStartPoint({ lat: latitude, lng: longitude });
      setEndPoint(null);
    }
  };

  const handleSave = async () => {
    if (!startPoint || !endPoint || !roadName) {
      Alert.alert('Error', 'Please select start point, end point, and enter road name');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/road/add-road`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadName,
          startPoint,
          endPoint,
          oneWay,
          allowedForTricycle: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Road saved successfully');
        setStartPoint(null);
        setEndPoint(null);
        setRoadName('');
        setOneWay(false);
      } else {
        Alert.alert('Error', data.message || 'Saving failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network request failed');
    }
  };

  return (
    <View style={styles.container}>
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
        {startPoint && (
          <Marker coordinate={{ latitude: startPoint.lat, longitude: startPoint.lng }} pinColor="green" title="Start Point" />
        )}
        {endPoint && (
          <Marker coordinate={{ latitude: endPoint.lat, longitude: endPoint.lng }} pinColor="red" title="End Point" />
        )}
        {startPoint && endPoint && (
            <Polyline
            coordinates={[
                { latitude: startPoint.lat, longitude: startPoint.lng },
                { latitude: endPoint.lat, longitude: endPoint.lng },
            ]}
            strokeColor="#000" // Black color
            strokeWidth={4} // Thickness of the line
            />
        )}
      </MapView>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Road Name"
          value={roadName}
          onChangeText={setRoadName}
        />

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>One Way?</Text>
          <Switch value={oneWay} onValueChange={setOneWay} />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Road</Text>
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  switchText: {
    fontSize: 16,
    color: '#414141',
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
