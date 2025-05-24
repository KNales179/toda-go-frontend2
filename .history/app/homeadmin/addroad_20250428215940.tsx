// 📍 Admin Add Road Page - addroad.tsx (updated for path/multi points)

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Switch, Alert } from 'react-native';
import MapView, { Marker, Polyline, MapPressEvent } from 'react-native-maps';
import { useRouter } from 'expo-router';
import API_BASE_URL from '../../config';

const { width, height } = Dimensions.get('window');

export default function AddRoad() {
  const router = useRouter();

  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [middlePoints, setMiddlePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [roadName, setRoadName] = useState('');
  const [oneWay, setOneWay] = useState(false);
  const [mode, setMode] = useState<'start' | 'middle' | 'end' | 'delete'>('start');

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    if (mode === 'start') {
      setStartPoint({ lat: latitude, lng: longitude });
    } else if (mode === 'middle') {
      setMiddlePoints(prev => [...prev, { lat: latitude, lng: longitude }]);
    } else if (mode === 'end') {
      setEndPoint({ lat: latitude, lng: longitude });
    } else if (mode === 'delete') {
      // Find and remove the nearest middle point
      const THRESHOLD = 0.0005; // About 50 meters threshold
      setMiddlePoints(prev =>
        prev.filter(mp => {
          const dist = Math.sqrt(Math.pow(mp.lat - latitude, 2) + Math.pow(mp.lng - longitude, 2));
          return dist > THRESHOLD;
        })
      );
    }
  };

  const handleSave = async () => {
    if (!startPoint || !endPoint || !roadName) {
      Alert.alert('Error', 'Please set start point, end point, and road name.');
      return;
    }

    const path = [startPoint, ...middlePoints, endPoint];

    try {
      const response = await fetch(`${API_BASE_URL}/api/road/add-road`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadName,
          path,
          oneWay,
          allowedForTricycle: true,
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Road saved successfully');
        setStartPoint(null);
        setMiddlePoints([]);
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
          <Marker
            coordinate={{ latitude: startPoint.lat, longitude: startPoint.lng }}
            pinColor="green"
            title="Start Point"
          />
        )}

        {middlePoints.map((mp, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: mp.lat, longitude: mp.lng }}
            pinColor="blue"
            title={`Middle Point ${index + 1}`}
          />
        ))}

        {endPoint && (
          <Marker
            coordinate={{ latitude: endPoint.lat, longitude: endPoint.lng }}
            pinColor="red"
            title="End Point"
          />
        )}

        {/* Draw Polyline */}
        {startPoint && endPoint && (
          <Polyline
            coordinates={[
              startPoint,
              ...middlePoints,
              endPoint,
            ]}
            strokeColor="#5089A3"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Form Section */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Road Name"
          value={roadName}
          onChangeText={setRoadName}
        />

        {/* Mode Selection */}
        <View style={styles.modeSelector}>
          {['start', 'middle', 'end', 'delete'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeButton, mode === m ? styles.selectedMode : null]}
              onPress={() => setMode(m as 'start' | 'middle' | 'end' | 'delete')}
            >
              <Text style={styles.modeText}>{m.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  modeButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    width: '23%',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedMode: {
    backgroundColor: '#5089A3',
  },
  modeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
