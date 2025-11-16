import AsyncStorage from "@react-native-async-storage/async-storage";
import { ToastAndroid, Platform } from "react-native";
import { API_BASE_URL } from "../../config";

const BASE = API_BASE_URL.replace(/\/$/, "");
const HEALTH = `${BASE}/health`;
const WARMUP = `${BASE}/warmup`;
const LAST_WAKE_KEY = "toda.lastWakeOK";
const WAKE_LOGS_KEY = "toda.wakeLogs"; // ring buffer for debug

const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));
async function timedFetch(url:string, init: RequestInit = {}, ms=6000) {
  return Promise.race([
    fetch(url, { cache: "no-store", ...init }),
    new Promise<never>((_,rej)=>setTimeout(()=>rej(new Error("timeout")), ms)),
  ]);
}

function toast(msg:string){
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  console.log("[politeWake]", msg);
}

async function logWake(msg:string) {
  try {
    const now = new Date().toISOString();
    const raw = await AsyncStorage.getItem(WAKE_LOGS_KEY);
    const arr = raw ? JSON.parse(raw) as string[] : [];
    arr.push(`${now} ${msg}`);
    if (arr.length > 50) arr.shift(); // keep last 50
    await AsyncStorage.setItem(WAKE_LOGS_KEY, JSON.stringify(arr));
  } catch {}
}

/** Pass { force:true } to bypass 8-min debounce; { debug:true } to show toasts */
export async function politeWake(opts?: { force?: boolean; debug?: boolean }): Promise<boolean> {
  const force = !!opts?.force;
  const debug = !!opts?.debug;

  if (debug) { toast("wake:start"); await logWake("wake:start"); }

  // Debounce unless forced
  const last = Number(await AsyncStorage.getItem(LAST_WAKE_KEY) || "0");
  if (!force && Date.now() - last < 8 * 60_000) {
    if (debug) { toast("wake:skipped (debounced)"); await logWake("wake:skipped"); }
    return true;
  }

  // 1) Probe health
  try {
    const h = await timedFetch(HEALTH, {}, 5000);
    if (h.ok) {
      await AsyncStorage.setItem(LAST_WAKE_KEY, String(Date.now()));
      if (debug) { toast("wake:health OK"); await logWake("wake:health OK"); }
      return true;
    }
  } catch (e:any) {
    if (debug) { toast(`wake:health error`); await logWake(`wake:health error ${e?.message||e}`); }
  }

  // 2) Jitter
  await sleep(500 + Math.random() * 60_000);

  // 3) POST warmup
  try {
    const r = await timedFetch(WARMUP, { method: "POST" }, 6000);
    if (debug) { toast(`wake:warmup status ${r.status}`); await logWake(`wake:warmup status ${r.status}`); }
  } catch (e:any) {
    if (debug) { toast("wake:warmup error"); await logWake(`wake:warmup error ${e?.message||e}`); }
  }

  // 4) Poll health
  const t0 = Date.now();
  while (Date.now() - t0 < 15_000) {
    try {
      const r = await timedFetch(HEALTH, {}, 4000);
      if (r.ok) {
        await AsyncStorage.setItem(LAST_WAKE_KEY, String(Date.now()));
        if (debug) { toast("wake:ready"); await logWake("wake:ready"); }
        return true;
      }
    } catch {}
    await sleep(1200);
  }
  if (debug) { toast("wake:timeout"); await logWake("wake:timeout"); }
  return false;
}

/** Small helper to read last wake logs somewhere in-app */
export async function getWakeLogs(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(WAKE_LOGS_KEY);
  return raw ? JSON.parse(raw) as string[] : [];
}
