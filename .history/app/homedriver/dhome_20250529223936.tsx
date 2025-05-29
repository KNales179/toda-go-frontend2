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
  const [pickedUp, setPickedUp] = useState(false);
  const [paymentConfirm, setPaymentConfirm] = useState(false);
  const [minimized, setMinimized] = useState(false);

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
            let pickupMarker = null;
            let destinationMarker = null;

            const map = L.map('map').setView([${location.latitude}, ${location.longitude}], 15);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
              maxZoom: 19,
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            L.control.zoom({ position: 'topleft' }).addTo(map);

            L.marker([${location.latitude}, ${location.longitude}]).addTo(map).bindTooltip("You", { permanent: true, direction: "top" });

            document.addEventListener('message', function(event) {
            const msg = JSON.parse(event.data);

            // ✅ Clear markers if requested
            if (msg.type === 'setPassengerMarkers') {
              if (pickupMarker) {
                map.removeLayer(pickupMarker);
                pickupMarker = null;
              }
              if (destinationMarker) {
                map.removeLayer(destinationMarker);
                destinationMarker = null;
              }

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
          const booking = data[0];
          setIncomingBooking(booking);
        } else {
          if (incomingBooking && incomingBooking.status === "pending") {
            console.log("❌ Booking was cancelled - cleaning up...");

            // Show alert
            Alert.alert("Booking Cancelled", "The passenger has cancelled the booking.");

            // Clear markers
            if (mapRef.current) {
              mapRef.current.postMessage(
                JSON.stringify({
                  type: "setPassengerMarkers",
                  pickup: null,
                  destination: null,
                })
              );
            }

            // Clean up UI
            setIncomingBooking(null);
            setConfirmed(false);
          }
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
  }, [isOnline, confirmed, incomingBooking]);

  useEffect(() => {
    let interval: any;
    if (incomingBooking && incomingBooking.status === "accepted") {
      console.log("🧠 Booking state changed:", incomingBooking);
      setConfirmed(true);
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
      console.log("✅ Booking accepted result:", result);
      console.log("🧾 Booking status after accepting:", result.booking.status);
      const passengerId = result.booking.passengerId;
      if (passengerId) {
        console.log(passengerId)
        const infoRes = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`);
        const infoData = await infoRes.json();
        if (infoData.passenger) {
          result.booking.passengerName = `${infoData.passenger.firstName} ${infoData.passenger.middleName} ${infoData.passenger.lastName}`;
        }
      }

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

      {incomingBooking && !confirmed && !minimized && (
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
          <TouchableOpacity onPress={() => setMinimized(true)}>
            <Text>Minimize</Text>
          </TouchableOpacity>
        </View>
      )}

      {minimized && (
        <TouchableOpacity
          style={{ position: "absolute", top: 80, left: 20, backgroundColor: "white", padding: 10, borderRadius: 8 }}
          onPress={() => setMinimized(false)}
        >
          <Text>🔍 View Booking Info</Text>
        </TouchableOpacity>
      )}

      {confirmed && !minimized && !paymentConfirm && (
        <View style={styles.popup}>
          <Text style={{ fontWeight: 'bold', color: '#4caf50' }}>✅ Booking Confirmed!</Text>
          {!pickedUp ? (
            <>
              <Text>🕒 Waiting for pickup...</Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#4caf50',
                  padding: 10,
                  marginTop: 10,
                  borderRadius: 5,
                }}
                onPress={() => {
                  // Set "picked up" status
                  setPickedUp(true);
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center' }}>🚕 Picked Up</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text>🟢 Passenger picked up! Ready for drop-off.</Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#2196f3',
                  padding: 10,
                  marginTop: 10,
                  borderRadius: 5,
                }}
                onPress={() => {
                  setPickedUp(false);
                  setConfirmed(false);
                  setPaymentConfirm(true);
                  setIncomingBooking(null);
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center' }}>📦 Drop Off</Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity onPress={() => setMinimized(true)}>
            <Text style={{ marginTop: 10 }}>Minimize</Text>
          </TouchableOpacity>
        </View>
      )}

      {paymentConfirm && !minimized && (
        <View style={styles.popup}>
          <Text style={{ fontWeight: 'bold', color: '#ff9800' }}>💰 Confirm Payment</Text>
          <Text>Ask the passenger for payment and confirm here.</Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#4caf50',
              padding: 10,
              marginTop: 10,
              borderRadius: 5,
            }}
            onPress={async() => {
              try {
                const res = await fetch(`${API_BASE_URL}/api/complete-booking`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ bookingId: incomingBooking.id }),
                });

                if (res.ok) {
                  Alert.alert("✅ Payment Confirmed", "Transaction completed!");

                  setConfirmed(false);
                  setIncomingBooking(null);
                  setPickedUp(false);
                  setPaymentConfirm(false);
                  setMinimized(false);

                  if (mapRef.current) {
                    mapRef.current.postMessage(JSON.stringify({
                      type: "setPassengerMarkers",
                      pickup: null,
                      destination: null,
                    }));
                  }
                } else {
                  Alert.alert("❌ Error", "Failed to mark booking as complete.");
                }
              } catch (error) {
                console.error("❌ Error confirming payment:", error);
                Alert.alert("❌ Error", "Something went wrong.");
              }
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>✅ Payment Confirmed</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMinimized(true)}>
            <Text style={{ marginTop: 10 }}>Minimize</Text>
          </TouchableOpacity>
        </View>
      )}


      {/* <TouchableOpacity
        style={{
          backgroundColor: 'red',
          padding: 10,
          marginTop: 40,
          marginLeft: 100,
          borderRadius: 8,
          position: 'absolute'
        }}
        onPress={async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/clear-bookings`, {
              method: 'POST',
            });
            const data = await res.json();
            console.log("🧹 Response from server:", data);
            Alert.alert("Success", "All bookings have been cleared!");
          } catch (err) {
            console.error("❌ Failed to clear bookings:", err);
            Alert.alert("Error", "Could not clear bookings.");
          }
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Clear All Bookings</Text>
      </TouchableOpacity> */}


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
            {isOnline
              ? incomingBooking
                ? `📦 Incoming Booking`
                : "You're online.\nLooking for bookings....."
              : "You're offline."}
          </Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 40, flex: 1, marginBottom: 0 },
  map: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -30,
  },
  statusBar: {
    position: 'absolute',
    bottom: 10,
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
    bottom: 10,
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
