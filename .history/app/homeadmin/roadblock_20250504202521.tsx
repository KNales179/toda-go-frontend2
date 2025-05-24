import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import {API_BASE_URL}  from '../../config';

const { width, height } = Dimensions.get('window');

export default function RoadBlock() {
  const router = useRouter();
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
      <script>
        let points = [];
        const map = L.map('map').setView([13.9335, 121.6179], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        function sendToApp() {
          if (points.length === 2) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              start: points[0],
              end: points[1]
            }));
          }
        }

        map.on('click', function (e) {
          if (points.length >= 2) {
            points = []; map.eachLayer(layer => {
              if (layer instanceof L.Marker || layer instanceof L.Polyline) map.removeLayer(layer);
            });
          }

          const lat = e.latlng.lat.toFixed(5);
          const lng = e.latlng.lng.toFixed(5);
          const point = { lat: parseFloat(lat), lng: parseFloat(lng) };
          points.push(point);

          L.marker([point.lat, point.lng])
            .addTo(map)
            .bindPopup(points.length === 1 ? "Start Point" : "End Point")
            .openPopup();

          if (points.length === 2) {
            L.polyline([points[0], points[1]], { color: 'red' }).addTo(map);
            sendToApp();
          }
        });
      </script>
    </body>
    </html>
  `;

  const handleSave = async () => {
    if (!startPoint || !endPoint) {
      Alert.alert('Incomplete', 'Please select both start and end points first.');
      return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/blocked-roads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start: startPoint, end: endPoint })
        });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Blocked road saved.');
        setStartPoint(null);
        setEndPoint(null);
      } else {
        Alert.alert('Error', data.message || 'Something went wrong.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Network Error', 'Failed to connect to server.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Block a Road</Text>

      <View style={styles.mapContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          onMessage={(event) => {
            const { start, end } = JSON.parse(event.nativeEvent.data);
            setStartPoint(start);
            setEndPoint(end);
          }}
        />
      </View>

      <Text style={styles.coordText}>
        {startPoint && endPoint
          ? `Start: ${startPoint.lat},${startPoint.lng}\nEnd: ${endPoint.lat},${endPoint.lng}`
          : 'Tap two points on a road to block it'}
      </Text>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>💾 Save Blocked Road</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>🔙 Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  mapContainer: { width: width * 0.9, height: height * 0.45, borderRadius: 10, overflow: 'hidden', marginBottom: 15 },
  map: { width: '100%', height: '100%' },
  coordText: { fontSize: 16, color: '#222', marginBottom: 10, textAlign: 'center' },
  saveButton: { backgroundColor: '#3A7A3C', padding: 12, borderRadius: 8, marginBottom: 10 },
  saveText: { color: '#fff', fontSize: 16 },
  backButton: { backgroundColor: '#5089A3', padding: 10, paddingHorizontal: 20, borderRadius: 8 },
  backText: { color: '#fff', fontSize: 15 },
});
