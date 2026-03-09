import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Alert,
  BackHandler,
  AppState,
  Linking,
  Platform,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";
import { useLocation } from "../location/GlobalLocation";
import { API_BASE_URL, MAPTILER_KEY } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import type { AppStateStatus } from "react-native";
import ChatNotice from "../../components/ChatNotice";
import * as Clipboard from "expo-clipboard";
import * as IntentLauncher from "expo-intent-launcher";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { buildDriverMapHtml } from "./subfile/utils/driverMapHtml";
import DriverStatusBar from "./subfile/components/DriverStatusBar";
import AcceptedPassengersList from "./subfile/components/AcceptedPassengersList";
import PreviewBookingCard from "./subfile/components/PreviewBookingCard";
import IncomingBookingCard from "./subfile/components/IncomingBookingCard";
import WorkflowCard from "./subfile/components/WorkflowCard";
import PaymentCard from "./subfile/components/PaymentCard";
import { Ionicons } from "@expo/vector-icons";

import TaskProgressBar from "./subfile/components/TaskProgressBar";
import PwAppPanel from "./subfile/components/PwAppPanel";
import { useDriverTasks } from "./subfile/hooks/useDriverTasks";
import { usePwApp } from "./subfile/hooks/usePwApp";

const ENABLE_DEBUG = true;
const ALLOWED_TAG_PREFIXES = ["PUSH", "DHOME:acceptBooking", "DHOME:confirmPayment"];

// --- Debug helper ---
const dbg = async (tag: string, extra?: any) => {
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
  } catch (e) {}
};

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
});

const safeJson = async (res: Response, label: string) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error(`${label} → non-JSON`, {
      status: res.status,
      url: res.url,
      body: text.slice(0, 400),
    });
    throw new Error(`${label} returned non-JSON (status ${res.status})`);
  }
};

// ---- Address label helpers (cache + reverse geocode) ----
const addrCacheRef = { current: new Map<string, string>() };

function coordsKey(lat: number, lng: number) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// Builds a short readable label from Expo reverse geocode result
function buildLabel(addr: Location.LocationGeocodedAddress | null) {
  if (!addr) return "Selected location";
  const p = [];
  if (addr.name) p.push(addr.name);
  if (addr.street && !p.includes(addr.street)) p.push(addr.street);
  const city = addr.city || addr.subregion || addr.district || addr.region;
  if (city) p.push(city);
  return p.filter(Boolean).join(", ") || "Selected location";
}

async function getPlaceLabel(lat: number, lng: number) {
  const key = coordsKey(lat, lng);
  const cached = addrCacheRef.current.get(key);
  if (cached) return cached;

  try {
    const res = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    const label = buildLabel(res?.[0] ?? null);
    addrCacheRef.current.set(key, label);
    return label;
  } catch {
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    addrCacheRef.current.set(key, fallback);
    return fallback;
  }
}

async function ensureLocationEnabled(): Promise<boolean> {
  const services = await Location.hasServicesEnabledAsync();
  const perm = await Location.getForegroundPermissionsAsync();

  if (!services || perm.status !== "granted") {
    Alert.alert(
      "Enable Location",
      "We need your location for live tracking. Please enable GPS and grant permission.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "android") {
              IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS);
            } else {
              Linking.openURL("app-settings:");
            }
          },
        },
      ]
    );
    return false;
  }
  return true;
}

// ---- Driver push token helper ----
async function registerDriverPushToken(driverId: string) {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("❌ Driver push permission not granted");
      return;
    }

    const projectId: string | undefined =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId ??
      Constants?.manifest2?.extra?.eas?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const pushToken = tokenResponse.data;
    if (!pushToken) {
      console.log("❌ Failed to get Expo push token for driver");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/driver/push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId, pushToken }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.log("❌ /driver/push-token failed", res.status, txt.slice(0, 200));
    } else {
    }
  } catch (e) {
    console.log("❌ Error registering driver push token:", e);
  }
}

type Phase = "idle" | "toPickup" | "toDropoff";
type LatLng = { lat: number; lng: number };

