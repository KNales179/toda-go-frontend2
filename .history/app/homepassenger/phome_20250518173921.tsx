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
  Image
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
  const [matchedDriver, setMatchedDriver] = useState<{
    driverName: string;
    driverId: string;
    franchiseNumber: string;
    experienceYears: string;
    selfieImage: string;
    location: { latitude: number; longitude: number }; 
  } | null>(null);

  const [bookingId, setBookingId] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false); 
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);




  useEffect(() => {
    if (!location) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
          <style>
            html, body, #map {
              height: 100%;
              margin: 0;
              padding: 0;
              overflow: hidden;
              touch-action: auto;
            }
            .leaflet-control-zoom { top: 10px !important; left: 10px !important; }

            .driver-label {
              font-weight: bold;
              color: red;
              background: white;
              padding: 2px 5px;
              border-radius: 4px;
              font-size: 14px;
            }
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

            const currentMarker = L.marker([${location.latitude}, ${location.longitude}], {
              icon: L.icon({
                iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
                iconSize: [30, 30],
              })
            }).addTo(map).bindTooltip("You", { permanent: true, direction: "top" });

            let destMarker = null;
            let driverMarker = null;

            map.on('click', function(e) {
              const { lat, lng } = e.latlng;
              if (destMarker) map.removeLayer(destMarker);
              destMarker = L.marker([lat, lng], {
                icon: L.icon({
                  iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
                  iconSize: [30, 30],
                })
              }).addTo(map).bindTooltip("Destination", { permanent: true, direction: "top" });
            });

            window.addEventListener('message', function(event) {
              const msg = JSON.parse(event.data);
              window.ReactNativeWebView.postMessage("📥 RECEIVED IN MAP: " + JSON.stringify(msg));
              if (msg.type === 'setMarkers') {
                if (msg.destination) {
                  const { latitude, longitude } = msg.driver;
                  window.ReactNativeWebView.postMessage("✅ DRIVER FOUND AT: " + latitude + ", " + longitude);
                } else {
                  window.ReactNativeWebView.postMessage("❌ NO DRIVER IN MESSAGE");
                }
              }

              if (msg.type === 'setMarkers') {
                if (destMarker) map.removeLayer(destMarker);
                if (msg.destination) {
                  destMarker = L.marker([msg.destination.latitude, msg.destination.longitude], {
                    icon: L.icon({
                      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
                      iconSize: [30, 30],
                    })
                  }).addTo(map).bindTooltip("Destination", { permanent: true, direction: "top" });
                }

                if (driverMarker) map.removeLayer(driverMarker);
                if (msg.driver) {
                  const { latitude, longitude } = msg.driver;

                  window.ReactNativeWebView.postMessage("🧭 DRIVER MARKER REQUESTED: " + JSON.stringify(msg.driver));

                  L.circle([latitude, longitude], {
                    color: 'red',
                    radius: 10,
                    fillOpacity: 0.9
                  }).addTo(map);

                  driverMarker = L.marker([latitude, longitude], {
                    icon: L.icon({
                      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
                      iconSize: [40, 40],
                      iconAnchor: [20, 40],
                    })
                  }).addTo(map).bindTooltip("🚕 Driver", { permanent: true, direction: "top" })
                    .setZIndexOffset(1000);
                }
              }
            });
          </script>

        </body>
      </html>
    `;

    setMapHtml(html);
    }, [location]);
    

    useEffect(() => {
    if (!mapRef.current) return;

    const driverCoords = matchedDriver?.location
      ? {
          latitude: matchedDriver.location.latitude,
          longitude: matchedDriver.location.longitude,
        }
      : null;

    console.log("📤 Sending to WebView:", {
      type: "setMarkers",
      destination,
      driver: matchedDriver?.location,
    });


    mapRef.current.postMessage(
      JSON.stringify({
        type: "setMarkers",
        destination,
        driver: driverCoords,
      })
    );
  }, [destination, matchedDriver]);

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
      passengerName: "Anonymous",
    };

    try {
      setShowBookingForm(false); // hide form
      setSearching(true);        // show searching state

      const response = await fetch(`${API_BASE_URL}/api/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Something went wrong");

      setBookingId(result.booking.id);

      // Start polling for driver for up to 10 minutes
      const maxWaitTime = 10 * 60 * 1000; // 10 minutes
      const startTime = Date.now();

      const poll = async () => {
        try {
          const [driverRes, statusRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/driver/${result.booking.driverId}`),
            fetch(`${API_BASE_URL}/api/driver-status/${result.booking.driverId}`)
          ]);

          const driverData = await driverRes.json();
          const statusData = await statusRes.json();

          if (driverData?.driver) {
            setMatchedDriver({
              driverName: driverData.driver.driverName,
              driverId: driverData.driver._id,
              franchiseNumber: driverData.driver.franchiseNumber || "N/A",
              experienceYears: driverData.driver.experienceYears || "N/A",
              selfieImage: driverData.driver.selfieImage || "N/A",
              location: statusData.location || null, // Live GPS
            });

            console.log("🚨 DRIVER DATA FROM BACKEND:", driverData.driver);
            console.log("📍 LIVE LOCATION:", statusData.location);
            setSearching(false);
            return;
          }
        } catch (err) {
          console.log("⏳ Still waiting for driver...");
        }

        if (Date.now() - startTime < maxWaitTime) {
          searchTimeoutRef.current = setTimeout(poll, 5000); // try again in 5 sec
        } else {
          setSearching(false); // stop searching silently
          console.log("❌ No driver found within 10 minutes.");
        }
      };

      poll(); // start polling
    } catch (error) {
      console.error("❌ Booking error:", error);
      Alert.alert("Error", "Failed to send booking. Please try again.");
      setSearching(false);
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
              javaScriptEnabled={true}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
              }}
              onMessage={(event) => {
                console.log("✅ Received from WebView:", event.nativeEvent.data);
                const msg = event.nativeEvent.data;
                console.log("📥 WebView message:", msg);

                try {
                  const parsed = JSON.parse(msg);
                  if (parsed.latitude && parsed.longitude) {
                    setDestination(parsed);
                  }
                } catch (e) {
                  // Debug string from inside the WebView like "🧭 DRIVER MARKER: ..."
                }
              }}
            />
          )}

          <View style={styles.overlayContainer}>
            <View style={styles.overlay}>
              {searching && (
                <View style={{ backgroundColor: "#fff3cd", padding: 10, marginTop: 10, borderRadius: 8 }}>
                  <Text style={{ fontWeight: "bold" }}>🔍 Finding a driver...</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSearching(false);
                      setBookingId(null);
                      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                    }}
                    style={{ backgroundColor: "#f44336", padding: 10, marginTop: 10, borderRadius: 5 }}
                  >
                    <Text style={{ color: "white", textAlign: "center" }}>CANCEL RIDE</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ✅ Show this if driver is found */}
              {matchedDriver && (
                <View style={{ backgroundColor: "#d1fcd3", padding: 10, marginTop: 10, borderRadius: 8 }}>
                  <Text style={{ fontWeight: "bold" }}>✅ Driver Found!</Text>
                  {matchedDriver.selfieImage && (
                    <Image
                      source={{ uri: `${API_BASE_URL}/${matchedDriver.selfieImage}` }}
                      style={{ width: 80, height: 80, borderRadius: 40, marginVertical: 8 }}
                    />
                  )}
                  <Text>Name: {matchedDriver.driverName}</Text>
                  <Text>Franchise #: {matchedDriver.franchiseNumber || "N/A"}</Text>
                  <Text>Experience: {matchedDriver.experienceYears || "N/A"} years</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setMatchedDriver(null);
                      setBookingId(null);
                      setSearching(false);
                      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                    }}
                    style={{ backgroundColor: "#f44336", padding: 10, marginTop: 10, borderRadius: 5 }}
                  >
                    <Text style={{ color: "white", textAlign: "center" }}>CANCEL RIDE</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
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
              </View>
            )}

            {!matchedDriver && !searching && !showBookingForm && (
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
  container: {paddingTop: 30 ,flex: 1, backgroundColor: "#fff" },
  overlayContainer: { paddingBottom: Platform.OS === "android" ? 20 : 0, position: "absolute", bottom: 0, width: "100%", alignItems: "center" },
  overlay: {width: width, margin: 60},
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
