import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import API_OSRM_URL from "../../config";

const { width, height } = Dimensions.get("window");

export default function PHome() {
  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [html, setHtml] = useState("");

  // Get current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
    })();
  }, []);

  // Build map HTML with OpenStreetMap + OSRM
  useEffect(() => {
    if (!location) return;

    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
        <style> html, body, #map { height: 100%; margin: 0; padding: 0; } </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
        <script>
          const map = L.map('map').setView([${location.latitude}, ${location.longitude}], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          const start = L.marker([${location.latitude}, ${location.longitude}])
            .addTo(map)
            .bindPopup('You are here')
            .openPopup();

          let destMarker = null;
          let routeLine = null;

          map.on('click', async function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            if (destMarker) map.removeLayer(destMarker);
            if (routeLine) map.removeLayer(routeLine);

            destMarker = L.marker([lat, lng]).addTo(map).bindPopup('Destination').openPopup();

            const res = await fetch("${API_OSRM_URL}/route/v1/driving/${location.longitude},${location.latitude};" + lng + "," + lat + "?geometries=geojson");
            const data = await res.json();
            const coords = data.routes[0].geometry.coordinates.map(p => [p[1], p[0]]);
            routeLine = L.polyline(coords, { color: 'red' }).addTo(map);

            window.ReactNativeWebView.postMessage(JSON.stringify({
              destination: { latitude: lat, longitude: lng }
            }));
          });
        </script>
      </body>
      </html>
    `;

    setHtml(template);
  }, [location]);

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: 30 }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="black" />
      </View>

      {location && html ? (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          javaScriptEnabled
          onMessage={(event) => {
            const data = JSON.parse(event.nativeEvent.data);
            setDestination(data.destination);
          }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 20 }}>Loading map...</Text>
        </View>
      )}

      {/* Floating Card UI (unchanged) */}
      <View style={styles.card}>
        <View style={styles.cardHeader} />
        <TouchableOpacity style={styles.inputBox}>
          <Ionicons name="location-outline" size={20} color="#616161" />
          <Text style={styles.inputText}>
            {destination ? `Going to: ${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}` : "Saan ka papunta ngayon?"}
          </Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="#616161" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputBox}>
          <MaterialIcons name="swap-vert" size={20} color="#616161" />
          <Text style={styles.inputText}>Saan ka ihahatid?</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="#616161" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputBoxSimple}>
          <MaterialIcons name="edit" size={20} color="#616161" />
          <Text style={styles.inputText}>Notes sa driver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputBox}>
          <MaterialIcons name="payments" size={20} color="#616161" />
          <Text style={styles.inputText}>Paano ka magbabayad</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="#616161" />
        </TouchableOpacity>

        <View style={styles.totalFareContainer}>
          <View style={styles.fareBox}>
            <Text style={styles.totalFareText}>Total Fare: 9999</Text>
          </View>
          <TouchableOpacity style={styles.bookNowButton}>
            <Text style={styles.bookNowText}>BOOK NOW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Navigation (unchanged) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity>
          <Ionicons name="home" size={30} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="document-text-outline" size={30} color="black" />
          <Text>History</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="chatbubbles-outline" size={30} color="black" />
          <Text>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="person-outline" size={30} color="black" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    position: "absolute",
    bottom: 75,
    backgroundColor: "#81C3E1",
    width: width * 0.95,
    alignSelf: "center",
    borderRadius: 10,
    padding: 10,
  },
  cardHeader: {
    width: 150,
    height: 4,
    backgroundColor: "black",
    alignSelf: "center",
    borderRadius: 5,
    marginBottom: 10,
  },
  inputBox: {
    backgroundColor: "white",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 5,
  },
  inputBoxSimple: {
    backgroundColor: "white",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 5,
  },
  inputText: { flex: 1, marginLeft: 10, fontSize: 15, color: "#616161" },
  totalFareContainer: { flexDirection: "row", marginTop: 10 },
  fareBox: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: "white",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginRight: 5,
    width: '50%',
  },
  totalFareText: { fontSize: 14, fontWeight: "bold" },
  bookNowButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
    marginLeft: 5,
    width: '50%',
  },
  bookNowText: { fontSize: 16 },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    width: width,
    height: 70,
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
});
