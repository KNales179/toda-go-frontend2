import React, { useState, useEffect, useRef } from "react";
import { View, 
  Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, 
  TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, 
  Keyboard, Image, BackHandler, ScrollView, AppState, Linking  } from "react-native";
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
import { getAuth } from "../utils/authStorage";
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';



async function getLocalIconBase64(localPath: any) {
  const asset = Asset.fromModule(localPath);
  await asset.downloadAsync(); // ensures we have a real file on device
  const uri = asset.localUri || asset.uri; // localUri preferred
  const base64 = await FileSystem.readAsStringAsync(uri!, { encoding: 'base64' });
  return `data:image/png;base64,${base64}`;
}


const POI_ICON_FILES: Record<string, any> = {
  cafe: require('../../assets/images/pios/cafe.png'),          
  convenience: require('../../assets/images/pios/convenience.png'),
  pharmacy: require('../../assets/images/pios/pharmacy.png'),
  bank: require('../../assets/images/pios/bank.png'),
  supermarket: require('../../assets/images/pios/supermarket.png'),
  restaurant: require('../../assets/images/pios/restaurant.png'),
  fast_food: require('../../assets/images/pios/restaurant.png'),
  hospital: require('../../assets/images/pios/hospital.png'),
  school: require('../../assets/images/pios/school.png'),
  market: require('../../assets/images/pios/market.png'),
  parking: require('../../assets/images/pios/parking.png'),
};



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

async function ensureLocationEnabled() {
  const services = await Location.hasServicesEnabledAsync();
  const perm = await Location.getForegroundPermissionsAsync();

  if (!services || perm.status !== 'granted') {
    Alert.alert(
      "Enable Location",
      "We need your location for live tracking. Please enable GPS and grant permission.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === 'android') IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS);
            else Linking.openURL('app-settings:');
          }
        }
      ]
    );
    return false;
  }
  return true;
}






