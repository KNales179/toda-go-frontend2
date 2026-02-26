import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/config"; // change if your alias differs

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

export function useDriverTasks(driverId: string, enabled: boolean) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const timer = useRef<any>(null);

  const fetchTasks = useCallback(async () => {
    if (!driverId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${driverId}`);
      const json = await res.json();
      setTasks(Array.isArray(json?.tasks) ? json.tasks : []);
    } catch {
      // silent (you will debug easily from frontend)
    }
  }, [driverId]);

  const completeTask = useCallback(
    async (taskId: string) => {
      try {
        await fetch(`${API_BASE_URL}/api/tasks/${taskId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        await fetchTasks();
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

  const active = tasks.filter((t) => t.status === "ACTIVE");
  const pending = tasks.filter((t) => t.status === "PENDING");
  const completed = tasks.filter((t) => t.status === "COMPLETED");

  return { tasks, active, pending, completed, refresh: fetchTasks, completeTask };
}