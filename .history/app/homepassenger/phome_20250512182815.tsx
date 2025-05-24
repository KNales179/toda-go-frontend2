// 📍 Updated Passenger HomePage - phome.tsx using Leaflet + WebView + Destination Label + Booking + Fare Calculation

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";
import { WebViewMessageEvent, WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocation } from "../location/GlobalLocation";
import { OSRM_BASE_URL } from "../../config";

const { width, height } = Dimensions.get("window");

export default function PHome() {
  const { location, loading } = useLocation();
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationLabel, setDestinationLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [fare, setFare] = useState(0);
  const [mapHtml, setMapHtml] = useState("");
  const mapRef = useRef<WebViewType | null>(null);
  console.log("OSRM_BASE_URL is", OSRM_BASE_URL);

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

            map.on('click', function(e) {
              const { lat, lng } = e.latlng;
              if (destMarker) map.removeLayer(destMarker);
              if (routeLine) map.removeLayer(routeLine);
              destMarker = L.marker([lat, lng]).addTo(map);
              window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
            });

            window.addEventListener('message', function(event) {
              const msg = JSON.parse(event.data);
              if (msg.type === 'drawRoute' && msg.coords) {
                if (routeLine) map.removeLayer(routeLine);
                routeLine = L.polyline(msg.coords, { color: 'red' }).addTo(map);
              }
            });
          </script>
        </body>
      </html>
    `;

    setMapHtml(html);
  }, [location]);

  const handleBookNow = async () => {
    if (!location || !destination || !mapRef.current) {
      Alert.alert("Missing location info");
      return;
    }

    try {
      const url = `${OSRM_BASE_URL}/route/v1/driving/${location.longitude},${location.latitude};${destination.longitude},${destination.latitude}?geometries=geojson`;
      console.log("📡 Fetching route from:", url);
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      }
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        Alert.alert("OSRM", "No route found");
        return;
      }

      const distanceKm = data.routes[0].distance / 1000;
      const calculatedFare = distanceKm <= 2 ? 20 : 20 + Math.ceil(distanceKm - 2) * 5;
      setFare(calculatedFare);

      const coords = data.routes[0].geometry.coordinates.map((p: [number, number]) => [p[1], p[0]]);
      const message = JSON.stringify({ type: "drawRoute", coords });
      mapRef.current.postMessage(message);

      // Optional: send data to backend
      const bookingData = {
        currentLocation: location,
        destination,
        destinationLabel,
        notes,
        paymentMethod,
        fare: calculatedFare,
      };

      console.log("📤 Sending booking:", bookingData);
      // await fetch("https://your-backend-url.com/api/book", {...})

    } catch (err: any) {
      Alert.alert("OSRM Error", err.message);
      console.error("OSRM fetch failed:", err);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />

      {mapHtml && (
        <WebView
          ref={(ref) => {
            if (ref && !mapRef.current) mapRef.current = ref;
          }}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          javaScriptEnabled
          onMessage={(event) => {
            const data = JSON.parse(event.nativeEvent.data);
            setDestination(data);
          }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      <View style={styles.overlayContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader} />

          <TouchableOpacity style={styles.inputBox}>
            <Ionicons name="location-outline" size={20} color="#616161" />
            <Text style={styles.inputText}>
              {destination
                ? `Going to: ${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`
                : "Saan ka papunta ngayon?"}
            </Text>
            <MaterialIcons name="keyboard-arrow-right" size={24} color="#616161" />
          </TouchableOpacity>

          <TextInput
            style={styles.inputBoxSimple}
            placeholder="Name this location (optional: Home, Work, etc.)"
            value={destinationLabel}
            onChangeText={setDestinationLabel}
          />

          <TextInput
            style={styles.inputBoxSimple}
            placeholder="Notes sa driver"
            value={notes}
            onChangeText={setNotes}
          />

          <TextInput
            style={styles.inputBox}
            placeholder="Paano ka magbabayad"
            value={paymentMethod}
            onChangeText={setPaymentMethod}
          />

          <View style={styles.totalFareContainer}>
            <View style={styles.fareBox}>
              <Text style={styles.totalFareText}>Total Fare: ₱{fare}</Text>
            </View>
            <TouchableOpacity style={styles.bookNowButton} onPress={handleBookNow}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  overlayContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    alignItems: "center",
  },
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
