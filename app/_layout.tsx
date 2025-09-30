import { Stack } from "expo-router";
import { LocationProvider } from "./location/GlobalLocation";
import { useEffect } from "react";
import { AppState } from "react-native";
import { API_BASE_URL } from "../config"; 

const BASE = API_BASE_URL.replace(/\/$/, "");
const WAKE_URL = `${BASE}/health`;

function wakeBackend() {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); 
    fetch(WAKE_URL, { method: "GET", signal: controller.signal, cache: "no-store" })
      .catch(() => {})
      .finally(() => clearTimeout(id));

    setTimeout(() => { fetch(`${BASE}/warmup`).catch(() => {}); }, 400);
  } catch {
    // ignore; it's just a warmup
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Wake immediately on app start
    wakeBackend();

    // Wake again whenever app returns to foreground
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") wakeBackend();
    });
    return () => sub.remove();
  }, []);

  return (
    <LocationProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </LocationProvider>
  );
}
