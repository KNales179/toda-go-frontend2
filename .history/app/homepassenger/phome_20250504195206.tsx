// 📍 Updated Passenger HomePage - phome.tsx using Leaflet + WebView

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocation } from "../location/GlobalLocation";
import API_BASE_URL from "../../config";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function PHome() {
  const { location, loading } = useLocation();
  const [destination, setDestination] = useState(null);
  const [mapHtml, setMapHtml] = useState("");

  useEffect(() => {
    if (!location) return;

    const html = `
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
            const map = L.map('map').setView([${location.latitude}, ${location.longitude}], 15);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
              maxZoom: 19,
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            const startMarker = L.marker([${location.latitude}, ${location.longitude}]).addTo(map);

            let destMarker = null;
            let routeLine = null;

            map.on('click', async function(e) {
              const { lat, lng } = e.latlng;
              if (destMarker) map.removeLayer(destMarker);
              if (routeLine) map.removeLayer(routeLine);

              destMarker = L.marker([lat, lng]).addTo(map);

              const res = await fetch('${API_BASE_URL}/route/v1/driving/${location.longitude},${location.latitude};' + lng + ',' + lat + '?geometries=geojson');
              const data = await res.json();
              const coords = data.routes[0].geometry.coordinates.map(p => [p[1], p[0]]);
              routeLine = L.polyline(coords, { color: 'red' }).addTo(map);

              window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
            });
          </script>
        </body>
      </html>
    `;

    setMapHtml(html);
  }, [location]);

  if (loading || !location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 20 }}>Loading Map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />
      
      {mapHtml ? (
        <WebView
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          javaScriptEnabled
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              setDestination(data);
            } catch (e) {
              console.error("Invalid map data", e);
            }
          }}
          style={{ flex: 1 }}
        />
      ) : null}


      

      {/* Floating Card */}
      <SafeAreaView style={styles.overlayContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader} />

          <TouchableOpacity style={styles.inputBox}>
            <Ionicons name="location-outline" size={20} color="#616161" />
            {/* <Text style={styles.inputText}>
              {destination
                ? `Going to: ${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`
                : "Saan ka papunta ngayon?"}
            </Text> */}
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
      </SafeAreaView>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  overlayContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    alignItems: "center",
    zIndex: 10,
  },
  
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "red", height: height,},
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
