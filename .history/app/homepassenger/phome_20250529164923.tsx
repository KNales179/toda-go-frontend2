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
  Image,
  BackHandler,
  ScrollView
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useLocation } from "../location/GlobalLocation";
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../../config";
import * as Location from 'expo-location';

const { width } = Dimensions.get("window");

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
  const [matchedDriver, setMatchedDriver] = useState<any>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [infoBoxMinimized, setInfoBoxMinimized] = useState(false);
  const [pickupName, setPickupName] = useState("");
  const [dropoffName, setDropoffName] = useState("");

  // Save booking state
  useEffect(() => {
    const saveState = async () => {
      const state = {
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
      await AsyncStorage.setItem("phomeBookingState", JSON.stringify(state));
    };
    saveState();
  }, [destination, destinationLabel, notes, paymentMethod, fare, matchedDriver, bookingConfirmed, bookingId, showBookingForm, searching]);

  // Load booking state
  useEffect(() => {
    const loadState = async () => {
      const saved = await AsyncStorage.getItem("phomeBookingState");
      if (saved) {
        const state = JSON.parse(saved);
        if (state.destination) setDestination(state.destination);
        if (state.destinationLabel) setDestinationLabel(state.destinationLabel);
        if (state.notes) setNotes(state.notes);
        if (state.paymentMethod) setPaymentMethod(state.paymentMethod);
        if (state.fare) setFare(state.fare);
        if (state.matchedDriver) setMatchedDriver(state.matchedDriver);
        if (state.bookingConfirmed) setBookingConfirmed(state.bookingConfirmed);
        if (state.bookingId) setBookingId(state.bookingId);
        if (state.showBookingForm) setShowBookingForm(state.showBookingForm);
        if (state.searching) setSearching(state.searching);
      }
    };
    loadState();
  }, []);

  // Reverse geocode for pickup
  useEffect(() => {
    if (location) {
      Location.reverseGeocodeAsync({
        latitude: location.latitude,
        longitude: location.longitude,
      }).then((results) => {
        if (results && results.length > 0) {
          const addr = results[0];
          setPickupName(`${addr.street || ""}${addr.street ? ", " : ""}${addr.city || addr.subregion || ""}`);
        } else setPickupName("Current Location");
      }).catch(() => setPickupName("Current Location"));
    }
  }, [location]);

  // Back handler
  useEffect(() => {
    const backAction = () => {
      Alert.alert("Logout Confirmation", "Do you want to log out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            await AsyncStorage.removeItem("passengerId");
            await AsyncStorage.removeItem("phomeBookingState");
            router.replace("/login_and_reg/plogin");
          },
        },
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  // Map
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
          window.onload = function () {
            const map = L.map('map').setView([${location.latitude}, ${location.longitude}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            const marker = L.marker([${location.latitude}, ${location.longitude}]).addTo(map).bindTooltip("You", { permanent: true });
            map.on('click', function(e) {
              const { lat, lng } = e.latlng;
              window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
            });
          };
        </script>
      </body>
      </html>
    `;
    setMapHtml(html);
  }, [location]);

  const handleMapMessage = async (event: any) => {
    const parsed = JSON.parse(event.nativeEvent.data);
    if (parsed.latitude && parsed.longitude) {
      setDestination(parsed);
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: parsed.latitude,
          longitude: parsed.longitude,
        });
        if (results && results.length > 0) {
          const addr = results[0];
          setDropoffName(`${addr.street || ""}${addr.street ? ", " : ""}${addr.city || addr.subregion || ""}`);
        } else setDropoffName("Selected Location");
      } catch {
        setDropoffName("Selected Location");
      }
    }
  };

  if (loading || !location) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={keyboardOffset}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent backgroundColor="black" />
          {mapHtml && (
            <WebView
              ref={mapRef}
              originWhitelist={["*"]}
              source={{ html: mapHtml }}
              javaScriptEnabled
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
              onMessage={handleMapMessage}
            />
          )}
          <View style={styles.overlayContainer}>
            {/* Place your booking panel, driver info, or search logic here */}
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "black", marginTop: 20 }}>TodaGO Map Ready</Text>
            <Text>Tap on the map to select a destination.</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  overlayContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
});
