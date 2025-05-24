import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";
import { useLocation } from '../location/GlobalLocation';
import { API_BASE_URL } from "../../config";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from "@react-navigation/native";
import { Alert, BackHandler } from "react-native";
import { router } from "expo-router";
const { width, height } = Dimensions.get('window');

export default function DHome() {
  const { location } = useLocation();
  const [isOnline, setIsOnline] = useState(false);
  const [mapHtml, setMapHtml] = useState("");
  const mapRef = useRef<WebViewType | null>(null);
  const [incomingBooking, setIncomingBooking] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const toggleSwitch = () => setIsOnline(prev => !prev);

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
            L.marker([${location.latitude}, ${location.longitude}]).addTo(map);
            document.addEventListener('message', function(event) {
              const msg = JSON.parse(event.data);
              if (msg.type === 'setPassengerMarkers') {
                if (pickupMarker) map.removeLayer(pickupMarker);
                if (destinationMarker) map.removeLayer(destinationMarker);

                if (msg.pickup) {
                  pickupMarker = L.marker([msg.pickup.latitude, msg.pickup.longitude], {
                    icon: L.icon({
                      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
                      iconSize: [30, 30],
                    })
                  }).addTo(map).bindTooltip("📍 Passenger", { permanent: true, direction: "top" });
                }

                if (msg.destination) {
                  destinationMarker = L.marker([msg.destination.latitude, msg.destination.longitude], {
                    icon: L.icon({
                      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
                      iconSize: [30, 30],
                    })
                  }).addTo(map).bindTooltip("🎯 Destination", { permanent: true, direction: "top" });
                }
              }
            });
          </script>
        </body>
      </html>
    `;

    setMapHtml(html);
  }, [location]);
  const updateDriverStatus = async (newStatus: boolean) => {
    if (!location) return;

    try {
      const driverId = await AsyncStorage.getItem("driverId");
      const driverName = await AsyncStorage.getItem("driverName");
      console.log(driverName)
      if (!driverId) return;
      const response = await fetch(`${API_BASE_URL}/api/driver-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          driverName,
          isOnline: newStatus,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        }),
      });
      const data = await response.json();
      console.log("✅ Driver status sent:", data);
    } catch (error) {
      console.error("❌ Failed to update driver status:", error);
    }
  };

  useEffect(() => {
    let interval: any;

    const fetchRequests = async () => {
      const driverId = await AsyncStorage.getItem("driverId");
      if (!driverId) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/driver-requests/${driverId}`);
        const data = await res.json();
        if (data.length > 0) {
          setIncomingBooking(data[0]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch booking:", err);
      }
    };

    if (isOnline && !confirmed) {
      fetchRequests();
      interval = setInterval(fetchRequests, 5000);
    }

    return () => clearInterval(interval);
  }, [isOnline, confirmed]);

  useEffect(() => {
    let interval: any;

    const checkPassengerConfirmation = async () => {
      if (!incomingBooking) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/bookings`);
        const all = await res.json();
        const found = all.find((b: any) => b.id === incomingBooking.id);
        if (found && found.passengerConfirmed) {
          setConfirmed(true);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    if (incomingBooking && incomingBooking.status === "accepted") {
      interval = setInterval(checkPassengerConfirmation, 5000);
    }

    return () => clearInterval(interval);
  }, [incomingBooking]);

  const acceptBooking = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/accept-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: incomingBooking.id }),
      });
      const result = await res.json();
      console.log("✅ Booking accepted:", result);
      setIncomingBooking(result.booking);
    } catch (error) {
      console.error("❌ Error accepting booking:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          "Logout",
          "Are you sure you want to log out?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {},
            },
            {
              text: "Yes",
              onPress: async () => {
                setIsOnline(false);
                updateDriverStatus(false);
                await AsyncStorage.clear();
                router.push("/login_and_reg/dlogin");
              },
            },
          ]
        );
        return true; // prevent default back action
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [isOnline])
  );

  useEffect(() => {
    if (!mapRef.current || !incomingBooking) return;

    mapRef.current.postMessage(JSON.stringify({
      type: "setPassengerMarkers",
      pickup: {
        latitude: incomingBooking.pickupLat,
        longitude: incomingBooking.pickupLng
      },
      destination: {
        latitude: incomingBooking.destinationLat,
        longitude: incomingBooking.destinationLng
      }
    }));
  }, [incomingBooking]);


  return (
    <View style={styles.container}>
      <View style={{ paddingTop: 30 }}>
        <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />
      </View>

      {mapHtml && (
        <WebView
          ref={(ref) => {
            if (ref && !mapRef.current) mapRef.current = ref;
          }}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          javaScriptEnabled
          style={styles.map}
        />
      )}

      {incomingBooking && !confirmed && (
        <View style={styles.popup}>
          <Text style={styles.popupTitle}>🚕 Incoming Booking</Text>
          <Text>From: {incomingBooking.pickupLat.toFixed(4)}, {incomingBooking.pickupLng.toFixed(4)}</Text>
          <Text>To: {incomingBooking.destinationLat.toFixed(4)}, {incomingBooking.destinationLng.toFixed(4)}</Text>
          <Text>Fare: ₱{incomingBooking.fare}</Text>
          <Text>Payment: {incomingBooking.paymentMethod}</Text>
          <Text>Notes: {incomingBooking.notes}</Text>
          <Text>Passenger: {incomingBooking.passengerName}</Text>

          <TouchableOpacity style={styles.acceptButton} onPress={acceptBooking}>
            <Text style={{ color: 'white', textAlign: 'center' }}>ACCEPT</Text>
          </TouchableOpacity>
        </View>
      )}

      {confirmed && (
        <View style={styles.popup}>
          <Text style={{ fontWeight: 'bold', color: '#4caf50' }}>✅ Booking Confirmed!</Text>
          <Text>🕒 Waiting for pickup...</Text>
        </View>
      )}

      <View style={styles.statusBar}>
        <Switch
          style={{ marginRight: 10 }}
          trackColor={{ false: '#ccc', true: '#37982a' }}
          thumbColor="white"
          ios_backgroundColor="black"
          onValueChange={() => {
            const newStatus = !isOnline;
            setIsOnline(newStatus);
            updateDriverStatus(newStatus);
          }}
          value={isOnline}
        />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.statusText}>
            {isOnline ? "You're online.\nLooking for bookings....." : "You're offline."}
          </Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: width,
    height: height,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusBar: {
    position: 'absolute',
    bottom: 75,
    backgroundColor: '#80C3E1',
    width: width,
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: 'black',
    fontSize: 14,
    fontWeight: '500',
  },
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
  popup: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 5,
    zIndex: 99,
  },
  popupTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  acceptButton: {
    backgroundColor: '#4caf50',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
});
