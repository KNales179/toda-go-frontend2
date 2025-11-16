// location/GlobalLocation.tsx
import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import * as Location from "expo-location";
import { AppState, AppStateStatus, Platform } from "react-native";

type Loc = { latitude: number; longitude: number; accuracy?: number };

type Ctx = {
  location: Loc | null;
  loading: boolean;
  error: string | null;
  permission: Location.PermissionStatus | null;
  servicesEnabled: boolean | null;
};

const LocationContext = createContext<Ctx>({
  location: null,
  loading: true,
  error: null,
  permission: null,
  servicesEnabled: null,
});

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useState<Loc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [servicesEnabled, setServicesEnabled] = useState<boolean | null>(null);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const stopWatch = () => {
    try { watchRef.current?.remove(); } catch {}
    watchRef.current = null;
  };

  const startWatch = async () => {
    try {
      // check services + permission
      const services = await Location.hasServicesEnabledAsync();
      setServicesEnabled(services);
      const perm = await Location.getForegroundPermissionsAsync();
      setPermission(perm.status);

      if (!services || perm.status !== "granted") {
        setError(!services ? "Location services are off." : "Location permission not granted.");
        return;
      }

      // initial one-shot (fast first value)
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
        accuracy: initial.coords.accuracy ?? undefined,
      });
      setError(null);

      // continuous updates
      stopWatch();
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 3000,     // ~3s
          distanceInterval: 3,    // ~3m
          mayShowUserSettingsDialog: true,
        },
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? undefined,
          });
        }
      );
    } catch (e: any) {
      setError(e?.message || "Failed to start location watcher.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // request first, then start watch
    (async () => {
      try {
        const req = await Location.requestForegroundPermissionsAsync();
        setPermission(req.status);
      } catch {}
      startWatch();
    })();

    return () => stopWatch();
  }, []);

  // restart watch on foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appStateRef.current = next;
      if (next === "active") {
        // re-check services/permission and ensure watcher is alive
        startWatch();
      } else if (next === "background") {
        // optional: stop to save power (keep if you don’t use background tracking)
        if (Platform.OS === "ios") stopWatch();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <LocationContext.Provider
      value={{ location, loading, error, permission, servicesEnabled }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
