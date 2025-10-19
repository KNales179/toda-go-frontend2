import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "toda.auth";

export type SavedAuth = {
  role: "driver" | "passenger";
  userId: string;
  token?: string;
};

export async function saveAuth(auth: SavedAuth) {
  debugger; // AUTH:A0
  await AsyncStorage.setItem(KEY, JSON.stringify(auth));
}

export async function getAuth(): Promise<SavedAuth | null> {
  debugger; // AUTH:A1
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedAuth;
    debugger; // AUTH:A2
    return parsed;
  } catch (e: any) {
    console.warn("AUTH:A3:getAuth:parse_error", e?.message);
    debugger; // AUTH:A3
    return null;
  }
}

export async function clearAuth() {
  debugger; // AUTH:A4
  await AsyncStorage.removeItem(KEY);
}
