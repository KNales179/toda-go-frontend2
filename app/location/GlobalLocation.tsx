import React, { createContext, useState, useEffect, useContext } from "react";
import * as Location from "expo-location";

// 1. Create Context
const LocationContext = createContext<{
  location: { latitude: number; longitude: number } | null;
  loading: boolean;
}>({
  location: null,
  loading: true,
});

// 2. Provider Component
export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Permission to access location was denied");
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (error) {
        console.error("Error getting location:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <LocationContext.Provider value={{ location, loading }}>
      {children}
    </LocationContext.Provider>
  );
};

// 3. Custom Hook
export const useLocation = () => useContext(LocationContext);
