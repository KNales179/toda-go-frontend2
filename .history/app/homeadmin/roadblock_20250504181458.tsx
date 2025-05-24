import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function RoadBlock() {
  const router = useRouter();
  const [blockedCoords, setBlockedCoords] = useState<string | null>(null);

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
        const sendCoords = (lat, lng) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
        };

        const map = L.map('map').setView([13.9335, 121.6179], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        map.on('click', function (e) {
          const lat = e.latlng.lat.toFixed(5);
          const lng = e.latlng.lng.toFixed(5);
          L.marker([lat, lng]).addTo(map)
            .bindPopup("Blocked: " + lat + ", " + lng).openPopup();
          sendCoords(lat, lng);
        });
      </script>
    </body>
    </html>
  `;

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
            const { lat, lng } = JSON.parse(event.nativeEvent.data);
            setBlockedCoords(`${lat}, ${lng}`);
          }}
        />
      </View>

      {blockedCoords && (
        <Text style={styles.coordText}>Blocked at: {blockedCoords}</Text>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>🔙 Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  mapContainer: {
    width: width * 0.9,
    height: height * 0.5,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  coordText: {
    fontSize: 16,
    color: '#222',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#5089A3',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
});
