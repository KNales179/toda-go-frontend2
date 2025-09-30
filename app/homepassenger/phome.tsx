import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image, BackHandler, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocation } from "../location/GlobalLocation";
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, MAPTILER_KEY } from "../../config";
import * as Location from 'expo-location';
import ChatNotice from "../../components/ChatNotice";
import { useNavigation } from "@react-navigation/native";


const { width } = Dimensions.get("window");

type DiscountType = 'none' | 'senior' | 'student' | 'pwd';

const calculateFare = (distanceKm: number, discount: DiscountType = 'none') => {
  if (!isFinite(distanceKm) || distanceKm <= 0) return 0; 

  const BASE_FARE = 20;   
  const INCLUDED_KM = 2;
  const PER_KM = 5;      

  const succeedingWholeKm = Math.max(0, Math.floor(distanceKm - INCLUDED_KM));

  let fare = BASE_FARE + succeedingWholeKm * PER_KM;

  // 20% discount for senior/student/PWD
  if (discount !== 'none') fare *= 0.8;

  return Math.round(fare); 
};




export default function PHome() {
  const { location, loading } = useLocation();
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationLabel, setDestinationLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [fare, setFare] = useState(0);
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
  const [bookingId, setBookingId] = useState<any>(null);
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
  const [discount] = useState<DiscountType>('none'); 
  const [query, setQuery] = useState('');
  const navigation = useNavigation();
  const [hits, setHits] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const status = currentBooking?.status as 'accepted' | 'pending' | 'completed' | 'canceled' | undefined;
  const driverId = currentBooking?.driverId;
  const [passengerId, setPassengerId] = useState<string | null>(null);
  
  useEffect(() => {
    AsyncStorage.getItem("passengerId")
      .then((v) => setPassengerId(v))
      .catch(() => setPassengerId(null));
  }, []);

  const canShowChatNotice =
    bookingConfirmed && !!bookingId && !!matchedDriver?.driverId && !!passengerId;

  // ---------- ORS: fetch route and draw in WebView ----------
  const fetchORSRoute = async (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: [from.longitude, from.latitude],
          end: [to.longitude, to.latitude],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.features?.[0]?.geometry?.coordinates) {
        console.error("🛑 Invalid ORS response:", data);
        Alert.alert("Route error", "Failed to get route from ORS.");
        return;
      }

      const coords = data.features[0].geometry.coordinates; 
      const polylinePoints = coords.map(([lng, lat]: number[]) => [lat, lng]); 

      const summary = data.features?.[0]?.properties?.summary || {};
      const distanceM = summary.distance ?? 0;
      const durationS = summary.duration ?? 0;

      const distanceKm = distanceM / 1000;

      const distanceText = `${distanceKm.toFixed(2)} km`;
      const mins = Math.round(durationS / 60);
      const durationText = mins >= 60
        ? `${Math.floor(mins / 60)}h ${mins % 60}m`
        : `${mins} min`;

      const computedFare = calculateFare(distanceKm, discount); // or 'none'
      const fareText = `₱${computedFare} est`;
      setFare(computedFare);

      mapRef.current?.postMessage(JSON.stringify({
        type: 'drawRoute',
        route: polylinePoints,
        distanceKm, 
        distanceText,     
        durationText,
        fareText,  
      }));

    } catch (err) {
      console.error("❌ Failed to fetch ORS route:", err);
      Alert.alert("Route error", "Could not fetch route.");
    }
  };

  const onChangeQuery = (t: string) => {
    setQuery(t);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      if (!t || t.length < 3) { setHits([]); return; }

      // bail if we don’t have the user’s location yet
      if (!location) { setHits([]); return; }

      try {
        const lat = location.latitude;
        const lon = location.longitude;
        const url = `${API_BASE_URL}/api/geocode?q=${encodeURIComponent(t)}&lat=${lat}&lon=${lon}`;
        const r = await fetch(url);
        const data = await r.json();
        setHits(Array.isArray(data) ? data : []);
      } catch {
        setHits([]);
      }
    }, 300);
  };


  // When a user taps a suggestion
  const choosePlace = (p: { label: string; lat: number; lon: number }) => {
    setQuery(p.label);
    setHits([]);

    const dest = { latitude: p.lat, longitude: p.lon };

    // update UI
    setDestination(dest);
    setDropoffName(p.label);

    // ✅ make sure we actually have current location
    if (!location) {
      Alert.alert('Location unavailable', 'Waiting for GPS, please try again in a moment.');
      return;
    }

    // draw route immediately
    fetchORSRoute(
      { latitude: location.latitude, longitude: location.longitude },
      dest
    );

    // (optional) update markers
    mapRef.current?.postMessage(JSON.stringify({
      type: 'setMarkers',
      destination: dest,
      driver: null,
    }));
  };

  useEffect(() => {
    (async () => {
      const fallback = "https://cdn-icons-png.flaticon.com/512/847/847969.png"; // simple silhouette
      try {
        const passengerId = await AsyncStorage.getItem("passengerId");
        if (!passengerId) return setAvatarUrl(fallback);

        const r = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`);
        const j = await r.json();
        const img =
          j?.passenger?.profileImage ||
          j?.passenger?.selfieImage ||
          j?.passenger?.avatar;
        setAvatarUrl(img ? `${API_BASE_URL}/${img}` : fallback);
      } catch {
        setAvatarUrl(fallback);
      }
    })();
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      // fire once right away, so the dot appears even before watch ticks
      if (location && mapRef.current) {
        mapRef.current.postMessage(JSON.stringify({
          type: "updateUserLoc",
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: 15,
          avatarUrl,
        }));
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (pos) => {
          mapRef.current?.postMessage(JSON.stringify({
            type: "updateUserLoc",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? 15,
            avatarUrl,
          }));
        }
      );
    })();

    return () => sub?.remove();
  }, [avatarUrl, mapHtml]); // reattach if HTML reloaded

  useEffect(() => {
    let headSub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        headSub = await Location.watchHeadingAsync((h) => {
          const bearing =
            Number.isFinite(h.trueHeading) ? h.trueHeading :
            (Number.isFinite(h.magHeading) ? h.magHeading : null);
          if (bearing !== null) {
            mapRef.current?.postMessage(JSON.stringify({
              type: "updateHeading",
              bearingDeg: bearing,
            }));
          }
        });
      } catch {
        // If heading isn’t available (some devices), we simply won’t show the cone.
      }
    })();

    return () => headSub?.remove();
  }, []);




  // ---------------------------------------------------------

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
  // useEffect(() => {
  //   const backAction = () => {
  //     Alert.alert("Logout Confirmation", "Do you want to log out?", [
  //       { text: "Cancel", onPress: () => null, style: "cancel" },
  //       {
  //         text: "Logout",
  //         onPress: async () => {
  //           await AsyncStorage.removeItem("passengerId");
  //           router.replace("/login_and_reg/plogin");
  //         },
  //       },
  //     ]);
  //     return true;
  //   };
  //   const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
  //   return () => backHandler.remove();
  // }, []);

  useEffect(() => {
    (async () => {
      try {
        const passengerId = await AsyncStorage.getItem("passengerId");
        if (!passengerId) return;
        const r = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`);
        const j = await r.json();
        const path: string | undefined =
          j?.passenger?.selfieImage || j?.passenger?.avatarUrl;
        if (path) {
          setAvatarUrl(path.startsWith("http") ? path : `${API_BASE_URL}/${path}`);
        } else {
          setAvatarUrl(null); // no image, still show blue dot
        }
      } catch {
        setAvatarUrl(null);
      }
    })();
  }, []);


  // Generate map HTML when location changes
  useEffect(() => {
  if (!location) return;

  const html = String.raw`
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; }
        .distance-label.leaflet-tooltip{
          background:rgba(0,0,0,.85);color:#fff;border:none;border-radius:12px;
          padding:4px 8px;box-shadow:0 1px 4px rgba(0,0,0,.3);
          font-size:12px;line-height:1;white-space:nowrap;
        }
        .distance-label.leaflet-tooltip:before{ display:none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
      <script>
        // --- Map init ---
        const map = L.map('map', { zoomControl:true })
          .setView([${location.latitude}, ${location.longitude}], 15);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom:19, attribution:'© OpenStreetMap contributors'
        }).addTo(map);

        // --- State ---
        let userMarker = null;       // blue marker for passenger
        let destMarker = null;       // green dot
        let driverMarker = null;     // car icon
        let destinationLocked = false;

        let routeLine = null;        // drawn polyline
        let distanceTooltip = null;  // route label (distance • time • fare)

        // --- Icons ---
        const userIcon = L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
          iconSize: [30, 30],
          iconAnchor: [15, 30], // bottom center
        });

        const destIcon = L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const carIcon = L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        // --- Helpers ---
        function upsertUserMarker(lat, lng){
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          if (!userMarker){
            userMarker = L.marker([lat,lng], { icon: userIcon, zIndexOffset: 1000 })
              .addTo(map)
              .bindTooltip( { permanent:true, direction:"top" });
          } else {
            userMarker.setLatLng([lat,lng]);
          }
        }

        function setDestination(lat, lng){
          if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
          destMarker = L.marker([lat,lng], { icon: destIcon })
            .addTo(map)
            .bindTooltip("Destination", { permanent:true, direction:"top" });
        }

        function setDriver(lat, lng){
          if (driverMarker) { map.removeLayer(driverMarker); driverMarker = null; }
          if (Number.isFinite(lat) && Number.isFinite(lng)){
            driverMarker = L.marker([lat,lng], { icon: carIcon })
              .addTo(map)
              .bindTooltip("🚕 Driver", { permanent:true, direction:"top" })
              .setZIndexOffset(1100);
          }
        }

        function clearRoute(){
          if (routeLine){ map.removeLayer(routeLine); routeLine = null; }
          if (distanceTooltip){ map.removeLayer(distanceTooltip); distanceTooltip = null; }
        }

        // --- Pick destination by tapping map (when not locked by active driver) ---
        map.on('click', function(e){
          if (destinationLocked) return;
          const { lat, lng } = e.latlng;
          setDestination(lat, lng);
          window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
        });

        // --- Message bridge ---
        document.addEventListener('message', function(event){
          let msg = {};
          try { msg = JSON.parse(event.data || '{}'); } catch(e){ return; }

          // Live passenger location (blue marker only)
          if (msg.type === 'updateUserLoc'){
            upsertUserMarker(msg.latitude, msg.longitude);
            return;
          }

          // Heading intentionally ignored (no cone)
          if (msg.type === 'updateHeading'){ return; }

          // Draw route with label (distance • duration • fare)
          if (msg.type === 'drawRoute' && Array.isArray(msg.route) && msg.route.length){
            clearRoute();

            routeLine = L.polyline(msg.route, { weight:4, color:'#1a73e8' }).addTo(map);
            map.fitBounds(routeLine.getBounds(), { padding:[50,50] });

            const mid = msg.route[Math.floor(msg.route.length/2)];
            const label = [msg.distanceText, msg.durationText, msg.fareText].filter(Boolean).join(' • ');
            distanceTooltip = L.tooltip({ permanent:true, direction:'top', offset:[0,-6], className:'distance-label' })
              .setContent(label || '')
              .setLatLng(mid)
              .addTo(map);
            return;
          }

          // Clear route
          if (msg.type === 'clearRoute'){
            clearRoute();
            return;
          }

          // Driver + Destination markers
          if (msg.type === 'setMarkers'){
            destinationLocked = !!msg.driver;

            // destination
            if (msg.destination && Number.isFinite(msg.destination.latitude) && Number.isFinite(msg.destination.longitude)){
              setDestination(msg.destination.latitude, msg.destination.longitude);
            } else if (destMarker){
              map.removeLayer(destMarker); destMarker = null;
            }

            // driver
            if (msg.driver && Number.isFinite(msg.driver.latitude) && Number.isFinite(msg.driver.longitude)){
              setDriver(msg.driver.latitude, msg.driver.longitude);
            } else if (driverMarker){
              map.removeLayer(driverMarker); driverMarker = null;
            }

            return;
          }
        });
      </script>
    </body>
  </html>
  `;
  setMapHtml(html);
  }, [location]);



  useEffect(() => {
    if (!mapRef.current || !location) return;
    mapRef.current.postMessage(JSON.stringify({
      type: "updateUserLoc",
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: 15,
      avatarUrl,
    }));
  }, [mapHtml, location, avatarUrl]);


  // Reverse geocode for drop-off location
  const handleMapMessage = async (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed.latitude && parsed.longitude) {
        setDestination(parsed);
        try {
          const results = await Location.reverseGeocodeAsync({
            latitude: parsed.latitude, longitude: parsed.longitude,
          });
          if (results && results.length > 0) {
            const addr = results[0];
            setDropoffName(`${addr.street || ""}${addr.street ? ", " : ""}${addr.city || addr.subregion || ""}`);
          } else {
            setDropoffName("Selected Location");
          }
        } catch {
          setDropoffName("Selected Location");
        }
      }
    } catch {}
  };

  const handleBookNow = async () => {
    if (!location || !destination) {
      Alert.alert("Missing location info");
      return;
    }
    setSearching(true)
    setAlertedBookingComplete(false);
    setTripCompleted(false);

    const passengerId = await AsyncStorage.getItem("passengerId");
    const bookingData = {
      pickupLat: location.latitude,
      pickupLng: location.longitude,
      destinationLat: destination.latitude,
      destinationLng: destination.longitude,
      fare, paymentMethod, notes, passengerId
    };

    try {
      // reset any old polling
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

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
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to send booking. Please try again.");
      setSearching(false);
    }
  };
  // {status === "accepted" && bookingId && (
  //   <ChatNotice
  //     bookingId={bookingId}
  //     role="passenger"
  //     onGoToChat={() =>
  //       router.push({
  //         pathname: "/chatcomponent",
  //         query: { bookingId, driverId, passengerId, role: "passenger" },
  //       })
  //     }
  //   />
  // )}

  
  

  // Set markers & trigger route drawing when destination is picked
  useEffect(() => {
    if (!mapRef.current || bookingConfirmed) return;

    const driverCoords = matchedDriver?.location
      ? { latitude: matchedDriver.location.latitude, longitude: matchedDriver.location.longitude }
      : null;

    if (driverCoords && destination) {
      mapRef.current.postMessage(JSON.stringify({ type: "setMarkers", destination, driver: driverCoords }));
    }

    // 👉 draw route as soon as we have both ends
    if (destination && location) {
      fetchORSRoute(location, destination);
    }
  }, [destination, matchedDriver, bookingConfirmed, location]);

  useEffect(() => {
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardOffset(-35));
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardOffset(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    const saveDriverId = async () => {
      if (matchedDriver && bookingId) {
        await AsyncStorage.setItem("driverIdToRate", matchedDriver.driverId);
        await AsyncStorage.setItem("bookingIdToRate", String(bookingId));
      }
    };
    saveDriverId();
  }, [matchedDriver, bookingId]);

  useEffect(() => {
    let interval: any;
    const pollForDriverMatch = async () => {
      if (!bookingId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/bookings`);
        const allBookings = await res.json();
        const myBooking = allBookings.find((b: any) => b && b.id === bookingId);

        if (!myBooking) return;

        if (myBooking.status === "accepted" && !bookingConfirmed) {
          setBookingConfirmed(true);
          setSearching(false);
          Alert.alert("Driver Accepted!", "The driver has accepted your ride and is on the way!");

          if (myBooking.driverId) {
            try {
              const [driverRes, statusRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/driver/${myBooking.driverId}`),
                fetch(`${API_BASE_URL}/api/driver-status/${myBooking.driverId}`)
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
                  location: statusData.location || null,
                });
              }
            } catch {}
          }
        }
      } catch {}
    };
    interval = setInterval(pollForDriverMatch, 4000);
    return () => clearInterval(interval);
  }, [bookingId, bookingConfirmed]);

  useEffect(() => {
    if (searching && (!bookingId || tripCompleted)) {
      setSearching(false);
    }
  }, [searching, bookingId, tripCompleted]);

  useEffect(() => {
    let interval: any;
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

          // 🔧 reset session so user can book again
          setSearching(false);                                     // <-- key line
          if (searchTimeoutRef.current) {                          // clear any pending timers
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
          }

          setBookingConfirmed(false);
          setBookingId(null);
          setMatchedDriver(null);
          setDestination(null);
          setShowBookingForm(false);
          setTripCompleted(true);

          // optional: tidy UI state
          setQuery('');
          setHits([]);

          // clear saved “searching:true” from storage
          AsyncStorage.removeItem("phomeBookingState").catch(() => {});

          // clear map
          mapRef.current?.postMessage(JSON.stringify({ type: "setMarkers", destination: null, driver: null }));
          mapRef.current?.postMessage(JSON.stringify({ type: "clearRoute" }));

          setFare(0);
        }

      } catch (err) { console.error("❌ Poll error:", err); }
    };
    interval = setInterval(pollForBookingCompletion, 4000);
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    const saveBookingState = async () => {
      const bookingState = {
        destination, destinationLabel, notes, paymentMethod, fare,
        matchedDriver, bookingConfirmed, bookingId, showBookingForm, searching,
      };
      try { await AsyncStorage.setItem("phomeBookingState", JSON.stringify(bookingState)); }
      catch (err) { console.warn("Error saving booking state:", err); }
    };
    saveBookingState();
  }, [destination, destinationLabel, notes, paymentMethod, fare, matchedDriver, bookingConfirmed, bookingId, showBookingForm, searching]);

  useEffect(() => {
    const loadBookingState = async () => {
      try {
        const savedState = await AsyncStorage.getItem("phomeBookingState");
        if (savedState) {
          const s = JSON.parse(savedState);
          if (s.destination) setDestination(s.destination);
          if (s.destinationLabel) setDestinationLabel(s.destinationLabel);
          if (s.notes) setNotes(s.notes);
          if (s.paymentMethod) setPaymentMethod(s.paymentMethod);
          if (s.fare) setFare(s.fare);
          if (s.matchedDriver) setMatchedDriver(s.matchedDriver);
          if (s.bookingConfirmed) setBookingConfirmed(s.bookingConfirmed);
          if (s.bookingId) setBookingId(s.bookingId);
          if (s.showBookingForm) setShowBookingForm(s.showBookingForm);
          if (s.searching) setSearching(s.searching);
        }
      } catch (err) { console.warn("Error loading booking state:", err); }
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
        body: JSON.stringify({ driverId: driverIdToRate, rating: selectedRating }),
      });

      if (res.ok && notes) {
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

  useEffect(() => { if (tripCompleted) setShowRatingModal(true); }, [tripCompleted]);

  const reportOptions = ["Overcharging","Harassment","Unproper Attire","Refusal to Convey Passenger","Other"];

  const submitReport = async () => {
    try {
      const passengerId = await AsyncStorage.getItem("passengerId");
      const res = await fetch(`${API_BASE_URL}/api/feedback/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId, passengerId, driverId: matchedDriver?.driverId, reportType, otherReport,
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
              scrollEnabled
              ref={(ref) => { if (ref && !mapRef.current) mapRef.current = ref; }}
              pointerEvents={showReportModal ? "none" : "auto"}
              originWhitelist={["*"]}
              source={{ html: mapHtml }}
              javaScriptEnabled
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: -30, zIndex: 0 }}
              onMessage={handleMapMessage}
              nestedScrollEnabled
            />
          )}

          <View style={styles.searchcont}>
            {/* Destination search */}
            <View style={styles.searchWrap}>
              <TextInput
                value={query}
                onChangeText={onChangeQuery}
                placeholder="Search destination (e.g., SM Lucena)"
                placeholderTextColor="#777"
                style={styles.searchInput}
              />
              {hits.length > 0 && (
                <View style={styles.searchResults}>
                  {hits.map((h, i) => (
                    <TouchableOpacity
                      key={`${h.lat},${h.lon}-${i}`}
                      onPress={() => choosePlace(h)}
                      style={styles.searchItem}
                    >
                      <Text style={styles.searchItemText}>{h.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

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
                    <TouchableOpacity style={{ alignItems: "center", padding: 10 }} onPress={() => setInfoBoxMinimized(false)}>
                      <Text style={{ fontWeight: "bold", color: "#000" }}>View Driver Info</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {matchedDriver.selfieImage && (
                          <Image
                            source={{ uri: `${API_BASE_URL}/${matchedDriver.selfieImage}` }}
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 25,
                              marginRight: 10,
                            }}
                          />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "bold", color: "#000" }}>✅ Driver Found!</Text>
                          <Text>Name: {matchedDriver.driverName}</Text>
                          <Text>Franchise #: {matchedDriver.franchiseNumber || "N/A"}</Text>
                          <Text>Experience: {matchedDriver.experienceYears || "N/A"} years</Text>

                          {/* Chat button here */}
                          <TouchableOpacity
                            onPress={() => {
                              router.push({
                                pathname: "/ChatRoom",
                                params: {
                                  bookingId: bookingId,
                                  driverId: matchedDriver?.driverId,
                                  passengerId: passengerId,
                                  role: "passenger",
                                },
                              });
                            }}
                            style={{
                              marginTop: 8,
                              backgroundColor: "#007bff",
                              paddingVertical: 8,
                              paddingHorizontal: 16,
                              borderRadius: 8,
                              alignSelf: "flex-start",
                            }}
                          >
                            <Text style={{ color: "#fff", fontWeight: "bold" }}>💬 Chat</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                        <TouchableOpacity onPress={() => setInfoBoxMinimized(true)} style={{ backgroundColor: "#81C3E1", borderRadius: 5, padding: 5 }}>
                          <Text style={{ color: "white" }}>Minimize</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowReportModal(true)} style={{ backgroundColor: "#f44336", borderRadius: 5, padding: 5 }}>
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
                            } catch {}
                            setSearching(false);
                            setBookingId(null);
                            setMatchedDriver(null);
                            setDestination(null);
                            setBookingConfirmed(false);
                            mapRef.current?.postMessage(JSON.stringify({ type: "setMarkers", destination: null, driver: null }));
                            mapRef.current?.postMessage(JSON.stringify({ type: "clearRoute" }));
                            setFare(0);
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
                <ScrollView style={styles.inputsContainer} keyboardDismissMode="on-drag">
                  <TextInput style={styles.input} placeholder="Saan ang pick-up?" value={pickupName} editable />
                  <TextInput style={styles.input} placeholder="Saan ang drop-off?" value={dropoffName} editable />
                  <TextInput style={styles.input} placeholder="Name this location (optional: Home, Work, etc.)" value={destinationLabel} onChangeText={setDestinationLabel} />
                  <TextInput style={styles.input} placeholder="Notes sa driver" value={notes} onChangeText={setNotes} />
                  <TextInput style={styles.input} placeholder="Paano ka magbabayad?" value={paymentMethod} onChangeText={setPaymentMethod} />
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
                style={{ position: "absolute", bottom: 10, backgroundColor: "#81C3E1", padding: 10, borderRadius: 8 }}
              >
                <Text style={{ fontWeight: "bold", fontSize: 16, color: "white" }}>START BOOKING</Text>
              </TouchableOpacity>
            )}

            {showRatingModal && (
              <View style={styles.ratingModalOverlay}>
                <View style={styles.ratingModal}>
                  <TouchableOpacity style={styles.dismissButton} onPress={() => { setShowRatingModal(false); AsyncStorage.removeItem("driverIdToRate"); }}>
                    <Ionicons name="close" size={24} color="gray" />
                  </TouchableOpacity>

                  <Text style={styles.modalTitle}>Rate Your Driver</Text>

                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                        <Ionicons name={selectedRating >= star ? "star" : "star-outline"} size={30} color="#FFD700" />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput style={styles.feedbackInput} placeholder="Leave a comment (optional)" multiline numberOfLines={3} onChangeText={setNotes} value={notes} />

                  <TouchableOpacity style={styles.submitButton} onPress={submitDriverRating}>
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {showReportModal && (
              <View style={styles.ratingModalOverlay}>
                <View style={[styles.ratingModal, { alignItems: "stretch" }]}>
                  <TouchableOpacity style={styles.dismissButton} onPress={() => setShowReportModal(false)}>
                    <Ionicons name="close" size={24} color="gray" />
                  </TouchableOpacity>

                  <Text style={styles.modalTitle}>Report Driver</Text>

                  <Text style={styles.modalLabel}>Select Report Type:</Text>
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowDropdown(!showDropdown)}>
                      <Text style={{ color: reportType ? "#000" : "#999" }}>{reportType || "Select a violation"}</Text>
                      <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                    </TouchableOpacity>

                    {showDropdown && (
                      <View style={styles.dropdownMenu}>
                        {["Overcharging","Harassment","Unproper Attire","Refusal to Convey Passenger","Other"].map((option) => (
                          <TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => { setReportType(option); setShowDropdown(false); }}>
                            <Text style={{ color: "#000" }}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {reportType === "Other" && (
                    <TextInput style={styles.feedbackInput} placeholder="Describe the issue" multiline numberOfLines={3} value={otherReport} onChangeText={setOtherReport} />
                  )}

                  <TouchableOpacity style={[styles.submitButton, { backgroundColor: "#4CAF50" }]} onPress={submitReport}>
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
  overlayContainer: { position: "absolute", bottom: 0, width: "100%", alignItems: 'center', height: 180 },
  overlay: { width: width, margin: 60 },
  searchcont: {position: "absolute", top: 50, width: "90%", alignItems: "center", marginLeft: 40},
  searchWrap: {
    width: '90%',
    alignSelf: 'center',
    zIndex: 20,            // stay above map
  },
  searchInput: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
  },
  searchResults: {
    marginTop: 4,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchItemText: {
    color: '#111',
  },

  panel: {
    position: 'absolute', bottom: 10, width: '100%', backgroundColor: '#E0F0FF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 15, zIndex: 10,
  },
  panelTitle: { fontWeight: 'bold', marginBottom: 5 },
  inputsContainer: { marginTop: 10, maxHeight: 180 },
  input: { backgroundColor: '#FFF', borderRadius: 10, padding: 10, marginVertical: 5 },
  fareContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  ratingModalOverlay: {
    position: "absolute", top: -100, left: 0, right: 0, bottom: 10,
    backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", zIndex: 999,
  },
  ratingModal: { width: "80%", backgroundColor: "#fff", borderRadius: 10, padding: 20, alignItems: "center" },
  dismissButton: { position: "absolute", top: 10, right: 10, zIndex: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  starsContainer: { flexDirection: "row", marginBottom: 10 },
  feedbackInput: { width: "100%", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 10, textAlignVertical: "top" },
  submitButton: { backgroundColor: "#4caf50", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  submitButtonText: { color: "#fff", fontWeight: "bold" },
  modalLabel: { marginTop: 5, marginBottom: 5, fontSize: 14, color: "#333", fontWeight: "500" },
  dropdownContainer: { width: "100%", marginVertical: 5 },
  dropdownButton: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 10, backgroundColor: "#FFF", borderRadius: 8, borderWidth: 1, borderColor: "#ccc",
  },
  dropdownMenu: { backgroundColor: "#FFF", borderRadius: 8, borderWidth: 1, borderColor: "#ccc", marginTop: 2 },
  dropdownItem: { padding: 10 },
  totalFare: { fontWeight: 'bold' },
  bookButton: { backgroundColor: '#000', borderRadius: 10, padding: 10 },
  bookButtonText: { color: '#FFF', fontWeight: 'bold' },
  bottomNav: {
    position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around",
    width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30,
    alignItems: "center", borderWidth: 1, borderColor: "black"
  },
  
});
