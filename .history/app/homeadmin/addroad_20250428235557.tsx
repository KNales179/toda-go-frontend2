// 📍 Admin Add Road Page - addroad.tsx (Updated with Intersections!)

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Switch, Alert, StatusBar } from 'react-native';
import MapView, { Marker, Polyline, MapPressEvent } from 'react-native-maps';
import { useRouter } from 'expo-router';
import API_BASE_URL from '../../config';

const { width } = Dimensions.get('window');

export default function AddRoad() {
  const router = useRouter();

  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [middlePoints, setMiddlePoints] = useState<{ lat: number; lng: number; isIntersection?: boolean }[]>([]);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [roadName, setRoadName] = useState('');
  const [oneWay, setOneWay] = useState(false);
  const [mode, setMode] = useState<'start' | 'middle' | 'intersection' | 'end' | 'delete'>('start');
  
  const [intersections, setIntersections] = useState<{ lat: number; lng: number; roadNames: string[] }[]>([]);
  const [savedRoads, setSavedRoads] = useState<any[]>([]);

  useEffect(() => {
    fetchIntersections();
    fetchSavedRoads();
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

  const fetchSavedRoads = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/road/get-roads`);
      const data = await response.json();
      setSavedRoads(data);
    } catch (error) {
      console.error('Failed to fetch saved roads:', error);
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    if (mode === 'start') {
      setStartPoint({ lat: latitude, lng: longitude });
    } else if (mode === 'middle') {
      setMiddlePoints(prev => [...prev, { lat: latitude, lng: longitude }]);
    } else if (mode === 'intersection') {
      // Find nearest intersection
      const clickedIntersection = intersections.find(intersection => {
        const dist = Math.sqrt(
          Math.pow(intersection.lat - latitude, 2) + Math.pow(intersection.lng - longitude, 2)
        );
        return dist < 0.0005; // about 50 meters threshold
      });

      if (clickedIntersection) {
        setMiddlePoints(prev => [
          ...prev,
          { lat: clickedIntersection.lat, lng: clickedIntersection.lng, isIntersection: true },
        ]);
      } else {
        Alert.alert('Error', 'Please click on an existing intersection.');
      }
    } else if (mode === 'end') {
      setEndPoint({ lat: latitude, lng: longitude });
    } else if (mode === 'delete') {
      const THRESHOLD = 0.0005;
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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Road saved successfully');
        setStartPoint(null);
        setMiddlePoints([]);
        setEndPoint(null);
        setRoadName('');
        setOneWay(false);
        fetchSavedRoads(); // 🔥 Refresh saved roads after saving
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
        {/* Show saved roads */}
        {savedRoads.map((road, idx) => (
          <Polyline
            key={idx}
            coordinates={road.path.map((p: any) => ({
              latitude: p.lat,
              longitude: p.lng,
            }))}
            strokeColor="#5089A3"
            strokeWidth={4}
          />
        ))}

        {/* Show existing intersections */}
        {intersections.map((intersection, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: intersection.lat, longitude: intersection.lng }}
            pinColor="orange"
            title={`${intersection.roadNames[0]} x ${intersection.roadNames[1]}`}
          />
        ))}

        {/* Show current working markers */}
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
            pinColor={mp.isIntersection ? "orange" : "blue"}
            title={mp.isIntersection ? "Intersection" : `Middle Point ${index + 1}`}
          />
        ))}

        {endPoint && (
          <Marker
            coordinate={{ latitude: endPoint.lat, longitude: endPoint.lng }}
            pinColor="red"
            title="End Point"
          />
        )}

        {/* Current working Polyline */}
        {startPoint && endPoint && (
          <Polyline
            coordinates={[
              { latitude: startPoint.lat, longitude: startPoint.lng },
              ...middlePoints.map((mp) => ({ latitude: mp.lat, longitude: mp.lng })),
              { latitude: endPoint.lat, longitude: endPoint.lng },
            ]}
            strokeColor="#FF0000"
            strokeWidth={2}
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
          {['start', 'middle', 'intersection', 'end', 'delete'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeButton, mode === m ? styles.selectedMode : null]}
              onPress={() => setMode(m as 'start' | 'middle' | 'intersection' | 'end' | 'delete')}
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
  mode
