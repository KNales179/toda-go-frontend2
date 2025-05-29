import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image, BackHandler, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocation } from "../location/GlobalLocation";
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OSRM_BASE_URL, API_BASE_URL } from "../../config";
import * as Location from 'expo-location';

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
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [infoBoxMinimized, setInfoBoxMinimized] = useState(false);
  const [alertedBookingComplete, setAlertedBookingComplete] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [tripCompleted, setTripCompleted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState("");
  const [otherReport, setOtherReport] = useState("");
  const [pickupName, setPickupName] = useState("");
  const [dropoffName, setDropoffName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);


  // Reverse geocode for pick-up location
  useEffect(() => {
    if (location) {
      Location.reverseGeocodeAsync({
        latitude: location.latitude,
        longitude: location.longitude,
      }).then((results) => {
        if (results && results.length > 0) {
          const addr = results[0];
          setPickupName(
            `${addr.street || ""}${addr.street ? ", " : ""}${addr.city || addr.subregion || ""}`
          );
        } else {
          setPickupName("Current Location");
        }
      }).catch(() => setPickupName("Current Location"));
    }
  }, [location]);

  // Handle Android hardware back button (logout prompt)
  useEffect(() => {
    const backAction = () => {
      Alert.alert("Logout Confirmation", "Do you want to log out?", [
        { text: "Cancel", onPress: () => null, style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            await AsyncStorage.removeItem("passengerId");
            router.replace("/login_and_reg/plogin");
          },
        },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  // Generate map HTML when location changes
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
            }
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
            window.onload = function () {
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
              let destinationLocked = false;
              map.on('click', function(e) {
                if (destinationLocked) return;
                const { lat, lng } = e.latlng;
                if (destMarker) map.removeLayer(destMarker);
                destMarker = L.marker([lat, lng], {
                  icon: L.icon({
                    iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
                    iconSize: [30, 30],
                  })
                }).addTo(map).bindTooltip("Destination", { permanent: true, direction: "top" });
                window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
              });
              document.addEventListener('message', function(event) {
                const msg = JSON.parse(event.data);
                window.ReactNativeWebView.postMessage("📥 RECEIVED IN MAP: " + JSON.stringify(msg));
                if (msg.type === 'setMarkers') {
                  destinationLocked = !!msg.driver;
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
                    L.circle([latitude, longitude], {
                      color: 'red',
                      radius: 10,
                      fillOpacity: 0.9
                    }).addTo(map);
                    driverMarker = L.marker([latitude, longitude], {
                      icon: L.icon({
                        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
                        iconSize: [40, 40],
                        iconAnchor: [20, 40],
                      })
                    }).addTo(map).bindTooltip("🚕 Driver", { permanent: true, direction: "top" })
                      .setZIndexOffset(1000);
                  }
                }
              });
            }
          </script>
        </body>
      </html>
    `;
    setMapHtml(html);
  }, [location]);

  // Reverse geocode for drop-off location
  const handleMapMessage = async (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed.latitude && parsed.longitude) {
        setDestination(parsed);
        // Get address for destination
        try {
          const results = await Location.reverseGeocodeAsync({
            latitude: parsed.latitude,
            longitude: parsed.longitude,
          });
          if (results && results.length > 0) {
            const addr = results[0];
            setDropoffName(
              `${addr.street || ""}${addr.street ? ", " : ""}${addr.city || addr.subregion || ""}`
            );
          } else {
            setDropoffName("Selected Location");
          }
        } catch {
          setDropoffName("Selected Location");
        }
      }
    } catch (e) {
      // handle parse error
    }
  };

  // Set destination/driver markers after booking confirmed, etc
  useEffect(() => {
    if (!mapRef.current || bookingConfirmed) return;
    const driverCoords = matchedDriver?.location
      ? {
          latitude: matchedDriver.location.latitude,
          longitude: matchedDriver.location.longitude,
        }
      : null;
    if (driverCoords && destination) {
      mapRef.current.postMessage(
        JSON.stringify({
          type: "setMarkers",
          destination,
          driver: driverCoords,
        })
      );
    }
  }, [destination, matchedDriver, bookingConfirmed]);

  




  const handleBookNow = async () => {
    if (!location || !destination) {
      Alert.alert("Missing location info");
      return;
    }
    setAlertedBookingComplete(false);
    setTripCompleted(false);
    const passengerId = await AsyncStorage.getItem("passengerId");
    const bookingData = {
      pickupLat: location.latitude,
      pickupLng: location.longitude,
      destinationLat: destination.latitude,
      destinationLng: destination.longitude,
      fare,
      paymentMethod,
      notes,
      passengerId
    };
    try {
      setShowBookingForm(false);
      setSearching(true);
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
            setSearching(false);
            return;
          }
        } catch (err) {
          // Still waiting
        }
        if (Date.now() - startTime < maxWaitTime) {
          searchTimeoutRef.current = setTimeout(poll, 5000);
        } else {
          setSearching(false);
        }
      };
      poll();
    } catch (error) {
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
    const saveDriverId = async () => {
      if (matchedDriver && bookingId) {
        console.log("driver match");
        await AsyncStorage.setItem("driverIdToRate", matchedDriver.driverId);
        await AsyncStorage.setItem("bookingIdToRate", String(bookingId)); // 👈 Fix here
        console.log(matchedDriver.driverId, bookingId);
      }
    };
    saveDriverId();
  }, [matchedDriver, bookingId]);




  useEffect(() => {
    let interval;
    const pollForDriverMatch = async () => {
      if (!bookingId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/bookings`);
        const allBookings = await res.json();
        const myBooking = allBookings.find((b: any) => b && b.id === bookingId);
        if (myBooking && myBooking.status === "accepted" && !bookingConfirmed) {
          setBookingConfirmed(true);
          Alert.alert("Driver Accepted!", "The driver has accepted your ride and is on the way!");
        }
      } catch (err) {
        // error polling
      }
    };
    interval = setInterval(pollForDriverMatch, 4000);
    return () => clearInterval(interval);
  }, [bookingId, bookingConfirmed]);

  useEffect(() => {
    let interval;
    const pollForBookingCompletion = async () => {
      if (!bookingId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/bookings`);
        const allBookings = await res.json();
        const myBooking = allBookings.find((b: any) => b && b.id === bookingId);
        setAlertedBookingComplete(false);
        setTripCompleted(false);

        if (myBooking.status === "completed" && !alertedBookingComplete) {
          setAlertedBookingComplete(true);
          Alert.alert("Booking Completed", "The driver has marked this ride as completed.");

          setBookingConfirmed(false);
          setBookingId(null);
          setMatchedDriver(null);
          setDestination(null);
          setShowBookingForm(false);
          setTripCompleted(true);

          if (mapRef.current) {
            mapRef.current.postMessage(
              JSON.stringify({
                type: "setMarkers",
                destination: null,
                driver: null,
              })
            );
          }
        }
      } catch (err) {
        console.error("❌ Poll error:", err);
      }
    };

    interval = setInterval(pollForBookingCompletion, 4000);
    return () => clearInterval(interval);
  }, [bookingId]);


  useEffect(() => {
    const saveBookingState = async () => {
      const bookingState = {
        destination,
        destinationLabel,
        notes,
        paymentMethod,
        fare,
        matchedDriver,
        bookingConfirmed,
        bookingId,
        showBookingForm,
        searching,
      };
      try {
        await AsyncStorage.setItem("phomeBookingState", JSON.stringify(bookingState));
      } catch (err) {
        console.warn("Error saving booking state:", err);
      }
    };

    saveBookingState();
  }, [
    destination,
    destinationLabel,
    notes,
    paymentMethod,
    fare,
    matchedDriver,
    bookingConfirmed,
    bookingId,
    showBookingForm,
    searching,
  ]);

  useEffect(() => {
    const loadBookingState = async () => {
      try {
        const savedState = await AsyncStorage.getItem("phomeBookingState");
        if (savedState) {
          const {
            destination,
            destinationLabel,
            notes,
            paymentMethod,
            fare,
            matchedDriver,
            bookingConfirmed,
            bookingId,
            showBookingForm,
            searching,
          } = JSON.parse(savedState);

          if (destination) setDestination(destination);
          if (destinationLabel) setDestinationLabel(destinationLabel);
          if (notes) setNotes(notes);
          if (paymentMethod) setPaymentMethod(paymentMethod);
          if (fare) setFare(fare);
          if (matchedDriver) setMatchedDriver(matchedDriver);
          if (bookingConfirmed) setBookingConfirmed(bookingConfirmed);
          if (bookingId) setBookingId(bookingId);
          if (showBookingForm) setShowBookingForm(showBookingForm);
          if (searching) setSearching(searching);
        }
      } catch (err) {
        console.warn("Error loading booking state:", err);
      }
    };

    loadBookingState();
  }, []);

  const submitDriverRating = async () => {
    try {
      const driverIdToRate = await AsyncStorage.getItem("driverIdToRate");
      const bookingIdToRate = await AsyncStorage.getItem("bookingIdToRate");

      if (!driverIdToRate || !bookingIdToRate) {
        Alert.alert("Error", "No driver or booking ID found to rate.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/feedback/rate-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driverIdToRate,
          rating: selectedRating,
        }),
      });

      if (res.ok && notes) {
        // Save the feedback separately if there's a note
        await fetch(`${API_BASE_URL}/api/feedback/submit-feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: bookingIdToRate,
            passengerId: await AsyncStorage.getItem("passengerId"),
            driverId: driverIdToRate,
            feedback: notes,
          }),
        });
      }

      if (res.ok) {
        Alert.alert("Success", "Thank you for your feedback!");
        setShowRatingModal(false);
        await AsyncStorage.removeItem("driverIdToRate");
        await AsyncStorage.removeItem("bookingIdToRate");
      } else {
        const data = await res.json();
        Alert.alert("Error", data.message || "Failed to submit rating.");
      }
    } catch (error) {
      console.error("❌ Failed to submit rating:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };



  useEffect(() => {
    if (tripCompleted) {
      setShowRatingModal(true);
    }
  }, [tripCompleted]);

  const reportOptions = [
    "Overcharging",
    "Harassment",
    "Unproper Attire",
    "Refusal to Convey Passenger",
    "Other",
  ];

  const submitReport = async () => {
    try {
      const passengerId = await AsyncStorage.getItem("passengerId");
      const res = await fetch(`${API_BASE_URL}/api/feedback/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          passengerId,
          driverId: matchedDriver?.driverId,
          reportType,
          otherReport,
        }),
      });
      if (res.ok) {
        Alert.alert("Success", "Report submitted!");
        setShowReportModal(false);
      } else {
        const data = await res.json();
        Alert.alert("Error", data.message || "Failed to submit report.");
      }
    } catch (error) {
      console.error("❌ Failed to submit report:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };


  if (loading || !location) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={keyboardOffset}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent backgroundColor="black" />


          {mapHtml && (
            <WebView
              scrollEnabled={true}
              ref={(ref) => {
                if (ref && !mapRef.current) {
                  mapRef.current = ref;
                }
              }}
              pointerEvents={showReportModal ? "none" : "auto"}
              originWhitelist={["*"]}
              source={{ html: mapHtml }}
              javaScriptEnabled
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: -30,
                zIndex: 0,
              }}
              onMessage={handleMapMessage}
              nestedScrollEnabled={true}
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

              {matchedDriver && (
                <View
                  style={{
                    position: "absolute",
                    bottom: -100,
                    left: 0,
                    right: 0,
                    marginHorizontal: 20,
                    backgroundColor: "#d1fcd3",
                    borderRadius: 10,
                    padding: 10,
                    elevation: 3,
                  }}
                >
                  {infoBoxMinimized ? (
                    <TouchableOpacity
                      style={{
                        alignItems: "center",
                        padding: 10,
                      }}
                      onPress={() => setInfoBoxMinimized(false)}
                    >
                      <Text style={{ fontWeight: "bold", color: "#000" }}>View Driver Info</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {matchedDriver.selfieImage && (
                          <Image
                            source={{ uri: `${API_BASE_URL}/${matchedDriver.selfieImage}` }}
                            style={{ width: 50, height: 50, borderRadius: 25, marginRight: 10 }}
                          />
                        )}
                        <View style={{ flex: 1}}>
                          <Text style={{ fontWeight: "bold", color: "#000" }}>✅ Driver Found!</Text>
                          <Text>Name: {matchedDriver.driverName}</Text>
                          <Text>Franchise #: {matchedDriver.franchiseNumber || "N/A"}</Text>
                          <Text>Experience: {matchedDriver.experienceYears || "N/A"} years</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => setInfoBoxMinimized(true)}
                          style={{ backgroundColor: "#81C3E1", borderRadius: 5, padding: 5 }}
                        >
                          <Text style={{ color: "white" }}>Minimize</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setShowReportModal(true)}
                          style={{ backgroundColor: "#f44336", borderRadius: 5, padding: 5 }}
                        >
                          <Text style={{ color: "white" }}>Report Driver</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              await fetch(`${API_BASE_URL}/api/cancel-booking`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ bookingId }),
                              });
                              await AsyncStorage.removeItem("phomeBookingState");
                            } catch (err) { }
                            setSearching(false);
                            setBookingId(null);
                            setMatchedDriver(null);
                            setDestination(null);
                            setBookingConfirmed(false);
                            mapRef.current?.postMessage(
                              JSON.stringify({
                                type: "setMarkers",
                                destination: null,
                                driver: null,
                              })
                            );
                            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                          }}
                          style={{ backgroundColor: "#f44336", borderRadius: 5, padding: 5 }}
                        >
                          <Text style={{ color: "white" }}>Cancel Ride</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
            {showBookingForm && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Booking Details</Text>
                <ScrollView style={styles.inputsContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Saan ang pick-up?"
                    value={pickupName}
                    editable={true}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Saan ang drop-off?"
                    value={dropoffName}
                    editable={true}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Name this location (optional: Home, Work, etc.)"
                    value={destinationLabel}
                    onChangeText={setDestinationLabel}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Notes sa driver"
                    value={notes}
                    onChangeText={setNotes}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Paano ka magbabayad?"
                    value={paymentMethod}
                    onChangeText={setPaymentMethod}
                  />
                </ScrollView>
                <View style={styles.fareContainer}>
                  <Text style={styles.totalFare}>Total Fare: ₱{fare}</Text>
                  <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
                    <Text style={styles.bookButtonText}>BOOK NOW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!matchedDriver && !searching && !showBookingForm && (
              <TouchableOpacity
                onPress={() => setShowBookingForm(true)}
                style={{
                  position: "absolute",
                  bottom: 10,
                  backgroundColor: "#81C3E1",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontWeight: "bold", fontSize: 16, color: "white" }}>START BOOKING</Text>
              </TouchableOpacity>
            )}

            {showRatingModal && (
              <View style={styles.ratingModalOverlay}>
                <View style={styles.ratingModal}>

                  <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={() => {
                      setShowRatingModal(false);
                      AsyncStorage.removeItem("driverIdToRate");
                    }}
                  >
                    <Ionicons name="close" size={24} color="gray" />
                  </TouchableOpacity>

                  <Text style={styles.modalTitle}>Rate Your Driver</Text>

                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setSelectedRating(star)}
                      >
                        <Ionicons
                          name={selectedRating >= star ? "star" : "star-outline"}
                          size={30}
                          color="#FFD700"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.feedbackInput}
                    placeholder="Leave a comment (optional)"
                    multiline
                    numberOfLines={3}
                    onChangeText={(text) => setNotes(text)}
                    value={notes}
                  />

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={submitDriverRating}
                  >
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {showReportModal && (
              <View style={styles.ratingModalOverlay}>
                <View style={[styles.ratingModal, { alignItems: "stretch" }]}>
                  <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={() => setShowReportModal(false)}
                  >
                    <Ionicons name="close" size={24} color="gray" />
                  </TouchableOpacity>

                  <Text style={styles.modalTitle}>Report Driver</Text>

                  <Text style={styles.modalLabel}>Select Report Type:</Text>
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowDropdown(!showDropdown)}
                    >
                      <Text style={{ color: reportType ? "#000" : "#999" }}>
                        {reportType || "Select a violation"}
                      </Text>
                      <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                    </TouchableOpacity>

                    {showDropdown && (
                      <View style={styles.dropdownMenu}>
                        {reportOptions.map((option) => (
                          <TouchableOpacity
                            key={option}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setReportType(option);
                              setShowDropdown(false);
                            }}
                          >
                            <Text style={{ color: "#000" }}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>


                  {reportType === "Other" && (
                    <TextInput
                      style={styles.feedbackInput}
                      placeholder="Describe the issue"
                      multiline
                      numberOfLines={3}
                      value={otherReport}
                      onChangeText={setOtherReport}
                    />
                  )}

                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: "#4CAF50" }]}
                    onPress={submitReport}
                  >
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}



          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 40, flex: 1, backgroundColor: "#fff" },
  overlayContainer: {position: "absolute", bottom: 0, width: "100%", alignItems: 'center', height: 180 },
  overlay: { width: width, margin: 60 },
  panel: {
    position: 'absolute',
    bottom: 10, 
    width: '100%',
    backgroundColor: '#E0F0FF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
    zIndex: 10,
  },
  panelTitle: { fontWeight: 'bold', marginBottom: 5 },
  radioContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  radioButton: { padding: 10, backgroundColor: '#FFF', borderRadius: 10, marginRight: 10 },
  inputsContainer: { marginTop: 10, maxHeight: 180 },
  input: { backgroundColor: '#FFF', borderRadius: 10, padding: 10, marginVertical: 5 },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  ratingModalOverlay: {
    position: "absolute",
    top: -100,
    left: 0,
    right: 0,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  ratingModal: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },

  dismissButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  feedbackInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#4caf50",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  modalLabel: {
    marginTop: 5,
    marginBottom: 5,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    padding: 0,
    width: "100%",
  },

  dropdownContainer: { width: "100%", marginVertical: 5 },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  dropdownMenu: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginTop: 2,
  },
  dropdownItem: { padding: 10 },



  totalFare: { fontWeight: 'bold' },
  bookButton: { backgroundColor: '#000', borderRadius: 10, padding: 10 },
  bookButtonText: { color: '#FFF', fontWeight: 'bold' },
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
});

