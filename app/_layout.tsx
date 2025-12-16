// app/_layout.tsx
import { Stack } from "expo-router";
import { LocationProvider } from "./location/GlobalLocation";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { AuthProvider } from "./utils/authContext";
import { politeWake } from "./utils/wakeup";

// 🔹 Helper to send logs to your backend in the format your route expects:
//   { source, message, extra }
async function debugLog(message: string, extra?: any) {
  try {
    await fetch("https://toda-go-backend-1.onrender.com/api/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ROOT_LAYOUT",
        message,
        extra,
      }),
    });
  } catch {
    // never crash the app because of logging
  }
}

function useForegroundWake() {
  const stateRef = useRef(AppState.currentState);

  useEffect(() => {
    let mounted = true;

    const fire = (reason: "mount" | "foreground") => {
      (async () => {
        if (!mounted) return;


        try {
          await politeWake();
        } catch (err: any) {
        }
      })();
    };

    // initial attempt on mount
    fire("mount");

    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = stateRef.current;
      stateRef.current = nextState;

      if (prev?.match(/inactive|background/) && nextState === "active") {
        // app came back to foreground
        fire("foreground");
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
