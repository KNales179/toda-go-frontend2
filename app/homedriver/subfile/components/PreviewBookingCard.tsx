// homedriver/subfile/PreviewBookingCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  previewBooking: any;
  onAccept: () => void;
  onClose: () => void;
};

function money(value: any) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function prettyType(value: any, partySize?: number) {
  const v = String(value || "CLASSIC").toUpperCase();

  if (v === "GROUP") return `Group (${partySize || 2})`;
  if (v === "SOLO") return "Solo (VIP)";
  return "Classic";
}

function Row({
  label,
  value,
  bold,
  green,
}: {
  label: string;
  value: string;
  bold?: boolean;
  green?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.boldValue, green && styles.greenValue]}>
        {value}
      </Text>
    </View>
  );
}

export default function PreviewBookingCard({
  previewBooking,
  onAccept,
  onClose,
}: Props) {
  if (!previewBooking) return null;

  const fb = previewBooking.fareBreakdown || {};

  const distanceKm = Number(fb.distanceKm || previewBooking.distanceKm || 0);
  const baseFare = Number(fb.baseFare || 0);
  const additionalFare = Number(fb.additionalFare || 0);

  const originalFare = Number(
    fb.originalFare || baseFare + additionalFare || previewBooking.estimatedFare || previewBooking.fare || 0
  );

  const discountApplied = Number(fb.discountApplied || 0);
  const discountAmount = Number(fb.discountAmount || 0);

  const totalFare = Number(
    fb.totalFare ||
      previewBooking.fare ||
      (previewBooking.bookingType === "GROUP"
        ? Number(previewBooking.fare || 0) * Number(previewBooking.partySize || 1)
        : Number(previewBooking.fare || 0))
  );

  const passengerName =
    previewBooking.displayName ||
    previewBooking.riderName ||
    previewBooking.passengerName ||
    "Passenger";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Passenger</Text>
          <Text style={styles.passengerName}>{passengerName}</Text>

          {previewBooking.bookedFor ? (
            <Text style={styles.bookedForText}>
              Booked by {previewBooking.passengerName || "account owner"}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Details</Text>

        <Row
          label="From:"
          value={
            previewBooking.pickupLabel ||
            `${Number(previewBooking.pickupLat).toFixed(4)}, ${Number(previewBooking.pickupLng).toFixed(4)}`
          }
        />

        <Row
          label="To:"
          value={
            previewBooking.destinationLabel ||
            `${Number(previewBooking.destinationLat).toFixed(4)}, ${Number(previewBooking.destinationLng).toFixed(4)}`
          }
        />

        <Row
          label="Type:"
          value={prettyType(previewBooking.bookingType, previewBooking.partySize)}
        />

        {!!previewBooking.displayPhone && (
          <Row label="Contact:" value={previewBooking.displayPhone} />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fare Breakdown</Text>

        <Row
          label="Distance:"
          value={distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : "—"}
        />

        <Row label="Base Fare:" value={money(baseFare)} />
        <Row label="Additional Fare:" value={money(additionalFare)} />

        {discountApplied > 0 ? (
          <>
            <Row label="Original Fare:" value={money(originalFare)} />
            <Row
              label={`Discounted (${discountApplied}%):`}
              value={`-${money(discountAmount)}`}
              green
            />
          </>
        ) : null}

        <View style={styles.divider} />

        <Row label="Total Fare:" value={money(totalFare)} bold />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>Back to Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    elevation: 8,
    zIndex: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  kicker: {
    fontSize: 11,
    fontWeight: "900",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  passengerName: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  bookedForText: {
    marginTop: 3,
    fontSize: 12,
    color: "#b45309",
    fontWeight: "700",
  },

  section: {
    marginTop: 14,
    borderTopColor: "#eef2f7",
    gap: 7,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  rowLabel: {
    width: 126,
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
  },

  rowValue: {
    flex: 1,
    fontSize: 10,
    color: "#111827",
    lineHeight: 18,
  },

  boldValue: {
    fontSize: 15,
    fontWeight: "900",
  },

  greenValue: {
    color: "#0a7f35",
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 4,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  backButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    alignItems: "center",
  },

  backButtonText: {
    color: "#374151",
    fontWeight: "900",
  },

  acceptButton: {
    flex: 1,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  acceptButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    textTransform: "uppercase",
  },
});