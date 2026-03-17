import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/config"; // change if your alias differs
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PwAppPassenger = {
  _id: string;
  driverId: string;
  passengerType: "REGULAR" | "STUDENT" | "PWD" | "SENIOR";
  note?: string;

  pickupLat: number;
  pickupLng: number;

  status: "ACTIVE" | "COMPLETED" | "CANCELED";
  computedFare?: number | null;
};

export function usePwApp(driverId: string, enabled: boolean) {
  const [list, setList] = useState<PwAppPassenger[]>([]);
  const timer = useRef<any>(null);

  const fetchActive = useCallback(async () => {
    if (!driverId) return;
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/pwapp/active/${driverId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      setList(Array.isArray(json?.list) ? json.list : []);
    } catch {}
  }, [driverId]);

  const addPassenger = useCallback(
    async (passengerType: PwAppPassenger["passengerType"], note: string) => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/pwapp/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ passengerType, note }),
        });
        const json = await res.json();
        await fetchActive();
        return { ok: res.ok, data: json };
      } catch (e) {
        return { ok: false };
      }
    },
    [driverId, fetchActive]
  );

  const quoteDropoff = useCallback(async (pwAppId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/pwapp/${pwAppId}/quote-dropoff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      return { ok: res.ok, data: json };
    } catch {
      return { ok: false };
    }
  }, []);

  const cancelPassenger = useCallback(
    async (pwAppId: string) => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/pwapp/${pwAppId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        const json = await res.json();
        await fetchActive();
        return { ok: res.ok, data: json };
      } catch {
        return { ok: false };
      }
    },
    [fetchActive]
  );

  const dropoff = useCallback(
    async (pwAppId: string) => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/pwapp/${pwAppId}/dropoff`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        const json = await res.json();
        await fetchActive();
        return { ok: res.ok, data: json };
      } catch {
        return { ok: false };
      }
    },
    [fetchActive]
  );

  useEffect(() => {
    if (!enabled || !driverId) return;

    fetchActive();
    timer.current = setInterval(fetchActive, 4000);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [enabled, driverId, fetchActive]);

  return { list, refresh: fetchActive, addPassenger, dropoff, quoteDropoff, cancelPassenger };
}