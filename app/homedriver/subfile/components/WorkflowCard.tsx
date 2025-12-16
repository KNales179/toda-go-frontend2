// homedriver/subfile/WorkflowCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  isPickedUp: boolean;
  onChat: () => void;
  onPickedUp: () => void;
  onDropOff: () => void;
  onMinimize: () => void;
};

export default function WorkflowCard({
  isPickedUp,
  onChat,
  onPickedUp,
  onDropOff,
  onMinimize,
}: Props) {
  return (
    <View style={styles.popup}>
      <Text style={{ fontWeight: "bold", color: "#4caf50" }}>
        ✅ Booking Confirmed!
      </Text>

      {!isPickedUp ? (
        <>
          <Text>🕒 Waiting for pickup...</Text>
          <TouchableOpacity style={styles.chatButton} onPress={onChat}>
            <Text style={styles.chatText}>💬 Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onPickedUp}>
            <Text style={styles.actionText}>🚕 Picked Up</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text>🟢 Passenger picked up! Ready for drop-off.</Text>
          <TouchableOpacity style={styles.chatButton} onPress={onChat}>
            <Text style={styles.chatText}>💬 Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropButton} onPress={onDropOff}>
            <Text style={styles.actionText}>📦 Drop Off</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={onMinimize}>
        <Text style={styles.minButton}>Minimize</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
    zIndex: 99,
  },
  chatButton: {
    marginTop: 8,
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  chatText: { color: "#fff", fontWeight: "bold" },
  actionButton: {
    backgroundColor: "#4caf50",
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
  },
  dropButton: {
    backgroundColor: "#2196f3",
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
  },
  actionText: { color: "white", textAlign: "center" },
  minButton: {
    marginTop: 10,
    padding: 5,
    backgroundColor: "#81C3E1",
    color: "white",
    borderRadius: 5,
    textAlign: "center",
  },
});
