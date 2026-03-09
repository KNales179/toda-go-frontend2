// homedriver/subfile/PreviewBookingCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  previewBooking: any;
  onAccept: () => void;
  onClose: () => void;
};

export default function PreviewBookingCard({
  previewBooking,
  onAccept,
  onClose,
}: Props) {
  if (!previewBooking) return null;

  const fare =
    previewBooking.bookingType === "GROUP"
      ? previewBooking.fare * previewBooking.partySize
      : previewBooking.fare;

  return (
    <View style={styles.popup}>
      <Text style={styles.popupTitle}>Potential Passenger</Text>

      <Text>
        From:{" "}
        {previewBooking.pickupLabel ||
          `${Number(previewBooking.pickupLat).toFixed(4)}, ${Number(
            previewBooking.pickupLng
          ).toFixed(4)}`}
      </Text>
      <Text>
        To:{" "}
        {previewBooking.destinationLabel ||
          `${Number(previewBooking.destinationLat).toFixed(4)}, ${Number(
            previewBooking.destinationLng
          ).toFixed(4)}`}
      </Text>
      <Text>
        Type:{" "}
        {previewBooking.bookingType
          ? previewBooking.bookingType === "GROUP"
            ? `Group (${previewBooking.partySize || 2})`
            : previewBooking.bookingType === "SOLO"
            ? "Solo (VIP)"
            : "Classic"
          : "—"}
      </Text>
      <Text>Fare: ₱{fare}</Text>

      <Text style={{ marginTop: 6 }}>
        Passenger: {previewBooking?.displayName ?? "Passenger"}
      </Text>
      {previewBooking?.bookedFor ? (
        <Text style={{ color: "#c0392b", fontWeight: "600" }}>
          For someone else
        </Text>
      ) : null}
      {!!previewBooking?.displayPhone && (
        <Text>Contact: {previewBooking.displayPhone}</Text>
      )}

      <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
        <Text style={{ color: "white", textAlign: "center" }}>ACCEPT</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onClose}>
        <Text style={styles.backButton}>Back to Map</Text>
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
    zIndex: 999,
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
