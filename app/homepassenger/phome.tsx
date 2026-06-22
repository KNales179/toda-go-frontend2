  // phome.tsx
  import React, { useState, useEffect, useRef } from "react";
  import { View, 
    Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, 
    TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, 
    Keyboard, Image, BackHandler, ScrollView, AppState, Linking, Animated, Easing  } from "react-native";
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
  import * as Notifications from "expo-notifications";
  import * as Device from "expo-device";
  import Constants from "expo-constants";
  import { buildPassengerMapHtml } from "./subfile/utils/mapHtml";
  import { calculateFare, FareConfigState } from "./subfile/utils/fare";
  import { ensureLocationEnabled } from "./subfile/utils/locationUtils";
  import lucenaBarangays from "./subfile/data/barangays-municity-1304-lucenacity.json";
  import PassengerRatingModal from "./subfile/components/PassengerRatingModal";
  import PassengerReportModal from "./subfile/components/PassengerReportModal";
  import * as MediaLibrary from "expo-media-library";
  import { Modal } from "react-native"; 


  const { width } = Dimensions.get("window");


    
  const DEBUG_ON = true;
  const ALLOWED_TAG_PREFIXES = [
    "PHOME:push",
    "PHOME:pollDriver",    
    "PHOME:pollDone",      
    "PHOME:pollError",     
  ];

  const dbg = async (tag: string, extra?: any) => {
    if (!DEBUG_ON) return;

    const isAllowed = ALLOWED_TAG_PREFIXES.some((p) =>
      tag.startsWith(p)
    );
    if (!isAllowed) return;

    try {
      const [source, message] = tag.split(":");
      await fetch(`${API_BASE_URL}/api/debug-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: source || "PHOME",
          message: message || tag,
          extra: extra || {},
        }),
      });
    } catch (e) {
      // never crash the app
    }
  };



  async function getLocalIconBase64(localPath: any) {
    const asset = Asset.fromModule(localPath);
    await asset.downloadAsync(); // ensures we have a real file on device
    const uri = asset.localUri || asset.uri; // localUri preferred
    const base64 = await FileSystem.readAsStringAsync(uri!, { encoding: 'base64' });
    return `data:image/png;base64,${base64}`;
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
  });



  const firedLocalNotifs = new Set<string>();

  async function localNotify(title: string, body: string, rawKey?: string) {
    const key = rawKey || `${title}|${body}`;
    if (firedLocalNotifs.has(key)) {
      return;
    }
    firedLocalNotifs.add(key);

    const perms = await Notifications.getPermissionsAsync();
    if (perms.status !== "granted") {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
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





  export default function PHome() {
    const { location, loading } = useLocation();
    const [copied, setCopied] = useState(false);
    const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
    const [destinationLabel, setDestinationLabel] = useState("");
    const [notes, setNotes] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [showPaymentOptions, setShowPaymentOptions] = useState(false);
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
      location: {
        latitude?: number;
        longitude?: number;
        lat?: number;
        lng?: number;
      };
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
    const [fareBreakdown, setFareBreakdown] = useState<any>(null);
    const [query, setQuery] = useState('');
    const navigation = useNavigation();
    const [hits, setHits] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [currentBooking, setCurrentBooking] = useState<any>(null);
    const status = currentBooking?.status as 'accepted' | 'pending' | 'completed' | 'canceled' | undefined;
    const hasActiveBooking =
    !!currentBooking &&
    ["pending", "accepted", "enroute"].includes(
      String(currentBooking?.status || "").toLowerCase()
    );
    const driverId = currentBooking?.driverId;
    const [passengerId, setPassengerId] = useState<string | null>(null);
    const [pushToken, setPushToken] = useState<string | null>(null);
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
    const [showTodas, setShowTodas] = useState(false);
    const [selectedToda, setSelectedToda] = useState<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      destinations: string[];
    } | null>(null);
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
    const inFlightRouteKeyRef = useRef<string | null>(null);
    const lastSuccessfulRouteKeyRef = useRef<string | null>(null);
    const passengerAutoRerouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [pickupLoc, setPickupLoc] = useState<{ latitude:number; longitude:number } | null>(null);
    const [pickup, setPickup] = useState<{ latitude:number; longitude:number } | null>(null);
    const [bookedFor, setBookedFor] = useState(false);
    const [isCurrentLocationInsideLucena, setIsCurrentLocationInsideLucena] = useState<boolean | null>(null);
    const [outsideLucenaWarned, setOutsideLucenaWarned] = useState(false);
    const [riderName, setRiderName] = useState("");
    const [riderPhone, setRiderPhone] = useState("");
    const [selectingPickup, setSelectingPickup] = useState(false); // map-tap to set pickup
    const [fareConfig, setFareConfig] = useState<FareConfigState | null>(null);
    const [lastDistanceKm, setLastDistanceKm] = useState<number | null>(null);
    const [lastDistanceText, setLastDistanceText] = useState<string | null>(null);
    const [lastDurationText, setLastDurationText] = useState<string | null>(null);
    const ROUTE_MIN_MOVE_M = 3;
    const ROUTE_MIN_INTERVAL = 2000;
    const [routeOptions, setRouteOptions] = React.useState<any[]>([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = React.useState<number | null>(null);
    const [routeVisible, setRouteVisible] = useState(false);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeReadyKey, setRouteReadyKey] = useState<string | null>(null);
    const selectedRoute = React.useMemo(
      () => (selectedRouteIndex != null ? routeOptions[selectedRouteIndex] : null),
      [routeOptions, selectedRouteIndex]
    );
    const [bookingPanelHeight, setBookingPanelHeight] = useState(0);
    const toLatLng = (p:{latitude:number; longitude:number}) => ({ lat: p.latitude, lng: p.longitude });
    const getActivePickup = () => {
      if (bookedFor) return pickup;
      return location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
          }
        : null;
    };
    const hasActivePickup = () => {
      return !!getActivePickup();
    };
    const makeRouteKey = (
      from?: { latitude: number; longitude: number } | null,
      to?: { latitude: number; longitude: number } | null
    ) => {
      if (!from || !to) return "";
      return (
        `${from.latitude.toFixed(6)},${from.longitude.toFixed(6)}` +
        `->${to.latitude.toFixed(6)},${to.longitude.toFixed(6)}`
      );
    };

    const clearVisibleRouteOnly = () => {
      setRouteVisible(false);
      setRouteReadyKey(null);
      setRouteOptions([]);
      setSelectedRouteIndex(null);
      setLastDistanceKm(null);
      setLastDistanceText(null);
      setLastDurationText(null);
      setFare(0);
      setFareBreakdown(null);

      lastRouteDestKeyRef.current = null;
      lastSuccessfulRouteKeyRef.current = null;
      inFlightRouteKeyRef.current = null;
      routeFramedRef.current = false;

      sendToMap({ type: "clearRoute" });
    };
    const acceptedNotifiedRef = useRef(false);
    const completedNotifiedRef = useRef(false);
    const [fabOpen, setFabOpen] = useState(false);
    const fabAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
    const [showFareInfo, setShowFareInfo] = useState(false);
    const [initialDriverPickupDistance, setInitialDriverPickupDistance] = useState<number | null>(null);
    const [initialDriverTripDistance, setInitialDriverTripDistance] = useState<number | null>(null);

    const BOOKING_DEBUG = true;

    const getPassengerSession = async () => {
      const auth = await getAuth();
      const [legacyPassengerId, legacyToken] = await Promise.all([
        AsyncStorage.getItem("passengerId"),
        AsyncStorage.getItem("token"),
      ]);

      const resolvedPassengerId =
        auth?.role === "passenger" && auth?.userId
          ? String(auth.userId)
          : legacyPassengerId;

      const resolvedToken =
        auth?.role === "passenger" && auth?.token
          ? String(auth.token)
          : legacyToken;

      return {
        passengerId: resolvedPassengerId || null,
        token: resolvedToken || null,
      };
    };

    const persistBookingState = async (overrides?: Partial<any>) => {
      try {
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
          pickup,
          pickupName,
          dropoffName,
          bookingType,
          partySize,
          ...overrides,
        };

        await AsyncStorage.setItem("phomeBookingState", JSON.stringify(bookingState));
      } catch (err) {
        console.warn("Error persisting booking state:", err);
      }
    };

    const dot1 = useRef(new Animated.Value(0.3)).current;
    const dot2 = useRef(new Animated.Value(0.3)).current;
    const dot3 = useRef(new Animated.Value(0.3)).current;

    
    const resetFareBreakdown = () => {
      setFare(0);
      setLastDistanceKm(null);
      setLastDistanceText(null);
      setLastDurationText(null);
      setRouteOptions([]);
      setSelectedRouteIndex(null);

      lastRouteDestKeyRef.current = null;
      lastRouteFromRef.current = null;
      lastRouteToRef.current = null;
      lastRouteAtRef.current = 0;
      routeFramedRef.current = false;
    };

    const computeBackendFare = async (distanceKm: number) => {
      try {
        const session = await getPassengerSession();

        if (!session.token || !distanceKm || distanceKm <= 0) return null;

        const res = await fetch(`${API_BASE_URL}/api/fare/compute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            distanceKm,
            bookingType,
            partySize: bookingType === "GROUP" ? partySize : 1,
          }),
        });

        const text = await res.text();

        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          console.log("❌ fare/compute non-JSON:", text);
          return null;
        }

        if (!res.ok) {
          console.log("❌ fare/compute failed:", res.status, data);
          return null;
        }

        setFare(data.fare);
        setFareBreakdown(data.breakdown);

        return data;
      } catch {
        return null;
      }
    };

    const getBackendFareOnly = async (distanceKm: number) => {
      try {
        const session = await getPassengerSession();

        if (!session.token || !distanceKm || distanceKm <= 0) return null;

        const res = await fetch(`${API_BASE_URL}/api/fare/compute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            distanceKm,
            bookingType,
            partySize: bookingType === "GROUP" ? partySize : 1,
          }),
        });

        const text = await res.text();

        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          console.log("❌ fare/compute label non-JSON:", text);
          return null;
        }

        if (!res.ok) {
          console.log("❌ fare/compute label failed:", res.status, data);
          return null;
        }

        return data;
      } catch {
        return null;
      }
    };

    const restoreBookingFromServer = async (id: string | number) => {
      try {
        const session = await getPassengerSession();
        const res = await fetch(`${API_BASE_URL}/api/bookings`, {
          headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
        });
        const allBookings = await res.json();

        if (!Array.isArray(allBookings)) {
          console.log("❌ bookings is not array:", allBookings);
          return;
        }

        const liveBooking = Array.isArray(allBookings)
          ? allBookings.find((b: any) =>
              b &&
              String(b.id ?? b.bookingId ?? b._id) === String(id)
            )
          : null;
          if (!Array.isArray(allBookings)) return;


        if (!liveBooking) {
          await AsyncStorage.removeItem("phomeBookingState");
          setBookingId(null);
          setBookingConfirmed(false);
          setMatchedDriver(null);
          setInitialDriverPickupDistance(null);
          setInitialDriverTripDistance(null);
          setSearching(false);
          return;
        }

        const liveStatus = String(liveBooking.status || "").toLowerCase();
        setSearching(false);
        setBookingConfirmed(false);
        setMatchedDriver(null);
        setInitialDriverPickupDistance(null);
        setInitialDriverTripDistance(null);
        setCurrentBooking(liveBooking);
        setBookingId(liveBooking.bookingId || liveBooking.id || liveBooking._id || null);

        // Restore pickup / destination from backend
        const restoredPickup =
          Number.isFinite(liveBooking.pickupLat) && Number.isFinite(liveBooking.pickupLng)
            ? { latitude: Number(liveBooking.pickupLat), longitude: Number(liveBooking.pickupLng) }
            : null;

        const restoredDestination =
          Number.isFinite(liveBooking.destinationLat) && Number.isFinite(liveBooking.destinationLng)
            ? { latitude: Number(liveBooking.destinationLat), longitude: Number(liveBooking.destinationLng) }
            : null;

        const restoredBookedFor = !!liveBooking.bookedFor;

        if (restoredPickup && restoredBookedFor) {
          setPickup(restoredPickup);
          sendToMap({
            type: "setPickup",
            latitude: restoredPickup.latitude,
            longitude: restoredPickup.longitude,
          });
        } else {
          setPickup(null);
          sendToMap({ type: "clearPickup" });
        }

        if (restoredDestination) {
          setDestination(restoredDestination);
        }

        if (liveBooking.pickupPlace) setPickupName(String(liveBooking.pickupPlace));
        if (liveBooking.destinationPlace) setDropoffName(String(liveBooking.destinationPlace));
        if (liveBooking.paymentMethod) setPaymentMethod(String(liveBooking.paymentMethod));
        if (liveBooking.notes) setNotes(String(liveBooking.notes));

        if (liveBooking.bookingType) {
          setBookingType(String(liveBooking.bookingType).toUpperCase() as "CLASSIC" | "GROUP" | "SOLO");
        }

        if (liveBooking.partySize) {
          setPartySize(Number(liveBooking.partySize) || 2);
        }

        // STATUS: pending/searching
        if (liveStatus === "pending") {
          setSearching(true);
          setBookingConfirmed(false);
          setMatchedDriver(null);
          setInitialDriverPickupDistance(null);
          setInitialDriverTripDistance(null);

          sendToMap({
            type: "setMarkers",
            destination: restoredDestination,
            driver: null,
            pickup: restoredBookedFor ? restoredPickup : null,
          });

          if (restoredPickup && restoredDestination) {
            lastRouteFromRef.current = { lat: restoredPickup.latitude, lng: restoredPickup.longitude };
            lastRouteToRef.current = { lat: restoredDestination.latitude, lng: restoredDestination.longitude };
            lastRouteAtRef.current = Date.now();
            fetchRouteVariants(restoredPickup, restoredDestination);
          }

          return;
        }

        // STATUS: accepted / ongoing
        if (liveStatus === "accepted" || liveStatus === "enroute") {
          setSearching(false);
          setBookingConfirmed(true);

          if (liveBooking.driverId) {
            try {
              const [driverRes, statusRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/driver/${liveBooking.driverId}`, {
                  headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
                }),
                fetch(`${API_BASE_URL}/api/driver-status/${liveBooking.driverId}`, {
                  headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
                }),
              ]);

              const driverData = await driverRes.json();
              const statusData = await statusRes.json();

              if (driverData?.driver) {
                const restoredDriver = {
                  driverName: driverData.driver.driverName,
                  driverId: driverData.driver._id,
                  franchiseNumber: driverData.driver.franchiseNumber || "N/A",
                  experienceYears: driverData.driver.experienceYears || "N/A",
                  selfieImage: driverData.driver.selfieImage || "N/A",
                  location: statusData.location || null,
                };

                setMatchedDriver(restoredDriver);

                sendToMap({
                  type: "setMarkers",
                  destination: restoredDestination,
                  driver: restoredDriver.location
                    ? {
                        latitude: restoredDriver.location.latitude,
                        longitude: restoredDriver.location.longitude,
                      }
                    : null,
                  pickup: restoredBookedFor ? restoredPickup : null,
                });
              }
            } catch {}
          }

          if (restoredPickup && restoredDestination) {
            lastRouteFromRef.current = { lat: restoredPickup.latitude, lng: restoredPickup.longitude };
            lastRouteToRef.current = { lat: restoredDestination.latitude, lng: restoredDestination.longitude };
            lastRouteAtRef.current = Date.now();
            fetchRouteVariants(restoredPickup, restoredDestination);
          }

          if (liveBooking.bookingId || liveBooking.id || liveBooking._id) {
            loadPaymentInfo(String(liveBooking.bookingId || liveBooking.id || liveBooking._id));
          }

          return;
        }

        // STATUS: completed / canceled
        if (liveStatus === "completed" || liveStatus === "canceled") {
          await AsyncStorage.removeItem("phomeBookingState");
          setSearching(false);
          setBookingConfirmed(false);
          setMatchedDriver(null);
          setInitialDriverPickupDistance(null);
          setInitialDriverTripDistance(null);
          setBookingId(null);
          setDestination(null);
          resetFareBreakdown();
          sendToMap({ type: "setMarkers", destination: null, driver: null, pickup: null });
          sendToMap({ type: "clearRoute" });
          sendToMap({ type: "clearPickup" });
        }
      } catch (e) {
      }
    };

    const restoreLatestBookingForPassenger = async () => {
      try {
        if (!passengerId) {
          return;
        }

        const session = await getPassengerSession();
        const res = await fetch(`${API_BASE_URL}/api/bookings`, {
          headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
        });
        const allBookings = await res.json();

        if (!Array.isArray(allBookings)) {
          return;
        }

        const mine = allBookings.filter((b: any) => {
          const bPassengerId =
            b?.passengerId?._id ||
            b?.passengerId?.id ||
            b?.passengerId ||
            null;

          const status = String(b?.status || "").toLowerCase();
          return (
            String(bPassengerId) === String(passengerId) &&
            ["pending", "accepted", "enroute"].includes(status)
          );
        });

        if (!mine.length) {
          return;
        }

        const latest = mine[mine.length - 1];
        const latestId = latest.bookingId || latest.id || latest._id;


        if (latestId) {
          await restoreBookingFromServer(latestId);
        }
      } catch (e) {
      }
    };

    const activeDistanceKm =
      typeof fareBreakdown?.distanceKm === "number"
        ? fareBreakdown.distanceKm
        : typeof lastDistanceKm === "number"
          ? lastDistanceKm
          : 0;

    const distanceKmText =
      activeDistanceKm > 0 ? `${activeDistanceKm.toFixed(2)} km` : "—";

    const passengerCount = bookingType === "GROUP" ? partySize : 1;

    const activeRules =
    fareConfig
      ? bookingType === "SOLO"
        ? fareConfig.special
        : fareConfig.regular
      : null;

    const baseFare = Number(fareBreakdown?.baseFare ?? activeRules?.baseFare ?? 0);
    const addlPerKm = Number(fareBreakdown?.addlPerKm ?? activeRules?.addlPerKm ?? 0);
    const baseKm = Number(activeRules?.baseKm ?? 0);

    const discountApplied = Number(fareBreakdown?.discountApplied ?? 0);

    const additionalUnits =
      activeDistanceKm > 0
        ? Math.ceil(Math.max(0, activeDistanceKm - baseKm))
        : 0;

    const additionalFare =
      activeDistanceKm > 0 ? additionalUnits * addlPerKm : 0;

    const grossFare =
      baseFare + additionalFare;

    const discountAmount =
      discountApplied > 0 ? (grossFare * discountApplied) / 100 : 0;

    const fallbackFare =
      activeDistanceKm > 0
        ? calculateFare(activeDistanceKm, "none", {
            bookingType,
            partySize,
            config: fareConfig,
          })
        : 0;

    const totalFare = Number(fare || fallbackFare || 0);

    const toggleFabMenu = () => {
      const toValue = fabOpen ? 0 : 1;

      setFabOpen(!fabOpen);

      Animated.timing(fabAnim, {
        toValue,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    useEffect(() => {
      if (!searching) return;

      const animateDot = (dot: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        );

      const a1 = animateDot(dot1, 0);
      const a2 = animateDot(dot2, 180);
      const a3 = animateDot(dot3, 360);

      a1.start();
      a2.start();
      a3.start();

      return () => {
        dot1.stopAnimation();
        dot2.stopAnimation();
        dot3.stopAnimation();
        dot1.setValue(0.3);
        dot2.setValue(0.3);
        dot3.setValue(0.3);
      };
    }, [searching]);

    useEffect(() => {
      if (!selectedRoute || typeof selectedRoute.distanceKm !== "number") return;

      setLastDistanceKm(selectedRoute.distanceKm);
      setLastDistanceText(selectedRoute.distanceText ?? null);
      setLastDurationText(selectedRoute.durationText ?? null);
    }, [selectedRoute]);

    useEffect(() => {
      if (!fareConfig || !routeOptions.length) return;

      const run = async () => {
        const updatedRoutes = await Promise.all(
          routeOptions.map(async (r) => {
            const distanceKm =
              typeof r.distanceKm === "number"
                ? r.distanceKm
                : (r?.summary?.distance ?? 0) / 1000;

            const backendFare = await getBackendFareOnly(distanceKm);

            const fareVal =
              backendFare?.fare ??
              calculateFare(distanceKm, "none", {
                bookingType,
                partySize,
                config: fareConfig,
              });

            return {
              ...r,
              distanceKm,
              fareText: `₱${fareVal} est`,
            };
          })
        );

        setRouteOptions(updatedRoutes);

        const idx = selectedRouteIndex ?? 0;
        const chosen = updatedRoutes[idx] || updatedRoutes[0];

        if (chosen?.distanceKm) {
          setLastDistanceKm(chosen.distanceKm);
          setLastDistanceText(
            chosen.distanceText ?? `${chosen.distanceKm.toFixed(2)} km`
          );
          setLastDurationText(chosen.durationText ?? null);

          await computeBackendFare(chosen.distanceKm);
        }

        if (routeVisible) {
          sendToMap({ type: "setRoutes", routes: updatedRoutes });
          sendToMap({ type: "selectRouteIndex", index: idx });
        }
      };

      run();
    }, [fareConfig, bookingType, partySize]);

    async function registerForPushNotificationsAsync(): Promise<string | null> {
      try {
        if (!Device.isDevice) {
          await dbg("PHOME:notRealDevice", {});
          return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          await dbg("PHOME:permissionDenied", { existingStatus, finalStatus });
          return null;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        // 🔑 Important on SDK 53+ in dev/standalone
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );

        const token = tokenData.data;
        await dbg("PHOME:getToken", { token });

        return token;
      } catch (e) {
        await dbg("PHOME:getTokenError", { error: String(e) });
        return null;
      }
    }




    useEffect(() => {
      if (!passengerId) return;

      (async () => {
        const expoPushToken = await registerForPushNotificationsAsync();
        if (!expoPushToken) return;

        setPushToken(expoPushToken);

        try {
          const session = await getPassengerSession();

          await fetch(`${API_BASE_URL}/api/passenger/push-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
            },
            body: JSON.stringify({ passengerId, pushToken: expoPushToken }),
          });

          dbg("PHOME:tokenSaved", { passengerId, token: expoPushToken });
        } catch (e) {
          dbg("PHOME:tokenError", { passengerId, error: String(e) });
        }
      })();
    }, [passengerId]);




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

    function isPointInRing(lat: number, lng: number, ring: number[][]) {
      let inside = false;

      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];

        const intersect =
          ((yi > lat) !== (yj > lat)) &&
          (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);

        if (intersect) inside = !inside;
      }

      return inside;
    }

    function isPointInPolygonGeometry(lat: number, lng: number, geometry: any) {
      if (!geometry) return false;

      if (geometry.type === "Polygon") {
        const rings = geometry.coordinates || [];
        if (!rings.length) return false;

        const outerRing = rings[0];
        if (!isPointInRing(lat, lng, outerRing)) return false;

        for (let i = 1; i < rings.length; i++) {
          if (isPointInRing(lat, lng, rings[i])) return false;
        }

        return true;
      }

      if (geometry.type === "MultiPolygon") {
        const polygons = geometry.coordinates || [];
        for (const polygon of polygons) {
          if (!polygon?.length) continue;

          const outerRing = polygon[0];
          if (!isPointInRing(lat, lng, outerRing)) continue;

          let insideHole = false;
          for (let i = 1; i < polygon.length; i++) {
            if (isPointInRing(lat, lng, polygon[i])) {
              insideHole = true;
              break;
            }
          }

          if (!insideHole) return true;
        }
      }

      return false;
    }

    function isPointInsideLucena(lat: number, lng: number) {
      const features = (lucenaBarangays as any)?.features || [];

      for (const feature of features) {
        if (feature?.properties?.NAME_2 !== "Lucena City") continue;
        if (isPointInPolygonGeometry(lat, lng, feature?.geometry)) {
          return true;
        }
      }

      return false;
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
      (async () => {
        try {

          const session = await getPassengerSession();

          if (session.passengerId) {
            setPassengerId(String(session.passengerId));
            return;
          }

          Alert.alert("Session expired", "Please log in again.");
          router.replace("/login_and_reg/plogin");
        } catch (err) {
          Alert.alert("Error", "Could not load your session. Please log in again.");
          router.replace("/login_and_reg/plogin");
        }
      })();
    }, []);

    useEffect(() => {
      if (!mapReady) return;

      sendToMap({
        type: "setPassengerType",
        passengerType: bookingType,
      });
    }, [bookingType, mapReady]);



    // useEffect(() => {
    //   const sub = Notifications.addNotificationReceivedListener(async (notif) => {
    //     dbg("PHOME:pushReceived", {
    //       title: notif.request.content.title,
    //       body: notif.request.content.body,
    //       data: notif.request.content.data,
    //     });

    //     // ✅ this is fine
    //     await Notifications.scheduleNotificationAsync({
    //       content: {
    //         title: notif.request.content.title || "TODA Go",
    //         body: notif.request.content.body || "",
    //         data: notif.request.content.data || {},
    //         sound: true,
    //       },
    //       trigger: null, 
    //     });
    //   });

    //   return () => sub.remove();
    // }, []);



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

    const normalizeFareConfig = (raw: any): FareConfigState | null => {
      const cfg = raw?.config ?? raw?.fareConfig ?? raw?.data ?? raw;

      if (
        !cfg ||
        !cfg.regular ||
        !cfg.special ||
        !cfg.discounts ||
        typeof cfg.regular.baseFare !== "number" ||
        typeof cfg.special.baseFare !== "number"
      ) {
        return null;
      }

      return cfg as FareConfigState;
    };

    useEffect(() => {
      const loadConfig = async () => {
        try {
          const session = await getPassengerSession();
          const res = await fetch(`${API_BASE_URL}/api/public/farematrix`, {
            headers: {
              "Content-Type": "application/json",
            },
          });
          const text = await res.text();

          let j;
          try {
            j = JSON.parse(text);
          } catch (e) {
            return;
          }

          const normalized = normalizeFareConfig(j);

          if (!normalized) {
            return;
          }

          setFareConfig(normalized);
        } catch (e) {
        }
      };
      loadConfig();
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
      if (!bookedFor) {
        setPickup(null);
      }
    }, [bookedFor]);

    useEffect(() => {
      if (!location) return;

      const inside = isPointInsideLucena(location.latitude, location.longitude);
      setIsCurrentLocationInsideLucena(inside);

      if (!inside && !outsideLucenaWarned) {
        Alert.alert(
          "Outside Lucena",
          "Your current location is outside Lucena. You cannot book for yourself here, but you may still use Book for someone else."
        );
        setOutsideLucenaWarned(true);
      }
    }, [location, outsideLucenaWarned]);


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
      if (!lastDistanceKm || lastDistanceKm <= 0) return;

      computeBackendFare(lastDistanceKm);
    }, [bookingType, partySize, lastDistanceKm]);


    useEffect(() => {
      const activePickup = getActivePickup();

      if (!destination || !activePickup) return;

      const routeKey = makeRouteKey(activePickup, destination);

      // ✅ If route is not currently shown, do not auto-request route.
      // User must still click Direction or Start Booking first.
      if (!routeVisible && !showBookingForm) {
        lastRouteDestKeyRef.current = routeKey;
        return;
      }

      // ✅ If booking is already submitted/accepted, do not let passenger GPS
      // clear or constantly recalc the pre-booking route.
      if (hasActiveBooking || searching || bookingConfirmed || matchedDriver) {
        return;
      }

      // ✅ Already fresh enough
      if (routeReadyKey === routeKey) {
        return;
      }

      const now = Date.now();
      const activePickupPoint = {
        lat: activePickup.latitude,
        lng: activePickup.longitude,
      };

      const lastFrom = lastRouteFromRef.current;
      const movedMeters = lastFrom ? haversine(lastFrom, activePickupPoint) : Infinity;
      const routeAgeMs = now - lastRouteAtRef.current;

      // ✅ For normal self-booking, GPS movement must be meaningful.
      // This prevents route API spam.
      if (!bookedFor) {
        // For normal passenger GPS movement, do not request route again.
        // The WebView map trims the existing route locally.
        return;
      }

      // ✅ For "book for someone else", pickup is manually pinned.q
      // When pickup changes, recalc, but debounce it.
      if (passengerAutoRerouteTimerRef.current) {
        clearTimeout(passengerAutoRerouteTimerRef.current);
      }

      passengerAutoRerouteTimerRef.current = setTimeout(() => {
        // GPS movement should NOT request backend/ORS route again.
        // Route trimming is handled locally inside mapHtml.ts via updateUserLoc.
        return;
      }, bookedFor ? 350 : 800);

      return () => {
        if (passengerAutoRerouteTimerRef.current) {
          clearTimeout(passengerAutoRerouteTimerRef.current);
          passengerAutoRerouteTimerRef.current = null;
        }
      };
    }, [
      destination,
      bookedFor,
      pickup,
      location,
      routeVisible,
      showBookingForm,
      routeReadyKey,
      hasActiveBooking,
      searching,
      bookingConfirmed,
      matchedDriver,
    ]);



    const canShowChatNotice = bookingConfirmed && !!bookingId && !!matchedDriver?.driverId && !!passengerId;

    const canBookForSelfFromCurrentLocation = () => {
      return bookedFor || isCurrentLocationInsideLucena === true;
    };

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
        const session = await getPassengerSession();
        const r = await fetch(`${API_BASE_URL}/api/booking/${id}/payment-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
          },
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
        const session = await getPassengerSession();
        const res = await fetch(`${API_BASE_URL}/api/route`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
          },
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

        setLastDistanceKm(distanceKm);
        setLastDistanceText(distanceText);
        setLastDurationText(durationText);

        await computeBackendFare(distanceKm);
      } catch {}
    };

    const fetchRouteVariants = async (
      pickupOverride?: { latitude: number; longitude: number } | null,
      destinationOverride?: { latitude: number; longitude: number } | null,
      options?: { silent?: boolean }
    ) => {
      const pickupToUse = pickupOverride ?? getActivePickup();
      const destinationToUse = destinationOverride ?? destination;

      if (!pickupToUse || !destinationToUse) return null;

      const routeKey = makeRouteKey(pickupToUse, destinationToUse);

      if (inFlightRouteKeyRef.current === routeKey) {
        return null;
      }

      if (lastSuccessfulRouteKeyRef.current === routeKey && routeOptions.length > 0) {
        return routeOptions[selectedRouteIndex ?? 0] || routeOptions[0] || null;
      }

      inFlightRouteKeyRef.current = routeKey;
      setRouteLoading(true);

      try {
        const body = {
          start: [pickupToUse.longitude, pickupToUse.latitude],
          end: [destinationToUse.longitude, destinationToUse.latitude],
        };

        const session = await getPassengerSession();

        const res = await fetch(`${API_BASE_URL}/api/route/variants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        const text = await res.text();

        let data: any[] = [];
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("Route API returned non-JSON");
        }

        if (!res.ok || !Array.isArray(data) || !data.length) {
          throw new Error("No route options returned.");
        }

        const enriched = await Promise.all(
          data.map(async (r: any) => {
            const distM = r?.summary?.distance ?? 0;
            const durS = r?.summary?.duration ?? 0;

            const distanceKm = distM / 1000;
            const distanceText = `${distanceKm.toFixed(2)} km`;

            const mins = Math.round(durS / 60);
            const durationText =
              mins >= 60
                ? `${Math.floor(mins / 60)}h ${mins % 60} min`
                : `${mins} min`;

            const backendFare = await getBackendFareOnly(distanceKm);

            const fareVal =
              backendFare?.fare ??
              calculateFare(distanceKm, "none", {
                bookingType,
                partySize,
                config: fareConfig,
              });

            const fareText = `₱${fareVal} est`;

            return {
              ...r,
              distanceKm,
              distanceText,
              durationText,
              fareText,
            };
          })
        );

        enriched.sort((a, b) => {
          const da = typeof a.distanceKm === "number" ? a.distanceKm : Infinity;
          const db = typeof b.distanceKm === "number" ? b.distanceKm : Infinity;
          return da - db;
        });

        const deduped: any[] = [];
        const DIST_ABS_EPS = 0.15;
        const DIST_REL_EPS = 0.05;

        for (const r of enriched) {
          const d = typeof r.distanceKm === "number" ? r.distanceKm : Infinity;
          let merged = false;

          for (let i = 0; i < deduped.length; i++) {
            const existing = deduped[i];
            const ed =
              typeof existing.distanceKm === "number"
                ? existing.distanceKm
                : Infinity;

            const diff = Math.abs(d - ed);
            const rel = ed > 0 ? diff / ed : 0;

            if (diff <= DIST_ABS_EPS || rel <= DIST_REL_EPS) {
              const curDur = r?.summary?.duration ?? Infinity;
              const exDur = existing?.summary?.duration ?? Infinity;

              if (curDur < exDur) {
                deduped[i] = r;
              }

              merged = true;
              break;
            }
          }

          if (!merged) {
            deduped.push(r);
          }
        }

        const fareGroups: Record<string, any[]> = {};

        for (const r of deduped) {
          const fareKey = r.fareText || "";
          if (!fareGroups[fareKey]) fareGroups[fareKey] = [];
          fareGroups[fareKey].push(r);
        }

        const finalRoutes: any[] = [];

        for (const fareKey in fareGroups) {
          const group = fareGroups[fareKey];

          if (group.length === 1) {
            finalRoutes.push(group[0]);
            continue;
          }

          let best = group[0];

          for (const r of group) {
            const dur = r?.summary?.duration ?? Infinity;
            const bestDur = best?.summary?.duration ?? Infinity;
            if (dur < bestDur) best = r;
          }

          finalRoutes.push(best);
        }

        if (!finalRoutes.length) {
          // ✅ Do not erase an existing visible route during auto recalculation.
          // Only clear if there is no old route to keep.
          if (!routeOptions.length) {
            setRouteOptions([]);
            setSelectedRouteIndex(null);
            sendToMap({ type: "clearRoute" });
          }

          return null;
        }

        setRouteOptions(finalRoutes);
        setSelectedRouteIndex(0);

        const chosen = finalRoutes[0];

        if (chosen?.distanceKm) {
          setLastDistanceKm(chosen.distanceKm);
          setLastDistanceText(chosen.distanceText ?? null);
          setLastDurationText(chosen.durationText ?? null);

          await computeBackendFare(chosen.distanceKm);
        }

        // Save the route origin/time so GPS auto-reroute can throttle correctly
        lastRouteFromRef.current = {
          lat: pickupToUse.latitude,
          lng: pickupToUse.longitude,
        };

        lastRouteToRef.current = {
          lat: destinationToUse.latitude,
          lng: destinationToUse.longitude,
        };

        lastRouteAtRef.current = Date.now();

        sendToMap({ type: "clearRoute" });
        sendToMap({ type: "setRoutes", routes: finalRoutes });
        sendToMap({ type: "selectRouteIndex", index: 0 });

        lastSuccessfulRouteKeyRef.current = routeKey;
        lastRouteDestKeyRef.current = routeKey;

        setRouteVisible(true);
        setRouteReadyKey(routeKey);

        return chosen;
      } catch (e: any) {
        console.log("❌ fetchRouteVariants failed:", e?.message || e);

        // ✅ Important:
        // If this was an auto GPS recalculation, keep the old route visible.
        // Only clear if there is no old route yet.
        if (!routeOptions.length) {
          setRouteOptions([]);
          setSelectedRouteIndex(null);
          sendToMap({ type: "clearRoute" });
        }

        if (!options?.silent) {
          Alert.alert(
            "Route unavailable",
            e?.message || "Unable to show direction right now."
          );
        }

        return null;
      } finally {
        if (inFlightRouteKeyRef.current === routeKey) {
          inFlightRouteKeyRef.current = null;
        }

        setRouteLoading(false);
      }
    };

    const handleShowHideDirection = async () => {
      const activePickup = getActivePickup();

      if (!activePickup || !destination) {
        Alert.alert(
          "Select destination",
          "Please select your pickup and destination first."
        );
        return;
      }

      if (routeVisible) {
        clearVisibleRouteOnly();
        return;
      }

      const routeKey = makeRouteKey(activePickup, destination);

      if (routeReadyKey === routeKey && routeOptions.length > 0) {
        sendToMap({ type: "setRoutes", routes: routeOptions });
        sendToMap({ type: "selectRouteIndex", index: selectedRouteIndex ?? 0 });
        setRouteVisible(true);
        return;
      }

      await fetchRouteVariants(activePickup, destination);
    };

    const ensureRouteBeforeOpeningBooking = async () => {
      const activePickup = getActivePickup();

      if (!activePickup || !destination) {
        Alert.alert(
          "Select destination",
          "Please select your pickup and destination first."
        );
        return false;
      }

      const currentRouteKey = makeRouteKey(activePickup, destination);

      const hasLatestRoute =
        routeReadyKey === currentRouteKey &&
        routeOptions.length > 0 &&
        typeof lastDistanceKm === "number" &&
        lastDistanceKm > 0;

      if (hasLatestRoute) {
        return true;
      }

      const fetchedRoute = await fetchRouteVariants(activePickup, destination);

      if (!fetchedRoute) {
        Alert.alert(
          "Route required",
          "Unable to get the route for this destination. Please try again."
        );
        return false;
      }

      return true;
    };

    const handleStartBookingPress = async () => {
      const ok = await ensureRouteBeforeOpeningBooking();
      if (!ok) return;

      setShowBookingForm(true);

      setTimeout(() => {
        sendToMap({
          type: "fitRoute",
          index: selectedRouteIndex ?? 0,
          bottomPadding: 380,
        });
      }, 350);
    };

    const onChangeQuery = (t: string) => {
      setQuery(t);

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }

      searchTimerRef.current = setTimeout(async () => {
        const text = t.trim();

        if (text.length < 3) {
          setHits([]);
          return;
        }

        try {
          const activePickup = getActivePickup();

          const qs = new URLSearchParams();
          qs.set("q", text);

          if (activePickup) {
            qs.set("lat", String(activePickup.latitude));
            qs.set("lng", String(activePickup.longitude));
          }

          const res = await fetch(`${API_BASE_URL}/api/geocode?${qs.toString()}`);
          const data = await res.json();

          if (!res.ok) {
            console.log("❌ geocode failed:", data);
            setHits([]);
            return;
          }

          const normalized = Array.isArray(data)
            ? data
                .map((item: any) => ({
                  label: String(item.label || "Selected location"),
                  lat: Number(item.lat),
                  lng: Number(item.lng ?? item.lon), // fallback only
                }))
                .filter(
                  (item: any) =>
                    Number.isFinite(item.lat) && Number.isFinite(item.lng)
                )
            : [];

          setHits(normalized);
        } catch (e) {
          console.log("❌ geocode search error:", e);
          setHits([]);
        }
      }, 350);
    };



    // When a user taps a suggestion
    const choosePlace = (p: { label: string; lat: number; lng: number }) => {
      const dest = {
        latitude: Number(p.lat),
        longitude: Number(p.lng),
      };

      if (
        !Number.isFinite(dest.latitude) ||
        !Number.isFinite(dest.longitude)
      ) {
        Alert.alert("Invalid location", "This search result has invalid coordinates.");
        return;
      }

      if (!isPointInsideLucena(dest.latitude, dest.longitude)) {
        Alert.alert("Not allowed", "Destination is outside Lucena service area.");
        return;
      }

      const activePickup = getActivePickup();

      if (!activePickup) {
        Alert.alert(
          "Location unavailable",
          "Waiting for GPS, please try again in a moment."
        );
        return;
      }

      setQuery(p.label);
      setHits([]);

      setDestination(dest);
      setDropoffName(p.label);
      setDestinationLabel(p.label);

      clearVisibleRouteOnly();

      sendToMap({
        type: "setMarkers",
        destination: dest,
        driver: null,
        pickup: bookedFor
          ? {
              latitude: activePickup.latitude,
              longitude: activePickup.longitude,
            }
          : null,
      });
    };

    useEffect(() => {
      (async () => {
        const fallback = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
        try {
          const session = await getPassengerSession();
          if (!session.passengerId || !session.token) {
            setAvatarUrl(fallback);
            return;
          }

          const r = await fetch(`${API_BASE_URL}/api/passenger/${session.passengerId}`, {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
          });

          const j = await r.json().catch(() => null);

          const raw =
            j?.passenger?.profileImage ||
            j?.passenger?.selfieImage ||
            j?.passenger?.avatar ||
            null;

          if (!raw) {
            setAvatarUrl(fallback);
            return;
          }

          const built =
            /^https?:\/\//i.test(raw)
              ? raw
              : `${API_BASE_URL.replace(/\/$/, "")}/${String(raw).replace(/^\/+/, "")}`;

          setAvatarUrl(built);
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
      if (!mapReady || !location) return;

      ensureUserMarker(location.latitude, location.longitude);

      sendToMap({
        type: "updateUserLoc",
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? 15,
        avatarUrl,
      });
    }, [mapReady, location, avatarUrl]);

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
      if (!location) return;
      if (mapHtml) return; // only build once

      const html = buildPassengerMapHtml({
        initLat: location.latitude,
        initLng: location.longitude,
        MAPTILER_KEY,
        iconDataJson: JSON.stringify(iconData),
        avatarUrl,
      });

      setMapHtml(html);
    }, [location, iconData, avatarUrl]);



    useEffect(() => {
      if (!initialLocRef.current && pickup) {
        initialLocRef.current = { latitude: pickup.latitude, longitude: pickup.longitude };
      }
    }, [pickup]);

    useEffect(() => {
    }, [mapHtml]);

    useEffect(() => {
    }, [location, pickup, iconData, mapHtml]);

    useEffect(() => {
      // Passenger route should not auto-recompute from pickup movement anymore.
      // Show Direction / Book Now will fetch the latest route when needed.
    }, [pickup, destination]);

    // Reverse geocode for drop-off location
    const handleMapMessage = async (event: any) => {
      try {
        const parsed = JSON.parse(event.nativeEvent.data);

        // ✅ PRIORITY: pickup selection MUST come first
        if (selectingPickup && parsed.latitude && parsed.longitude) {
          setPickup({ latitude: parsed.latitude, longitude: parsed.longitude });
          setSelectingPickup(false);

          sendToMap({
            type: 'setPickup',
            latitude: parsed.latitude,
            longitude: parsed.longitude
          });

          return;
        }

        if (selectingPickup && parsed.type === "mapTapDestination") {
          const lat = Number(parsed.latitude);
          const lng = Number(parsed.longitude);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          if (!isPointInsideLucena(lat, lng)) {
            Alert.alert("Not allowed", "Pickup is outside Lucena service area.");
            return;
          }

          setPickup({ latitude: lat, longitude: lng });
          setSelectingPickup(false);

          try {
            const results = await Location.reverseGeocodeAsync({
              latitude: lat,
              longitude: lng,
            });

            if (results && results.length > 0) {
              const a = results[0];
              setPickupName(
                `${a.street || ""}${a.street ? ", " : ""}${a.city || a.subregion || ""}`
              );
            } else {
              setPickupName("Pinned pickup");
            }
          } catch {
            setPickupName("Pinned pickup");
          }

          sendToMap({
            type: "setPickup",
            latitude: lat,
            longitude: lng,
          });

          return;
        }

        if (parsed.type === "mapTapDestination") {
          if (showBookingForm && destination) {
            return;
          }
          const lat = Number(parsed.latitude);
          const lng = Number(parsed.longitude);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          if (!isPointInsideLucena(lat, lng)) {
            Alert.alert("Not allowed", "Destination is outside Lucena service area.");
            return;
          }

          const dest = { latitude: lat, longitude: lng };
          setDestination(dest);

          try {
            const results = await Location.reverseGeocodeAsync({
              latitude: lat,
              longitude: lng,
            });

            if (results && results.length > 0) {
              const a = results[0];
              setDropoffName(
                `${a.street || ""}${a.street ? ", " : ""}${a.city || a.subregion || ""}`
              );
            } else {
              setDropoffName("Selected Location");
            }
          } catch {
            setDropoffName("Selected Location");
          }

          const activePickup = getActivePickup();

          if (!activePickup) {
            Alert.alert("Location unavailable", "Waiting for GPS, please try again in a moment.");
            return;
          }

          clearVisibleRouteOnly();

          sendToMap({
            type: "setMarkers",
            destination: dest,
            driver: null,
            pickup: bookedFor
              ? {
                  latitude: activePickup.latitude,
                  longitude: activePickup.longitude,
                }
              : null,
          });

          return;
        }

        if (parsed.type === 'dbg' && parsed.tag === 'nudgeRouteStart') {
          return;
        }
        if (parsed.type === 'nudgeAck') {
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
          if (!isPointInsideLucena(dest.latitude, dest.longitude)) {
            Alert.alert("Not allowed", "Destination is outside Lucena service area.");
            return;
          }
          setDestination(dest);
          setDropoffName(parsed.label || 'POI Destination');

          const activePickup = getActivePickup();

          if (!activePickup) {
            Alert.alert("Location unavailable", "Waiting for GPS, please try again in a moment.");
            return;
          }

          clearVisibleRouteOnly();

          sendToMap({
            type: "setMarkers",
            destination: dest,
            driver: null,
            pickup: bookedFor
              ? {
                  latitude: activePickup.latitude,
                  longitude: activePickup.longitude,
                }
              : null,
          });
          return;
        }
      } catch {}
    };

    const loadLandmarks = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/landmarks`);
        const items = await r.json();
        sendToMap({ type: 'setLandmarks', items: Array.isArray(items) ? items : [] });
      } catch {
        sendToMap({ type: 'setLandmarks', items: [] });
      }
    };

    const loadTodas = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/todas-public`);
        const raw = await r.json();

        const items = Array.isArray(raw)
          ? raw.map((t: any, idx: number) => ({
              id: t._id || String(idx),
              name: t.name,
              lat: t.latitude,
              lng: t.longitude,
              // 👇 send list of served destinations (by name)
              destinations: Array.isArray(t.servedDestinations)
                ? t.servedDestinations.map((d: any) => d.name || "Unnamed destination")
                : [],
            }))
          : [];

        sendToMap({ type: 'setTodas', items });
      } catch (e) {
        sendToMap({ type: 'clearTodas' });
      }
    };



    useEffect(() => {
      if (!mapReady) return;

      if (!bookedFor) {
        setPickup(null);
        setSelectingPickup(false);
        sendToMap({ type: "clearPickup" });
        return;
      }

      if (!pickup) {
        sendToMap({ type: "clearPickup" });
        return;
      }

      sendToMap({
        type: "setPickup",
        latitude: pickup.latitude,
        longitude: pickup.longitude,
      });
    }, [mapReady, bookedFor, pickup]);


    const gate = loading || !hasActivePickup();

    const handleBookNow = async () => {
      const activePickup = getActivePickup();

      if (!activePickup || !destination) {
        Alert.alert("Missing location info");
        return;
      }
      if (!passengerId) {
        Alert.alert("Not logged in", "Please log in again.");
        router.replace("/login_and_reg/plogin");
        return;
      }

      if (!bookedFor && isCurrentLocationInsideLucena === false) {
        Alert.alert(
          "Booking not allowed",
          "Your current location is outside Lucena. You may still use Book for someone else."
        );
        return;
      }

      if (bookedFor && !riderName.trim()) {
        Alert.alert("Missing info", "Please enter the rider’s name.");
        return;
      }

      if (!isPointInsideLucena(destination.latitude, destination.longitude)) {
        Alert.alert("Not allowed", "Destination is outside Lucena service area.");
        return;
      }

      dbg("PHOME:bookingSubmitted", {
        pickup: activePickup,
        destination,
      });

      // ✅ Book Now must have a latest route.
      // If passenger did not tap Show Direction, fetch route first.
      const currentRouteKey = makeRouteKey(activePickup, destination);

      let routeForBooking =
        routeReadyKey === currentRouteKey && routeOptions.length > 0
          ? routeOptions[selectedRouteIndex ?? 0] || routeOptions[0]
          : null;

      if (!routeForBooking) {
        const fetchedRoute = await fetchRouteVariants(activePickup, destination);

        if (!fetchedRoute) {
          Alert.alert(
            "Route required",
            "Unable to get the route for this destination. Please try again."
          );
          return;
        }

        routeForBooking = fetchedRoute;
      }

      // Normalize party size based on type
      const normalizedParty =
        bookingType === 'GROUP'
          ? Math.min(5, Math.max(1, Number(partySize) || 1))
          : 1; // CLASSIC & SOLO always 1

      const chosenRoutePayload = routeForBooking
        ? {
            preference: routeForBooking.preference || null,
            distanceMeters: routeForBooking.summary?.distance ?? null,
            durationSeconds: routeForBooking.summary?.duration ?? null,
            coords: Array.isArray(routeForBooking.coords)
              ? routeForBooking.coords.map(([lat, lng]: [number, number]) => [lng, lat])
              : [],
          }
        : null;
      


      setSearching(true);
      setAlertedBookingComplete(false);
      setTripCompleted(false);
      acceptedNotifiedRef.current = false;
      completedNotifiedRef.current = false;

      const bookingData = {
        pickupLat: activePickup.latitude,
        pickupLng: activePickup.longitude,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
        estimatedFare: fare,
        distanceKm:
          chosenRoutePayload?.distanceMeters != null
            ? Number(chosenRoutePayload.distanceMeters) / 1000
            : null,
        paymentMethod,
        notes,
        pickupPlace: pickupName,
        bookedFor,
        riderName: bookedFor ? riderName.trim() : "",
        riderPhone: bookedFor ? riderPhone.trim() : "",
        destinationPlace: dropoffName,
        bookingType,
        partySize: normalizedParty,
        chosenRoute: chosenRoutePayload,
      };
      if (chosenRoutePayload && Array.isArray(chosenRoutePayload.coords)) {
      }



      try {
        // reset any old polling
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }

        setShowBookingForm(false);
        setSearching(true);

        const token = await AsyncStorage.getItem("token");

        if (!token) {
          Alert.alert("Session expired", "Please log in again.");
          router.replace("/login_and_reg/plogin");
          setSearching(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/book`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bookingData),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Something went wrong");

        const createdBookingId =
          result.booking.bookingId || result.booking.id || result.booking._id;


        setBookingId(createdBookingId);

        await persistBookingState({
          bookingId: createdBookingId,
          searching: true,
          showBookingForm: false,
          bookingConfirmed: false,
        });
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Failed to send booking. Please try again.");
        setSearching(false);
      }
    };

    const downloadDriverGcashQr = async () => {
      try {
        const qrUrl = paymentInfo?.driverPayment?.qrUrl; // <-- from /payment-info

        if (!qrUrl) {
          Alert.alert("No QR code", "Driver has no GCash QR uploaded.");
          return;
        }

        // Ask permission to save to gallery (Android/iOS)
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Allow Photos permission to save the QR.");
          return;
        }

        // Make a local filename
        const fileUri = FileSystem.documentDirectory + `gcash_qr_${Date.now()}.png`;

        // Download
        const dl = await FileSystem.downloadAsync(qrUrl, fileUri);

        // Save to gallery
        const asset = await MediaLibrary.createAssetAsync(dl.uri);

        // Optional: Put it in an album (Android mostly)
        if (Platform.OS === "android") {
          await MediaLibrary.createAlbumAsync("TodaGO", asset, false).catch(() => {});
        }

        Alert.alert("Saved!", "GCash QR saved to your gallery.");
      } catch (e: any) {
        Alert.alert("Download failed", "Could not download the QR code.");
      }
    };

    

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
          const session = await getPassengerSession();
          const res = await fetch(`${API_BASE_URL}/api/bookings`, {
            headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
          });
          const allBookings = await res.json();
          const myBooking = allBookings.find(
            (b: any) =>
              b &&
              String(b.id ?? b.bookingId ?? b._id) === String(bookingId)
          );
          if (!Array.isArray(allBookings)) return;

          dbg("PHOME:pollDriverMatch", {
            bookingId,
            found: !!myBooking,
            status: myBooking?.status,
          });

          if (!myBooking) return;
          setCurrentBooking(myBooking);

          if (
            myBooking.status === "accepted" &&
            !bookingConfirmed
          ) {

            dbg("PHOME:driverMatched", {
              bookingId,
              driverId: myBooking.driverId || null,
            });

            setBookingConfirmed(true);
            setSearching(false);

            localNotify(
              "TODA-Go",
              "A driver accepted your booking.",
              bookingId ? `accepted-${bookingId}` : "accepted-generic"
            );


            if (bookingId) loadPaymentInfo(String(bookingId));

            if (myBooking.driverId) {
              try {
                const [driverRes, statusRes] = await Promise.all([
                  fetch(`${API_BASE_URL}/api/driver/${myBooking.driverId}`, {
                    headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
                  }),
                  fetch(`${API_BASE_URL}/api/driver-status/${myBooking.driverId}`, {
                    headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
                  }),
                ]);

                const driverData = await driverRes.json().catch(() => null);
                const statusData = await statusRes.json().catch(() => null);

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
              } catch (err) {
                dbg("PHOME:driverFetchError", {
                  bookingId,
                  error: String(err),
                });
              }
            }
          }

        } catch (err) {
          dbg("PHOME:pollDriverMatchError", {
            bookingId,
            error: String(err),
          });
        }
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
          const session = await getPassengerSession();
          const res = await fetch(`${API_BASE_URL}/api/bookings`, {
            headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
          });
          const allBookings = await res.json();
          const myBooking = allBookings.find(
            (b: any) =>
              b &&
              String(b.id ?? b.bookingId ?? b._id) === String(bookingId)
          );
          if (!Array.isArray(allBookings)) return;

          dbg("PHOME:pollCompletion", {
            bookingId,
            found: !!myBooking,
            status: myBooking?.status,
          });

          if (!myBooking) return;
          setCurrentBooking(myBooking);

          if (
            myBooking.status === "completed" &&
            !alertedBookingComplete
          ) {

            dbg("PHOME:tripCompleted", {
              bookingId: currentBooking?.bookingId,
            });

            setAlertedBookingComplete(true);
            localNotify(
              "TODA-Go",
              "Your Booking has been completed.",
              bookingId ? `completed-${bookingId}` : "localNotify-generic"
            );
            Alert.alert("Booking Completed", "The driver has marked this ride as completed.");

            setSearching(false);
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
              searchTimeoutRef.current = null;
            }

            setBookingConfirmed(false);
            setBookingId(null);
            setMatchedDriver(null);
            setInitialDriverPickupDistance(null);
            setInitialDriverTripDistance(null);
            setDestination(null);
            setTripCompleted(true);

            setQuery('');
            setHits([]);

            AsyncStorage.removeItem("phomeBookingState").catch(() => {});

            sendToMap({ type: "setMarkers", destination: null, driver: null });
            sendToMap({ type: "clearRoute" });
            sendToMap({ type: 'clearPickup' });

            resetFareBreakdown();
          }
        } catch (err) {
          console.error("❌ Poll error:", err);
          dbg("PHOME:pollCompletionError", {
            bookingId,
            error: String(err),
          });
        }
      };

      interval = setInterval(pollForBookingCompletion, 4000);
      return () => clearInterval(interval);
    }, [bookingId, alertedBookingComplete]);


    useEffect(() => {
      const saveBookingState = async () => {
        const hasActiveTransaction =
          !!bookingId || !!searching || !!bookingConfirmed || !!matchedDriver;

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
          pickup,
          pickupName,
          dropoffName,
          bookingType,
          partySize,
        };


        // Only persist if there is an active transaction
        if (!hasActiveTransaction) {
          return;
        }

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
      pickup,
      pickupName,
      dropoffName,
      bookingType,
      partySize,
    ]);

    useEffect(() => {
      const loadBookingState = async () => {

        try {
          const savedState = await AsyncStorage.getItem("phomeBookingState");

          if (!savedState) {
            return;
          }

          const s = JSON.parse(savedState);

          if (s.destinationLabel) setDestinationLabel(s.destinationLabel);
          if (s.notes) setNotes(s.notes);
          if (s.paymentMethod) setPaymentMethod(s.paymentMethod);
          if (s.pickupName) setPickupName(s.pickupName);
          if (s.dropoffName) setDropoffName(s.dropoffName);
          if (s.bookingType) setBookingType(s.bookingType);
          if (s.partySize) setPartySize(s.partySize);
          if (s.pickup) setPickup(s.pickup);
          if (s.destination) setDestination(s.destination);
          if (typeof s.showBookingForm === "boolean") setShowBookingForm(s.showBookingForm);

          const savedBookingId = s.bookingId;

          if (savedBookingId) {
            await restoreBookingFromServer(savedBookingId);
          }

          await restoreLatestBookingForPassenger();
        } catch (err) {
          console.warn("Error loading booking state:", err);
        }
      };

      loadBookingState();
    }, [mapReady, passengerId]);

    const cancelRideNow = async () => {
      try {
        if (!bookingId) {
          return;
        }
        dbg("PHOME:cancelRequested", { bookingId });

        const token = await AsyncStorage.getItem("token");

        if (!token) {
          Alert.alert("Session expired", "Please log in again.");
          router.replace("/login_and_reg/plogin");
          return;
        }

        const resp = await fetch(`${API_BASE_URL}/api/cancel-booking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookingId }),
        });
        const body = await resp.text();

        // UI reset after server confirms
        setSearching(false);
        setBookingId(null);
        setMatchedDriver(null);
        setInitialDriverPickupDistance(null);
        setInitialDriverTripDistance(null);
        setBookingConfirmed(false);
        setDestination(null);
        setTripCompleted(false);
        setAlertedBookingComplete(false);
        setShowBookingForm(false);
        setDropoffName("");
        setQuery("");
        setHits([]);
        setCurrentBooking(null);
        setPaymentInfo(null);

        // Clear map + cached state
        sendToMap({ type: "setMarkers", destination: null, driver: null });
        sendToMap({ type: "clearRoute" });
        sendToMap({ type: 'clearPickup' });
        await AsyncStorage.removeItem("phomeBookingState");
        resetFareBreakdown();
      } catch (e) {
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
        const session = await getPassengerSession();

        const res = await fetch(`${API_BASE_URL}/api/feedback/rate-driver`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
          },
          body: JSON.stringify({ driverId: driverIdToRate, rating: selectedRating }),
        });

        if (res.ok && notes) {
          await fetch(`${API_BASE_URL}/api/feedback/submit-feedback`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
            },
            body: JSON.stringify({
              bookingId: bookingIdToRate,
              passengerId: session.passengerId,
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
        const session = await getPassengerSession();

        const res = await fetch(`${API_BASE_URL}/api/feedback/submit-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
          },
          body: JSON.stringify({
            bookingId,
            passengerId: session.passengerId,
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

    const bookingPhase = String(currentBooking?.status || "").toLowerCase();
    const bookingProgressStatus = String(currentBooking?.progressStatus || "").toLowerCase();

    const isTripPhase =
      bookingPhase === "enroute" ||
      bookingPhase === "picked_up" ||
      bookingProgressStatus === "to_dropoff" ||
      bookingProgressStatus === "enroute" ||
      currentBooking?.pickedUp === true;

    const progressTarget = isTripPhase ? destination : pickup;

    const driverProgressDistanceMeters = React.useMemo(() => {
      if (!matchedDriver?.location || !progressTarget) return null;

      const driverLat =
        matchedDriver.location.latitude ?? matchedDriver.location.lat;
      const driverLng =
        matchedDriver.location.longitude ?? matchedDriver.location.lng;

      if (
        typeof driverLat !== "number" ||
        typeof driverLng !== "number" ||
        !Number.isFinite(driverLat) ||
        !Number.isFinite(driverLng)
      ) {
        return null;
      }

      return haversine(
        { lat: driverLat, lng: driverLng },
        { lat: progressTarget.latitude, lng: progressTarget.longitude }
      );
    }, [matchedDriver?.location, progressTarget]);

    const activeInitialDistance =
      isTripPhase ? initialDriverTripDistance : initialDriverPickupDistance;

    const driverProgressDistanceText =
      driverProgressDistanceMeters == null
        ? "Calculating..."
        : driverProgressDistanceMeters >= 1000
          ? `${(driverProgressDistanceMeters / 1000).toFixed(1)} km away`
          : `${Math.max(0, Math.round(driverProgressDistanceMeters))} m away`;

    const driverProgressValue = React.useMemo(() => {
      if (
        driverProgressDistanceMeters == null ||
        activeInitialDistance == null ||
        activeInitialDistance <= 0
      ) {
        return 0;
      }

      const raw = 1 - driverProgressDistanceMeters / activeInitialDistance;

      return Math.max(0, Math.min(1, raw));
    }, [driverProgressDistanceMeters, activeInitialDistance]);

    const driverProgressPercent = Math.round(driverProgressValue * 100);

    const driverProgressTitle = isTripPhase
      ? "Trip progress"
      : "Pickup progress";

    const driverProgressHint =
      isTripPhase
        ? driverProgressPercent >= 95
          ? "You are almost at the destination."
          : `${driverProgressPercent}% closer to destination`
        : driverProgressPercent >= 95
          ? "Driver is almost at your pickup point."
          : `${driverProgressPercent}% closer to pickup`;

    useEffect(() => {
      if (!bookingConfirmed || !matchedDriver?.driverId || !bookingId || !pickup) return;

      let interval: any;

      const pollDriverAndBooking = async () => {
        try {
          const session = await getPassengerSession();

          // 1. Refresh booking status so passenger knows pickup/dropoff phase
          const bookingRes = await fetch(`${API_BASE_URL}/api/bookings`, {
            headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
          });

          const allBookings = await bookingRes.json().catch(() => []);

          if (Array.isArray(allBookings)) {
            const liveBooking = allBookings.find((b: any) =>
              String(b?.id ?? b?.bookingId ?? b?._id) === String(bookingId)
            );

            if (liveBooking) {
              setCurrentBooking(liveBooking);

              const liveStatus = String(liveBooking.status || "").toLowerCase();

              if (liveStatus === "completed" || liveStatus === "canceled") {
                setBookingConfirmed(false);
                setMatchedDriver(null);
                setInitialDriverPickupDistance(null);
                setInitialDriverTripDistance(null);
                setInitialDriverTripDistance(null);
                return;
              }
            }
          }

          // 2. Refresh driver location
          const res = await fetch(`${API_BASE_URL}/api/driver-status/${matchedDriver.driverId}`, {
            headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
          });

          const statusData = await res.json().catch(() => null);
          const nextLocation = statusData?.location || null;

          if (!nextLocation) return;

          setMatchedDriver((prev) =>
            prev
              ? {
                  ...prev,
                  location: nextLocation,
                }
              : prev
          );

          const driverLat = nextLocation.latitude ?? nextLocation.lat;
          const driverLng = nextLocation.longitude ?? nextLocation.lng;

          if (
            typeof driverLat !== "number" ||
            typeof driverLng !== "number" ||
            !Number.isFinite(driverLat) ||
            !Number.isFinite(driverLng)
          ) {
            return;
          }

          const liveStatus = String(currentBooking?.status || "").toLowerCase();
          const tripPhase =
            liveStatus === "enroute" ||
            liveStatus === "picked_up" ||
            currentBooking?.pickedUp === true;

          const target = tripPhase ? destination : pickup;
          if (!target) return;

          const distanceNow = haversine(
            { lat: driverLat, lng: driverLng },
            { lat: target.latitude, lng: target.longitude }
          );

          if (tripPhase) {
            setInitialDriverTripDistance((prev) => {
              if (prev == null || prev <= 0) return Math.max(distanceNow, 1);
              return prev;
            });
          } else {
            setInitialDriverPickupDistance((prev) => {
              if (prev == null || prev <= 0) return Math.max(distanceNow, 1);
              return prev;
            });
          }

          sendToMap({
            type: "setMarkers",
            destination,
            pickup,
            driver: {
              latitude: driverLat,
              longitude: driverLng,
            },
          });
        } catch {}
      };

      pollDriverAndBooking();
      interval = setInterval(pollDriverAndBooking, 4000);

      return () => clearInterval(interval);
    }, [
      bookingConfirmed,
      matchedDriver?.driverId,
      bookingId,
      pickup,
      destination,
      currentBooking?.status,
    ]);

    const DriverActionButton = ({
      icon,
      label,
      onPress,
      danger,
      success,
      disabled,
    }: {
      icon: keyof typeof Ionicons.glyphMap;
      label: string;
      onPress: () => void;
      danger?: boolean;
      success?: boolean;
      disabled?: boolean;
    }) => (
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.driverActionButton,
          danger && styles.driverActionButtonDanger,
          success && styles.driverActionButtonSuccess,
          disabled && styles.driverActionButtonDisabled,
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={
            success
              ? "#166534"
              : danger
                ? "#7f1d1d"
                : "#374151"
          }
        />
        <Text
          style={[
            styles.driverActionButtonText,
            danger && styles.driverActionButtonDangerText,
            success && styles.driverActionButtonSuccessText,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );



      

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
                      resetFareBreakdown();
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
            </View>

            <View
              style={[
                styles.fabContainer,
                showBookingForm
                  ? { bottom: bookingPanelHeight + 20 }
                  : { bottom: 15 },
              ]}
            >
              {/* ✅ Hidden buttons container (slides up/down) */}
              <Animated.View
                style={{
                  opacity: fabAnim,
                  transform: [
                    {
                      translateY: fabAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0], 
                      }),
                    },
                  ],
                }}
                pointerEvents={fabOpen ? "auto" : "none"}
              >
                {/* Explore Landmarks */}
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateY: fabAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -52 * .2], // topmost
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      if (showLandmarks) {
                        sendToMap({ type: "clearLandmarks" });
                        setShowLandmarks(false);
                      } else {
                        loadLandmarks();
                        setShowLandmarks(true);
                      }
                    }}
                    style={[styles.fabButton, showLandmarks && styles.fabButtonActive]}
                  >
                    <Ionicons name="map" size={22} color={showLandmarks ? "#fff" : "#333"} />
                  </TouchableOpacity>
                </Animated.View>

                {/* Show TODA */}
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateY: fabAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -52 * .1], // middle
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    onPress={async () => {
                      if (showTodas) {
                        sendToMap({ type: "clearTodas" });
                        setShowTodas(false);
                      } else {
                        await loadTodas();
                        setShowTodas(true);
                      }
                    }}
                    style={[styles.fabButton, showTodas && styles.fabButtonActive]}
                  >
                    <Ionicons name="flag" size={22} color={showTodas ? "#fff" : "#333"} />
                  </TouchableOpacity>
                </Animated.View>

                {/* Book for someone else */}
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateY: fabAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -52 * 0], // nearest above menu
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      const next = !bookedFor;
                      setBookedFor(next);

                      if (next) {
                        setSelectingPickup(true);
                        Alert.alert(
                          "Book for someone else",
                          "Tap the map to set the OTHER person's pickup."
                        );
                        return;
                      }

                      setSelectingPickup(false);

                      setDestination(null);
                      setDropoffName("");
                      resetFareBreakdown();

                      lastRouteDestKeyRef.current = null;
                      lastRouteFromRef.current = null;
                      lastRouteToRef.current = null;
                      lastRouteAtRef.current = 0;
                      routeFramedRef.current = false;

                      sendToMap({ type: "setMarkers", destination: null, driver: null, pickup: null });
                      sendToMap({ type: "clearRoute" });
                      sendToMap({ type: "clearPickup" });

                      if (location) {
                        const { latitude, longitude } = location;
                        setPickup({ latitude, longitude });
                        sendToMap({ type: "setPickup", latitude, longitude });
                      }
                    }}
                    style={[styles.fabButton, bookedFor && styles.fabButtonActive]}
                  >
                    <Ionicons name="people" size={22} color={bookedFor ? "#fff" : "#333"} />
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>

              {!showBookingForm && !hasActiveBooking && !searching && !bookingConfirmed && !matchedDriver && (
                <TouchableOpacity
                  style={[
                    styles.fabButton,
                    (!destination || !hasActivePickup() || routeLoading) && { opacity: 0.45 },
                  ]}
                  disabled={!destination || !hasActivePickup() || routeLoading}
                  onPress={handleShowHideDirection}
                >
                  <Ionicons
                    name={routeVisible ? "eye-off-outline" : "navigate-outline"}
                    size={24}
                    color="#111827"
                  />
                </TouchableOpacity>
              )}

              {/* ✅ Menu button (always visible) */}
              <TouchableOpacity
                onPress={toggleFabMenu}
                style={[
                  styles.fabButton,
                  fabOpen && { backgroundColor: "#111", borderColor: "#111" },
                ]}
              >
                <Ionicons name={fabOpen ? "close" : "menu"} size={22} color={fabOpen ? "#fff" : "#333"} />
              </TouchableOpacity>
            </View>



            <View style={styles.overlayContainer}>
              <View style={styles.overlay}>

                {searching && (
                  <View
                    style={{
                      backgroundColor: "#ffffff",
                      padding: 12,
                      marginTop: -10,
                      margin: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#e3e3e3",
                      zIndex: 9999,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View>
                        <Text style={{ fontWeight: "bold", fontSize: 15, color: "#061e1f" }}>
                          Finding a driver
                        </Text>
                        <Text style={{ marginTop: 4, color: "#6b7280" }}>
                          {bookingType === "GROUP"
                            ? `Booking type: Group (${partySize})`
                            : bookingType === "SOLO"
                            ? "Booking type: Solo (VIP)"
                            : "Booking type: Classic"}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Animated.View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: "#061e1f",
                            marginHorizontal: 3,
                            opacity: dot1,
                          }}
                        />
                        <Animated.View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: "#061e1f",
                            marginHorizontal: 3,
                            opacity: dot2,
                          }}
                        />
                        <Animated.View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: "#061e1f",
                            marginHorizontal: 3,
                            opacity: dot3,
                          }}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={cancelRideNow}
                      style={{
                        backgroundColor: "#910d04",
                        padding: 10,
                        marginTop: 12,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>
                        CANCEL BOOKING
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              
                {matchedDriver && (
                  <View
                    style={styles.driverFoundCard}
                    onLayout={(e) => {
                      const h = e.nativeEvent.layout.height;
                      setBookingPanelHeight(h);
                    }}
                  >
                    {!infoBoxMinimized ? (
                      <>
                        <View style={styles.driverFoundHeader}>
                          {driverSelfieUri ? (
                            <Image
                              source={{ uri: driverSelfieUri }}
                              style={styles.driverFoundPhoto}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.driverFoundPhotoFallback}>
                              <Ionicons name="person" size={34} color="#64748b" />
                            </View>
                          )}

                          <View style={{ flex: 1 }}>
                            <View style={styles.driverFoundTitleRow}>
                              <Text style={styles.driverFoundTitle}>Driver Found!</Text>
                              <View style={styles.driverFoundPill}>
                                <Text style={styles.driverFoundPillText}>On the way</Text>
                              </View>
                            </View>

                            <Text style={styles.driverFoundName}>
                              {matchedDriver?.driverName || "Driver"}
                            </Text>

                            <View style={styles.driverFoundMetaRow}>
                              <Text style={styles.driverFoundMeta}>
                                Franchise: {matchedDriver?.franchiseNumber || "N/A"}
                              </Text>
                              <Text style={styles.driverFoundMeta}>
                                Exp: {matchedDriver?.experienceYears || "N/A"} yrs
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.driverProgressBox}>
                          <View style={styles.driverProgressTopRow}>
                            <Text style={styles.driverProgressLabel}>{driverProgressTitle}</Text>
                            <Text style={styles.driverProgressDistance}>
                              {driverProgressDistanceText}
                            </Text>
                          </View>

                          <View style={styles.driverProgressTrack}>
                            <View
                              style={[
                                styles.driverProgressFill,
                                { width: `${driverProgressPercent}%` },
                              ]}
                            />
                          </View>

                          <Text style={styles.driverProgressHint}>
                            {driverProgressHint}
                          </Text>
                        </View>

                        <View style={styles.driverActionGrid}>
                          <DriverActionButton
                            icon="chevron-down"
                            label="Minimize"
                            onPress={() => setInfoBoxMinimized(true)}
                          />

                          <DriverActionButton
                            icon="chatbubble-outline"
                            label="Chat"
                            onPress={() => {
                              if (!bookingId || !matchedDriver?.driverId || !passengerId) return;

                              router.push({
                                pathname: "/ChatRoom",
                                params: {
                                  bookingId: String(bookingId),
                                  driverId: String(matchedDriver.driverId),
                                  passengerId: String(passengerId),
                                  role: "passenger",
                                },
                              });
                            }}
                          />

                          <DriverActionButton
                            icon="flag-outline"
                            label="Report"
                            danger
                            onPress={() => setShowReportModal(true)}
                          />
                        </View>
                        {paymentInfo?.paymentMethod?.toLowerCase() === "gcash" &&
                          paymentInfo?.driverPayment?.number && (
                            <View style={styles.gcashMiniCard}>
                              <View style={styles.gcashMiniHeader}>
                                <View>
                                  <Text style={styles.gcashMiniTitle}>GCash Payment</Text>
                                  <Text style={styles.gcashMiniSubtitle}>
                                    Send payment to the driver’s GCash number.
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.paymentStatusPill,
                                    paymentInfo?.paymentStatus === "paid" && styles.paymentStatusPillPaid,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.paymentStatusText,
                                      paymentInfo?.paymentStatus === "paid" && styles.paymentStatusTextPaid,
                                    ]}
                                  >
                                    {paymentInfo?.paymentStatus === "paid" ? "Paid" : "Awaiting"}
                                  </Text>
                                </View>
                              </View>

                              <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.gcashNumberRow}
                                onPress={handleCopy}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.gcashNumberLabel}>GCash Number</Text>
                                  <Text style={styles.gcashNumberText}>
                                    {paymentInfo.driverPayment?.number}
                                  </Text>
                                  <Text style={styles.gcashCopyHint}>
                                    {copied ? "Copied to clipboard" : "Tap to copy"}
                                  </Text>
                                </View>

                                <Ionicons
                                  name={copied ? "checkmark-circle" : "copy-outline"}
                                  size={20}
                                  color={copied ? "#166534" : "#64748b"}
                                />
                              </TouchableOpacity>

                              <View style={styles.gcashActionRow}>
                                <DriverActionButton
                                  icon="download-outline"
                                  label="QR"
                                  onPress={downloadDriverGcashQr}
                                />

                                <DriverActionButton
                                  icon={
                                    paymentInfo?.paymentStatus === "paid"
                                      ? "checkmark-circle"
                                      : "cash-outline"
                                  }
                                  label={paymentInfo?.paymentStatus === "paid" ? "Paid" : "Mark Paid"}
                                  success={paymentInfo?.paymentStatus === "paid"}
                                  disabled={paymentInfo?.paymentStatus === "paid"}
                                  onPress={() => {
                                    if (bookingId) setPaymentStatus(String(bookingId), "paid");
                                  }}
                                />
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
                <View
                  style={styles.panel}
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    setBookingPanelHeight(h);
                  }}
                >
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
                      { key: 'CLASSIC', label: 'Regular' },
                      { key: 'GROUP', label: 'Group' },
                      { key: 'SOLO', label: 'Special' },
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
                    <Text style={{ fontSize: 10,marginTop: 6, color: '#444' }}>
                      Group ride — specify how many passengers (including you).
                    </Text>
                  )}

                  {/* Group Party Size Stepper */}
                  {bookingType === 'GROUP' && (
                    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: '600' }}>Passengers (2-6)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => setPartySize((p) => Math.max(2, p - 1))}
                          style={{ paddingHorizontal: 10, backgroundColor: '#eeeeee00', borderRadius: 8, marginRight: 10}}
                        >
                          <Text style={{ fontSize: 18 }}>–</Text>
                        </TouchableOpacity>
                        <Text style={{ minWidth: 28, textAlign: 'center', fontWeight: '700' }}>{partySize}</Text>
                        <TouchableOpacity
                          onPress={() => setPartySize((p) => Math.min(6, p + 1))}
                          style={{ paddingHorizontal: 10, backgroundColor: '#eeeeee00', borderRadius: 8, marginLeft: 10, alignContent:"center" }}
                        >
                          <Text style={{ fontSize: 18 }}>＋</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <ScrollView
                    style={styles.inputsContainer}
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true} 
                  >
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
                            resetFareBreakdown();
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
                    <TextInput
                      style={styles.input}
                      placeholder="Notes sa driver"
                      placeholderTextColor="#A0A0A0"
                      value={notes}
                      onChangeText={setNotes}
                    />
                  </ScrollView>

                  <View style={styles.fareContainer}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.totalFare}>Fare Breakdown</Text>

                        {/* ℹ️ info icon */}
                        <TouchableOpacity onPress={() => setShowFareInfo(true)}>
                          <Ionicons name="information-circle-outline" size={18} color="#111" />
                        </TouchableOpacity>
                      </View>

                      <Text style={{fontSize:12}}>Distance: {distanceKmText}</Text>
                      {bookingType === "GROUP" && (
                        <Text style={{fontSize:12}}>Passenger Count: {passengerCount}</Text>
                      )}
                      <Text style={{fontSize:12}}>Base Fare: ₱{baseFare.toFixed(2)}</Text>
                      <Text style={{fontSize:12}}>
                        Additional Fare: ₱{additionalFare.toFixed(2)}
                      </Text>

                      {discountApplied > 0 && (
                        <Text style={{fontSize:12, color: "#0a7f35"}}>
                          Discount ({discountApplied}%): -₱{discountAmount.toFixed(2)}
                        </Text>
                      )}

                      <Text style={{ marginTop: 4, fontWeight: "bold", fontSize: 15 }}>
                        Total Fare: ₱{totalFare.toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.bookingActionColumn}>
                      <TouchableOpacity
                        style={styles.paymentSelectButton}
                        onPress={() => setShowPaymentOptions(true)}
                      >
                        <Text style={styles.paymentSelectLabel}>Payment Method</Text>
                        <Text style={styles.paymentSelectValue}>{paymentMethod || "Cash"}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.bookButton,
                          ((bookingType === "GROUP" && (partySize < 2 || partySize > 6)) ||
                            !destination ||
                            routeLoading) && { opacity: 0.4 },
                        ]}
                        disabled={
                          (bookingType === "GROUP" && (partySize < 2 || partySize > 6)) ||
                          !destination ||
                          routeLoading
                        }
                        onPress={handleBookNow}
                      >
                        <Text style={styles.bookButtonText}>
                          {routeLoading ? "LOADING..." : "BOOK NOW"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* <TouchableOpacity
                onPress={async () => {
                  const perms = await Notifications.getPermissionsAsync();
                  console.log("🔎 PERMS:", perms);

                  await Notifications.scheduleNotificationAsync({
                    content: {
                      title: "Local test 📣",
                      body: "If you see this, system notifications are working.",
                    },
                    trigger: null, // fire immediately
                  });
                }}
                style={{
                  position: "absolute",
                  bottom: 140,
                  left: 20,
                  right: 20,
                  backgroundColor: "#111",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
                  TEST LOCAL NOTIFICATION
                </Text>
              </TouchableOpacity> */}

              {!showBookingForm && !hasActiveBooking && !searching && !bookingConfirmed && !matchedDriver && (
                <TouchableOpacity
                  onPress={handleStartBookingPress}
                  disabled={!destination || !hasActivePickup() || routeLoading}
                  style={[
                    {
                      position: "absolute",
                      bottom: 10,
                      backgroundColor: "#5089A3",
                      padding: 10,
                      borderRadius: 8,
                    },
                    (!destination || !hasActivePickup() || routeLoading) && { opacity: 0.45 },
                  ]}
                >
                  <Text style={{ fontWeight: "bold", fontSize: 16, color: "white" }}>
                    {routeLoading ? "LOADING ROUTE..." : "START BOOKING"}
                  </Text>
                </TouchableOpacity>
              )}

              <PassengerRatingModal
                visible={showRatingModal}
                notes={notes}
                selectedRating={selectedRating}
                setNotes={setNotes}
                setSelectedRating={setSelectedRating}
                onSubmit={submitDriverRating}
                onClose={async () => {
                  setShowRatingModal(false);
                  await AsyncStorage.removeItem("driverIdToRate");
                }}
              />
            </View>
            <PassengerReportModal
              visible={showReportModal}
              reportType={reportType}
              setReportType={setReportType}
              otherReport={otherReport}
              setOtherReport={setOtherReport}
              onSubmit={submitReport}
              onClose={() => setShowReportModal(false)}
            />
            <Modal
              visible={showPaymentOptions}
              transparent
              animationType="fade"
              onRequestClose={() => setShowPaymentOptions(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowPaymentOptions(false)}>
                <View style={styles.paymentModalBackdrop}>
                  <TouchableWithoutFeedback>
                    <View style={styles.paymentModalCard}>
                      <Text style={styles.paymentModalTitle}>Choose Payment Method</Text>
                      <Text style={styles.paymentModalSubtitle}>
                        Select how you want to pay the driver.
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.paymentCardOption,
                          paymentMethod === "Cash" && styles.paymentCardOptionActive,
                        ]}
                        onPress={() => {
                          setPaymentMethod("Cash");
                          setShowPaymentOptions(false);
                        }}
                      >
                        <View>
                          <Text style={styles.paymentCardTitle}>Cash</Text>
                          <Text style={styles.paymentCardDesc}>Pay directly after the ride.</Text>
                        </View>

                        {paymentMethod === "Cash" && (
                          <Ionicons name="checkmark-circle" size={22} color="#111827" />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.paymentCardOption,
                          paymentMethod === "GCash" && styles.paymentCardOptionActive,
                        ]}
                        onPress={() => {
                          setPaymentMethod("GCash");
                          setShowPaymentOptions(false);
                        }}
                      >
                        <View>
                          <Text style={styles.paymentCardTitle}>GCash</Text>
                          <Text style={styles.paymentCardDesc}>Pay using the driver’s GCash QR.</Text>
                        </View>

                        {paymentMethod === "GCash" && (
                          <Ionicons name="checkmark-circle" size={22} color="#111827" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
  </Modal>
            <Modal
              visible={showFareInfo}
              transparent
              animationType="fade"
              onRequestClose={() => setShowFareInfo(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowFareInfo(false)}>
                <View style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  justifyContent: "center",
                  padding: 20,
                }}>
                  <TouchableWithoutFeedback onPress={() => {}}>
                    <View style={{
                      backgroundColor: "#fff",
                      borderRadius: 12,
                      padding: 16,
                    }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontWeight: "800", fontSize: 16 }}>Fare Matrix (Lucena)</Text>
                        <TouchableOpacity onPress={() => setShowFareInfo(false)}>
                          <Ionicons name="close" size={20} color="#111" />
                        </TouchableOpacity>
                      </View>

                      <Text style={{ marginTop: 10, fontWeight: "700" }}>Regular Fare (Per Passenger)</Text>
                      <Text>• ₱20.00 for first 2 km (or within City Proper)</Text>
                      <Text>• +₱5.00 for every succeeding km or fraction</Text>
                      <Text>• 20% discount for Senior Citizens, PWDs, Students</Text>
                      <Text>• Regular fare applies on a per passenger basis</Text>

                      <Text style={{ marginTop: 10, fontWeight: "700" }}>Special / Exclusive Hire (Per Trip)</Text>
                      <Text>• ₱60.00 for first 2 km</Text>
                      <Text>• If only 1 km: ₱30.00</Text>
                      <Text>• +₱10.00 for every succeeding km or fraction</Text>
                      <Text>• 20% discount for Senior Citizens, PWDs, Students</Text>
                      <Text>• Applies per trip (regardless of passenger count)</Text>

                      <Text style={{ marginTop: 10, fontSize: 12, color: "#444", lineHeight: 16 }}>
                        The fare information shown above follows the official Tricycle Fare Matrix 
                        issued by the Tricycle Franchising & Regulatory Office (TFRO) of Lucena City. 
                        This matrix is implemented to ensure fair and standardized fares for both 
                        passengers and drivers.
                      </Text>
                      <Text style={{ marginTop: 10, fontSize: 12, color: "#444" }}>
                        Please note that fare policies may be updated by TFRO in accordance with 
                        new regulations approved by the local government.
                      </Text>
                      <Text style={{ marginTop: 10, fontSize: 12, color: "#444" }}>
                        If a driver charges more than the authorized fare, you may report the 
                        incident using the reporting feature in this app or directly through the 
                        TFRO office for proper investigation and action.
                      </Text>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
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
    inputsContainer: { marginTop: 10, maxHeight: 180, paddingRight: 10 },
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
    totalFare: { fontSize: 12,fontWeight: 'bold' },
    bookButton: { backgroundColor: '#000', borderRadius: 10, padding: 10 },
    bookButtonText: { color: '#FFF', fontWeight: 'bold' },
    showDirectionButton: {
      backgroundColor: "#f8fafc",
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: "#cbd5e1",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 5,
    },

    showDirectionButtonText: {
      color: "#0f172a",
      fontWeight: "800",
      fontSize: 11,
      textAlign: "center",
    },
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

      fabContainer: {
      position: "absolute",
      right: 16,
      alignItems: "center",
      zIndex: 30,
    },

    fabButton: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: "#FFF",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 8,
      borderWidth: 1,
      borderColor: "#ddd",
      elevation: 3,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 2 },
    },
    fabButtonActive: {
      backgroundColor: "#111",
      borderColor: "#111",
    },
    bookingActionColumn: {
      width: 96,
      gap: 8,
    },

    paymentSelectButton: {
      backgroundColor: "#ffffff",
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: "#dbeafe",
      alignItems: "center",
    },

    paymentSelectLabel: {
      fontSize: 7,
      fontWeight: "900",
      color: "#64748b",
      textTransform: "uppercase",
    },

    paymentSelectValue: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "900",
      color: "#111827",
    },

    paymentModalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
      padding: 16,
    },

    paymentModalCard: {
      backgroundColor: "#ffffff",
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: "#e5e7eb",
    },

    paymentModalTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: "#111827",
    },

    paymentModalSubtitle: {
      marginTop: 4,
      marginBottom: 14,
      fontSize: 12,
      fontWeight: "600",
      color: "#6b7280",
    },

    paymentCardOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#e5e7eb",
      backgroundColor: "#f9fafb",
      marginTop: 10,
    },

    paymentCardOptionActive: {
      backgroundColor: "#eff6ff",
      borderColor: "#111827",
    },

    paymentCardTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: "#111827",
    },

    paymentCardDesc: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
      color: "#6b7280",
    },
    driverFoundCard: {
      position: "absolute",
      bottom: -110,
      left: 0,
      right: 0,
      marginHorizontal: 10,
      backgroundColor: "#e7ecf0",
      borderRadius: 18,
      padding: 14,
      elevation: 8,
      zIndex: 9999,
      borderWidth: 1,
      borderColor: "rgba(15, 23, 42, 0.08)",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },

    driverFoundHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    driverFoundPhoto: {
      width: 68,
      height: 68,
      borderRadius: 999,
      backgroundColor: "#cbd5e1",
      borderWidth: 3,
      borderColor: "#ffffff",
    },

    driverFoundPhotoFallback: {
      width: 68,
      height: 68,
      borderRadius: 999,
      backgroundColor: "#f8fafc",
      borderWidth: 3,
      borderColor: "#ffffff",
      alignItems: "center",
      justifyContent: "center",
    },

    driverFoundTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },

    driverFoundTitle: {
      fontSize: 12,
      fontWeight: "900",
      color: "#2563eb",
      textTransform: "uppercase",
      letterSpacing: 0.7,
    },

    driverFoundPill: {
      backgroundColor: "#dcfce7",
      borderWidth: 1,
      borderColor: "#86efac",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },

    driverFoundPillText: {
      fontSize: 10,
      fontWeight: "900",
      color: "#166534",
    },

    driverFoundName: {
      marginTop: 3,
      fontSize: 18,
      fontWeight: "900",
      color: "#0f172a",
    },

    driverFoundMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 5,
    },

    driverFoundMeta: {
      fontSize: 11,
      fontWeight: "700",
      color: "#475569",
      backgroundColor: "rgba(255,255,255,0.7)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },

    driverProgressBox: {
      marginTop: 12,
      backgroundColor: "rgba(255,255,255,0.72)",
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: "rgba(148, 163, 184, 0.28)",
    },

    driverProgressTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },

    driverProgressLabel: {
      fontSize: 12,
      fontWeight: "900",
      color: "#0f172a",
    },

    driverProgressDistance: {
      fontSize: 12,
      fontWeight: "800",
      color: "#2563eb",
    },

    driverProgressTrack: {
      height: 9,
      borderRadius: 999,
      backgroundColor: "#cbd5e1",
      overflow: "hidden",
    },

    driverProgressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: "#111827",
    },

    driverProgressHint: {
      marginTop: 6,
      fontSize: 11,
      fontWeight: "700",
      color: "#64748b",
    },
    driverActionGrid: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },

    driverActionButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 12,
      backgroundColor: "#f8fafc",
      borderWidth: 1,
      borderColor: "#e5e7eb",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },

    driverActionButtonText: {
      fontSize: 12,
      fontWeight: "900",
      color: "#374151",
    },

    driverActionButtonDanger: {
      backgroundColor: "#fef2f2",
      borderColor: "#fecaca",
    },

    driverActionButtonDangerText: {
      color: "#7f1d1d",
    },

    driverActionButtonSuccess: {
      backgroundColor: "#ecfdf5",
      borderColor: "#bbf7d0",
    },

    driverActionButtonSuccessText: {
      color: "#166534",
    },

    driverActionButtonDisabled: {
      opacity: 0.9,
    },

    gcashMiniCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.72)",
      borderWidth: 1,
      borderColor: "rgba(148, 163, 184, 0.28)",
    },

    gcashMiniHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
    },

    gcashMiniTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: "#0f172a",
    },

    gcashMiniSubtitle: {
      marginTop: 2,
      fontSize: 9,
      fontWeight: "700",
      color: "#64748b",
    },

    paymentStatusPill: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: "#fff7ed",
      borderWidth: 1,
      borderColor: "#fed7aa",
    },

    paymentStatusText: {
      fontSize: 10,
      fontWeight: "900",
      color: "#c2410c",
      textTransform: "uppercase",
    },

    paymentStatusPillPaid: {
      backgroundColor: "#ecfdf5",
      borderColor: "#bbf7d0",
    },

    paymentStatusTextPaid: {
      color: "#166534",
    },

    gcashNumberRow: {
      marginTop: 10,
      padding: 10,
      borderRadius: 12,
      backgroundColor: "#f8fafc",
      borderWidth: 1,
      borderColor: "#e5e7eb",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    gcashNumberLabel: {
      fontSize: 10,
      fontWeight: "900",
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },

    gcashNumberText: {
      marginTop: 2,
      fontSize: 14,
      fontWeight: "900",
      color: "#111827",
    },

    gcashCopyHint: {
      marginTop: 1,
      fontSize: 11,
      fontWeight: "700",
      color: "#64748b",
    },

    gcashActionRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },

    floatingDirectionText: {
      color: "#0f172a",
      fontWeight: "900",
      fontSize: 11,
    },
  });
