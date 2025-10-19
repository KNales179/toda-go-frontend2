import { Stack } from "expo-router";
import { LocationProvider } from "./location/GlobalLocation";
import { useEffect } from "react";
import { AppState } from "react-native";
import { API_BASE_URL } from "../config";
import { AuthProvider } from "./utils/authContext";

const BASE = API_BASE_URL.replace(/\/$/, "");
const WAKE_URL = `${BASE}/health`;

function wakeBackend() {
  console.log("AUTH:R0:wakeBackend:called", { WAKE_URL, BASE });
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    fetch(WAKE_URL, { method: "GET", signal: controller.signal, cache: "no-store" })
      .then(() => console.log("AUTH:R0:wakeBackend:health:ok"))
      .catch(() => console.log("AUTH:R0:wakeBackend:health:fail"))
      .finally(() => clearTimeout(id));
    setTimeout(() => { fetch(`${BASE}/warmup`).catch(() => {}); }, 400);
  } catch {}
}

export default function RootLayout() {
  useEffect(() => {
    console.log("AUTH:R1:root:effect:start");
    wakeBackend();
    const sub = AppState.addEventListener("change", (s) => {
      console.log("AUTH:R2:root:appstate", s);
      if (s === "active") wakeBackend();
    });
    return () => { console.log("AUTH:R3:root:effect:cleanup"); sub.remove(); };
  }, []);

  console.log("AUTH:R4:root:render");
  return (
    <LocationProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </LocationProvider>
  );
}