export default function PHome() {

  useEffect(() => {
    (async () => {
      try {
        const auth = await getAuth();
        if (auth?.role === "passenger" && auth?.userId) {
          setPassengerId(String(auth.userId));
          return;
        }

        // 2) fallback to legacy key (keeps old screens working)
        const legacy = await AsyncStorage.getItem("passengerId");
        if (legacy) {
          setPassengerId(legacy);
          return;
        }

        // 3) no id → force re-login
        Alert.alert("Session expired", "Please log in again.");
        router.replace("/login_and_reg/plogin");
      } catch {
        Alert.alert("Error", "Could not load your session. Please log in again.");
        router.replace("/login_and_reg/plogin");
      }
    })();
  }, []);


  const { location, loading } = useLocation();
  const [copied, setCopied] = useState(false);
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
  const [hits, setHits] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const status = currentBooking?.status as 'accepted' | 'pending' | 'completed' | 'canceled' | undefined;
  const driverId = currentBooking?.driverId;
  const [passengerId, setPassengerId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const messageQueue = useRef<any[]>([]);
  const poiFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPoiKeyRef = useRef<string>('');
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [iconData, setIconData] = useState<Record<string, string> | null>(null);
  const lastCenterRef = useRef<{lat:number; lng:number} | null>(null);
  const poiCacheRef = useRef<Map<string, any[]>>(new Map());
  const inflightRef  = useRef<Set<string>>(new Set());
  const lastReqIdRef = useRef(0);
  const [showPOIs, setShowPOIs] = useState(false);
  const lastBBoxRef = useRef<{ minLng:number; minLat:number; maxLng:number; maxLat:number; zoom:number } | null>(null);
  // --- Booking type + party size ---
  const [bookingType, setBookingType] = useState<'CLASSIC' | 'GROUP' | 'SOLO'>('CLASSIC');
  const [partySize, setPartySize] = useState<number>(2);
  const userMarkerOkRef = useRef(false);
  const [livePos, setLivePos] = useState<{latitude:number; longitude:number} | null>(null);
  const initialLocRef = useRef<{ latitude:number; longitude:number } | null>(null);
  const routeFramedRef = useRef(false);
  const lastRouteDestKeyRef = useRef<string | null>(null);
  const lastOriginRef = useRef<{lat:number; lng:number} | null>(null);
  const lastRouteFromRef = useRef<{lat:number; lng:number} | null>(null);
  const lastRouteToRef   = useRef<{lat:number; lng:number} | null>(null);
  const lastRouteAtRef   = useRef(0);
  const [pickupLoc, setPickupLoc] = useState<{ latitude:number; longitude:number } | null>(null);
  const [pickup, setPickup] = useState<{ latitude:number; longitude:number } | null>(null);
  const [bookedFor, setBookedFor] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [selectingPickup, setSelectingPickup] = useState(false); // map-tap to set pickup



  const ROUTE_MIN_MOVE_M   = 35;   // recompute if user moved >= 35 m
  const ROUTE_MIN_INTERVAL = 8000; // or every 8s, whichever comes first

  const toLatLng = (p:{latitude:number; longitude:number}) => ({ lat: p.latitude, lng: p.longitude });


  function ensureUserMarker(lat: number, lng: number) {
    let attempts = 0;
    userMarkerOkRef.current = false;

    const tryOnce = () => {
      attempts += 1;
      sendToMap({ type: 'ensureUserMarker', latitude: lat, longitude: lng });

      if (!userMarkerOkRef.current && attempts < 6) {
        setTimeout(tryOnce, 400);  // retry every 400ms up to ~2s
      }
    };

    tryOnce();
  }

  const handleCopy = async () => {
    const n = paymentInfo?.driverPayment?.number;
    if (!n) return;

    await Clipboard.setStringAsync(n);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  function roundByZoom(value: number, zoom: number) {
    const decimals =
      zoom >= 18 ? 3 :
      zoom >= 16 ? 3 :
      zoom >= 15 ? 2 :
      /* <=14 */   2;
    const m = Math.pow(10, decimals);
    return Math.round(value * m) / m;
  }


  function haversine(a:{lat:number,lng:number}, b:{lat:number,lng:number}) {
    const R = 6371000;
    const toRad = (x:number)=>x*Math.PI/180;
    const dLat = toRad(b.lat-a.lat);
    const dLng = toRad(b.lng-a.lng);
    const s1 = Math.sin(dLat/2)**2 +
              Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(s1)); 
  }


  const sendToMap = (msg: any) => {
    const json = JSON.stringify(msg);
    if (!mapReady || !mapRef.current) {
      messageQueue.current.push(json);
      return;
    }
    mapRef.current.postMessage(json);
  };

  useEffect(() => {
    if (!mapReady || !iconData) return;
    sendToMap({ type: 'preloadIcons', icons: iconData });
  }, [mapReady, iconData]);


  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const k of Object.keys(POI_ICON_FILES)) {
        out[k] = await getLocalIconBase64(POI_ICON_FILES[k]);
      }
      setIconData(out);
    })();
  }, []);


  useEffect(() => {
    if (mapReady && mapRef.current && messageQueue.current.length) {
      messageQueue.current.forEach((m) => mapRef.current?.postMessage(m));
      messageQueue.current = [];
    }
  }, [mapReady]);
  useEffect(() => {
    if (mapReady && location) {
      ensureUserMarker(location.latitude, location.longitude);
    }
  }, [mapReady, location]);

  useEffect(() => {
    if (location && !pickup) {
      setPickup({ latitude: location.latitude, longitude: location.longitude });
    }
  }, [location]);


  useFocusEffect(React.useCallback(() => { ensureLocationEnabled(); }, []));

  // call on mount
  useEffect(() => { ensureLocationEnabled(); }, []);

  // call on resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') ensureLocationEnabled();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!destination || !pickup) return;

    const destKey = `${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`;

    if (lastRouteDestKeyRef.current !== destKey) {
      fetchORSRoute(pickup, destination, true); 
      routeFramedRef.current = true;
      lastRouteDestKeyRef.current = destKey;
      lastOriginRef.current = { lat: pickup.latitude, lng: pickup.longitude };
    }
  }, [destination, pickup]);

  const canShowChatNotice = bookingConfirmed && !!bookingId && !!matchedDriver?.driverId && !!passengerId;

  const setPickupToMyLocation = () => {
    if (!location) { Alert.alert("GPS not ready"); return; }
    setPickup({ latitude: location.latitude, longitude: location.longitude });
  };


  // ---------- ORS: fetch route and draw in WebView ----------
  const routeReqIdRef = useRef(0);

  const [paymentInfo, setPaymentInfo] = useState<{
    paymentMethod?: string;
    paymentStatus?: "none"|"awaiting"|"paid"|"failed";
    driverPayment?: { number?: string; qrUrl?: string|null };
  } | null>(null);

  const loadPaymentInfo = async (id: string) => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/booking/${id}/payment-info`);
      const j = await r.json();
      if (j?.ok) setPaymentInfo({
        paymentMethod: j.paymentMethod,
        paymentStatus: j.paymentStatus,
        driverPayment: j.driverPayment || {},
      });
    } catch {}
  };

  const setPaymentStatus = async (id: string, status: "paid"|"failed") => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/booking/${id}/payment-status`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await r.json();
      if (j?.ok) setPaymentInfo((p)=> p ? { ...p, paymentStatus: status } : p);
    } catch {}
  };

  const fetchORSRoute = async (
    from: { latitude: number; longitude: number },
    to:   { latitude: number; longitude: number },
    reframe: boolean = false         // <-- NEW
  ) => {
    const myReqId = ++routeReqIdRef.current;

    try {
      const res = await fetch(`${API_BASE_URL}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: [from.longitude, from.latitude],
          end:   [to.longitude,   to.latitude],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.features?.[0]?.geometry?.coordinates) return;
      if (myReqId !== routeReqIdRef.current) return; 

      const coords = data.features[0].geometry.coordinates; // [lng,lat]
      const polylinePoints = coords.map(([lng, lat]: number[]) => [lat, lng]);

      const summary    = data.features?.[0]?.properties?.summary || {};
      const distanceM  = summary.distance ?? 0;
      const durationS  = summary.duration ?? 0;
      const distanceKm = distanceM / 1000;

      const distanceText = `${distanceKm.toFixed(2)} km`;
      const mins         = Math.round(durationS / 60);
      const durationText = mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins} min`;

      const computedFare = calculateFare(distanceKm, discount);
      setFare(computedFare);

      sendToMap({
        type: 'drawRoute',
        route: polylinePoints,
        distanceKm,
        distanceText,
        durationText,
        fareText: `₱${computedFare} est`,
        reframe,                        
      });
    } catch {}
  };



  const onChangeQuery = (t: string) => {
    setQuery(t);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      if (!t || t.length < 3) { setHits([]); return; }
      if (!pickup) { setHits([]); return; }

      try {
        const lat = pickup.latitude;
        const lng = pickup.longitude; 
        const url = `${API_BASE_URL}/api/places-search?q=${encodeURIComponent(t)}&lat=${lat}&lng=${lng}`;
        const r = await fetch(url);
        const data = await r.json();
        setHits(Array.isArray(data) ? data : []);
      } catch {
        setHits([]);
      }
    }, 300);
  };



  // When a user taps a suggestion
  const choosePlace = (p: { label: string; lat: number; lng: number }) => {
    setQuery(p.label);
    setHits([]);

    const dest = { latitude: p.lat, longitude: p.lng };

    // update UI
    setDestination(dest);
    setDropoffName(p.label);

    // ✅ make sure we actually have current location
    if (!pickup) {
      Alert.alert('Location unavailable', 'Waiting for GPS, please try again in a moment.');
      return;
    }
    

    // draw route immediately
    lastRouteFromRef.current = { lat: pickup.latitude, lng: pickup.longitude };
    lastRouteToRef.current   = { lat: dest.latitude,     lng: dest.longitude };
    lastRouteAtRef.current   = Date.now();
    fetchORSRoute(
      { latitude: pickup.latitude, longitude: pickup.longitude },
      dest,
      true
    );

    sendToMap({
      type: 'setMarkers',
      destination: dest,
      driver: null,
      pickup: pickup ? { latitude: pickup.latitude, longitude: pickup.longitude } : null,
    });
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

  const destinationRef = useRef<typeof destination>(null);
  useEffect(() => { destinationRef.current = destination; }, [destination]);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      // ✅ Seed blue marker from current GPS if we have it
      if (location && mapRef.current) {
        mapRef.current.postMessage(JSON.stringify({
          type: "updateUserLoc",
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: 15,
          avatarUrl,
        }));
        ensureUserMarker(location.latitude, location.longitude);
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;

          setLivePos({ latitude, longitude });
          // 🔵 Always drive the blue marker from GPS
          sendToMap({
            type: "updateUserLoc",
            latitude,
            longitude,
            accuracy: accuracy ?? 15,
            avatarUrl,
          });

          // 🧭 Keep route recalculation origin = pickup (NOT blue) when routing
          const dest = destinationRef.current;
          if (dest && pickup) {
            const fromLL = { lat: pickup.latitude, lng: pickup.longitude };
            const toLL   = { lat: dest.latitude,   lng: dest.longitude   };
            const movedM = haversine(lastRouteFromRef.current ?? fromLL, fromLL);
            const now = Date.now();
            const shouldRecompute =
              movedM >= ROUTE_MIN_MOVE_M ||
              (now - lastRouteAtRef.current) >= ROUTE_MIN_INTERVAL;

            if (shouldRecompute) {
              fetchORSRoute(
                { latitude: pickup.latitude, longitude: pickup.longitude },
                dest,
                false // no reframe on live updates
              );
              lastRouteFromRef.current = fromLL;
              lastRouteToRef.current   = toLL;
              lastRouteAtRef.current   = now;
            }
          }

          if (accuracy && accuracy > 80) return;
        }
      );
    })();

    return () => sub?.remove();
  }, [avatarUrl, location, pickup]);


  


  useEffect(() => {
    let headSub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        headSub = await Location.watchHeadingAsync((h) => {
          const bearing =
            Number.isFinite(h.trueHeading) ? h.trueHeading :
            (Number.isFinite(h.magHeading) ? h.magHeading : null);
          if (bearing !== null) {
            sendToMap({
              type: "updateHeading",
              bearingDeg: bearing,
            });
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
  if (!pickup) return;
    Location.reverseGeocodeAsync({
      latitude: pickup.latitude, longitude: pickup.longitude
    }).then((results) => {
      if (results && results.length > 0) {
        const a = results[0];
        setPickupName(`${a.street || ""}${a.street ? ", " : ""}${a.city || a.subregion || ""}`);
      } else {
        setPickupName("Pinned pickup");
      }
    }).catch(() => setPickupName("Pinned pickup"));
  }, [pickup]);

  
  useEffect(() => {
    if (!mapReady) return;
    const p = bookedFor && location ? location : (location || pickup);
    if (p) ensureUserMarker(p.latitude, p.longitude);
  }, [mapReady, mapHtml, location, pickup, bookedFor]);


  useEffect(() => {
    if (!livePos) return;
    console.log("LIVE POS →", livePos.latitude, livePos.longitude);
  }, [livePos]);


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
  if (!location || mapHtml) return;

  // lock the very first location for the initial setView
  if (!initialLocRef.current) {
    initialLocRef.current = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }

  const { latitude: initLat, longitude: initLng } = initialLocRef.current;
  const iconJson = JSON.stringify(iconData || {});

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
        if (!window.L) {
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type:'error', msg:'Leaflet failed to load' }));
        }
        // --- Map init ---
        const map = L.map('map', {
          zoomControl: true,
          maxBounds: [[13.96,121.643],[13.88,121.588]],
          maxBoundsViscosity: 0.5,
          minZoom: 13,
          maxZoom: 19, 
          noWrap: true
        }).setView([${initLat}, ${initLng}], 15);


        L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=7yQg8w68otDEssrPk9wU', {
          maxZoom: 19,
          attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors | © <a href="https://www.maptiler.com/">MapTiler</a>'
        }).addTo(map);

        // --- State ---
        let userMarker = null;       // blue marker for passenger
        let destMarker = null;       // green dot
        let driverMarker = null;     // car icon
        let destinationLocked = false;

        let routeLine = null;        // drawn polyline
        let distanceTooltip = null;  // route label (distance • time • fare)

        let poiLayer = L.layerGroup().addTo(map);
        let landmarkLayer = L.layerGroup().addTo(map);
        let currentZoomLevel = map.getZoom();    // track last zoom to know in/out
        let userMarkerPlaced = false; // <— NEW
        let pickupMarker = null;

        let tweenHandle = null;
        function tweenMarkerTo(lat, lng, durationMs = 300) {
          if (!userMarker) return upsertUserMarker(lat, lng);
          if (tweenHandle) cancelAnimationFrame(tweenHandle);

          const start = userMarker.getLatLng();
          const end = L.latLng(lat, lng);
          const t0 = performance.now();

          const step = (t) => {
            const p = Math.min(1, (t - t0) / durationMs);
            const latI = start.lat + (end.lat - start.lat) * p;
            const lngI = start.lng + (end.lng - start.lng) * p;
            userMarker.setLatLng([latI, lngI]);
            if (p < 1) tweenHandle = requestAnimationFrame(step);
          };
          tweenHandle = requestAnimationFrame(step);
        }

        function upsertUserMarker(lat, lng){
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          if (!userMarker){
            userMarker = L.marker([lat,lng], { icon: userIcon, zIndexOffset: 1000 })
              .addTo(map)
              .bindTooltip({ permanent:true, direction:"top" });
          } else {
            userMarker.setLatLng([lat,lng]);
          }
          userMarkerPlaced = true; 
        }

        function bboxContains(b, lat, lng) {
          return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
        }

        const poiMarkers = new Map();        // id -> L.Marker
        const iconCache  = {};               // category -> L.Icon
        let poiBatchHandle = null;           // cancel previous batch

        function getPoiIcon(cat, poiIcons) {
          if (iconCache[cat]) return iconCache[cat];

          const url = (poiIcons[cat] && poiIcons[cat].includes('base64,'))
            ? poiIcons[cat]
            : 'https://cdn-icons-png.flaticon.com/512/854/854878.png'; // fallback

          iconCache[cat] = L.icon({
            iconUrl: url,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
          });
          return iconCache[cat];
        }

        function addOrUpdatePOIMarker(it, poiIcons) {
          const existing = poiMarkers.get(it.id);
          if (existing) {
            // update position if it changed
            const curr = existing.getLatLng();
            if (curr.lat !== it.lat || curr.lng !== it.lng) {
              existing.setLatLng([it.lat, it.lng]);
            }
            return;
          }
          const icon = getPoiIcon(it.category, poiIcons); // your cached icon getter
          const marker = L.marker([it.lat, it.lng], { icon });

          // build popup with "Set Destination"
          const container = document.createElement('div');
          const title = document.createElement('b');
          title.textContent = it.name || it.category || 'POI';
          container.appendChild(title);
          container.appendChild(document.createElement('br'));
          const btn = document.createElement('button');
          btn.textContent = 'Set Destination';
          btn.style.marginTop = '6px';
          btn.onclick = function () {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'setDestinationFromPOI',
              lat: it.lat, lng: it.lng, label: it.name || it.category || 'POI'
            }));
          };
          container.appendChild(btn);
          marker.bindPopup(container);

          marker.addTo(poiLayer);
          poiMarkers.set(it.id, marker);
        }
        
        function bboxContains(b, lat, lng) {
          return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
        }

        // --- Icons ---
        const userIcon = L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
          iconSize: [30, 30],
          iconAnchor: [15, 30], // bottom center
        });

        const pickupIcon = L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
          iconSize: [30,30],
          iconAnchor: [15,30],
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

        function setDestination(lat, lng){
          if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
          destMarker = L.marker([lat,lng], { icon: destIcon })
            .addTo(map)
            .bindTooltip("Destination", { permanent:true, direction:"top" });
        }

        function setPickup(lat, lng){
          if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
          pickupMarker = L.marker([lat,lng], { icon: pickupIcon })
            .addTo(map)
            .bindTooltip({ permanent:true, direction:"top" });
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

        (function sendInitialBBox(){
          const b = map.getBounds();
          const c = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'bbox',
            bbox: {
              minLng: b.getWest(), minLat: b.getSouth(),
              maxLng: b.getEast(), maxLat: b.getNorth()
            },
            zoom: map.getZoom(),
            center: { lat: c.lat, lng: c.lng }
          }));
        })();

        map.on('moveend', function () {
          const b = map.getBounds();
          const c = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'bbox',
            bbox: {
              minLng: b.getWest(), minLat: b.getSouth(),
              maxLng: b.getEast(), maxLat: b.getNorth()
            },
            zoom: map.getZoom(),
            center: { lat: c.lat, lng: c.lng }
          }));
        });


        // --- Message bridge ---
        document.addEventListener('message', function(event){
          let msg = {};
          try { msg = JSON.parse(event.data || '{}'); } catch(e){ return; }

          if (msg.type === 'ensureUserMarker') {
            const lat = Number(msg.latitude);
            const lng = Number(msg.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              upsertUserMarker(lat, lng);
            }
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'userMarkerEnsured',
              placed: !!userMarker,
            }));
            return;
          }

          // Live passenger location (blue marker only)
          if (msg.type === 'updateUserLoc'){
            const lat = Number(msg.latitude), lng = Number(msg.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) tweenMarkerTo(lat, lng, 300);
            return;
          }

          if (msg.type === 'setPickup') {
            const lat = Number(msg.latitude), lng = Number(msg.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) setPickup(lat, lng);
            return;
          }
          if (msg.type === 'clearPickup') {
            if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
            return;
          }


          // Keep route line's head glued to the moving CL marker
          if (msg.type === 'nudgeRouteStart') {
            const lat = Number(msg.latitude), lng = Number(msg.longitude);

            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'dbg',
              tag: 'nudgeRouteStart',
              note: 'received nudge'
            }));

            if (!routeLine || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

            let pts = routeLine.getLatLngs();
            if (!Array.isArray(pts) || !pts.length) return;
            if (Array.isArray(pts[0]) && pts[0].length) { pts = pts[0]; }

            pts[0] = L.latLng(lat, lng);
            routeLine.setLatLngs(pts);

            if (pts.length > 1) {
              const p1 = pts[0], p2 = pts[1];
              const mid = L.latLng(
                p1.lat + (p2.lat - p1.lat) * 0.15,
                p1.lng + (p2.lng - p1.lng) * 0.15
              );
              routeLine.setLatLngs([p1, mid, ...pts.slice(1)]);
            }

            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'nudgeAck', ok: true }));
            return;
          }


            
          // Heading intentionally ignored (no cone)
          if (msg.type === 'updateHeading'){ return; }

          // Draw route with label (distance • duration • fare)
          if (msg.type === 'drawRoute' && Array.isArray(msg.route) && msg.route.length) {
            clearRoute();
            routeLine = L.polyline(msg.route, { weight:4, color:'#1a73e8' }).addTo(map);

            if (msg.reframe) {
              map.fitBounds(routeLine.getBounds(), { padding:[50,50] });
            }

            const mid = msg.route[Math.floor(msg.route.length/2)];
            const label = [msg.distanceText, msg.durationText, msg.fareText]
              .filter(Boolean).join(' • ');
            distanceTooltip = L.tooltip({
              permanent:true, direction:'top', offset:[0,-6], className:'distance-label'
            }).setContent(label || '').setLatLng(mid).addTo(map);
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

            if (msg.pickup && Number.isFinite(msg.pickup.latitude) && Number.isFinite(msg.pickup.longitude)){
              setPickup(msg.pickup.latitude, msg.pickup.longitude);
            } else if (pickupMarker){
              map.removeLayer(pickupMarker); pickupMarker = null;
            }

            // driver
            if (msg.driver && Number.isFinite(msg.driver.latitude) && Number.isFinite(msg.driver.longitude)){
              setDriver(msg.driver.latitude, msg.driver.longitude);
            } else if (driverMarker){
              map.removeLayer(driverMarker); driverMarker = null;
            }

            return;
          }

          if (msg.type === 'requestBbox') {
            const b = map.getBounds();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'bbox',
              bbox: {
                minLng: b.getWest(),
                minLat: b.getSouth(),
                maxLng: b.getEast(),
                maxLat: b.getNorth()
              },
              zoom: map.getZoom()
            }));
            return;
          }

          const poiIcons = ${iconJson};
          if (msg.type === 'setPOIs' && Array.isArray(msg.items)) {
            if (poiBatchHandle) {
              cancelAnimationFrame(poiBatchHandle);
              poiBatchHandle = null;
            }

            const z = Number(msg.zoom) || currentZoomLevel;
            const b = msg.bbox || null;

            // Collect desired items from payload
            const desired = new Map();
            for (const it of msg.items) {
              if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) continue;
              desired.set(it.id, it);
            }
            const desiredIds = new Set(desired.keys());

            // Decide strategy based on zoom direction
            if (z > currentZoomLevel) {
              // ---- ZOOM IN: accumulate (add new), but prune anything far outside screen
              if (b) {
                for (const [id, marker] of poiMarkers) {
                  const p = marker.getLatLng();
                  if (!bboxContains(b, p.lat, p.lng)) {
                    poiLayer.removeLayer(marker);
                    poiMarkers.delete(id);
                  }
                }
              }
            } else if (z < currentZoomLevel) {
              // ---- ZOOM OUT: shrink to what backend sent
              for (const [id, marker] of poiMarkers) {
                const keep = desiredIds.has(id);
                const p = marker.getLatLng();
                const onScreen = !b || bboxContains(b, p.lat, p.lng);
                if (!keep || !onScreen) {
                  poiLayer.removeLayer(marker);
                  poiMarkers.delete(id);
                }
              }
            } else {
              // ---- SAME ZOOM (pan): replace by diff within current screen
              for (const [id, marker] of poiMarkers) {
                const p = marker.getLatLng();
                const drop = !desiredIds.has(id) || (b && !bboxContains(b, p.lat, p.lng));
                if (drop) {
                  poiLayer.removeLayer(marker);
                  poiMarkers.delete(id);
                }
              }
            }

            // Build list of new ones to add
            const toAdd = [];
            for (const [id, it] of desired) {
              if (!poiMarkers.has(id)) toAdd.push(it);
            }

            // ✅ UPDATED PART: adaptive batching for smoother render
            const total = toAdd.length;
            const BATCH =
              total > 300 ? 80 :
              total > 150 ? 50 :
              total > 60  ? 35 :
              25; // small = faster draw
            const DELAY = total > 150 ? 20 : 10;

            const poiIcons = ${JSON.stringify(iconData || {})};

            let i = 0;
            const addBatch = () => {
              const end = Math.min(i + BATCH, total);
              for (; i < end; i++) {
                const it = toAdd[i];
                const icon = getPoiIcon(it.category, poiIcons);
                const marker = L.marker([it.lat, it.lng], { icon, opacity: 0 }); // start transparent

                const container = document.createElement('div');
                const title = document.createElement('b');
                title.textContent = it.name || it.category || 'POI';
                container.appendChild(title);
                container.appendChild(document.createElement('br'));

                const btn = document.createElement('button');
                btn.textContent = 'Set Destination';
                btn.style.marginTop = '6px';
                btn.onclick = function () {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'setDestinationFromPOI',
                    lat: it.lat, lng: it.lng, label: it.name || it.category || 'POI'
                  }));
                };
                container.appendChild(btn);

                marker.bindPopup(container);
                marker.addTo(poiLayer);
                poiMarkers.set(it.id, marker);

                // 🔥 Fade-in animation
                let op = 0;
                const fade = () => {
                  op += 0.15;
                  if (op <= 1) {
                    marker.setOpacity(op);
                    requestAnimationFrame(fade);
                  } else {
                    marker.setOpacity(1);
                  }
                };
                requestAnimationFrame(fade);
              }

              if (i < total) {
                poiBatchHandle = requestAnimationFrame(() => setTimeout(addBatch, DELAY));
              } else {
                poiBatchHandle = null;
              }
            };


            addBatch();

            currentZoomLevel = z;
            return;
          }





          // Render Landmarks (pin markers)
          if (msg.type === 'setLandmarks' && Array.isArray(msg.items)) {
            landmarkLayer.clearLayers();
            msg.items.forEach(it => {
              if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) return;
              L.marker([it.lat, it.lng])
                .bindTooltip(it.name || 'Landmark', { direction: 'top' })
                .addTo(landmarkLayer);
            });
            return;
          }
          if (msg.type === 'clearLandmarks') {
            landmarkLayer.clearLayers();
            return;
          }
        });
      </script>
    </body>
  </html>
  `;
  setMapHtml(html);
  }, [mapHtml, location]);  



  useEffect(() => {
    if (!mapRef.current || !location) return;

    // 🔵 Update passenger marker live
    mapRef.current.postMessage(JSON.stringify({
      type: "updateUserLoc",
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: 15,
      avatarUrl,
    }));

    // 🧭 Recompute route occasionally (no zoom)
    const now = Date.now();
    if (destination && pickup) {
      const fromLL = { lat: pickup.latitude, lng: pickup.longitude };
      const toLL   = { lat: destination.latitude, lng: destination.longitude };

      const movedM = haversine(
        lastRouteFromRef.current ?? fromLL,
        fromLL
      );

      const shouldRecompute =
        movedM >= ROUTE_MIN_MOVE_M ||
        (now - lastRouteAtRef.current) >= ROUTE_MIN_INTERVAL;

      if (shouldRecompute) {
        fetchORSRoute(
          { latitude: pickup.latitude, longitude: pickup.longitude },
          destination,
          false // ⚠️ never reframe on live updates
        );
        lastRouteFromRef.current = fromLL;
        lastRouteToRef.current   = toLL;
        lastRouteAtRef.current   = now;
      }
    }
  }, [location, pickup, avatarUrl, destination]);


  useEffect(() => {
    if (!initialLocRef.current && pickup) {
      initialLocRef.current = { latitude: pickup.latitude, longitude: pickup.longitude };
    }
  }, [pickup]);

  useEffect(() => {
    console.log("[PHome] HTML built once?", !!mapHtml);
  }, [mapHtml]);

  useEffect(() => {
    console.log('[PHome] guards:',
      'hasLocation=', !!location,
      'haspickup=', !!pickup,
      'hasIconData=', !!iconData,
      'hasMapHtml=', !!mapHtml
    );
  }, [location, pickup, iconData, mapHtml]);

  useEffect(() => {
    if (!destination || !pickup || !routeFramedRef.current) return;

    const now = { lat: pickup.latitude, lng: pickup.longitude };
    const moved = lastOriginRef.current ? haversine(lastOriginRef.current, now) : Infinity;

    if (moved > 150) {                 // tweak threshold as you like
      fetchORSRoute(pickup, destination, false); 
      lastOriginRef.current = now;
    }
  }, [pickup, destination]);

  useEffect(() => {
    if (!pickup) return;
    sendToMap({ type: 'setPickup', latitude: pickup.latitude, longitude: pickup.longitude });
  }, [pickup]);

  // Reverse geocode for drop-off location
  const handleMapMessage = async (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);

      // ✅ PRIORITY: pickup selection
      if (selectingPickup && parsed.latitude && parsed.longitude) {
        setPickup({ latitude: parsed.latitude, longitude: parsed.longitude });
        setSelectingPickup(false);
        sendToMap({ type: 'setPickup', latitude: parsed.latitude, longitude: parsed.longitude });
        return; // <-- don't also set destination
      }

      // Destination clicks (normal map tap)
      if (parsed.latitude && parsed.longitude) {
        setDestination(parsed);
        try {
          const results = await Location.reverseGeocodeAsync({
            latitude: parsed.latitude, longitude: parsed.longitude,
          });
          if (results && results.length > 0) {
            const a = results[0];
            setDropoffName(`${a.street || ""}${a.street ? ", " : ""}${a.city || a.subregion || ""}`);
          } else {
            setDropoffName("Selected Location");
          }
        } catch {
          setDropoffName("Selected Location");
        }
      }

      if (selectingPickup && parsed.latitude && parsed.longitude) {
        setPickup({ latitude: parsed.latitude, longitude: parsed.longitude });
        setSelectingPickup(false);
        sendToMap({ type: 'setPickup', latitude: parsed.latitude, longitude: parsed.longitude });
        return;
      }

      if (parsed.type === 'dbg' && parsed.tag === 'nudgeRouteStart') {
        console.log('[MAP] nudge dbg:', parsed);
        return;
      }
      if (parsed.type === 'nudgeAck') {
        console.log('[MAP] nudgeAck ok=', parsed.ok);
        return;
      }
      if (parsed.type === 'userMarkerEnsured') {
        userMarkerOkRef.current = !!parsed.placed;
        return;
      }
      if (parsed.type === 'bbox' && parsed.bbox) {
        const { minLng, minLat, maxLng, maxLat } = parsed.bbox;
        const zoom = Number(parsed.zoom) || 0;
        lastBBoxRef.current = { minLng, minLat, maxLng, maxLat, zoom };
        if (!showPOIs || zoom < 14) {
          sendToMap({ type: 'setPOIs', items: [] });
          return;
        };

        const center = parsed.center;
        if (center && lastCenterRef.current) {
          const moved = haversine(lastCenterRef.current, center);
          if (moved < 300) return; // <300m → skip fetch
        }
        if (center) lastCenterRef.current = center;

        const key = [
          zoom,
          roundByZoom(minLng, zoom),
          roundByZoom(minLat, zoom),
          roundByZoom(maxLng, zoom),
          roundByZoom(maxLat, zoom),
        ].join('|');

        if (lastPoiKeyRef.current === key) return; // avoid duplicates
        lastPoiKeyRef.current = key;

        if (poiFetchTimerRef.current) clearTimeout(poiFetchTimerRef.current);
        poiFetchTimerRef.current = setTimeout(async () => {
          try {
            const qs: string[] = [
              `types=${encodeURIComponent('cafe,convenience,pharmacy,bank,supermarket,restaurant,fast_food,hospital,school,market,parking,terminal')}`,
              `bbox=${minLng},${minLat},${maxLng},${maxLat}`,
              `zoom=${zoom}`,
            ];
            if (center?.lat != null && center?.lng != null) {
              qs.push(`clat=${center.lat}`, `clng=${center.lng}`);
            }
            const url = `${API_BASE_URL}/api/pois?${qs.join('&')}`;
            if (poiCacheRef.current.has(key)) {
              sendToMap({ type: 'setPOIs', items: poiCacheRef.current.get(key) });
              return;
            }

            if (inflightRef.current.has(key)) {
              return;
            }

            inflightRef.current.add(key);

            const reqId = ++lastReqIdRef.current;
            
            try {
              const qs: string[] = [
                `types=${encodeURIComponent('cafe,convenience,pharmacy,bank,supermarket,restaurant,fast_food,hospital,school,market,parking,terminal')}`,
                `bbox=${minLng},${minLat},${maxLng},${maxLat}`,
                `zoom=${zoom}`,
              ];
              if (center?.lat != null && center?.lng != null) {
                qs.push(`clat=${center.lat}`, `clng=${center.lng}`);
              }
              const url = `${API_BASE_URL}/api/pois?${qs.join('&')}`;

              const r = await fetch(url);
              const items = await r.json();

              if (reqId !== lastReqIdRef.current) {
                return; // a newer request finished after this one
              }

              if (Array.isArray(items)) {
                poiCacheRef.current.set(key, items);
                sendToMap({ type: 'setPOIs', items });
              } else {
                sendToMap({ type: 'setPOIs', items: [] });
              }
            } catch (e) {
              console.log('[ERR] POI fetch failed for', key, e);
              sendToMap({ type: 'setPOIs', items: [] });
            } finally {
              inflightRef.current.delete(key);
            }
            const r = await fetch(url);
            const items = await r.json();
            if (Array.isArray(items)) {
              poiCacheRef.current.set(key, items);
              sendToMap({
                type: 'setPOIs',
                items,
                zoom,                       
                bbox: { minLng, minLat, maxLng, maxLat },  
              });
            }

          } catch {
            sendToMap({ type: 'setPOIs', items: [] });
          }
        }, 500);
        return;
      }
      if (parsed.type === 'setDestinationFromPOI') {
        const dest = { latitude: parsed.lat, longitude: parsed.lng };
        setDestination(dest);
        setDropoffName(parsed.label || 'POI Destination');

        if (!pickup) {
          Alert.alert('Location unavailable', 'Waiting for GPS, please try again in a moment.');
          return;
        }
        const { latitude, longitude } = pickup;

        lastRouteFromRef.current = { lat: pickup.latitude, lng: pickup.longitude };
        lastRouteToRef.current   = { lat: dest.latitude,     lng: dest.longitude };
        lastRouteAtRef.current   = Date.now();

        fetchORSRoute(
          { latitude: pickup.latitude, longitude: pickup.longitude },
          dest
        );
        sendToMap({
          type: 'setMarkers',
          destination: dest,
          driver: null,
        });
        return;
      }
    } catch {}
  };

    // Set markers & trigger route drawing when destination is picked
  // useEffect(() => {
  //   if (!mapRef.current || bookingConfirmed) return;

  //   const driverCoords = matchedDriver?.location
  //     ? { latitude: matchedDriver.location.latitude, longitude: matchedDriver.location.longitude }
  //     : null;

  //   if (driverCoords && destination) {
  //     mapRef.current.postMessage(JSON.stringify({ type: "setMarkers", destination, driver: driverCoords }));
  //   }

  //   // 👉 draw route as soon as we have both ends
  //   if (destination && location) {
  //     fetchORSRoute(location, destination);
  //   }
  // }, [destination, matchedDriver, bookingConfirmed, location]);

  const loadLandmarks = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/landmarks`);
      const items = await r.json();
      sendToMap({ type: 'setLandmarks', items: Array.isArray(items) ? items : [] });
    } catch {
      sendToMap({ type: 'setLandmarks', items: [] });
    }
  };

  useEffect(() => {
    if (!pickup) return;
    sendToMap({ type: 'setPickup', latitude: pickup.latitude, longitude: pickup.longitude });
  }, [pickup]);



  const gate = loading || !pickup;

  const handleBookNow = async () => {
    if (!pickup || !destination) { Alert.alert("Missing location info"); return; }
    if (!passengerId) {
      Alert.alert("Not logged in", "Please log in again.");
      router.replace("/login_and_reg/plogin");
      return;
    }

    if (bookedFor && !riderName.trim()) {
      Alert.alert("Missing info", "Please enter the rider’s name.");
      return;
    }


    // Normalize party size based on type
    const normalizedParty =
      bookingType === 'GROUP'
        ? Math.min(5, Math.max(1, Number(partySize) || 1))
        : 1; // CLASSIC & SOLO always 1

    setSearching(true);
    setAlertedBookingComplete(false);
    setTripCompleted(false);

    const bookingData = {
      pickupLat: pickup.latitude,
      pickupLng: pickup.longitude,
      destinationLat: destination.latitude,
      destinationLng: destination.longitude,
      fare,
      paymentMethod,
      notes,
      passengerId,
      pickupPlace: pickupName,
      bookedFor,
      riderName: bookedFor ? riderName.trim() : "",
      riderPhone: bookedFor ? riderPhone.trim() : "",
      destinationPlace: dropoffName,
      bookingType,
      partySize: normalizedParty,

    };
    console.log(bookingData);

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

      setBookingId(result.booking.bookingId || result.booking.id || result.booking._id);
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
          if (bookingId) loadPaymentInfo(String(bookingId));
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
    if (!bookingId || !bookingConfirmed) return;
    const t = setInterval(() => loadPaymentInfo(String(bookingId)), 5000);
    return () => clearInterval(t);
  }, [bookingId, bookingConfirmed]);


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
          sendToMap({ type: "setMarkers", destination: null, driver: null });
          sendToMap({ type: "clearRoute" });
          sendToMap({ type: 'clearPickup' });

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


  const cancelRideNow = async () => {
    try {
      if (!bookingId) {
        return;
      }

      const resp = await fetch(`${API_BASE_URL}/api/cancel-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const body = await resp.text();

      // UI reset after server confirms
      setSearching(false);
      setBookingId(null);
      setMatchedDriver(null);
      setBookingConfirmed(false);
      setDestination(null);
      setTripCompleted(false);
      setAlertedBookingComplete(false);
      setShowBookingForm(false);

      // Clear map + cached state
      sendToMap({ type: "setMarkers", destination: null, driver: null });
      sendToMap({ type: "clearRoute" });
      sendToMap({ type: 'clearPickup' });
      await AsyncStorage.removeItem("phomeBookingState");
      setFare(0);
    } catch (e) {
      console.log("[PHOME] cancel error", e);
      Alert.alert("Cancel error", "Could not cancel ride. Check your connection and try again.");
    }
  };



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

  const buildImageUri = (raw?: string, updatedAt?: string | number) => {
    if (!raw) return null;

    // If it's already an absolute URL (Cloudinary, etc.)
    if (/^https?:\/\//i.test(raw)) {
      const v = encodeURIComponent(String(updatedAt ?? Date.now()));
      return `${raw}${raw.includes("?") ? "&" : "?"}v=${v}`;
    }

    // Else treat as relative path served by your backend
    const base = API_BASE_URL.replace(/\/$/, "");
    const path = String(raw).replace(/^\//, ""); // strip leading slash if any
    const v = encodeURIComponent(String(updatedAt ?? Date.now()));
    return `${base}/${path}?v=${v}`;
  };

  const driverSelfieUri = React.useMemo(() => {
    if (!matchedDriver?.selfieImage) return null;

    // Use a stable version key if you have one; NEVER Date.now()
    const ver =
      (matchedDriver as any)?.updatedAt ||
      (matchedDriver as any)?.selfieUpdatedAt ||
      matchedDriver?.driverId || // last resort: driverId keeps it stable
      1;

    return buildImageUri(matchedDriver.selfieImage, ver);
  }, [matchedDriver?.selfieImage, (matchedDriver as any)?.updatedAt, matchedDriver?.driverId]);



    

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
              allowFileAccess
              onLoadEnd={() => setMapReady(true)}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: -30, zIndex: 0 }}
              mixedContentMode="always"
              onMessage={handleMapMessage}
              nestedScrollEnabled
            />
          )}

          <View style={styles.searchcont}>
            {/* Destination search */}
            <View style={[styles.searchWrap, { position: "relative" }]}>
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="Search destination (e.g., SM Lucena)"
              placeholderTextColor="#777"
              style={[styles.searchInput, { paddingRight: 35 }]}
            />

            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setHits([]);
                  setDestination(null);
                  setDropoffName("");
                  sendToMap({ type: "clearRoute" });
                  sendToMap({ type: "setMarkers", destination: null, driver: null });
                }}
                style={{
                  position: "absolute",
                  right: 7,
                  top: 6,
                  zIndex: 9999,
                  padding: 4,
                }}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}

            {/* Results dropdown */}
            {hits.length > 0 && (
              <View style={styles.searchResults}>
                {hits.map((h, i) => (
                  <TouchableOpacity
                    key={`${h.lat},${h.lng}-${i}`}
                    onPress={() => choosePlace(h)}
                    style={styles.searchItem}
                  >
                    <Text style={styles.searchItemText}>{h.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

            <TouchableOpacity
              onPress={() => {
                if (showLandmarks) {
                  sendToMap({ type: 'clearLandmarks' });
                  setShowLandmarks(false);
                } else {
                  loadLandmarks(); // same function we made before
                  setShowLandmarks(true);
                }
              }}
              style={{
                alignSelf: 'center',
                marginTop: 6,
                backgroundColor: showLandmarks ? '#81C3E1' : '#eee',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8
              }}
            >
              <Text>{showLandmarks ? 'Hide Landmarks' : 'Explore Landmarks'}</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity
              onPress={() => {
                if (showPOIs) {
                  setShowPOIs(false);
                  if (poiFetchTimerRef.current) clearTimeout(poiFetchTimerRef.current);
                  sendToMap({ type: 'setPOIs', items: [] });
                } else {
                  setShowPOIs(true);
                  const b = lastBBoxRef.current;
                  if (b) {
                    const { minLng, minLat, maxLng, maxLat, zoom } = b;
                    if (zoom >= 14) {
                      if (poiFetchTimerRef.current) clearTimeout(poiFetchTimerRef.current);
                      poiFetchTimerRef.current = setTimeout(async () => {
                        try {
                          const types = 'cafe,convenience,pharmacy,restaurant,fast_food,bank,supermarket,hospital,school,parking,market';
                          const url = `${API_BASE_URL}/api/pois?types=${encodeURIComponent(types)}&bbox=${minLng},${minLat},${maxLng},${maxLat}`;
                          const r = await fetch(url);
                          const items = await r.json();
                          sendToMap({ type: 'setPOIs', items: Array.isArray(items) ? items : [] });
                        } catch {
                          sendToMap({ type: 'setPOIs', items: [] });
                        }
                      }, 0);
                    } else {
                      sendToMap({ type: 'setPOIs', items: [] });
                    }
                  } else {
                    sendToMap({ type: 'requestBbox' });
                  }
                }
              }}

              style={{
                alignSelf: 'center',
                marginTop: 6,
                backgroundColor: showPOIs ? '#81C3E1' : '#eee',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8
              }}
            >
              <Text>{showPOIs ? 'Hide Places' : 'Show Places'}</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              onPress={() => {
                const next = !bookedFor;
                setBookedFor(next);

                if (next) {
                  // Turning ON: choose someone else's pickup
                  setSelectingPickup(true);
                  Alert.alert("Book for someone else", "Tap the map to set the OTHER person's pickup.");
                  return;
                }

                // Turning OFF: full cleanup (like a soft refresh)
                setSelectingPickup(false);

                // Clear UI state
                setDestination(null);
                setDropoffName("");
                setFare(0);

                // Reset route trackers
                lastRouteDestKeyRef.current = null;
                lastRouteFromRef.current = null;
                lastRouteToRef.current   = null;
                lastRouteAtRef.current   = 0;
                routeFramedRef.current   = false;

                // Clear map markers & route
                sendToMap({ type: "setMarkers", destination: null, driver: null, pickup: null });
                sendToMap({ type: "clearRoute" });
                sendToMap({ type: "clearPickup" });

                // Re-seed pickup to current GPS so booking uses BLUE marker
                if (location) {
                  const { latitude, longitude } = location;
                  setPickup({ latitude, longitude });
                  sendToMap({ type: "setPickup", latitude, longitude });
                }
              }}
              style={{
                alignSelf: 'center',
                marginTop: 6,
                backgroundColor: bookedFor ? '#111' : '#eee',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8
              }}
            >
              <Text style={{ color: bookedFor ? '#fff' : '#111', fontWeight: '600' }}>
                {bookedFor ? 'For Someone Else: ON' : 'Book for someone else'}
              </Text>
            </TouchableOpacity>




          </View>

          <View style={styles.overlayContainer}>
            <View style={styles.overlay}>

              {searching && (
                <View style={{ backgroundColor: "#fff3cd", padding: 10, marginTop: 10, borderRadius: 8 }}>
                  <Text style={{ fontWeight: "bold" }}>
                    🔍 Finding a driver... {bookingType === 'GROUP' ? `Group (${partySize})` : bookingType === 'SOLO' ? 'Solo (VIP)' : 'Classic'}
                  </Text>
                  <TouchableOpacity
                    onPress={cancelRideNow}
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
                  {!infoBoxMinimized ? (
                    <>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {driverSelfieUri ? (
                          <Image
                            source={{ uri: driverSelfieUri }}
                            style={{ width: 80, height: 80, borderRadius: 50, marginRight: 10 }}
                            resizeMode="cover"
                          />
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "bold", color: "#000" }}>✅ Driver Found!</Text>
                          <Text>Name: {matchedDriver?.driverName}</Text>
                          <Text>Franchise No.: {matchedDriver?.franchiseNumber || "N/A"}</Text>
                          <Text>Experience: {matchedDriver?.experienceYears || "N/A"} years</Text>

                          
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 10 }}>
                        <TouchableOpacity onPress={() => setInfoBoxMinimized(true)} style={{ backgroundColor: "#81C3E1", flex: 1, alignItems: "center", borderRadius: 5, padding: 5 }}>
                          <Text style={{ color: "white" }}>Minimize</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                              router.push({
                                pathname: "/ChatRoom",
                                params: {
                                  bookingId,
                                  driverId: matchedDriver?.driverId,
                                  passengerId,
                                  role: "passenger",
                                },
                              });
                            }}
                            style={{ backgroundColor: "#007bff", flex: 1, alignItems: "center", borderRadius: 5, padding: 5 }}
                          >
                            <Text style={{ color: "#fff", fontWeight: "bold" }}>Chat</Text>
                          </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowReportModal(true)} style={{ backgroundColor: "#f44336", flex: 1, alignItems: "center", borderRadius: 5, padding: 5 }}>
                          <Text style={{ color: "white" }}>Report</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              const resp = await fetch(`${API_BASE_URL}/api/cancel-booking`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ bookingId }),
                              });
                              const body = await resp.text();

                              await AsyncStorage.removeItem("phomeBookingState");
                            } catch (e) {
                              console.log("[PHOME] cancel error", e);
                            }
                            setSearching(false);
                            setBookingId(null);
                            setMatchedDriver(null);
                            setDestination(null);
                            setBookingConfirmed(false);
                            sendToMap({ type: "setMarkers", destination: null, driver: null });
                            sendToMap({ type: "clearRoute" });
                            setFare(0);
                            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                          }}
                          style={{ backgroundColor: "#f44336", flex: 1, alignItems: "center", borderRadius: 5, padding: 5 }}
                        >
                          <Text style={{ color: "white" }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                      {paymentInfo?.paymentMethod?.toLowerCase() === "gcash" && paymentInfo?.driverPayment?.number &&(
                        <View style={{paddingTop:5}}>
                          <View style={{flexDirection:"row", justifyContent:"space-between"}}>
                            <Text style={{ fontWeight: "700", marginBottom: 6 }}>GCash Payment</Text>
                            <Text>
                              Status:{" "}
                              <Text style={{ fontWeight: "700" }}>
                                {paymentInfo?.paymentStatus || "none"}
                              </Text>
                            </Text>
                          </View>
                          <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                            <TouchableOpacity onPress={handleCopy}>
                              <Text>
                                Number:{' '}
                                <Text style={{ fontWeight: '600' }}>
                                  {paymentInfo.driverPayment?.number}
                                </Text>
                              </Text>
                              <Text style={{ fontSize: 12, color: copied ? '#81C3E1' : '#666' }}>
                                {copied ? '✔ Copied to clipboard' : 'Tap to copy'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                bookingId && setPaymentStatus(String(bookingId), "paid")
                              }
                              disabled={paymentInfo?.paymentStatus === "paid"}
                              style={{
                                backgroundColor:
                                  paymentInfo?.paymentStatus === "paid" ? "#9e9e9e" : "#2e7d32", 
                                alignItems: "center", justifyContent: "center", borderRadius: 5, padding: 5
                              }}
                            >
                              <Text style={{ color: "#fff", fontWeight: "700" }}>
                                {paymentInfo?.paymentStatus === "paid" ? "Paid" : "Mark Paid"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity style={{ alignItems: "center", padding: 10 }} onPress={() => setInfoBoxMinimized(false)}>
                      <Text style={{ fontWeight: "bold", color: "#000" }}>View Driver Info</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {showBookingForm && (
              <View style={styles.panel}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.panelTitle}>Booking Details</Text>
                  <TouchableOpacity
                    onPress={() => setShowBookingForm(false)}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ alignContent: "center", fontSize: 22, fontWeight: 'bold', transform: [{ rotate: '180deg' }] }}><Ionicons name="close-circle" size={25} color="#999" /></Text>
                  </TouchableOpacity>
                </View>


                {/* Booking Type Selector */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {[
                    { key: 'CLASSIC', label: 'Classic' },
                    { key: 'GROUP', label: 'Group' },
                    { key: 'SOLO', label: 'Solo' },
                  ].map((opt) => {
                    const active = bookingType === (opt.key as any);
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => {
                          setBookingType(opt.key as any);
                          if (opt.key !== 'GROUP') setPartySize(2);
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: active ? '#111' : '#fff',
                          borderWidth: 1,
                          borderColor: active ? '#111' : '#ccc',
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: active ? '#fff' : '#111', fontWeight: '600' }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Notes for Solo & Group */}
                {bookingType === 'SOLO' && (
                  <Text style={{ marginTop: 6, color: '#444' }}>
                    • VIP ride — driver will be dedicated to you.
                  </Text>
                )}
                {bookingType === 'GROUP' && (
                  <Text style={{ marginTop: 6, color: '#444' }}>
                    • Group ride — specify how many passengers (including you).
                  </Text>
                )}

                {/* Group Party Size Stepper */}
                {bookingType === 'GROUP' && (
                  <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: '600' }}>Passengers (2-6)</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => setPartySize((p) => Math.max(2, p - 1))}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eee', borderRadius: 8, marginRight: 10 }}
                      >
                        <Text style={{ fontSize: 18 }}>–</Text>
                      </TouchableOpacity>
                      <Text style={{ minWidth: 28, textAlign: 'center', fontWeight: '700' }}>{partySize}</Text>
                      <TouchableOpacity
                        onPress={() => setPartySize((p) => Math.min(6, p + 1))}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eee', borderRadius: 8, marginLeft: 10 }}
                      >
                        <Text style={{ fontSize: 18 }}>＋</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <ScrollView style={styles.inputsContainer} keyboardDismissMode="on-drag">
                  <Text>From:</Text>
                  <TextInput style={styles.input} placeholder="Saan ang pick-up?" value={pickupName} editable />
                  <Text>To:</Text>
                  <View style={{ position: "relative", zIndex: 999 }}>
                    <TextInput
                      value={dropoffName}   // 👈 keep the original behavior
                      onChangeText={(text) => {
                        setDropoffName(text); // what the user sees
                        onChangeQuery(text);  // drives search & suggestions
                      }}
                      placeholder="Saan ang drop-off?"
                      placeholderTextColor="#777"
                      style={[styles.input, { paddingRight: 35 }]} // space for X
                    />

                    {/* ❌ Clear button */}
                    {dropoffName.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setDropoffName("");
                          setQuery("");
                          setHits([]);
                          setDestination(null);
                          sendToMap({ type: "clearRoute" });
                          sendToMap({ type: "setMarkers", destination: null, driver: null });
                        }}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: 12,
                          padding: 4,
                          zIndex: 9999,
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color="#999" />
                      </TouchableOpacity>
                    )}

                    {/* Suggestions (reusing the same hits + choosePlace) */}
                    {hits.length > 0 && (
                      <View style={[styles.searchResults, { width: "100%" }]}>
                        {hits.map((h, i) => (
                          <TouchableOpacity
                            key={`${h.lat},${h.lng}-${i}`}
                            onPress={() => choosePlace(h)}
                            style={styles.searchItem}
                          >
                            <Text style={styles.searchItemText}>{h.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>


                  {bookedFor && (
                    <>
                      <Text>Rider’s Name (who will ride):</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Juan Dela Cruz"
                        value={riderName}
                        onChangeText={setRiderName}
                      />
                      <Text>Rider’s Phone (optional):</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="09xx xxx xxxx"
                        keyboardType="phone-pad"
                        value={riderPhone}
                        onChangeText={setRiderPhone}
                      />
                    </>
                  )}

                  {/* <TextInput
                    style={styles.input}
                    placeholder="Name this location (optional: Home, Work, etc.)"
                    value={destinationLabel}
                    onChangeText={setDestinationLabel}
                  /> */}
                  <TextInput style={styles.input} placeholder="Notes sa driver" placeholderTextColor="#A0A0A0" value={notes} onChangeText={setNotes} />
                  <Text>Paano ka magbabayad?</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => setPaymentMethod("Cash")}
                      style={[
                        styles.paymentOption,
                        paymentMethod === "Cash" && styles.paymentSelected
                      ]}
                    >
                      <Text style={paymentMethod === "Cash" ? styles.paymentSelectedText : styles.paymentText}>Cash</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setPaymentMethod("GCash")}
                      style={[
                        styles.paymentOption,
                        paymentMethod === "GCash" && styles.paymentSelected
                      ]}
                    >
                      <Text style={paymentMethod === "GCash" ? styles.paymentSelectedText : styles.paymentText}>GCash</Text>
                    </TouchableOpacity>
                  </View>

                </ScrollView>

                <View style={styles.fareContainer}>
                  <View>
                    <Text style={styles.totalFare}>
                      Fare:
                    </Text>
                    <Text style={{ paddingLeft: 20 }}>
                      ₱{fare} {bookingType === 'SOLO' ? '(VIP)' : bookingType === 'GROUP' ? `x${partySize}` : ''}
                    </Text>
                    <Text style={styles.totalFare}>
                      Total Fare: ₱
                      {bookingType === 'GROUP' ? (fare * partySize).toFixed(2) : fare.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.bookButton,
                      // disable if invalid group count or no destination
                      ((bookingType === 'GROUP' && (partySize < 2 || partySize > 6)) || !destination) && { opacity: 0.4 },
                    ]}
                    disabled={(bookingType === 'GROUP' && (partySize < 2 || partySize > 6)) || !destination}
                    onPress={handleBookNow}
                  >
                    <Text style={styles.bookButtonText}>BOOK NOW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}


            {!showBookingForm && !(searching || !!bookingId || bookingConfirmed || !!matchedDriver) && (
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

                  <TextInput style={styles.feedbackInput} placeholder="Leave a comment (optional)" placeholderTextColor="#A0A0A0" multiline numberOfLines={3} onChangeText={setNotes} value={notes} />

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
                    <TextInput style={styles.feedbackInput} placeholder="Describe the issue" placeholderTextColor="#A0A0A0" multiline numberOfLines={3} value={otherReport} onChangeText={setOtherReport} />
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
  fareContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth:1, },
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

  paymentOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
    backgroundColor: "#fff",
  },
  paymentSelected: {
    backgroundColor: "#000",
    borderColor: "#333",
  },
  paymentText: {
    color: "#333",
    fontWeight: "600",
  },
  paymentSelectedText: {
    color: "#fff",
    fontWeight: "700",
  },

  
});
