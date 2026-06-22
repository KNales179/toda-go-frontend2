import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import * as Location from "expo-location";
import { AppState, AppStateStatus, Platform } from "react-native";

type Loc = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
};

type Ctx = {
  location: Loc | null;
  loading: boolean;
  error: string | null;
  permission: Location.PermissionStatus | null;
  servicesEnabled: boolean | null;
  refreshLocation: () => Promise<Loc | null>;
};

const LocationContext = createContext<Ctx>({
  location: null,
  loading: true,
  error: null,
  permission: null,
  servicesEnabled: null,
  refreshLocation: async () => null,
});

const MAX_ACCEPTED_ACCURACY_M = 180;
const MAX_JUMP_METERS = 900;
const MIN_UPDATE_DISTANCE_M = 0.5;
const WATCH_TIME_INTERVAL_MS = 1500;
const WATCH_DISTANCE_INTERVAL_M = 1;

function haversineMeters(a: Loc, b: Loc) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

function isValidLocation(loc: Loc | null) {
  if (!loc) return false;

  return (
    Number.isFinite(loc.latitude) &&
    Number.isFinite(loc.longitude) &&
    loc.latitude >= -90 &&
    loc.latitude <= 90 &&
    loc.longitude >= -180 &&
    loc.longitude <= 180
  );
}

function normalizeExpoLocation(pos: Location.LocationObject): Loc {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
    timestamp: pos.timestamp || Date.now(),
  };
}

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useState<Loc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [servicesEnabled, setServicesEnabled] = useState<boolean | null>(null);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const latestLocationRef = useRef<Loc | null>(null);

  const stopWatch = useCallback(() => {
    try {
      watchRef.current?.remove();
    } catch {}

    watchRef.current = null;
    startingRef.current = false;
  }, []);

  const commitLocation = useCallback((next: Loc) => {
    if (!mountedRef.current) return;
    if (!isValidLocation(next)) return;

    const accuracy = Number(next.accuracy ?? 9999);

    // Ignore very bad GPS readings if we already have a better/usable location.
    if (latestLocationRef.current && accuracy > MAX_ACCEPTED_ACCURACY_M) {
      return;
    }

    const prev = latestLocationRef.current;

    if (prev) {
      const moved = haversineMeters(prev, next);

      // Ignore tiny GPS noise.
      if (moved < MIN_UPDATE_DISTANCE_M) {
        return;
      }

      // Ignore impossible jumps caused by bad GPS/network location.
      if (moved > MAX_JUMP_METERS && accuracy > 60) {
        return;
      }
    }

    latestLocationRef.current = next;
    setLocation(next);
    setError(null);
  }, []);

  const checkPermissionAndServices = useCallback(async () => {
    const services = await Location.hasServicesEnabledAsync();
    setServicesEnabled(services);

    let perm = await Location.getForegroundPermissionsAsync();

    if (perm.status !== "granted") {
      perm = await Location.requestForegroundPermissionsAsync();
    }

    setPermission(perm.status);

    if (!services) {
      setError("Location services are off.");
      return false;
    }

    if (perm.status !== "granted") {
      setError("Location permission not granted.");
      return false;
    }

    return true;
  }, []);

  const refreshLocation = useCallback(async (): Promise<Loc | null> => {
    try {
      const ok = await checkPermissionAndServices();

      if (!ok) {
        return latestLocationRef.current;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const next = normalizeExpoLocation(pos);
      commitLocation(next);

      return next;
    } catch (e: any) {
      setError(e?.message || "Failed to refresh location.");
      return latestLocationRef.current;
    }
  }, [checkPermissionAndServices, commitLocation]);

  const startWatch = useCallback(async () => {
    if (startingRef.current) return;
    if (watchRef.current) return;

    startingRef.current = true;
    setLoading(true);

    try {
      const ok = await checkPermissionAndServices();

      if (!ok) {
        stopWatch();
        return;
      }

      // Get one current value before starting watcher.
      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        commitLocation(normalizeExpoLocation(initial));
      } catch {}

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: WATCH_TIME_INTERVAL_MS,
          distanceInterval: WATCH_DISTANCE_INTERVAL_M,
          mayShowUserSettingsDialog: true,
        },
        (pos) => {
          const next = normalizeExpoLocation(pos);
          commitLocation(next);
        }
      );
    } catch (e: any) {
      setError(e?.message || "Failed to start location watcher.");
      stopWatch();
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }

      startingRef.current = false;
    }
  }, [checkPermissionAndServices, commitLocation, stopWatch]);

  useEffect(() => {
    mountedRef.current = true;
    startWatch();

    return () => {
      mountedRef.current = false;
      stopWatch();
    };
  }, [startWatch, stopWatch]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appStateRef.current = next;

      if (next === "active") {
        startWatch();
        refreshLocation();
      }

      if (next === "background") {
        // Android driver side may still need its own online watcher.
        // Global location can stop in background to avoid duplicate watchers.
        if (Platform.OS === "ios") {
          stopWatch();
        }
      }
    });

    return () => sub.remove();
  }, [refreshLocation, startWatch, stopWatch]);

  return (
    <LocationContext.Provider
      value={{
        location,
        loading,
        error,
        permission,
        servicesEnabled,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);