import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Task = {
  _id: string;
  driverId: string;
  sourceType: "BOOKING" | "PWAPP";
  sourceId: string;
  taskType: "PICKUP" | "DROPOFF";
  lat: number;
  lng: number;
  place?: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELED";
  dependsOnTaskId?: string | null;
  createdAt?: string;
};

type LatLng = { lat: number; lng: number };

export function useDriverTasks(driverId: string, enabled: boolean) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const timer = useRef<any>(null);

  const fetchTasks = useCallback(async () => {
    if (!driverId) return;
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/api/tasks/${driverId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      setTasks(Array.isArray(json?.tasks) ? json.tasks : []);
    } catch {
      // silent
    }
  }, [driverId]);

  const replan = useCallback(
    async (pos: LatLng) => {
      if (!driverId) return false;
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/tasks/replan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ driverId, lat: pos.lat, lng: pos.lng }),
        });
        const json = await res.json().catch(() => null);
        // backend returns tasks as well
        if (json?.tasks && Array.isArray(json.tasks)) setTasks(json.tasks);
        else await fetchTasks();
        return true;
      } catch {
        return false;
      }
    },
    [driverId, fetchTasks]
  );

  const completeTask = useCallback(
    async (taskId: string, pos: LatLng) => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ driverLat: pos.lat, driverLng: pos.lng }),
        });
        const json = await res.json().catch(() => null);
        if (json?.tasks && Array.isArray(json.tasks)) setTasks(json.tasks);
        else await fetchTasks();
        return true;
      } catch {
        return false;
      }
    },
    [fetchTasks]
  );

  useEffect(() => {
    if (!enabled || !driverId) return;

    fetchTasks();
    timer.current = setInterval(fetchTasks, 4000);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [enabled, driverId, fetchTasks]);

  const active = useMemo(() => tasks.filter((t) => t.status === "ACTIVE"), [tasks]);
  const pending = useMemo(() => tasks.filter((t) => t.status === "PENDING"), [tasks]);
  const completed = useMemo(() => tasks.filter((t) => t.status === "COMPLETED"), [tasks]);

  return { tasks, active, pending, completed, refresh: fetchTasks, replan, completeTask };
}