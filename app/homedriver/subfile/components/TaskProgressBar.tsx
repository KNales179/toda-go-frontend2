import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Task } from "../hooks/useDriverTasks";

function sortByCreatedAt(a: Task, b: Task) {
  return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

function isLocked(t: Task) {
  return !!t.dependsOnTaskId;
}

export default function TaskProgressBar({
  active,
  pending,
  onComplete,
  getPassengerName, // ✅ NEW
}: {
  active: Task[];
  pending: Task[];
  onComplete: (taskId: string) => void;

  // ✅ NEW: parent provides a way to resolve passenger name for this task
  // Return null/"" if unknown.
  getPassengerName?: (t: Task) => string | null | undefined;
}) {
  const activeOne = active?.[0] || null;

  function labelTask(t: Task) {
    const type = t.taskType === "PICKUP" ? "Pickup" : "Dropoff";

    // ✅ If we can resolve a passenger name, use it instead of location
    const pname = (getPassengerName?.(t) || "").trim();
    if (pname) {
      return `${type}: ${pname}`;
    }

    // fallback (old behavior)
    const place = t.place?.trim() ? t.place : `${t.lat.toFixed(5)}, ${t.lng.toFixed(5)}`;
    return `${type}: ${place}`;
  }

  const ordered = useMemo(() => {
    const a = [...(active || [])].sort(sortByCreatedAt);
    const p = [...(pending || [])].sort(sortByCreatedAt);

    const a1 = a.length ? [a[0]] : [];
    return [...a1, ...p];
  }, [active, pending]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tasks</Text>
        {active && active.length > 1 ? (
          <Text style={styles.warn}>⚠️ {active.length} ACTIVE (should be 1)</Text>
        ) : null}
      </View>

      {ordered.length === 0 ? (
        <Text style={styles.empty}>No tasks</Text>
      ) : (
        ordered.slice(0, 6).map((t, idx) => {
          const locked = t.status !== "ACTIVE" && isLocked(t);
          const meta =
            t.status === "ACTIVE"
              ? "Active (nearest eligible)"
              : locked
              ? "Locked (after pickup)"
              : "Eligible";

          return (
            <View key={t._id} style={styles.row}>
              <View style={styles.dotCol}>
                <View
                  style={[
                    styles.dot,
                    t.status === "ACTIVE"
                      ? styles.dotActive
                      : locked
                      ? styles.dotLocked
                      : styles.dotPending,
                  ]}
                />
                {idx < Math.min(ordered.length, 6) - 1 ? <View style={styles.line} /> : null}
              </View>

              <View style={styles.textCol}>
                <Text style={styles.label} numberOfLines={2}>
                  {labelTask(t)}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>

              {t.status === "ACTIVE" ? (
                <TouchableOpacity style={styles.btn} onPress={() => onComplete(t._id)}>
                  <Text style={styles.btnText}>Done</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 52 }} />
              )}
            </View>
          );
        })
      )}

      {activeOne ? (
        <Text style={styles.footerHint} numberOfLines={1}>
          Current: {labelTask(activeOne)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 12, elevation: 2, bottom: -80},

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  warn: { fontSize: 11, color: "#b45309", fontWeight: "800" },

  empty: { color: "#6b7280" },

  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6 },
  dotCol: { width: 18, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },

  dotActive: { backgroundColor: "#22c55e" },
  dotPending: { backgroundColor: "#f59e0b" },
  dotLocked: { backgroundColor: "#9ca3af" },

  line: { width: 2, flex: 1, backgroundColor: "#e5e7eb", marginTop: 2 },

  textCol: { flex: 1, paddingRight: 8 },
  label: { fontSize: 13, fontWeight: "700" },
  meta: { fontSize: 11, color: "#6b7280", marginTop: 2 },

  btn: { backgroundColor: "#111827", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  footerHint: { marginTop: 8, fontSize: 11, color: "#374151", fontWeight: "700" },
});