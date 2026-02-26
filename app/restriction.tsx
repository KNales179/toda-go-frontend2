// app/restriction.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${days}d ${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;
}

type Appeal = {
  _id: string;
  status: "pending" | "approved" | "rejected";
  appealMessage?: string;
  adminNotes?: string | null;
  handledAt?: string | null;
  createdAt?: string;
};

export default function RestrictionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const userType = (params.userType as string) || "passenger";
  const displayName = (params.name as string) || "User";
  const reason = (params.reason as string) || "";
  const type = (params.type as string) || "ban";
  const endAtRaw = (params.endAt as string) || "";

  const endAt = useMemo(() => {
    if (!endAtRaw) return null;
    const d = new Date(endAtRaw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [endAtRaw]);

  const [now, setNow] = useState(Date.now());

  const [appealLoading, setAppealLoading] = useState(true);
  const [appealError, setAppealError] = useState<string | null>(null);
  const [latestAppeal, setLatestAppeal] = useState<Appeal | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = useMemo(() => {
    if (!endAt) return null; // indefinite
    return Math.max(0, endAt.getTime() - now);
  }, [endAt, now]);

  const expired = useMemo(() => {
    if (!endAt) return false;
    return endAt.getTime() <= now;
  }, [endAt, now]);

  const fixedMessage =
    "Your account has been restricted by the TODA-GO admin team. You cannot continue using the app until this restriction ends.";

  const appealHint =
    "If you believe this was a mistake, you may submit an appeal. Please provide clear details so admin can review faster.";

  async function getUserId() {
    if (userType === "driver") return await AsyncStorage.getItem("driverId");
    return await AsyncStorage.getItem("passengerId");
  }

  async function fetchLatestAppeal() {
    try {
      setAppealLoading(true);
      setAppealError(null);

      const userId = await getUserId();
      if (!userId) {
        setLatestAppeal(null);
        setAppealLoading(false);
        return;
      }

      const url = `${API_BASE_URL}/api/appeals/latest?userType=${encodeURIComponent(
        userType
      )}&userId=${encodeURIComponent(userId)}`;

      const res = await fetch(url);
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok || !data?.ok) {
        setAppealError(data?.error || `HTTP ${res.status}`);
        setLatestAppeal(null);
        return;
      }

      setLatestAppeal(data?.appeal || null);
    } catch (e: any) {
      console.error("[restriction] fetch appeal error:", e);
      setAppealError(e?.message || "Network error");
      setLatestAppeal(null);
    } finally {
      setAppealLoading(false);
    }
  }

  useEffect(() => {
    fetchLatestAppeal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appealStatus = (latestAppeal?.status || "none") as
    | "none"
    | "pending"
    | "approved"
    | "rejected";

  const adminResponse =
    (latestAppeal?.adminNotes || "").trim() ||
    (appealStatus === "rejected" ? "No admin notes provided." : "");

  const handleGoToAppeal = () => {
    router.push({
      pathname: "/appeal",
      params: {
        userType,
        name: displayName,
        type,
        reason,
        endAt: endAtRaw || "",
      },
    });
  };

  // ✅ Confirm ALWAYS available (force logout)
  const handleConfirm = async () => {
    if (userType === "driver") {
      await AsyncStorage.multiRemove(["driverId", "driverToken"]);
      router.replace("/login_and_reg/dlogin");
    } else {
      await AsyncStorage.multiRemove(["passengerId", "token"]);
      router.replace("/login_and_reg/plogin");
    }
  };

  // ✅ Appeal button logic
  const canSendAppeal = !expired && (appealStatus === "none" || appealStatus === "rejected");
  const isWaiting = !expired && appealStatus === "pending";
  const showAdminResponse = appealStatus === "rejected";

  // extra label for timer
  const timerLabel = !endAt
    ? "Indefinite"
    : expired
    ? "Expired — restriction time ended"
    : formatCountdown(remainingMs || 0);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Account Restricted</Text>
        <Text style={styles.sub}>
          {displayName} • {String(userType).toUpperCase()}
        </Text>

        <View style={styles.block}>
          <Text style={styles.msg}>{fixedMessage}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Restriction Type</Text>
          <Text style={styles.value}>{String(type).toUpperCase()}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Reason</Text>
          <Text style={styles.reason}>{reason?.trim() ? reason : "No reason provided."}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Time Remaining</Text>
          <Text
            style={[
              styles.timer,
              !endAt ? { color: "#111827" } : expired ? { color: "#065f46" } : null,
            ]}
          >
            {timerLabel}
          </Text>

          {endAt && !expired && <Text style={styles.endsAt}>Ends at: {endAt.toLocaleString()}</Text>}
        </View>

        {/* ✅ Appeal status */}
        <View style={styles.block}>
          <Text style={styles.label}>Appeal Status</Text>

          {appealLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator />
              <Text style={{ color: "#6b7280", fontSize: 12 }}>Checking appeal status…</Text>
            </View>
          ) : appealError ? (
            <Text style={{ color: "#991b1b", fontSize: 12 }}>
              Failed to check appeal status: {appealError}
            </Text>
          ) : appealStatus === "none" ? (
            <Text style={{ color: "#6b7280", fontSize: 12 }}>No appeal submitted yet.</Text>
          ) : appealStatus === "pending" ? (
            <Text style={{ color: "#92400e", fontSize: 12, fontWeight: "900" }}>
              Pending — waiting for admin response
            </Text>
          ) : appealStatus === "approved" ? (
            <Text style={{ color: "#065f46", fontSize: 12, fontWeight: "900" }}>
              Approved — admin accepted your appeal
            </Text>
          ) : (
            <Text style={{ color: "#991b1b", fontSize: 12, fontWeight: "900" }}>
              Rejected — you may appeal again
            </Text>
          )}

          {showAdminResponse && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: "#111827", fontWeight: "900" }}>
                Admin Response
              </Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: "#374151", lineHeight: 18 }}>
                {adminResponse}
              </Text>
            </View>
          )}
        </View>

        {/* ✅ Appeal buttons */}
        <View style={styles.block}>
          <Text style={styles.msg2}>{appealHint}</Text>

          <TouchableOpacity
            style={[
              styles.appealBtn,
              (!canSendAppeal || isWaiting) && { opacity: 0.55, borderColor: "#9ca3af" },
            ]}
            onPress={handleGoToAppeal}
            disabled={!canSendAppeal || isWaiting}
          >
            <Text style={[styles.appealText, (!canSendAppeal || isWaiting) && { color: "#9ca3af" }]}>
              {isWaiting
                ? "Waiting for Admin Response"
                : appealStatus === "rejected"
                ? "Send Appeal Again"
                : "Send Appeal"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={fetchLatestAppeal} disabled={appealLoading}>
            <Text style={styles.refreshText}>{appealLoading ? "Refreshing…" : "Refresh Status"}</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ Confirm always enabled */}
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmText}>
            Go back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center", padding: 18 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#fff",
  },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  sub: { marginTop: 6, fontSize: 13, color: "#6b7280" },

  block: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  label: { fontSize: 12, fontWeight: "800", color: "#111827", marginBottom: 6 },
  value: { fontSize: 14, fontWeight: "800", color: "#111827" },

  msg: { fontSize: 13, color: "#374151", lineHeight: 18 },
  msg2: { fontSize: 12, color: "#6b7280", lineHeight: 18 },

  reason: { fontSize: 14, color: "#111827", lineHeight: 20 },

  timer: { fontSize: 18, fontWeight: "900", color: "#991b1b" },
  endsAt: { marginTop: 6, fontSize: 12, color: "#6b7280" },

  appealBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5089A3",
    alignItems: "center",
  },
  appealText: { color: "#5089A3", fontWeight: "900" },

  refreshBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  refreshText: { color: "#111827", fontWeight: "800" },

  confirmBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#5089A3",
    alignItems: "center",
  },
  confirmText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  footer: { marginTop: 10, fontSize: 12, color: "#9ca3af", textAlign: "center" },
});