export default function DHome() {
  const { location } = useLocation();
  const [isOnline, setIsOnline] = useState(false);
  const [mapHtml, setMapHtml] = useState("");
  const mapRef = useRef<WebViewType | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [livePos, setLivePos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [incomingBooking, setIncomingBooking] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [dropoff, setDropOff] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [minimized, setMinimized] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [previewBooking, setPreviewBooking] = useState<any | null>(null);
  const [todas, setTodas] = useState<any[]>([]);
  const [driverLoc, setDriverLoc] = useState<LatLng | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const bookingIdRef = useRef<string | null>(null);
  const [driverPayment, setDriverPayment] = React.useState<{ gcashNumber?: string; gcashQRUrl?: string } | null>(
    null
  );

  // ✅ NEW: tasks + pwApp hooks (auto poll when online)
  const tasks = useDriverTasks(driverId || "", isOnline);
  const pwapp = usePwApp(driverId || "", isOnline);

  const bookingSeats = activeJobs.reduce((sum, job) => sum + (job.partySize || 1), 0);
  const pwActiveSeats = (pwapp.list || []).filter((p) => p.status === "ACTIVE").length;
  const usedSeatsUi = bookingSeats + pwActiveSeats;

  const usedSeats = bookingSeats + pwActiveSeats;
  const totalSeats = capacity;
  const isFull = totalSeats != null && usedSeats >= totalSeats;
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [currentToda, setCurrentToda] = useState<any | null>(null);
  const [inTodaZone, setInTodaZone] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const msgQ = useRef<string[]>([]);
  const hasRegisteredPushRef = useRef(false);
  const [taskPwMinimized, setTaskPwMinimized] = useState(false);
  const [panelMode, setPanelMode] = useState<"none" | "tasks" | "pw">("none");

  const sendToMap = (obj: any) => {
    const s = JSON.stringify(obj);
    if (!mapReady || !mapRef.current) {
      msgQ.current.push(s);
      return;
    }
    mapRef.current.postMessage(s);
  };

  const [jobStateById, setJobStateById] = useState<{
    [id: string]: { phase: Phase; pickedUp: boolean; paymentConfirm: boolean };
  }>({});
  const defaultJobState = { phase: "toPickup" as Phase, pickedUp: false, paymentConfirm: false };

  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  function bookingKey(b: any | null) {
    if (!b) return "";
    return String(b.bookingId || b.id || b._id || "");
  }

  function getJobStateFor(job: any | null) {
    const key = bookingKey(job);
    if (!key) return defaultJobState;
    return jobStateById[key] || defaultJobState;
  }
  const focusedBooking =
    (activeBookingId
      ? activeJobs.find((j) => String(j.id) === String(activeBookingId))
      : null) || null;
  const focusedJobState = focusedBooking ? (jobStateById[bookingKey(focusedBooking)] || defaultJobState) : defaultJobState;
  const showWorkflowCard = !!incomingBooking && !minimized && !focusedJobState.paymentConfirm;
  const isPickedUp = focusedJobState.pickedUp;
  const showPaymentCard = !!focusedBooking && !minimized && focusedJobState.paymentConfirm;
  const showIncomingCard = !!focusedBooking && !dropoff && !confirmed && !minimized && !previewBooking;

  const pickDisplayName = (b: any, passengerProfile?: any) => {
    const acctName = passengerProfile
      ? [passengerProfile.firstName, passengerProfile.middleName, passengerProfile.lastName].filter(Boolean).join(" ")
      : b.passengerName || "Passenger";
    const rider = (b.riderName || "").trim();
    return b.bookedFor && rider ? rider : acctName;
  };

  const pickDisplayPhone = (b: any, passengerProfile?: any) => {
    const rider = (b.riderPhone || "").trim();
    if (b.bookedFor && rider) return rider;
    const p = passengerProfile?.phone || passengerProfile?.contactNumber || passengerProfile?.mobile || "";
    return (p || "").trim();
  };

  useEffect(() => {
    if (mapReady && mapRef.current && msgQ.current.length) {
      msgQ.current.forEach((m) => mapRef.current?.postMessage(m));
      msgQ.current = [];
    }
  }, [mapReady]);

  const status = currentBooking?.status as "accepted" | "pending" | "completed" | "canceled" | undefined;
  const passengerId = currentBooking?.passengerId;

  // ✅ driverId only from AsyncStorage
  useEffect(() => {
    const fetchDriver = async () => {
      const legacyId = await AsyncStorage.getItem("driverId");
      if (!legacyId) {
        Alert.alert("Session expired", "Please log in again.");
        router.replace("/login_and_reg/dlogin");
        return;
      }
      setDriverId(String(legacyId));
    };
    fetchDriver();
  }, []);

  // push token register
  useEffect(() => {
    if (!driverId) return;
    if (hasRegisteredPushRef.current) return;
    hasRegisteredPushRef.current = true;
    registerDriverPushToken(driverId);
  }, [driverId]);

  // ✅ NEW: send pwApp pins to map whenever list changes
  useEffect(() => {
    if (!isOnline) return;
    sendToMap({
      type: "setPwAppMarkers",
      items: (pwapp.list || []).map((p) => ({
        id: p._id,
        lat: p.pickupLat,
        lng: p.pickupLng,
        passengerType: p.passengerType,
        note: p.note || "",
      })),
    });
    
  }, [isOnline, pwapp.list, mapReady]);

  useEffect(() => {
    if (!isOnline) return;

    const ordered = [
      ...tasks.active.map(t => ({...t, status:"ACTIVE"})),
      ...tasks.pending.map(t => ({...t, status:"PENDING"})),
    ];

    const activeTaskId = tasks.active?.[0]?._id || null;

    sendToMap({
      type: "setTaskPlan",
      activeTaskId,
      tasks: ordered.map((t, i) => ({
        id: t._id,
        lat: t.lat,
        lng: t.lng,
        taskType: t.taskType,
        status: t.status,
        label: t.place || "",
      })),
    });
  }, [isOnline, tasks.active, tasks.pending, mapReady]);
  

  const setBookingPaymentStatus = async (bookingId: string, status: "paid" | "failed") => {
    try {
      await fetch(`${API_BASE_URL}/api/booking/${bookingId}/payment-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {}
  };

  const canShowChatNotice = status === "accepted" && !!currentBooking?._id && !!driverId && !!passengerId;

  const validateBooking = (b: any) => {
    const okNum = (n: any) => typeof n === "number" && Number.isFinite(n);
    const okLat = (x: any) => okNum(x) && x >= -90 && x <= 90;
    const okLng = (x: any) => okNum(x) && x >= -180 && x <= 180;
    const issues: string[] = [];
    if (!okLat(b?.pickupLat)) issues.push("pickupLat invalid");
    if (!okLng(b?.pickupLng)) issues.push("pickupLng invalid");
    if (!okLat(b?.destinationLat)) issues.push("destinationLat invalid");
    if (!okLng(b?.destinationLng)) issues.push("destinationLng invalid");
    return { valid: issues.length === 0, issues };
  };

  const haversineMeters = (a: LatLng, b: LatLng) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  useEffect(() => {
    if (!driverLoc && location) {
      const seeded = { lat: location.latitude, lng: location.longitude };
      setDriverLoc(seeded);
      sendToMap({ type: "updateDriver", latitude: seeded.lat, longitude: seeded.lng });
    }
  }, [location, isOnline]);

  useEffect(() => {
    if (!driverLoc && !todas.length) {
      setCurrentToda(null);
      setInTodaZone(false);
      return;
    }
    if (!driverLoc || !todas.length) {
      setCurrentToda(null);
      setInTodaZone(false);
      return;
    }

    let best: any = null;
    let bestDist = Infinity;

    for (const t of todas) {
      const center = { lat: t.latitude, lng: t.longitude };
      const d = haversineMeters(driverLoc, center);

      const r = typeof t.radiusMeters === "number" && t.radiusMeters > 0 ? t.radiusMeters : 100;

      if (d <= r && d < bestDist) {
        best = t;
        bestDist = d;
      }
    }

    if (best) {
      setCurrentToda(best);
      setInTodaZone(true);
    } else {
      setCurrentToda(null);
      setInTodaZone(false);
    }
  }, [driverLoc, todas]);

  const routeAndDraw = async (from: LatLng, to: LatLng) => {
    const url = `${API_BASE_URL}/api/route?start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;

    try {
      const res = await fetch(url);

      if (!res.ok) {
        const txt = await res.text();
        Alert.alert("Routing error", `HTTP ${res.status}`);
        return null;
      }

      const raw = await res.text();
      let geo: any = null;
      try {
        geo = JSON.parse(raw);
      } catch (e) {
        Alert.alert("Routing error", "Route API returned non-JSON");
        return null;
      }

      const feat = geo.features?.[0];

      if (!feat) {
        Alert.alert("Routing error", "No features in GeoJSON (check start/end)");
        return null;
      }

      const coords = (feat.geometry?.coordinates || []).map(([lng, lat]: number[]) => [lat, lng]);
      const { distance = 0, duration = 0 } = feat.properties?.summary || {};
      if (!coords.length) {
        Alert.alert("Routing error", "Route has 0 coordinates");
        return null;
      }

      sendToMap({ type: "drawRoute", coords, summary: { distance, duration } });
      return { distance, duration };
    } catch (e: any) {
      Alert.alert("Routing error", e?.message || "Failed to get route");
      return null;
    }
  };

  // fetch driver capacity once online
  useEffect(() => {
    (async () => {
      try {
        const driverId = await AsyncStorage.getItem("driverId");
        if (!driverId) return;
        const r = await fetch(`${API_BASE_URL}/api/driver/${driverId}`);
        const j = await r.json();
        const cap = j?.driver?.capacity;
        setCapacity(typeof cap === "number" ? cap : null);
      } catch {
        setCapacity(null);
      }
    })();
  }, [isOnline]);

  // on mount
  useEffect(() => {
    ensureLocationEnabled();
  }, []);

  // on resume
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") ensureLocationEnabled();
    });
    return () => sub.remove();
  }, []);

  // on screen focus
  useFocusEffect(
    React.useCallback(() => {
      ensureLocationEnabled();
    }, [])
  );

  useEffect(() => {
    if (!mapReady) return;

    const fetchTodas = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/todas-public`);
        const json = await res.json();
        const list = Array.isArray(json) ? json : [];
        setTodas(list);

        sendToMap({
          type: "setTodaZones",
          items: list.map((t: any) => ({
            id: t.id || t._id,
            name: t.name,
            lat: t.latitude,
            lng: t.longitude,
            radius: typeof t.radiusMeters === "number" ? t.radiusMeters : 100,
          })),
        });
      } catch (e) {
        console.log("[DHOME] failed to load TODAs", e);
      }
    };

    fetchTodas();
  }, [mapReady]);

  // build map html
  useEffect(() => {
    if (!location || mapHtml) return;
    const html = buildDriverMapHtml(location.latitude, location.longitude);
    setMapHtml(html);
  }, [location, mapHtml]);

  // live driver GPS push to map (only when online)
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    const start = async () => {
      const ok = await ensureLocationEnabled();
      if (!ok) return;

      try {
        const p = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const seeded = { lat: p.coords.latitude, lng: p.coords.longitude };
        setDriverLoc(seeded);
        sendToMap({ type: "updateDriver", latitude: seeded.lat, longitude: seeded.lng });
      } catch (e) {
        console.log("[DHOME:GPS] seed error", e);
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;

          if (typeof accuracy === "number" && accuracy > 500) return;

          const loc = { lat: latitude, lng: longitude };
          setDriverLoc(loc);
          sendToMap({ type: "updateDriver", latitude: loc.lat, longitude: loc.lng });
        }
      );
    };

    if (isOnline) start();
    return () => sub?.remove();
  }, [isOnline]);

  // ✅ draw route to ACTIVE task target
  useEffect(() => {
    const run = async () => {
      if (!isOnline) return;
      if (!driverLoc) return;

      const activeTask = tasks.active?.[0] || null;
      if (!activeTask) {
        sendToMap({ type: "clearRoute" });
        return;
      }

      const to = { lat: activeTask.lat, lng: activeTask.lng } as LatLng;

      // small jitter guard
      const d = haversineMeters(driverLoc, to);
      if (d < 8) return;

      await routeAndDraw(driverLoc, to);
    };

    run();
  }, [isOnline, driverLoc, tasks.active]);

  const sendHeartbeat = async () => {
    try {
      const driverId = await AsyncStorage.getItem("driverId");
      if (!driverId) return;

      const center = driverLoc
        ? { lat: driverLoc.lat, lng: driverLoc.lng }
        : location
        ? { lat: location.latitude, lng: location.longitude }
        : null;

      if (!center) return;

      await fetch(`${API_BASE_URL}/api/driver-heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          location: { lat: center.lat, lng: center.lng },
          currentTodaId: currentToda ? currentToda.id : null,
          inTodaZone,
        }),
      });
    } catch (e) {
      console.log("❌ heartbeat failed", e);
    }
  };

  const updateDriverStatus = async (newStatus: boolean) => {
    if (!driverId) return;

    const center =
      driverLoc ??
      (location ? { lat: location.latitude, lng: location.longitude } : null);

    try {
      await fetch(`${API_BASE_URL}/api/driver-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          isOnline: newStatus,
          location: center ? { latitude: center.lat, longitude: center.lng } : undefined,
          currentTodaId: currentToda ? currentToda.id : null,
          inTodaZone,
        }),
      });
    } catch (e) {
      console.error("❌ Failed to update driver status:", e);
    }
  };

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      appStateRef.current = nextState;
      const isForeground = nextState === "active";

      if (isOnline && isForeground) {
        if (!heartbeatTimerRef.current) {
          const start = () => {
            sendHeartbeat();
            heartbeatTimerRef.current = setInterval(() => {
              const jitter = 1000 + Math.floor(Math.random() * 1000);
              setTimeout(sendHeartbeat, jitter);
            }, 20000);
          };
          start();
        }
      } else {
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    handleAppState(AppState.currentState);

    return () => {
      sub.remove?.();
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [isOnline, driverLoc]);

  // Poll driver requests
  useEffect(() => {
    if (!driverId) return;
    let interval: any;

    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/driver-requests/${driverId}`);
        const raw = await safeJson(res, "GET /api/driver-requests");
        const data: any[] = Array.isArray(raw) ? raw : [];

        const acceptedOnly = data
          .filter((b: any) => b?.status === "accepted" && String(b?.driverId || "") === String(driverId))
          .map((b: any) => {
            const id = String(b.bookingId || b.id || b._id || "");
            return {
              ...b,
              id, // ✅ normalize
              displayName: b.bookedFor && b.riderName ? b.riderName : b.passengerName || "Passenger",
            };
          })
          .filter((b: any) => !!b.id);

        setActiveJobs((prev) => {
          const prevMap = new Map(prev.map((j: any) => [String(j.id), j]));
          return acceptedOnly.map((b: any) => {
            const key = String(b.id);
            const prevJob = prevMap.get(key);
            return prevJob ? { ...prevJob, ...b } : b;
          });
        });

        let chosen: any = null;

        if (activeBookingId) {
          chosen = acceptedOnly.find((b) => String(b.id) === String(activeBookingId)) || null;
        }

        if (!chosen && acceptedOnly.length > 0) {
          chosen = acceptedOnly[0];
          setActiveBookingId(String(chosen.id));
        }

        if (!chosen) {
          if (activeBookingId || incomingBooking) {
            console.log("❌ Booking disappeared — cleanup");
            if (incomingBooking) {
              Alert.alert("Booking Cancelled", "The passenger has cancelled the booking.");
            }

            mapRef.current?.postMessage(JSON.stringify({ type: "clearRoute" }));
            mapRef.current?.postMessage(
              JSON.stringify({ type: "setPassengerMarkers", pickup: null, destination: null })
            );

            setIncomingBooking(null);
            setConfirmed(false);
            setDropOff(false);
            setPhase("idle");
            setPreviewBooking(null);
            setActiveJobs([]);
            setActiveBookingId(null);
          }
          return;
        }

        const chosenId = bookingKey(chosen);
        bookingIdRef.current = chosenId;
        setJobStateById((prev) => ({
          ...prev,
          [chosenId]: prev[chosenId] || defaultJobState,
        }));
        
      } catch (err) {
        console.error("❌ Failed to fetch booking:", err);
      }
    };

    if (isOnline && !focusedJobState.paymentConfirm) {
      fetchRequests();
      interval = setInterval(fetchRequests, 5000);
    }
    return () => clearInterval(interval);
  }, [isOnline, focusedJobState.paymentConfirm, incomingBooking, driverId, activeBookingId, driverLoc, location]);

  useEffect(() => {
    if (incomingBooking && incomingBooking.status === "accepted") {
      setConfirmed(true);
    }
  }, [incomingBooking]);

  // accept from preview
  const acceptPreview = async () => {
    try {
      if (!previewBooking?.id) return;

      const driverId = await AsyncStorage.getItem("driverId");
      if (!driverId) {
        Alert.alert("Error", "Missing driverId. Please re-login.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/accept-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: previewBooking.id, driverId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || "Failed to accept booking");

      let booking = result.booking as any;
      booking = { ...booking, id: booking.bookingId || booking.id || booking._id };

      const [pickupLabel, destinationLabel] = await Promise.all([
        getPlaceLabel(booking.pickupLat, booking.pickupLng),
        getPlaceLabel(booking.destinationLat, booking.destinationLng),
      ]);

      let passengerProfile: any = null;
      if (booking.passengerId) {
        try {
          const infoRes = await fetch(`${API_BASE_URL}/api/passenger/${booking.passengerId}`);
          if (infoRes.ok) {
            const infoData = await infoRes.json();
            const p = infoData?.passenger;
            if (p) {
              passengerProfile = p;
              const buildName = (x: any) => [x.firstName, x.middleName, x.lastName].filter(Boolean).join(" ");
              booking = { ...booking, passengerName: buildName(p) };
            }
          }
        } catch {}
      }

      booking = {
        ...booking,
        pickupLabel,
        destinationLabel,
        bookingType: booking.bookingType || "CLASSIC",
        partySize: booking.partySize || 1,
      };

      const displayName = pickDisplayName(booking, passengerProfile);
      const displayPhone = pickDisplayPhone(booking, passengerProfile);
      booking = { ...booking, displayName, displayPhone };
      const jobId = String(booking.id);

      setActiveJobs((prev) => (prev.some((j) => String(j.id) === jobId) ? prev : [...prev, booking]));
      setJobStateById((prev) => ({
        ...prev,
        [jobId]: prev[jobId] || { phase: "toPickup", pickedUp: false, paymentConfirm: false },
      }));
      setActiveBookingId(jobId);

      setIncomingBooking(booking);
      bookingIdRef.current = String(booking.id);
      setPreviewBooking(null);

      const check = validateBooking(booking);
      if (!check.valid) Alert.alert("Booking data issue", check.issues.join(", "));

      mapRef.current?.postMessage(
        JSON.stringify({
          type: "setPassengerMarkers",
          pickup: { latitude: booking.pickupLat, longitude: booking.pickupLng },
          destination: { latitude: booking.destinationLat, longitude: booking.destinationLng },
        })
      );
    } catch (error: any) {
      console.error("❌ Error accepting booking (preview):", error);
      Alert.alert("Error", error.message ?? "Failed to accept booking.");
    }
  };

  // acceptBooking from pending card
  const acceptBooking = async () => {
    try {
      const driverId = await AsyncStorage.getItem("driverId");
      if (!driverId || !incomingBooking?.id) {
        Alert.alert("Error", "Missing driverId or booking id.");
        return;
      }

      dbg("DHOME:acceptBooking", { bookingId: incomingBooking?.id, driverId });

      const res = await fetch(`${API_BASE_URL}/api/accept-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: incomingBooking.id, driverId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || "Failed to accept booking");

      let booking = result.booking as any;
      booking = { ...booking, id: booking.bookingId || booking.id || booking._id };

      const [pickupLabel, destinationLabel] = await Promise.all([
        getPlaceLabel(booking.pickupLat, booking.pickupLng),
        getPlaceLabel(booking.destinationLat, booking.destinationLng),
      ]);

      let passengerProfile: any = null;
      if (booking.passengerId) {
        try {
          const infoRes = await fetch(`${API_BASE_URL}/api/passenger/${booking.passengerId}`);
          if (infoRes.ok) {
            const infoData = await infoRes.json();
            const p = infoData?.passenger;
            if (p) {
              passengerProfile = p;
              const buildName = (x: any) => [x.firstName, x.middleName, x.lastName].filter(Boolean).join(" ");
              booking = { ...booking, passengerName: buildName(p) };
            }
          }
        } catch {}
      }

      const displayName = pickDisplayName(booking, passengerProfile);
      const displayPhone = pickDisplayPhone(booking, passengerProfile);
      booking = { ...booking, displayName, displayPhone };

      booking = {
        ...booking,
        pickupLabel,
        destinationLabel,
        bookingType: booking.bookingType || "CLASSIC",
        partySize: booking.partySize || 1,
      };
      const jobId = String(booking.id);

      setIncomingBooking(booking);
      bookingIdRef.current = jobId;
      setActiveBookingId(jobId);

      setActiveJobs((prev) => (prev.some((j) => String(j.id) === jobId) ? prev : [...prev, booking]));

      setJobStateById((prev) => ({
        ...prev,
        [jobId]: prev[jobId] || { phase: "toPickup", pickedUp: false, paymentConfirm: false },
      }));

      const check = validateBooking(booking);
      if (!check.valid) Alert.alert("Booking data issue", check.issues.join(", "));

      mapRef.current?.postMessage(
        JSON.stringify({
          type: "setPassengerMarkers",
          pickup: { latitude: booking.pickupLat, longitude: booking.pickupLng },
          destination: { latitude: booking.destinationLat, longitude: booking.destinationLng },
        })
      );
    } catch (error: any) {
      console.error("❌ Error accepting booking:", error);
      Alert.alert("Error", error.message ?? "Failed to accept booking.");
    }
  };

  // Android back = logout prompt
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Logout", "Are you sure you want to log out?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes",
            onPress: async () => {
              setIsOnline(false);
              updateDriverStatus(false);
              await AsyncStorage.clear();
              router.push("/login_and_reg/dlogin");
            },
          },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [isOnline])
  );

  // reflect focused accepted job markers
  useEffect(() => {
    if (!mapRef.current || !incomingBooking) return;
    mapRef.current.postMessage(
      JSON.stringify({
        type: "setPassengerMarkers",
        pickup: { latitude: incomingBooking.pickupLat, longitude: incomingBooking.pickupLng },
        destination: { latitude: incomingBooking.destinationLat, longitude: incomingBooking.destinationLng },
      })
    );
  }, [incomingBooking]);

  // fetch PoPas & paint markers
  useEffect(() => {
    let timer: any;

    const fetchQueue = async () => {
      try {
        if (!isOnline || isFull) {
          setQueue([]);
          setPreviewBooking(null);
          mapRef.current?.postMessage(JSON.stringify({ type: "setWaitingMarkers", items: [] }));
          return;
        }

        const center = driverLoc
          ? { lat: driverLoc.lat, lng: driverLoc.lng }
          : location
          ? { lat: location.latitude, lng: location.longitude }
          : null;

        if (!center) return;

        const driverId = await AsyncStorage.getItem("driverId");
        const url = `${API_BASE_URL}/api/waiting-bookings?lat=${center.lat}&lng=${center.lng}&radiusKm=5&limit=10${
          driverId ? `&driverId=${driverId}` : ""
        }&ai=1`;

        const r = await fetch(url);
        const text = await r.text();
        let data: any = [];
        try {
          data = JSON.parse(text);
        } catch {
          console.log("❌ [DHOME] waiting-bookings non-JSON:", text.slice(0, 200));
        }

        if (!r.ok || !Array.isArray(data)) {
          setQueue([]);
          setPreviewBooking(null);
          mapRef.current?.postMessage(JSON.stringify({ type: "setWaitingMarkers", items: [] }));
          return;
        }

        const list = data as any[];
        setQueue(list);

        if (previewBooking && !list.some((q: any) => String(q.id) === String(previewBooking.id))) {
          setPreviewBooking(null);
        }

        mapRef.current?.postMessage(
          JSON.stringify({
            type: "setWaitingMarkers",
            items: list.map((q: any) => ({
              id: q.id,
              lat: q.pickup.lat,
              lng: q.pickup.lng,
              bookingType: q.bookingType || "CLASSIC",
            })),
          })
        );
      } catch (e) {
        console.log("❌ [DHOME] queue fetch error", e);
        setQueue([]);
        setPreviewBooking(null);
        mapRef.current?.postMessage(JSON.stringify({ type: "setWaitingMarkers", items: [] }));
      }
    };

    fetchQueue();
    timer = setInterval(fetchQueue, 3000);
    return () => clearInterval(timer);
  }, [isOnline, driverLoc, location, capacity, activeJobs, isFull]);

  useEffect(() => {
    const bookingSeats = activeJobs.reduce((s, j) => s + (j.partySize || 1), 0);
    const pwActive = (pwapp.list || []).filter((p) => p.status === "ACTIVE").length;

    const totalUsedSeats = bookingSeats + pwActive;
    const fullNow = capacity != null && totalUsedSeats >= capacity;

    // ✅ Only force-close preview when capacity is FULL
    if (fullNow) {
      if (previewBooking) setPreviewBooking(null);
    }
  }, [capacity, activeJobs, pwapp.list, previewBooking]);

  useEffect(() => {
    if (!isOnline || isFull) {
      mapRef.current?.postMessage(JSON.stringify({ type: "setWaitingMarkers", items: [] }));
    }
  }, [isOnline, isFull]);

  const handleToggleOnline = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    updateDriverStatus(newStatus);
    if (newStatus && driverLoc && driverId) {
      tasks.replan(driverLoc);
    }
  };

  const handleSelectActiveJob = (job: any) => {
    const id = bookingKey(job);
    if (!id) return;

    // normalize the job object so everywhere uses .id consistently
    const normalized = { ...job, id };

    setActiveBookingId(id);
    setIncomingBooking(normalized);
    setMinimized(false);
    setJobStateById((prev) => ({ ...prev, [id]: prev[id] || defaultJobState }));
  };

  const openChatForBooking = (booking: any | null) => {
    if (!booking || !driverId || !booking.passengerId) return;
    router.push({
      pathname: "/ChatRoom",
      params: {
        bookingId: String(booking.id),
        driverId: driverId,
        passengerId: String(booking.passengerId),
        role: "driver",
      },
    });
  };

  // --- task -> booking resolver (BOOKING tasks only) ---
  function findBookingForTask(t: any) {
    if (!t) return null;
    if (t.sourceType !== "BOOKING") return null;

    // your Task model uses sourceId = bookingId
    const bid = String(t.sourceId || "");
    if (!bid) return null;

    // activeJobs items have .id = booking.bookingId (you set it that way)
    const b = activeJobs.find((j) => String(j.id) === bid) || null;
    return b;
  }

  function applyPickedUpForBookingId(bookingId: string) {
    setJobStateById((prev) => ({
      ...prev,
      [bookingId]: { ...(prev[bookingId] || defaultJobState), pickedUp: true, phase: "toDropoff" },
    }));
  }

  function applyDropoffForBookingId(bookingId: string) {
    setJobStateById((prev) => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || defaultJobState),
        pickedUp: true,
        phase: "toDropoff",
        paymentConfirm: true,
      },
    }));
  }

  const markPickedUp = () => {
    if (!incomingBooking?.id) return;
    const id = String(incomingBooking.id);
    setJobStateById((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || defaultJobState), pickedUp: true, phase: "toDropoff" },
    }));
  };

  const markDropOff = () => {
    if (!incomingBooking?.id) return;
    const id = String(incomingBooking.id);
    setJobStateById((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || defaultJobState), pickedUp: true, phase: "toDropoff", paymentConfirm: true },
    }));
  };

  const handleConfirmPayment = async () => {
    try {
      const idToComplete =
        bookingIdRef.current || incomingBooking?.id || incomingBooking?.bookingId || incomingBooking?._id;

      if (!idToComplete) {
        Alert.alert("❌ Error", "Missing booking id.");
        return;
      }

      dbg("DHOME:confirmPayment", { bookingId: idToComplete });

      const res = await fetch(`${API_BASE_URL}/api/complete-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: idToComplete }),
      });

      if (res.ok) {
        Alert.alert("✅ Payment Confirmed", "Transaction completed!");

        const idStr = String(idToComplete);

        setActiveJobs((prev) => {
          const next = prev.filter((j) => String(j.id) !== idStr);
          setActiveBookingId((old) => (old && String(old) === idStr ? null : old));
          return next;
        });

        setJobStateById((prev) => {
          const copy = { ...prev };
          delete copy[idStr];
          return copy;
        });

        bookingIdRef.current = null;

        mapRef.current?.postMessage(JSON.stringify({ type: "clearRoute" }));
        mapRef.current?.postMessage(JSON.stringify({ type: "setPassengerMarkers", pickup: null, destination: null }));

        setIncomingBooking(() => null);
      } else {
        Alert.alert("❌ Error", "Failed to mark booking as complete.");
      }
    } catch (error) {
      console.error("❌ Error confirming payment:", error);
      Alert.alert("❌ Error", "Something went wrong.");
    }
  };

  const showCapOverlay = isOnline;
  const showTodaPill = isOnline && currentToda && inTodaZone;

  const showGcashQR =
    focusedJobState.paymentConfirm &&
    focusedBooking?.paymentMethod?.toLowerCase() === "gcash" &&
    focusedBooking?.driverPayment?.qrUrl;

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: 30 }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="black" />
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
          onLoadEnd={() => setMapReady(true)}
          onMessage={(e) => {
            try {
              const msg = JSON.parse(e.nativeEvent.data);

              if (msg?.type === "waitingMarkerTapped") {
                if (isFull) {
                  Alert.alert("Capacity full", "You’ve reached your passenger limit.");
                  return;
                }
                const q = queue.find((x) => String(x.id) === String(msg.bookingId));
                if (q) {
                  (async () => {
                    const pickupLabel = await getPlaceLabel(q.pickup.lat, q.pickup.lng);
                    const destinationLabel = await getPlaceLabel(q.destination.lat, q.destination.lng);

                    setPreviewBooking({
                      id: q.id,
                      pickupLat: q.pickup.lat,
                      pickupLng: q.pickup.lng,
                      destinationLat: q.destination.lat,
                      destinationLng: q.destination.lng,
                      pickupLabel,
                      destinationLabel,
                      fare: q.fare,

                      bookedFor: !!q.passengerPreview?.bookedFor,
                      riderName: q.passengerPreview?.bookedFor ? q.passengerPreview?.name || "Rider" : "",
                      riderPhone: "",

                      passengerName: q.passengerPreview?.name || "Passenger",
                      displayName:
                        q.passengerPreview?.bookedFor && q.passengerPreview?.name
                          ? q.passengerPreview.name
                          : q.passengerPreview?.name || "Passenger",

                      status: "pending",
                      bookingType: q.bookingType,
                      partySize: q.partySize || 1,
                    });
                  })();
                }
                return;
              }
              Alert.alert("Map error", msg.error);
            } catch {}
          }}
        />
      )}

      {showCapOverlay && (
        <View pointerEvents="box-none" style={styles.capOverlay}>
          <View style={[styles.capPill, isFull && styles.capPillFull]}>
            <Text style={styles.capText}>
              {totalSeats != null ? `${usedSeats}/${totalSeats} cap` : `${usedSeats} cap`}
            </Text>
          </View>
        </View>
      )}

      {/* ✅ LEFT FLOATING BUTTONS (Tasks + Roaming Passenger) */}
      {isOnline && (
        <View pointerEvents="box-none" style={styles.leftToolsWrap}>
          {/* TASKS BUTTON */}
          <TouchableOpacity
            style={[styles.leftToolBtn, panelMode === "tasks" ? styles.leftToolBtnActive : null]}
            onPress={() => setPanelMode((m) => (m === "tasks" ? "none" : "tasks"))}
          >
            <Ionicons name="list" size={20} color={panelMode === "tasks" ? "#fff" : "#111827"} />
          </TouchableOpacity>

          {/* + PASSENGER BUTTON */}
          <TouchableOpacity
            style={[styles.leftToolBtn, panelMode === "pw" ? styles.leftToolBtnActive : null]}
            onPress={() => setPanelMode((m) => (m === "pw" ? "none" : "pw"))}
          >
            <Ionicons name="person-add" size={20} color={panelMode === "pw" ? "#fff" : "#111827"} />
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ TASKS PANEL (separate) */}
      {isOnline && panelMode === "tasks" && (
        <View pointerEvents="box-none" style={styles.tasksPanelOverlay}>
          <View pointerEvents="auto" style={styles.panelCard}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>Tasks</Text>
              <TouchableOpacity style={styles.panelCloseBtn} onPress={() => setPanelMode("none")}>
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <TaskProgressBar
              active={tasks.active}
              pending={tasks.pending}
              getPassengerName={(t) => {
                if (t.sourceType !== "BOOKING") return null;
                const bookingId = String(t.sourceId || "");
                if (!bookingId) return null;

                const b = activeJobs.find((j) => String(j.id) === bookingId) || null;
                return b?.displayName || b?.passengerName || null;
              }}
              onComplete={async (taskId) => {
                if (!driverLoc) return;

                const t = tasks.tasks.find((x) => String(x._id) === String(taskId));
                await tasks.completeTask(taskId, driverLoc);

                if (t?.sourceType === "BOOKING") {
                  const bookingId = String(t.sourceId || "");
                  if (!bookingId) return;

                  // focus booking immediately
                  const b = activeJobs.find((j) => String(j.id) === bookingId) || null;
                  if (b) {
                    const normalized = { ...b, id: bookingId };
                    setIncomingBooking(normalized);
                    setActiveBookingId(bookingId);
                    setMinimized(false);
                  }

                  if (t.taskType === "PICKUP") {
                    setJobStateById((prev) => ({
                      ...prev,
                      [bookingId]: {
                        ...(prev[bookingId] || defaultJobState),
                        pickedUp: true,
                        phase: "toDropoff",
                      },
                    }));
                  }

                  if (t.taskType === "DROPOFF") {
                    setJobStateById((prev) => ({
                      ...prev,
                      [bookingId]: {
                        ...(prev[bookingId] || defaultJobState),
                        pickedUp: true,
                        phase: "toDropoff",
                        paymentConfirm: true,
                      },
                    }));
                  }
                }
              }}
            />
          </View>
        </View>
      )}

      {/* ✅ ROAMING PASSENGER PANEL (separate) */}
      {isOnline && panelMode === "pw" && (
        <View pointerEvents="box-none" style={styles.pwPanelOverlay}>
          <View pointerEvents="auto" style={styles.panelCard}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>Roaming Passenger</Text>
              <TouchableOpacity style={styles.panelCloseBtn} onPress={() => setPanelMode("none")}>
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <PwAppPanel
              list={pwapp.list}
              onAdd={pwapp.addPassenger}
              onDropoff={pwapp.dropoff}
              onQuote={pwapp.quoteDropoff}
              onCancel={pwapp.cancelPassenger}
            />
          </View>
        </View>
      )}

      {showTodaPill && (
        <View pointerEvents="box-none" style={[styles.capOverlay, { top: 80 }]}>
          <View style={[styles.capPill, { backgroundColor: "#1e88e5" }]}>
            <Text style={styles.capText}>Inside TODA: {currentToda?.name || "Unknown TODA"}</Text>
          </View>
        </View>
      )}


      <PreviewBookingCard previewBooking={previewBooking} onAccept={acceptPreview} onClose={() => setPreviewBooking(null)} />

      {showIncomingCard && (
        <IncomingBookingCard
          incomingBooking={incomingBooking}
          onAccept={acceptBooking}
          onBack={() => {
            setIncomingBooking(null);
            setMinimized(false);
          }}
        />
      )}
      {minimized && (
        <TouchableOpacity style={styles.minimizedButton} onPress={() => setMinimized(false)}>
          <Text>🔍 View Booking Info</Text>
        </TouchableOpacity>
      )}

      {showPaymentCard && (
        <View pointerEvents="auto">
          <PaymentCard
            showGcashQR={!!showGcashQR}
            gcashQrUrl={focusedBooking?.driverPayment?.qrUrl}
            onChat={() => openChatForBooking(focusedBooking)}
            onConfirmPayment={handleConfirmPayment}
            onMinimize={() => setMinimized(true)}
          />
        </View>
      )}

      <DriverStatusBar
        isOnline={isOnline}
        hasIncoming={!!incomingBooking}
        capacity={capacity}
        activeJobsCount={activeJobs.length}
        usedSeats={usedSeatsUi}
        onToggleOnline={handleToggleOnline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginBottom: 0 },
  map: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -30,
  },
  capOverlay: {
    position: "absolute",
    top: 50,
    right: 12,
    zIndex: 99,
  },
  capPill: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  capPillFull: { backgroundColor: "#dc3545" },
  capText: { color: "#fff", fontWeight: "600" },
  minimizedButton: {
    position: "absolute",
    bottom: 80,
    left: 20,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "black",
  },

  // ✅ NEW: overlay container for Tasks + pwApp
  taskPwOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 88, // above DriverStatusBar
    zIndex: 120,
    gap: 8,
  },

  taskPwCardWrap: {
    gap: 8,
  },

  taskPwHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 2,
  },

  taskPwHeaderTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  taskPwMinBtn: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  taskPwMinBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
  },

  taskPwMiniRow: {
    alignItems: "center",
  },

  taskPwMiniBtn: {
    backgroundColor: "rgba(17,24,39,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  taskPwMiniText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },

  leftToolsWrap: {
    position: "absolute",
    left: 12,
    top: 120,
    zIndex: 999,
    gap: 10,
  },

  leftToolBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 8,
  },

  leftToolBtnActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  // ✅ PANELS (separate)
  tasksPanelOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 88,
    zIndex: 950,
  },

  pwPanelOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 88,
    zIndex: 950,
  },

  panelCard: {
    gap: 10,
  },

  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 6,
  },

  panelTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  panelCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});