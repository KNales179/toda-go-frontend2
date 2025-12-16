// homedriver/subfile/IncomingBookingCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  incomingBooking: any;
  onAccept: () => void;
  onBack: () => void;
};

export default function IncomingBookingCard({
  incomingBooking,
  onAccept,
  onBack,
}: Props) {
  if (!incomingBooking) return null;

  return (
    <View style={styles.popup}>
      <Text style={styles.popupTitle}>🚕 Incoming Booking</Text>
      <Text>
        From:{" "}
        {incomingBooking?.pickupLabel ||
          `${Number(incomingBooking?.pickupLat)?.toFixed?.(4) ?? "-"}, ${
            Number(incomingBooking?.pickupLng)?.toFixed?.(4) ?? "-"
          }`}
      </Text>
      <Text>
        To:{" "}
        {incomingBooking?.destinationLabel ||
          `${Number(incomingBooking?.destinationLat)?.toFixed?.(4) ?? "-"}, ${
            Number(incomingBooking?.destinationLng)?.toFixed?.(4) ?? "-"
          }`}
      </Text>
      <Text>
        Type:{" "}
        {incomingBooking?.bookingType
          ? incomingBooking.bookingType === "GROUP"
            ? `Group (${incomingBooking.partySize || 1})`
            : incomingBooking.bookingType === "SOLO"
            ? "Solo (VIP)"
            : "Classic"
          : "—"}
      </Text>

      <Text>Fare: ₱{incomingBooking?.fare ?? "-"}</Text>
      <Text>Passenger: {incomingBooking?.displayName ?? "Passenger"}</Text>
      {incomingBooking?.riderName ? (
        <Text style={{ color: "#c0392b", fontWeight: "600" }}>
          For someone else
        </Text>
      ) : null}

      <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
        <Text style={{ color: "white", textAlign: "center" }}>ACCEPT</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backButton}>Back to Queue</Text>
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
  popupTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 5 },
  acceptButton: {
    backgroundColor: "#4caf50",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  backButton: {
    marginTop: 10,
    padding: 5,
    backgroundColor: "#81C3E1",
    color: "white",
    borderRadius: 5,
    textAlign: "center",
  },
});
