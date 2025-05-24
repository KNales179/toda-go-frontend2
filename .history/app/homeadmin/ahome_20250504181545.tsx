import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function AdminHome() {
  const router = useRouter();

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
        var map = L.map('map').setView([13.9335, 121.6179], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        map.on('click', function (e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          L.marker([lat, lng]).addTo(map)
            .bindPopup("Blocked here:<br>Lat: " + lat.toFixed(5) + "<br>Lng: " + lng.toFixed(5))
            .openPopup();
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Text style={styles.title}>Lucena City Map</Text>

      {/* Mini Map Display */}
      <View style={styles.mapContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      {/* Buttons Below */}
      <ScrollView contentContainerStyle={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('./roadblock')}>
          <Text style={styles.buttonText}>🚧 Block a Road</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity style={styles.button} onPress={() => router.push('/adminpages/viewreports')}>
          <Text style={styles.buttonText}>📄 View Reports</Text>
        </TouchableOpacity> */}

        <TouchableOpacity style={[styles.button, { backgroundColor: '#DD1F1F' }]} onPress={() => router.replace('/login_and_reg/alogin')}>
          <Text style={styles.buttonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#414141',
  },
  mapContainer: {
    height: height * 0.4,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 15,
  },
  button: {
    backgroundColor: '#5089A3',
    paddingVertical: 15,
    width: width * 0.8,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
