import { Stack } from "expo-router";
import { LocationProvider } from "./location/GlobalLocation";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { AuthProvider } from "./utils/authContext";
import { politeWake } from "./utils/wakeup";

function useForegroundWake() {
  const stateRef = useRef(AppState.currentState);
  useEffect(() => {
    let mounted = true;

    const fire = async () => {
      if (!mounted) return;
      // Fire & forget: don't block UI
      politeWake().catch(() => {});
    };

    // initial attempt on mount (optional: gate with __DEV__ if you want)
    fire();

    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = stateRef.current;
      stateRef.current = nextState;
      if (prev?.match(/inactive|background/) && nextState === "active") {
        fire();  // wake when app comes to foreground
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
}

export default function RootLayout() {
  useForegroundWake();

  return (
    <LocationProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </LocationProvider>
  );
}
