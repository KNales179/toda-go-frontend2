import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function DNotifDetails() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  console.log("🧾 [DDETAILS] route.params:", route.params);

  const notif = useMemo(() => {
    return route.params?.item || null; // passed as object from navigate()
  }, [route.params]);

  console.log("🧾 [DDETAILS] notif id:", notif?._id);

  const fromLabel =
    notif?.meta?.fromLabel ||
    (notif?.createdByAdminName ? `TFRO Admin - ${notif.createdByAdminName}` : "TFRO Admin");

  const toLabel = notif?.meta?.toLabel || "Driver";
  const category = (notif?.category || "notice").toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5089A3" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <View style={{ width: 24 }} />
      </View>

      {!notif ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={56} color="#9ca3af" />
          <Text style={styles.emptyText}>Notification data not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.emailCard}>
            <View style={styles.row}>
              <Text style={styles.label}>From</Text>
              <Text style={styles.value}>{fromLabel}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.value}>{toLabel}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{category}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>
                {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : "—"}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.subject}>{notif.title || "—"}</Text>
            <Text style={styles.body}>{notif.message || "—"}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  header: {
    backgroundColor: "#5089A3",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  emailCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 12 },
  label: { color: "#6b7280", fontSize: 12, fontWeight: "700", width: 60 },
  value: { flex: 1, fontSize: 13, color: "#111827" },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 12 },
  subject: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 10 },
  body: { fontSize: 14, color: "#374151", lineHeight: 20 },
  empty: { marginTop: 120, alignItems: "center", paddingHorizontal: 20 },
  emptyText: { marginTop: 10, color: "#6b7280", textAlign: "center" },
});
