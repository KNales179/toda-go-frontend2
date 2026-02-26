import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from "react-native";
import type { PwAppPassenger } from "../hooks/usePwApp";

const TYPES: PwAppPassenger["passengerType"][] = ["REGULAR", "STUDENT", "PWD", "SENIOR"];

export default function PwAppPanel({
  list,
  onAdd,
  onDropoff,
}: {
  list: PwAppPassenger[];
  onAdd: (type: PwAppPassenger["passengerType"], note: string) => Promise<{ ok: boolean; data?: any }>;
  onDropoff: (id: string) => Promise<{ ok: boolean; data?: any }>;
}) {
  const [note, setNote] = useState("");
  const [type, setType] = useState<PwAppPassenger["passengerType"]>("REGULAR");
  const activeCount = useMemo(() => list.filter((x) => x.status === "ACTIVE").length, [list]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Roaming Passenger</Text>
        <Text style={styles.count}>{activeCount} active</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.typeRow}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t ? styles.typeBtnActive : null]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeText, type === t ? styles.typeTextActive : null]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder='Optional note (e.g., "yellow shirt")'
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.addBtn}
          onPress={async () => {
            const res = await onAdd(type, note.trim());

            if (!res.ok) {
              const msg =
                res?.data?.error ||
                res?.data?.message ||
                "Unable to add passenger right now.";

              if (String(msg).toLowerCase().includes("capacity")) {
                Alert.alert("Capacity full", "You’ve reached your passenger limit. Drop off someone first.");
              } else {
                Alert.alert("pwApp", msg);
              }
              return;
            }

            setNote("");
            setType("REGULAR");
          }}
        >
          <Text style={styles.addBtnText}>➕ Add Passenger</Text>
        </TouchableOpacity>
      </View>

      {list.length === 0 ? (
        <Text style={styles.empty}>No engers</Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          {list.map((p) => (
            <TouchableOpacity
              key={p._id}
              style={styles.item}
              onPress={() => {
                Alert.alert(
                  "Dropoff passenger?",
                  `${p.passengerType}${p.note ? ` • ${p.note}` : ""}`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Dropoff",
                      style: "destructive",
                      onPress: async () => {
                        const res = await onDropoff(p._id);

                        if (!res.ok) {
                          const msg = res?.data?.error || res?.data?.message || "Dropoff failed.";
                          Alert.alert("pwApp", msg);
                          return;
                        }

                        const passenger = res?.data?.passenger;
                        const fb = passenger?.fareBreakdown;

                        if (fb) {
                          const discPct = Math.round((fb.discountRate || 0) * 100);
                          Alert.alert(
                            "Fare computed",
                            [
                              `Distance: ${fb.distanceKm} km`,
                              ``,
                              `Base fare (first ${fb.baseKm} km): ₱${fb.baseFare}`,
                              `Extra: ${fb.extraKmCharged} km × ₱${fb.perKm} = ₱${fb.extraFare}`,
                              `Subtotal: ₱${Math.round(fb.subtotal)}`,
                              discPct > 0 ? `Discount (${discPct}%): -₱${fb.discountAmount}` : `Discount: ₱0`,
                              ``,
                              `TOTAL: ₱${fb.total}`,
                            ].join("\n")
                          );
                        } else {
                          const fare = passenger?.computedFare;
                          const distM = passenger?.distanceMeters;
                          Alert.alert(
                            "Fare computed",
                            `Total: ₱${fare ?? "?"}\nDistance: ${distM ? (distM / 1000).toFixed(2) : "?"} km`
                          );
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {p.passengerType} {p.note ? `• ${p.note}` : ""}
                </Text>
                <Text style={styles.itemSub} numberOfLines={1}>
                  Pin: {p.pickupLat.toFixed(4)}, {p.pickupLng.toFixed(4)}
                </Text>
              </View>
              <Text style={styles.dropText}>Dropoff</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 12, elevation: 2 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: "800" },
  count: { fontSize: 12, color: "#6b7280" },
  controls: { marginTop: 10 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#f3f4f6" },
  typeBtnActive: { backgroundColor: "#111827" },
  typeText: { fontSize: 12, fontWeight: "800", color: "#111827" },
  typeTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  addBtn: { marginTop: 8, backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: "#fff", fontWeight: "900", textAlign: "center" },
  empty: { color: "#6b7280", marginTop: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 10,
  },
  itemTitle: { fontWeight: "900" },
  itemSub: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  dropText: { fontWeight: "900", color: "#ef4444" },
});