import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { API_BASE_URL } from "../../../../config";

type Notif = {
  _id: string;
  userId: string;
  userType: "passenger" | "driver";
  category: "verification" | "report" | "feedback" | "notice";
  title: string;
  message: string;
  seenAt: string | null;
  readAt: string | null;
  createdByAdminId?: string | null;
  createdByAdminName?: string;
  meta?: any;
  createdAt: string;
};

function timeAgo(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Notif[]>([]);
  const [error, setError] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Notif | null>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      setError("");
      setLoading(true);

      const passengerId = await AsyncStorage.getItem("passengerId");
      if (!passengerId) {
        setError("Missing passengerId. Please login again.");
        setItems([]);
        return;
      }

      // ✅ Make sure your backend route matches this:
      // GET /api/notifications?userType=passenger&userId=<id>
      const res = await fetch(
        `${API_BASE_URL}/api/notifications?userType=passenger&userId=${encodeURIComponent(
          passengerId
        )}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load notifications.");
      }

      const list: Notif[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      // sort newest first (just in case backend doesn’t)
      list.sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setItems(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const unseenIds = useMemo(
    () => items.filter((n) => !n.seenAt).map((n) => n._id),
    [items]
  );

  const markSeenBulk = useCallback(async () => {
    // optional endpoint - if you don’t have bulk endpoint, we’ll do per-id
    if (unseenIds.length === 0) return;

    // Option 1: bulk endpoint if you created it:
    // PATCH /api/notifications/seen-bulk  body: { ids: [...] }
    // If you don't have it, comment this and use per-item loop below.
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/seen-bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unseenIds }),
      });

      if (res.ok) {
        // update local state
        const nowIso = new Date().toISOString();
        setItems((prev) =>
          prev.map((n) => (unseenIds.includes(n._id) ? { ...n, seenAt: nowIso } : n))
        );
        return;
      }
    } catch {
      // fall through to per-item
    }

    // Option 2: per notification
    for (const id of unseenIds) {
      try {
        await fetch(`${API_BASE_URL}/api/notifications/${id}/seen`, {
          method: "PATCH",
        });
      } catch {}
    }
    const nowIso = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (!n.seenAt ? { ...n, seenAt: nowIso } : n))
    );
  }, [unseenIds]);

  const markRead = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, { method: "PATCH" });
    } catch {}
    const nowIso = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, readAt: nowIso, seenAt: n.seenAt || nowIso } : n)));
  }, []);

  useEffect(() => {
    (async () => {
      await fetchNotifs();
    })();
  }, [fetchNotifs]);

  useEffect(() => {
    // when list is loaded, mark unseen as seen
    if (!loading && items.length > 0) {
      markSeenBulk();
    }
  }, [loading, items.length]); // keep simple

  const openDetails = async (n: Notif) => {
    setSelected(n);
    setOpen(true);

    // mark read immediately
    if (!n.readAt) {
      await markRead(n._id);
    }
  };

  const badgeLabel = (cat: Notif["category"]) => {
    if (cat === "verification") return "VERIFICATION";
    if (cat === "report") return "REPORT";
    if (cat === "feedback") return "FEEDBACK";
    return "NOTICE";
  };

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        <TouchableOpacity onPress={fetchNotifs} style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#666" }}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: "#B00020", textAlign: "center" }}>{error}</Text>
          <TouchableOpacity onPress={fetchNotifs} style={styles.retryBtn}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="mail-open-outline" size={32} color="#666" />
              <Text style={{ marginTop: 10, color: "#666" }}>No notifications yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const unread = !item.readAt;
            return (
              <TouchableOpacity
                onPress={() => openDetails(item)}
                style={[styles.card, unread && styles.cardUnread]}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeLabel(item.category)}</Text>
                  </View>
                  <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>

                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.msg} numberOfLines={2}>
                  {item.message}
                </Text>

                {unread && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* details modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color="#111" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalH1}>{selected?.title || "—"}</Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={styles.meta}>
                  From: {selected?.createdByAdminName || "Admin"}
                </Text>
                <Text style={styles.meta}>
                  {selected?.createdAt ? new Date(selected.createdAt).toLocaleString() : ""}
                </Text>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.modalBody}>{selected?.message || "—"}</Text>
              </View>

              {/* extra details */}
              <View style={styles.metaBox}>
                <Text style={styles.metaRow}>
                  <Text style={styles.metaKey}>Category: </Text>
                  {selected?.category || "—"}
                </Text>
                <Text style={styles.metaRow}>
                  <Text style={styles.metaKey}>Status: </Text>
                  {selected?.meta?.status || "—"}
                </Text>
                {!!selected?.meta?.rejectionReason && (
                  <Text style={styles.metaRow}>
                    <Text style={styles.metaKey}>Reason: </Text>
                    {selected?.meta?.rejectionReason}
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingTop: 48,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  iconBtn: { padding: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  retryBtn: {
    marginTop: 12,
    backgroundColor: "#5089A3",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e7e7e7",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    position: "relative",
  },
  cardUnread: {
    borderColor: "#cfe6f3",
    backgroundColor: "#f6fbff",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e9f3f8",
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#1f4f66" },
  time: { fontSize: 12, color: "#666" },
  title: { marginTop: 8, fontSize: 15, fontWeight: "800", color: "#111" },
  msg: { marginTop: 4, fontSize: 13, color: "#444" },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: "#d11a2a",
    position: "absolute",
    right: 12,
    top: 12,
  },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 18 },
  modalBox: { backgroundColor: "#fff", borderRadius: 14, padding: 14, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 16, fontWeight: "800" },
  modalH1: { fontSize: 16, fontWeight: "900", marginTop: 8, color: "#111" },
  modalBody: { fontSize: 14, color: "#333", marginTop: 6, lineHeight: 20 },
  meta: { fontSize: 12, color: "#666" },
  metaBox: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: "#f7f7f7" },
  metaRow: { fontSize: 13, color: "#333", marginBottom: 6 },
  metaKey: { fontWeight: "800" },
});
