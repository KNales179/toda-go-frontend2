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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocation } from "../location/GlobalLocation";
import { OSRM_BASE_URL, API_BASE_URL } from "../../config";

const { width, height } = Dimensions.get("window");

export default function PHome() {
  const { location, loading } = useLocation();
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationLabel, setDestinationLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [fare, setFare] = useState(20);
  const [mapHtml, setMapHtml] = useState("");
  const mapRef = useRef<WebViewType>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [matchedDriver, setMatchedDriver] = useState<{ driverName: string; driverId:string} | null>(null);
  const [bookingId, setBookingId] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);


  useEffect(() => {
    if (!location) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
          <style>
            html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; }
            #map {
              height: 100vh;
              width: 100vw;
              position: relative;
              padding-top: 40px;   /* Top padding for zoom controls */
              padding-bottom: 80px; /* Bottom padding for booking panel */
              box-sizing: border-box;
            }
            .leaflet-control-zoom { top: 10px !important; left: 10px !important; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
          <script>
            const map = L.map('map', {
              zoomControl: false,
              dragging: true,
              scrollWheelZoom: true,
              touchZoom: true,
              doubleClickZoom: true,
              boxZoom: true,
            }).setView([${location.latitude}, ${location.longitude}], 15);

            L.control.zoom({ position: 'topleft' }).addTo(map);

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
    if (!location || !destination) {
      Alert.alert("Missing location info");
      return;
    }

    const bookingData = {
      pickupLat: location.latitude,
      pickupLng: location.longitude,
      destinationLat: destination.latitude,
      destinationLng: destination.longitude,
      fare,
      paymentMethod,
      notes,
      passengerName: "Anonymous", // or retrieve from storage if needed
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Something went wrong");
      }

      setBookingId(result.booking.id);
      setMatchedDriver(result.booking.driverId);

      const res = await fetch(`${API_BASE_URL}/api/driver/${result.booking.driverId}`);
      const data = await res.json();
      setMatchedDriver(data.driver);

      Alert.alert("Success", "Booking sent successfully.");
    } catch (error) {
      console.error("❌ Booking error:", error);
      Alert.alert("Error", "Failed to send booking. Please try again.");
    }
  };



  useEffect(() => {
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardOffset(-35));
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardOffset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let interval;
    const pollForDriverMatch = async () => {
      if (!bookingId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/bookings`);
        const allBookings = await res.json();
        const myBooking = allBookings.find((b: any) => b && b.id === bookingId);
        if (myBooking && myBooking.status === "accepted" && !myBooking.passengerConfirmed) {
          setMatchedDriver(myBooking);
        }
      } catch (err) {
        console.error("❌ Poll error:", err);
      }
    };
    interval = setInterval(pollForDriverMatch, 4000);
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    if (matchedDriver) {
      console.log("🎯 Matched driver name (from state):", matchedDriver.driverId);
      console.log("🎯 Matched driver name (from state):", matchedDriver.driverName);
    }
  }, [matchedDriver]);


  if (loading || !location) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={keyboardOffset}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent backgroundColor="black" />
          {mapHtml && (
            <WebView
              ref={(ref) => {
                if (ref && !mapRef.current) {
                  mapRef.current = ref;
                }
              }}
              originWhitelist={["*"]}
              source={{ html: mapHtml }}
              javaScriptEnabled
              onMessage={(event) => setDestination(JSON.parse(event.nativeEvent.data))}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
          )}

          <View style={styles.overlayContainer}>
            {showBookingForm && (
              <View style={styles.card}>
                <View style={styles.cardHeader} />
                <TouchableOpacity style={styles.inputBox}>
                  <Ionicons name="location-outline" size={20} color="#616161" />
                  <Text style={styles.inputText}>
                    {destination ? `Going to: ${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}` : "Saan ka papunta ngayon?"}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-right" size={24} color="#616161" />
                </TouchableOpacity>
                <TextInput style={styles.inputBoxSimple} placeholder="Name this location (optional: Home, Work, etc.)" value={destinationLabel} onChangeText={setDestinationLabel} />
                <TextInput style={styles.inputBoxSimple} placeholder="Notes sa driver" value={notes} onChangeText={setNotes} />
                <TextInput style={styles.inputBox} placeholder="Paano ka magbabayad" value={paymentMethod} onChangeText={setPaymentMethod} />
                <View style={styles.totalFareContainer}>
                  <View style={styles.fareBox}><Text style={styles.totalFareText}>Total Fare: ₱{fare}</Text></View>
                  <TouchableOpacity style={styles.bookNowButton} onPress={handleBookNow}><Text style={styles.bookNowText}>BOOK NOW</Text></TouchableOpacity>
                </View>
                {matchedDriver && (
                  <View style={{ backgroundColor: "#d1fcd3", padding: 10, marginTop: 10, borderRadius: 8 }}>
                    <Text style={{ fontWeight: "bold" }}>✅ Driver Found!</Text>
                    <Text>Name: {matchedDriver?.driverName}</Text>
                    
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const res = await fetch(`${API_BASE_URL}/api/confirm-driver`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ bookingId }),
                          });
                          const data = await res.json();
                          Alert.alert("Confirmed", "You accepted the driver!");
                          setMatchedDriver(null);
                        } catch (error) {
                          console.error("❌ Confirm error:", error);
                        }
                      }}
                      style={{ backgroundColor: "#3cba54", padding: 10, marginTop: 10, borderRadius: 5 }}
                    >
                      <Text style={{ color: "white", textAlign: "center" }}>CONFIRM DRIVER</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {!showBookingForm && (
              <TouchableOpacity
                onPress={() => setShowBookingForm(true)}
                style={{
                  position: "absolute",
                  bottom: 85,
                  backgroundColor: "#81C3E1",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontWeight: "bold", fontSize: 16, color: "white" }}>START BOOKING</Text>
              </TouchableOpacity>
            )}


            <View style={styles.bottomNav}>
              <TouchableOpacity><Ionicons name="home" size={30} color="black" /><Text>Home</Text></TouchableOpacity>
              <TouchableOpacity><Ionicons name="document-text-outline" size={30} color="black" /><Text>History</Text></TouchableOpacity>
              <TouchableOpacity><Ionicons name="chatbubbles-outline" size={30} color="black" /><Text>Chats</Text></TouchableOpacity>
              <TouchableOpacity><Ionicons name="person-outline" size={30} color="black" /><Text>Profile</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {paddingTop: 20 ,flex: 1, backgroundColor: "#fff" },
  overlayContainer: { paddingBottom: Platform.OS === "android" ? 20 : 0, position: "absolute", bottom: 0, width: "100%", alignItems: "center" },
  card: { position: "absolute", bottom: 75, backgroundColor: "#81C3E1", width: width * 0.95, alignSelf: "center", borderRadius: 10, padding: 10 },
  cardHeader: { width: 150, height: 4, backgroundColor: "black", alignSelf: "center", borderRadius: 5, marginBottom: 10 },
  inputBox: { backgroundColor: "white", borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, height: 40, marginBottom: 5 },
  inputBoxSimple: { backgroundColor: "white", borderRadius: 8, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, height: 40, marginBottom: 5 },
  inputText: { flex: 1, marginLeft: 10, fontSize: 15, color: "#616161" },
  totalFareContainer: { flexDirection: "row", marginTop: 10 },
  fareBox: { flex: 1, borderRadius: 3, backgroundColor: "white", justifyContent: "center", paddingHorizontal: 5, marginRight: 5, width: '50%' },
  totalFareText: { fontSize: 14, fontWeight: "bold" },
  bookNowButton: { flex: 1, backgroundColor: "white", borderRadius: 8, alignItems: "center", justifyContent: "center", padding: 5, marginLeft: 5, width: '50%' },
  bookNowText: { fontSize: 16 },
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
});
