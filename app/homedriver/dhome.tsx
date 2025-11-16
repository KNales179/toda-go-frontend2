  import React, { useEffect, useState, useRef } from 'react';
  import {
    View, Text, Switch, StyleSheet, Dimensions, TouchableOpacity, 
    StatusBar, Alert, BackHandler, AppState, Linking, Platform, Image
  } from 'react-native';
  import { WebView } from "react-native-webview";
  import type { WebView as WebViewType } from "react-native-webview";
  import { useLocation } from '../location/GlobalLocation';
  import { API_BASE_URL, MAPTILER_KEY } from "../../config";
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { useFocusEffect } from "@react-navigation/native";
  import { router } from "expo-router";
  import type { AppStateStatus } from "react-native";
  import ChatNotice from "../../components/ChatNotice";
  import { getAuth } from "../utils/authStorage";
  import * as Clipboard from "expo-clipboard";
  import * as IntentLauncher from "expo-intent-launcher";
  import * as Location from 'expo-location';

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
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
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
                // Open system Location settings
                IntentLauncher.startActivityAsync(
                  IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
                );
              } else {
                // iOS app settings
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


  type LatLng = { lat: number; lng: number };
  type Phase = "idle" | "toPickup" | "toDropoff";

  const { width } = Dimensions.get('window');

  export default function DHome() {
    const { location } = useLocation();
    const [isOnline, setIsOnline] = useState(false);
    const [mapHtml, setMapHtml] = useState("");
    const mapRef = useRef<WebViewType | null>(null);
    const [driverId, setDriverId] = useState<string | null>(null);
    const [livePos, setLivePos] = useState<{latitude:number; longitude:number} | null>(null);
    const [incomingBooking, setIncomingBooking] = useState<any>(null); // focused accepted job
    const [confirmed, setConfirmed] = useState(false);
    const [pickedUp, setPickedUp] = useState(false);
    const [dropoff, setDropOff] = useState(false);
    const [paymentConfirm, setPaymentConfirm] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [queue, setQueue] = useState<any[]>([]);
    const [capacity, setCapacity] = useState<number | null>(null);
    const [activeJobs, setActiveJobs] = useState<any[]>([]);
    const [previewBooking, setPreviewBooking] = useState<any | null>(null);
    const [driverLoc, setDriverLoc] = useState<LatLng | null>(null);
    const [phase, setPhase] = useState<Phase>("idle");
    const heartbeatTimerRef = useRef<number | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const bookingIdRef = useRef<string | null>(null);
    const [driverPayment, setDriverPayment] = React.useState<{gcashNumber?: string; gcashQRUrl?: string} | null>(null);
    const usedSeats = activeJobs.reduce((sum, job) => sum + (job.partySize || 1), 0);
    const totalSeats = capacity
    const isFull = totalSeats != null && usedSeats >= totalSeats;
    const [currentBooking, setCurrentBooking] = useState<any>(null);
    const [mapReady, setMapReady] = useState(false);
    const msgQ = useRef<string[]>([]);
    const sendToMap = (obj: any) => {
      const s = JSON.stringify(obj);
      if (!mapReady || !mapRef.current) { msgQ.current.push(s); return; }
      mapRef.current.postMessage(s);
    };

    const pickDisplayName = (b: any, passengerProfile?: any) => {
  const acctName =
    passengerProfile
      ? [passengerProfile.firstName, passengerProfile.middleName, passengerProfile.lastName]
          .filter(Boolean)
          .join(" ")
      : (b.passengerName || "Passenger");

  const rider = (b.riderName || "").trim();
    return b.bookedFor && rider ? rider : acctName;
  };

  const pickDisplayPhone = (b: any, passengerProfile?: any) => {
    const rider = (b.riderPhone || "").trim();
    if (b.bookedFor && rider) return rider;
    const p =
      passengerProfile?.phone ||
      passengerProfile?.contactNumber ||
      passengerProfile?.mobile ||
      "";
    return (p || "").trim();
  };

    useEffect(() => {
      if (mapReady && mapRef.current && msgQ.current.length) {
        msgQ.current.forEach(m => mapRef.current?.postMessage(m));
        msgQ.current = [];
      }
    }, [mapReady]);
    const status = currentBooking?.status as
      | 'accepted'
      | 'pending'
      | 'completed'
      | 'canceled'
      | undefined;
    const passengerId = currentBooking?.passengerId;
    // ✅ Fetch unified/legacy driverId once
    useEffect(() => {
      const fetchDriver = async () => {
        const auth = await getAuth();
        const legacyId = await AsyncStorage.getItem("driverId");
        const resolved = (auth?.role === "driver" ? auth.userId : null) || legacyId;

        if (!resolved) {
          Alert.alert("Session expired", "Please log in again.");
          router.replace("/login_and_reg/dlogin");
          return;
        }
        setDriverId(String(resolved)); // ✅ fix: store in state
      };
      fetchDriver();
    }, []);

    const setBookingPaymentStatus = async (bookingId: string, status: "paid"|"failed") => {
      try {
        await fetch(`${API_BASE_URL}/api/booking/${bookingId}/payment-status`, {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ status }),
        });
      } catch {}
    };



    const canShowChatNotice =
      status === 'accepted' && !!currentBooking?._id && !!driverId && !!passengerId;

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
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };

    useEffect(() => {
      if (!driverLoc && location) {
        const seeded = { lat: location.latitude, lng: location.longitude };
        setDriverLoc(seeded);
        // keep map in sync too
        sendToMap({ type: "updateDriver", latitude: seeded.lat, longitude: seeded.lng });
      }
    }, [location, isOnline]); // seed when user goes online or context updates


    const routeAndDraw = async (from: LatLng, to: LatLng) => {
      const url = `${API_BASE_URL}/api/route?start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;

      try {
        const res = await fetch(url);

        if (!res.ok) {
          const txt = await res.text();
          Alert.alert("Routing error", `HTTP ${res.status}`);
          return null;
        }

        // guard: non-JSON handler
        const raw = await res.text();
        let geo: any = null;
        try { geo = JSON.parse(raw); }
        catch (e) {
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

        sendToMap({
          type: "drawRoute",
          coords,
          summary: { distance, duration },
        });
        return { distance, duration };
      } catch (e:any) {
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
    useEffect(() => { ensureLocationEnabled(); }, []);

    // on resume
    useEffect(() => {
      const sub = AppState.addEventListener("change", (s) => {
        if (s === "active") ensureLocationEnabled();
      });
      return () => sub.remove();
    }, []);

    // optional: on screen focus (needs react-navigation)
    useFocusEffect(React.useCallback(() => {
      ensureLocationEnabled();
    }, []));


    // build map html
    useEffect(() => {
      if (!location || mapHtml) return;

      const html = String.raw`
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
              let driverMarker = null;
              let routeLine = null;
              let midTooltipMarker = null;
              let waitingLayer = null;
              let driverTweenHandle = null;
              let tweenHandle = null;

              let __dbgDiv = null;
              function __ensureDbg(){
                if (__dbgDiv) return __dbgDiv;
                __dbgDiv = document.createElement('div');
                __dbgDiv.style.cssText = 'position:absolute;right:6px;top:6px;background:rgba(0,0,0,.7);color:#0f0;font:12px monospace;padding:6px 8px;border-radius:6px;max-width:50vw;max-height:35vh;overflow:auto;z-index:99999;white-space:pre-wrap';
                __dbgDiv.innerText = 'map: ready';
                document.body.appendChild(__dbgDiv);
                return __dbgDiv;
              }
              function __dbg(msg){
                const d = __ensureDbg();
                const now = new Date();
                const hh = now.getHours().toString().padStart(2,'0');
                const mm = now.getMinutes().toString().padStart(2,'0');
                const ss = now.getSeconds().toString().padStart(2,'0');
                d.innerText = '[' + hh + ':' + mm + ':' + ss + '] ' + msg + '\n' + d.innerText.slice(0, 2000);
              }

              window.onerror = function(msg, src, line, col, err) {
                __dbg('ERR ' + msg + ' @' + line + ':' + col);
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ error: String(msg) }));
                } catch {}
              };





              
              function tweenDriverTo(lat, lng, durationMs = 300) {
                if (!driverMarker) {
                  // place first if needed (no reframe)
                  setDriver(lat, lng);
                  return;
                }
                if (driverTweenHandle) cancelAnimationFrame(driverTweenHandle);

                const start = driverMarker.getLatLng();
                const end = L.latLng(lat, lng);
                const t0 = performance.now();

                const step = (t) => {
                  const p = Math.min(1, (t - t0) / durationMs);
                  const latI = start.lat + (end.lat - start.lat) * p;
                  const lngI = start.lng + (end.lng - start.lng) * p;
                  driverMarker.setLatLng([latI, lngI]);
                  if (p < 1) driverTweenHandle = requestAnimationFrame(step);
                };
                driverTweenHandle = requestAnimationFrame(step);
              }

              function tweenDriverTo(lat, lng, durationMs = 300) { 
                if (!driverMarker) { 
                  driverMarker = L.marker([lat, lng]).addTo(map); 
                  return; 
                } 
                if (tweenHandle) cancelAnimationFrame(tweenHandle); 
                const start = driverMarker.getLatLng(); 
                const end = L.latLng(lat, lng); 
                const t0 = performance.now(); 
                const step = (t) => { 
                  const p = Math.min(1, (t - t0) / durationMs); 
                  const latI = start.lat + (end.lat - start.lat) * p; 
                  const lngI = start.lng + (end.lng - start.lng) * p; 
                  driverMarker.setLatLng([latI, lngI]); 
                  if (p < 1) tweenHandle = requestAnimationFrame(step); 
                }; 
                tweenHandle = requestAnimationFrame(step); 
              }


              function formatDuration(sec){
                if (sec < 60) return Math.round(sec) + "s";
                const m = Math.round(sec / 60);
                if (m >= 60) return Math.floor(m/60) + "h " + (m%60) + "m";
                return m + "m";
              }

              const map = L.map('map', {
                zoomControl: true,
                maxBounds: [[13.96, 121.643], [13.88,121.588]],
                maxBoundsViscosity: 0.5,
                minZoom: 13,
                maxZoom: 18,
                noWrap: true 
              }).setView([${location.latitude}, ${location.longitude}], 15)
                .fitBounds([[13.96, 121.643], [13.88,121.588]]);

              L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=7yQg8w68otDEssrPk9wU', {
                maxZoom: 19,
                attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors | © <a href="https://www.maptiler.com/">MapTiler</a>'
              }).addTo(map);

              driverMarker = L.marker([${location.latitude}, ${location.longitude}]).addTo(map);

              document.addEventListener('message', function(event) {
                const msg = JSON.parse(event.data);

                if (msg.type === 'debug') { __dbg(String(msg.text || '')); return; }

                if (msg.type === 'setPassengerMarkers') {
                  if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
                  if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null; }

                  if (msg.pickup) {
                    pickupMarker = L.marker([msg.pickup.latitude, msg.pickup.longitude], {
                      icon: L.icon({
                        iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/yellow-dot.png',
                        iconSize: [30, 30],
                      })
                    }).addTo(map);
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

                if (msg.type === 'updateDriver') {
                  const lat = Number(msg.latitude), lng = Number(msg.longitude);

                  // reject obviously-bad points
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                  // optional: ignore tiny jitters
                  if (driverMarker) {
                    const curr = driverMarker.getLatLng();
                    const dLat = Math.abs(curr.lat - lat);
                    const dLng = Math.abs(curr.lng - lng);
                    if (dLat < 1e-5 && dLng < 1e-5) return; // ~1m-ish
                  }

                  tweenDriverTo(lat, lng, 320);
                  return;
                }



                if (msg.type === 'drawRoute') {
                  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
                  if (midTooltipMarker) { map.removeLayer(midTooltipMarker); midTooltipMarker = null; }

                  routeLine = L.polyline(msg.coords, { weight: 5 }).addTo(map);
                  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

                  const idx = Math.floor(msg.coords.length / 2);
                  const mid = msg.coords[idx] || msg.coords[0];
                  const km = (msg.summary.distance / 1000).toFixed(2);
                  const eta = formatDuration(msg.summary.duration);

                  midTooltipMarker = L.marker(mid, { opacity: 0 })
                    .addTo(map)
                    .bindTooltip(km + " km • " + eta, { permanent: true, direction: "top" })
                    .openTooltip();
                }

                if (msg.type === 'clearRoute') {
                  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
                  if (midTooltipMarker) { map.removeLayer(midTooltipMarker); midTooltipMarker = null; }
                }

                if (msg.type === 'setWaitingMarkers') {
                  if (waitingLayer) { waitingLayer.clearLayers(); map.removeLayer(waitingLayer); }
                  waitingLayer = L.layerGroup().addTo(map);

                  var items = Array.isArray(msg.items) ? msg.items : [];
                  items.forEach(function(it) {
                    var marker = L.marker([it.lat, it.lng], {
                      icon: L.icon({
                        iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/yellow-dot.png',
                        iconSize: [30, 30],
                      })
                    })
                    .addTo(waitingLayer)
                    .bindTooltip('🧍 Passenger #' + it.id, { direction: 'top' });
                    marker.on('click', function() {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'waitingMarkerTapped',
                        bookingId: it.id,
                      }));
                    });
                  });
                }
              });
            </script>
          </body>
        </html>
      `;
      setMapHtml(html);
    }, [location, mapHtml]);

    // live driver GPS push to map (only when not idle)
    useEffect(() => {
      let sub: Location.LocationSubscription | null = null;

      const start = async () => {
        const ok = await ensureLocationEnabled();

        // one-shot seed to avoid "no driverLoc"
        try {
          const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const seeded = { lat: p.coords.latitude, lng: p.coords.longitude };
          setDriverLoc(seeded);
          sendToMap({ type: "updateDriver", latitude: seeded.lat, longitude: seeded.lng });
        } catch (e) {
          console.log("[DHOME:GPS] seed error", e);
        }

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;

            if (typeof accuracy === "number" && accuracy > 500) {
              return;
            }

            const loc = { lat: latitude, lng: longitude };
            setDriverLoc(loc);
            sendToMap({ type: "updateDriver", latitude: loc.lat, longitude: loc.lng });
          }
        );
      };

      if (isOnline) start();
      return () => sub?.remove();
    }, [isOnline]);



    // {canShowChatNotice && (
    //   <ChatNotice
    //     bookingId={currentBooking._id}
    //     role="driver"
    //     onGoToChat={() =>
    //       router.push(`/chat/${bookingId}?driverId=${driverId}&passengerId=${passengerId}&role=passenger`)
    //     }
    //   />
    // )}


    // draw routes depending on phase
    useEffect(() => {
      const run = async () => {
        if (!driverLoc) { return; }
        if (!incomingBooking) { return; }

        const pickup = { lat: incomingBooking.pickupLat, lng: incomingBooking.pickupLng } as LatLng;
        const dropoff = { lat: incomingBooking.destinationLat, lng: incomingBooking.destinationLng } as LatLng;


        if (phase === "toPickup") {
          const d = haversineMeters(driverLoc, pickup);
          if (d < 8) { return; }
          await routeAndDraw(driverLoc, pickup);
        } else if (phase === "toDropoff") {
          await routeAndDraw(driverLoc, dropoff);
        } else {
        }
      };
      run();
    }, [driverLoc, phase, incomingBooking]);


    const sendHeartbeat = async () => {
      try {
        const driverId = await AsyncStorage.getItem("driverId");
        if (!driverId) return;

        // Prefer live GPS (driverLoc); fallback to initial location
        const center = driverLoc
          ? { lat: driverLoc.lat, lng: driverLoc.lng }
          : (location ? { lat: location.latitude, lng: location.longitude } : null);

        if (!center) return;

        await fetch(`${API_BASE_URL}/api/driver-heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverId,
            location: { lat: center.lat, lng: center.lng },
          }),
        });
      } catch (e) {
        console.log("❌ heartbeat failed", e);
      }
    };

    // ✅ safer driver-status (may not return JSON)
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

        // Restart/stop timer based on online + foreground
        if (isOnline && isForeground) {
          if (!heartbeatTimerRef.current) {
            // small jitter to avoid synchronized calls
            const start = () => {
              sendHeartbeat();
              heartbeatTimerRef.current = setInterval(() => {
                // add 1–2s jitter to 20s
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
      // initial kick if already online & active
      handleAppState(AppState.currentState);

      return () => {
        sub.remove?.();
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
      };
    }, [isOnline, driverLoc]); // driverLoc in deps keeps heartbeats sending fresh coords


      // ✅ Poll driver requests safely
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
            .map((b: any) => ({
              ...b,
              displayName: (b.bookedFor && b.riderName) ? b.riderName : (b.passengerName || "Passenger"),
            }));


          const acceptedHead = acceptedOnly[0];
          if (acceptedHead) {
            const same = incomingBooking?.id && String(incomingBooking.id) === String(acceptedHead.id);

            // focus the job
            setIncomingBooking((prev: any) => (same ? prev : acceptedHead));

            // 🔵 ensure phase + markers when we first see it
            if (!same) {
              setPhase("toPickup");
              bookingIdRef.current = String(acceptedHead.bookingId || acceptedHead.id || acceptedHead._id);

              sendToMap({
                type: "setPassengerMarkers",
                pickup: { latitude: acceptedHead.pickupLat, longitude: acceptedHead.pickupLng },
                destination: { latitude: acceptedHead.destinationLat, longitude: acceptedHead.destinationLng },
              });


              const from = driverLoc ?? (location ? { lat: location.latitude, lng: location.longitude } : null);
              if (from) routeAndDraw(from, { lat: acceptedHead.pickupLat, lng: acceptedHead.pickupLng });
            }

            return;
          }


          // cleanup if booking cancelled
          const wasAcceptedByMe =
            incomingBooking?.status === "accepted" &&
            String(incomingBooking?.driverId || "") === String(driverId);

          if (wasAcceptedByMe) {
            console.log("❌ Booking cancelled — cleanup");
            Alert.alert("Booking Cancelled", "The passenger has cancelled the booking.");

            // 🔥 Clear route + markers immediately
            mapRef.current?.postMessage(JSON.stringify({ type: "clearRoute" }));
            mapRef.current?.postMessage(JSON.stringify({
              type: "setPassengerMarkers",
              pickup: null,
              destination: null,
            }));

            // ✅ Reset UI state
            setIncomingBooking(null);
            setConfirmed(false);
            setPickedUp(false);
            setDropOff(false);
            setPaymentConfirm(false);
            setPhase("idle");
            setPreviewBooking(null);
            setActiveJobs(prev => prev.filter(j => String(j.id) !== String(incomingBooking?.id)));
          }

        } catch (err) {
          console.error("❌ Failed to fetch booking:", err);
        }
      };

      if (isOnline && !paymentConfirm) {
        fetchRequests();
        interval = setInterval(fetchRequests, 5000);
      }
      return () => clearInterval(interval);
    }, [isOnline, paymentConfirm, incomingBooking, driverId]);

    // reflect accepted→confirmed
    useEffect(() => {
      if (incomingBooking && incomingBooking.status === "accepted") {
        setConfirmed(true);
      }
    }, [incomingBooking]);

    // accept from preview (PoPas tap)
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
        console.log("[DHOME] booking raw from backend →", result.booking);


        // Add readable labels
        const [pickupLabel, destinationLabel] = await Promise.all([
          getPlaceLabel(booking.pickupLat, booking.pickupLng),
          getPlaceLabel(booking.destinationLat, booking.destinationLng),
        ]);

        // Try to hydrate passenger profile (for fallbacks like phone)
        let passengerProfile: any = null;
        if (booking.passengerId) {
          try {
            const infoRes = await fetch(`${API_BASE_URL}/api/passenger/${booking.passengerId}`);
            if (infoRes.ok) {
              const infoData = await infoRes.json();
              const p = infoData?.passenger;
              if (p) {
                passengerProfile = p;
                const buildName = (x: any) =>
                  [x.firstName, x.middleName, x.lastName].filter(Boolean).join(" ");
                booking = { ...booking, passengerName: buildName(p) };
              }
            }
          } catch {}
        }

        // Enrich with labels and type fallbacks
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

        // Set active + focus
        setActiveJobs((prev) =>
          prev.some((j) => String(j.id) === String(booking.id)) ? prev : [...prev, booking]
        );
        setIncomingBooking(booking);
        bookingIdRef.current = String(booking.id);
        setConfirmed(true);
        setPhase("toPickup");
        setPreviewBooking(null);

        // Basic validation
        const check = validateBooking(booking);
        if (!check.valid) Alert.alert("Booking data issue", check.issues.join(", "));

        // Paint markers
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


    // --- acceptBooking (FULL, updated)
    const acceptBooking = async () => {
      try {
        const driverId = await AsyncStorage.getItem("driverId");
        if (!driverId || !incomingBooking?.id) {
          Alert.alert("Error", "Missing driverId or booking id.");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/accept-booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: incomingBooking.id, driverId }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result?.message || "Failed to accept booking");

        let booking = result.booking as any;
        booking = { ...booking, id: booking.bookingId || booking.id || booking._id };
        console.log("[DHOME] booking raw from backend →", result.booking);

        // Add readable labels
        const [pickupLabel, destinationLabel] = await Promise.all([
          getPlaceLabel(booking.pickupLat, booking.pickupLng),
          getPlaceLabel(booking.destinationLat, booking.destinationLng),
        ]);

        // Try to hydrate passenger profile
        let passengerProfile: any = null;
        if (booking.passengerId) {
          try {
            const infoRes = await fetch(`${API_BASE_URL}/api/passenger/${booking.passengerId}`);
            if (infoRes.ok) {
              const infoData = await infoRes.json();
              const p = infoData?.passenger;
              if (p) {
                passengerProfile = p;
                const buildName = (x: any) =>
                  [x.firstName, x.middleName, x.lastName].filter(Boolean).join(" ");
                booking = { ...booking, passengerName: buildName(p) };
              }
            }
          } catch {}
        }

        // Compute display name/phone (rider if bookedFor=true; else passenger)
        {
          const displayName = pickDisplayName(booking, passengerProfile);
          const displayPhone = pickDisplayPhone(booking, passengerProfile);
          booking = { ...booking, displayName, displayPhone };
          console.log("[DHOME] computed display fields →", { displayName, displayPhone, bookedFor: booking.bookedFor, riderName: booking.riderName });
        }

        // Enrich with labels and type fallbacks
        booking = {
          ...booking,
          pickupLabel,
          destinationLabel,
          bookingType: booking.bookingType || "CLASSIC",
          partySize: booking.partySize || 1,
        };

        // Focus this booking
        setIncomingBooking(booking);
        bookingIdRef.current = String(booking.id);
        setConfirmed(true);
        setPhase("toPickup");

        // Track in accepted list
        setActiveJobs((prev) =>
          prev.some((j) => String(j.id) === String(booking.id)) ? prev : [...prev, booking]
        );

        // Basic validation
        const check = validateBooking(booking);
        if (!check.valid) Alert.alert("Booking data issue", check.issues.join(", "));

        // Paint markers
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
          Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
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
            ]
          );
          return true;
        };
        const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => subscription.remove();
      }, [isOnline])
    );

    // reflect focused accepted job markers
    useEffect(() => {
      if (!mapRef.current || !incomingBooking) return;
      mapRef.current.postMessage(JSON.stringify({
        type: "setPassengerMarkers",
        pickup: { latitude: incomingBooking.pickupLat, longitude: incomingBooking.pickupLng },
        destination: { latitude: incomingBooking.destinationLat, longitude: incomingBooking.destinationLng }
      }));
    }, [incomingBooking]);

    // fetch PoPas & paint markers even while on a job (until capacity is full)
    useEffect(() => {
      let timer: any;

      const fetchQueue = async () => {
        try {
          if (!isOnline) {
            setQueue([]);
            mapRef.current?.postMessage(JSON.stringify({ type: 'setWaitingMarkers', items: [] }));
            return;
          }

          const isFull = capacity !== null && activeJobs.length >= capacity;
          if (isFull) {
            setQueue([]);
            mapRef.current?.postMessage(JSON.stringify({ type: 'setWaitingMarkers', items: [] }));
            return;
          }

          const center = driverLoc
            ? { lat: driverLoc.lat, lng: driverLoc.lng }
            : (location ? { lat: location.latitude, lng: location.longitude } : null);
          if (!center) return;

          const driverId = await AsyncStorage.getItem("driverId");
          const url = `${API_BASE_URL}/api/waiting-bookings?lat=${center.lat}&lng=${center.lng}&radiusKm=5&limit=10${driverId ? `&driverId=${driverId}` : ""}`;

          const r = await fetch(url);
          const text = await r.text();
          let data: any = [];
          try { data = JSON.parse(text); } catch {}

          if (!r.ok || !Array.isArray(data)) {
            // 🔥 Clear markers on ANY error/403 so stale markers disappear
            setQueue([]);
            mapRef.current?.postMessage(JSON.stringify({ type: 'setWaitingMarkers', items: [] }));
            return;
          }

          const list = data;
          setQueue(list);

          if (previewBooking && !list.some((q: any) => String(q.id) === String(previewBooking.id))) {
            setPreviewBooking(null);
          }

          mapRef.current?.postMessage(JSON.stringify({
            type: 'setWaitingMarkers',
            items: list.map((q: any) => ({
              id: q.id,
              lat: q.pickup.lat,
              lng: q.pickup.lng,
            })),
          }));
        } catch (e) {
          console.log("❌ [DHOME] queue fetch error", e);
          // 🔥 also clear on thrown error
          setQueue([]);
          setPreviewBooking(null);
          mapRef.current?.postMessage(JSON.stringify({ type: 'setWaitingMarkers', items: [] }));
        }
      };



      fetchQueue();
      timer = setInterval(fetchQueue, 3000);
      return () => clearInterval(timer);
    }, [isOnline, driverLoc, location, capacity, activeJobs]);

    useEffect(() => {
      const isFull = capacity !== null && activeJobs.length >= capacity;
      if (isFull || incomingBooking) {
        if (previewBooking) {
          setPreviewBooking(null);
        }
      }
    }, [capacity, activeJobs, incomingBooking]);


    // when going offline or becoming full → clear PoPas markers
    useEffect(() => {
      const isFull = capacity !== null && activeJobs.length >= capacity;
      if (!isOnline || isFull) {
        mapRef.current?.postMessage(JSON.stringify({ type: 'setWaitingMarkers', items: [] }));
      }
    }, [isOnline, capacity, activeJobs]);

    return (
      <View style={styles.container}>
        <View style={{ paddingTop: 30 }}>
          <StatusBar barStyle="light-content" translucent backgroundColor="black" />
        </View>

        {mapHtml && (
          <WebView
            ref={(ref) => { if (ref && !mapRef.current) mapRef.current = ref; }}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            javaScriptEnabled
            style={styles.map}
            onLoadEnd={() => setMapReady(true)}
            onMessage={(e) => {
              try {
                const msg = JSON.parse(e.nativeEvent.data);

                if (msg?.type === 'waitingMarkerTapped') {
                  const isFull = capacity !== null && activeJobs.length >= capacity;
                  if (isFull) {
                    Alert.alert("Capacity full", "You’ve reached your passenger limit.");
                    return;
                  }
                  const q = queue.find(x => String(x.id) === String(msg.bookingId));
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
                        riderName: q.passengerPreview?.bookedFor ? (q.passengerPreview?.name || "Rider") : "",
                        riderPhone: "",

                        passengerName: q.passengerPreview?.name || "Passenger",
                        displayName:
                          q.passengerPreview?.bookedFor && q.passengerPreview?.name
                            ? q.passengerPreview.name
                            : (q.passengerPreview?.name || "Passenger"),

                        status: "pending",
                        bookingType: q.bookingType,
                        partySize: q.partySize || 1,
                      });
                    })();
                  }
                  return;
                }
                Alert.alert("Map error", msg.error);
              } catch {
              }
            }}
          />
        )}

        {isOnline && (
          <View pointerEvents="box-none" style={styles.capOverlay}>
            <View style={[styles.capPill, isFull && styles.capPillFull]}>
              <Text style={styles.capText}>
                {totalSeats != null ? `${usedSeats}/${totalSeats} cap` : `${usedSeats} cap`}
              </Text>
            </View>
          </View>
        )}


        {/* Accepted passengers list */}
        {isOnline && activeJobs.length > 0 && (
          <View style={[styles.popup, { backgroundColor: '#eef6ff' }]}>
            <Text style={styles.popupTitle}>
              👥 Accepted Passengers ({activeJobs.length}{capacity !== null ? ` / ${capacity}` : ''})
            </Text>

            {activeJobs.map((job: any) => (
              <TouchableOpacity
                key={job.id}
                style={{ paddingVertical: 8 }}
                onPress={() => {
                  setIncomingBooking(job);
                  setMinimized(false);
                }}
              >
                <Text>
                  #{job.id}{job?.displayName ? ` • ${job.displayName}` : ""}
                  {" • "}
                  {job.pickupLabel || `${Number(job.pickupLat)?.toFixed?.(4) ?? "-"}, ${Number(job.pickupLng)?.toFixed?.(4) ?? "-"}`}
                  {" → "}
                  {job.destinationLabel || `${Number(job.destinationLat)?.toFixed?.(4) ?? "-"}, ${Number(job.destinationLng)?.toFixed?.(4) ?? "-"}`}
                  {job.bookingType ? ` • ${job.bookingType === 'GROUP' ? `Group(${job.partySize || 1})` : job.bookingType === 'SOLO' ? 'Solo(VIP)' : 'Classic'}` : ''}
                </Text>
                {job.bookedFor ? (
                  <Text style={{ color: "#c0392b", fontWeight: "600" }}>👤 For someone else</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {previewBooking && !minimized && (
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>Potential Passenger</Text>

            <Text>From: {previewBooking.pickupLabel || `${Number(previewBooking.pickupLat).toFixed(4)}, ${Number(previewBooking.pickupLng).toFixed(4)}`}</Text>
            <Text>To: {previewBooking.destinationLabel || `${Number(previewBooking.destinationLat).toFixed(4)}, ${Number(previewBooking.destinationLng).toFixed(4)}`}</Text>
            <Text>
              Type: {previewBooking.bookingType
                ? (previewBooking.bookingType === 'GROUP' ? `Group (${previewBooking.partySize || 2})`
                  : previewBooking.bookingType === 'SOLO' ? 'Solo (VIP)' : 'Classic')
                : '—'}
            </Text>
            <Text>Fare: ₱{previewBooking.bookingType === 'GROUP' ? (previewBooking.fare * previewBooking.partySize) : previewBooking.fare}</Text>

            {/* 🔧 Fixed: use previewBooking here */}
            <Text style={{ marginTop: 6 }}>
              Passenger: {previewBooking?.displayName ?? "Passenger"}
            </Text>
            {previewBooking?.bookedFor ? (
              <Text style={{ color: "#c0392b", fontWeight: "600" }}>For someone else</Text>
            ) : null}
            {!!previewBooking?.displayPhone && (
              <Text>Contact: {previewBooking.displayPhone}</Text>
            )}

            <TouchableOpacity style={styles.acceptButton} onPress={acceptPreview}>
              <Text style={{ color: 'white', textAlign: 'center' }}>ACCEPT</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPreviewBooking(null)}>
              <Text style={{ marginTop: 10, padding: 5, backgroundColor: "#81C3E1", color: 'white', borderRadius: 5, textAlign: 'center' }}>
                Back to Map
              </Text>
            </TouchableOpacity>
          </View>
        )}


        {/* (Optional legacy) Pending card if something sets incomingBooking before accept */}
        {incomingBooking && !dropoff && !confirmed && !minimized && !previewBooking && (
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>🚕 Incoming Booking</Text>
            <Text>From: {incomingBooking?.pickupLabel || `${Number(incomingBooking?.pickupLat)?.toFixed?.(4) ?? "-"}, ${Number(incomingBooking?.pickupLng)?.toFixed?.(4) ?? "-"}`}</Text>
            <Text>To: {incomingBooking?.destinationLabel || `${Number(incomingBooking?.destinationLat)?.toFixed?.(4) ?? "-"}, ${Number(incomingBooking?.destinationLng)?.toFixed?.(4) ?? "-"}`}</Text>
            <Text>
              Type: {incomingBooking?.bookingType
                ? (incomingBooking.bookingType === 'GROUP' ? `Group (${incomingBooking.partySize || 1})`
                  : incomingBooking.bookingType === 'SOLO' ? 'Solo (VIP)' : 'Classic')
                : '—'}
            </Text>

            <Text>Fare: ₱{incomingBooking?.fare ?? "-"}</Text>
            <Text>Passenger: {incomingBooking?.displayName ?? "Passenger"}</Text>
            {incomingBooking?.riderName ? (
              <Text style={{ color: "#c0392b", fontWeight: "600" }}>For someone else</Text>
            ) : null}


            <TouchableOpacity style={styles.acceptButton} onPress={acceptBooking}>
              <Text style={{ color: 'white', textAlign: 'center' }}>ACCEPT</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setIncomingBooking(null); setMinimized(false); }}>
              <Text style={{ marginTop: 10, padding: 5, backgroundColor: "#81C3E1", color: 'white', borderRadius: 5, textAlign: 'center' }}>
                Back to Queue
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {minimized && (
          <TouchableOpacity
            style={{ position: "absolute", bottom: 80, left: 20, backgroundColor: "white", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "black"}}
            onPress={() => setMinimized(false)}
          >
            <Text>🔍 View Booking Info</Text>
          </TouchableOpacity>
        )}

        {/* Accepted job workflow */}
        {confirmed && !minimized && !paymentConfirm && (
          <View style={styles.popup}>
            <Text style={{ fontWeight: 'bold', color: '#4caf50' }}>✅ Booking Confirmed!</Text>
            {!pickedUp ? (
              <>
                <Text>🕒 Waiting for pickup...</Text>
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: "/ChatRoom",
                      params: {
                        bookingId: String(incomingBooking.id),
                        driverId: driverId,
                        passengerId: String(incomingBooking.passengerId),
                        role: "driver",
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
                <TouchableOpacity
                  style={{ backgroundColor: '#4caf50', padding: 10, marginTop: 10, borderRadius: 5 }}
                  onPress={() => { setPhase("toDropoff"); setPickedUp(true); }}
                >
                  <Text style={{ color: 'white', textAlign: 'center' }}>🚕 Picked Up</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text>🟢 Passenger picked up! Ready for drop-off.</Text>
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: "/ChatRoom",
                      params: {
                        bookingId: String(incomingBooking.id),
                        driverId: driverId,
                        passengerId: String(incomingBooking.passengerId),
                        role: "driver",
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
                <TouchableOpacity
                  style={{ backgroundColor: '#2196f3', padding: 10, marginTop: 10, borderRadius: 5 }}
                  onPress={() => {
                    setPickedUp(false);
                    setConfirmed(false);
                    setDropOff(true);
                    setPaymentConfirm(true);
                  }}
                >
                  <Text style={{ color: 'white', textAlign: 'center' }}>📦 Drop Off</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setMinimized(true)}>
              <Text style={{ marginTop: 10, padding: 5, backgroundColor: "#81C3E1", color: 'white', borderRadius: 5, textAlign: 'center' }}>
                Minimize
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {paymentConfirm && !minimized && (
          <View style={styles.popup}>
            {paymentConfirm &&
            incomingBooking?.paymentMethod?.toLowerCase() === "gcash" &&
            incomingBooking?.driverPayment?.qrUrl && (
              <View
                style={{
                  flexDirection: "column",
                  alignItems: "center",
                  marginTop: 8,
                  backgroundColor: "#fff",
                  padding: 12,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>
                  GCash Payment
                </Text>

                <View style={{
                  width: 200,
                  height: 200,
                  marginBottom: 12,
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  <Image
                    source={{ uri: incomingBooking.driverPayment.qrUrl }}
                    style={{
                      width: 300,
                      height: 300,
                      marginLeft: -50,
                      backgroundColor: "#eee",
                    }}
                    
                  />
                </View>
              </View>
            )}
            <Text style={{ fontWeight: 'bold', color: '#ff9800' }}>💰 Confirm Payment</Text>
            <Text>Ask the passenger for payment and confirm here.</Text>
            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: "/ChatRoom",
                  params: {
                    bookingId: String(incomingBooking.id),
                    driverId: driverId,
                    passengerId: String(incomingBooking.passengerId),
                    role: "driver",
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
            <TouchableOpacity
              style={{ backgroundColor: '#4caf50', padding: 10, marginTop: 10, borderRadius: 5 }}
              onPress={async () => {
                try {
                  const idToComplete =
                    bookingIdRef.current ||
                    incomingBooking?.id ||
                    incomingBooking?.bookingId ||
                    incomingBooking?._id;
                  console.log("Completing bookingId:", idToComplete);
                  if (!idToComplete) {
                    Alert.alert("❌ Error", "Missing booking id.");
                    return;
                  }
                  const res = await fetch(`${API_BASE_URL}/api/complete-booking`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bookingId: idToComplete }),
                  });

                  if (res.ok) {
                    Alert.alert("✅ Payment Confirmed", "Transaction completed!");
                    setPhase("idle");
                    setConfirmed(false);
                    setIncomingBooking(null);
                    setPickedUp(false);
                    setDropOff(false);
                    setPaymentConfirm(false);
                    setMinimized(false);
                    setActiveJobs(prev => prev.filter(j => String(j.id) !== String(idToComplete)));
                    bookingIdRef.current = null;

                    mapRef.current?.postMessage(JSON.stringify({ type: "clearRoute" }));
                    mapRef.current?.postMessage(JSON.stringify({
                      type: "setPassengerMarkers",
                      pickup: null,
                      destination: null,
                    }));
                  } else {
                    const idToComplete =
                      bookingIdRef.current ||
                      incomingBooking?.id ||
                      incomingBooking?.bookingId ||
                      incomingBooking?._id;
                    console.log("Completing bookingId:", idToComplete);
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
              <Text style={{ marginTop: 10, padding: 5, backgroundColor: "#81C3E1", color: 'white', borderRadius: 5, textAlign: 'center' }}>
                Minimize
              </Text>
            </TouchableOpacity>
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
          <Text style={styles.statusText}>
            {isOnline
              ? incomingBooking
                ? `📦 Active ride`
                : `You're online.${capacity !== null ? ` Capacity: ${activeJobs.length}/${capacity}` : ""}`
              : "You're offline."}
          </Text>
        </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, marginBottom: 0 },
    map: { position: "absolute", top: 0, left: 0, right: 0, bottom: -30 },
    statusBar: {
      position: 'absolute',
      bottom: 10,
      backgroundColor: '#80C3E1',
      width: width,
      padding: 5,
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusText: { color: 'black', fontSize: 14, fontWeight: '500' },
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
    popupTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
    acceptButton: { backgroundColor: '#4caf50', padding: 10, borderRadius: 5, marginTop: 10 },
    capOverlay: { position: 'absolute', top: 50, right: 12, zIndex: 99 },
    capPill: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    capPillFull: { backgroundColor: '#dc3545' }, // red when full
    capText: { color: '#fff', fontWeight: '600' },

  });
