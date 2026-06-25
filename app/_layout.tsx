// app/_layout.tsx
import { Stack } from "expo-router";
import { LocationProvider } from "./location/GlobalLocation";
import { useEffect, useRef } from "react";
import { AppState, Platform, StatusBar, useColorScheme } from "react-native";
import { AuthProvider } from "./utils/authContext";
import { politeWake } from "./utils/wakeup";
import * as NavigationBar from "expo-navigation-bar";

// 🔹 Helper to send logs to your backend in the format your route expects:
//   { source, message, extra }
async function debugLog(message: string, extra?: any) {
  try {
    await fetch("https://api-tg-be.onrender.com/api/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ROOT_LAYOUT",
        message,
        extra,
      }),
    });
  } catch {}
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
        } catch {}
      })();
    };

    fire("mount");

    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = stateRef.current;
      stateRef.current = nextState;

      if (prev?.match(/inactive|background/) && nextState === "active") {
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

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  useEffect(() => {
    const barBg = isDark ? "#0F1417" : "#FFFFFF";

    // ✅ Top status bar icons/text
    StatusBar.setBarStyle(isDark ? "light-content" : "dark-content");

    // ✅ Android status bar background (prevents random transparency)
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(barBg, true);
      StatusBar.setTranslucent(false);
    }

    // ✅ Android bottom navigation bar (back/home/recents)
    if (Platform.OS === "android") {
      (async () => {
        try {
          await NavigationBar.setBackgroundColorAsync(barBg);
          await NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
          await NavigationBar.setBorderColorAsync(barBg);
        } catch (e) {
          debugLog("Failed to set nav bar", String(e));
        }
      })();
    }
  }, [isDark]);

  return (
    <LocationProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </LocationProvider>
  );
}