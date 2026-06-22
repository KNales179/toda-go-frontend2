// homedriver/subfile/PaymentCard.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
} from "react-native";

type Props = {
  showGcashQR: boolean;
  gcashQrUrl?: string;
  booking?: any;
  onChat: () => void;
  onConfirmPayment: () => void;
  onMinimize: () => void;
};

function money(value: any) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function prettyPaymentMethod(value: any) {
  const v = String(value || "").toLowerCase();
  if (v === "gcash") return "GCash";
  if (v === "cash") return "Cash";
  return value ? String(value) : "Cash";
}

export default function PaymentCard({
  showGcashQR,
  gcashQrUrl,
  booking,
  onChat,
  onConfirmPayment,
  onMinimize,
}: Props) {
  const [qrExpanded, setQrExpanded] = useState(false);

  const fb = booking?.fareBreakdown || {};

  const passengerName =
    booking?.displayName ||
    booking?.riderName ||
    booking?.passengerName ||
    "Passenger";

  const baseFare = Number(fb.baseFare || 0);
  const additionalFare = Number(fb.additionalFare || 0);
  const discountApplied = Number(fb.discountApplied || 0);
  const discountAmount = Number(fb.discountAmount || 0);
  const totalFare = Number(fb.totalFare || booking?.fare || 0);
  const paymentStatus = String(booking?.paymentStatus || "awaiting").toLowerCase();

  const paymentStatusLabel =
    paymentStatus === "paid"
      ? "Paid"
      : paymentStatus === "failed"
        ? "Failed"
        : "Awaiting";

  const isPaid = paymentStatus === "paid";

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.label}>Amount to Collect</Text>
            <Text style={styles.amount}>{money(totalFare)}</Text>
          </View>

          <View style={[styles.statusPill, isPaid && styles.statusPillPaid]}>
            <Text style={[styles.statusText, isPaid && styles.statusTextPaid]}>
              {paymentStatusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Passenger</Text>
            <Text style={styles.infoValue}>{passengerName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Method</Text>
            <Text style={styles.infoValue}>
              {prettyPaymentMethod(booking?.paymentMethod)}
            </Text>
          </View>

          {baseFare > 0 || additionalFare > 0 ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fare</Text>
              <Text style={styles.infoValue}>
                {money(baseFare)} + {money(additionalFare)}
                {discountApplied > 0
                  ? ` - ${money(discountAmount)}`
                  : ""}
              </Text>
            </View>
          ) : null}
        </View>

        {showGcashQR && gcashQrUrl ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.qrMiniRow}
            onPress={() => setQrExpanded(true)}
          >
            <Image source={{ uri: gcashQrUrl }} style={styles.qrThumb} />

            <View style={{ flex: 1 }}>
              <Text style={styles.qrTitle}>GCash QR</Text>
              <Text style={styles.qrHint}>Tap QR to expand</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={styles.note}>
            Confirm only after receiving {money(totalFare)}.
          </Text>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.lightButton} onPress={onChat}>
            <Text style={styles.lightButtonText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.lightButton} onPress={onMinimize}>
            <Text style={styles.lightButtonText}>Minimize</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.confirmButton} onPress={onConfirmPayment}>
          <Text style={styles.confirmText}>Payment Confirmed</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={qrExpanded} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setQrExpanded(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>GCash QR</Text>

            {gcashQrUrl ? (
              <Image source={{ uri: gcashQrUrl }} style={styles.qrLarge} />
            ) : null}

            <Text style={styles.modalHint}>Tap anywhere to close</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 78,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 10,
    zIndex: 9999,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  label: {
    fontSize: 10,
    fontWeight: "900",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  amount: {
    marginTop: 1,
    fontSize: 25,
    fontWeight: "900",
    color: "#111827",
  },

  statusPill: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#c2410c",
    textTransform: "uppercase",
  },

  infoBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
    gap: 6,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6b7280",
  },

  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
  },

  qrMiniRow: {
    marginTop: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  qrThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#eee",
  },

  qrTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  qrHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
  },

  note: {
    marginTop: 10,
    padding: 9,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 11,
  },

  lightButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },

  lightButtonText: {
    color: "#374151",
    fontWeight: "900",
  },

  confirmButton: {
    marginTop: 9,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  confirmText: {
    color: "#ffffff",
    fontWeight: "900",
    textTransform: "uppercase",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
  },

  qrLarge: {
    width: 310,
    height: 310,
    borderRadius: 14,
    backgroundColor: "#eee",
  },

  modalHint: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  statusPillPaid: {
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0",
  },

  statusTextPaid: {
    color: "#166534",
  },
});