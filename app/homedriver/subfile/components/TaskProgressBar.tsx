import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Task } from "../hooks/useDriverTasks";

function labelTask(t: Task) {
  const type = t.taskType === "PICKUP" ? "Pickup" : "Dropoff";
  const place = t.place?.trim() ? t.place : `${t.lat.toFixed(5)}, ${t.lng.toFixed(5)}`;
  return `${type}: ${place}`;
}

export default function TaskProgressBar({
  active,
  pending,
  onComplete,
}: {
  active: Task[];
  pending: Task[];
  onComplete: (taskId: string) => void;
}) {
  const ordered = [
    ...active.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")),
    ...pending.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")),
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tasks</Text>

      {ordered.length === 0 ? (
        <Text style={styles.empty}>No active tasks</Text>
      ) : (
        ordered.slice(0, 6).map((t, idx) => (
          <View key={t._id} style={styles.row}>
            <View style={styles.dotCol}>
              <View style={[styles.dot, t.status === "ACTIVE" ? styles.dotActive : styles.dotPending]} />
              {idx < Math.min(ordered.length, 6) - 1 ? <View style={styles.line} /> : null}
            </View>

            <View style={styles.textCol}>
              <Text style={styles.label} numberOfLines={2}>
                {labelTask(t)}
              </Text>
              <Text style={styles.meta}>
                {t.status === "ACTIVE" ? "Active" : "Pending"}
                {t.dependsOnTaskId ? " • locked until pickup done" : ""}
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
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 12, elevation: 2 },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  empty: { color: "#6b7280" },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6 },
  dotCol: { width: 18, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  dotActive: { backgroundColor: "#22c55e" },
  dotPending: { backgroundColor: "#f59e0b" },
  line: { width: 2, flex: 1, backgroundColor: "#e5e7eb", marginTop: 2 },
  textCol: { flex: 1, paddingRight: 8 },
  label: { fontSize: 13, fontWeight: "700" },
  meta: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  btn: { backgroundColor: "#111827", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "900" },
});