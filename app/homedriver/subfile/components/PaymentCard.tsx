// homedriver/subfile/PaymentCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

type Props = {
  showGcashQR: boolean;
  gcashQrUrl?: string;
  onChat: () => void;
  onConfirmPayment: () => void;
  onMinimize: () => void;
};

export default function PaymentCard({
  showGcashQR,
  gcashQrUrl,
  onChat,
  onConfirmPayment,
  onMinimize,
}: Props) {
  return (
    <View style={styles.popup}>
      {showGcashQR && gcashQrUrl && (
        <View style={styles.gcashContainer}>
          <Text style={styles.gcashTitle}>GCash Payment</Text>

          <View style={styles.qrWrapper}>
            <Image
              source={{ uri: gcashQrUrl }}
              style={styles.qrImage}
            />
          </View>
        </View>
      )}

      <Text style={{ fontWeight: "bold", color: "#ff9800" }}>
        💰 Confirm Payment
      </Text>
      <Text>Ask the passenger for payment and confirm here.</Text>

      <TouchableOpacity style={styles.chatButton} onPress={onChat}>
        <Text style={styles.chatText}>💬 Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.confirmButton}
        onPress={onConfirmPayment}
      >
        <Text style={styles.confirmText}>✅ Payment Confirmed</Text>
      </TouchableOpacity>

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
  gcashContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
  },
  gcashTitle: { fontWeight: "700", fontSize: 16, marginBottom: 8 },
  qrWrapper: {
    width: 200,
    height: 200,
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  qrImage: {
    width: 300,
    height: 300,
    marginLeft: -50,
    backgroundColor: "#eee",
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
  confirmButton: {
    backgroundColor: "#4caf50",
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
  },
  confirmText: { color: "white", textAlign: "center" },
  minButton: {
    marginTop: 10,
    padding: 5,
    backgroundColor: "#81C3E1",
    color: "white",
    borderRadius: 5,
    textAlign: "center",
  },
});
