// homedriver/subfile/WorkflowCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  // still used to show status text (optional)
  isPickedUp: boolean;
  onChat: () => void;
  onMinimize: () => void;
};

export default function WorkflowCard({ isPickedUp, onChat, onMinimize }: Props) {
  return (
    <View style={styles.popup}>
      <Text style={styles.title}>✅ Booking Confirmed!</Text>

      {!isPickedUp ? (
        <Text style={styles.sub}>🕒 Waiting for pickup…</Text>
      ) : (
        <Text style={styles.sub}>🟢 Passenger picked up! Proceed to drop-off.</Text>
      )}

      <View style={styles.row}>
        <TouchableOpacity style={styles.chatButton} onPress={onChat}>
          <Text style={styles.chatText}>💬 Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.minBtn} onPress={onMinimize}>
          <Text style={styles.minText}>Minimize</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Use the <Text style={{ fontWeight: "900" }}>Done</Text> button in the{" "}
        <Text style={{ fontWeight: "900" }}>Tasks</Text> list to mark Picked Up / Drop Off.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 5,
    zIndex: 99,
  },
  title: { fontWeight: "900", color: "#16a34a", marginBottom: 6 },
  sub: { color: "#111827" },

  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },

  chatButton: {
    backgroundColor: "#007bff",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  chatText: { color: "#fff", fontWeight: "900" },

  minBtn: {
    backgroundColor: "#111827",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  minText: { color: "#fff", fontWeight: "900" },

  hint: { marginTop: 10, fontSize: 12, color: "#6b7280" },
});