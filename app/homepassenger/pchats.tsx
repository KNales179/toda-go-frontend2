// PChats.tsx – no auth context; uses AsyncStorage(passengerId)

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config";
import { router } from "expo-router";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

const { width } = Dimensions.get("window");
const API = `${API_BASE_URL.replace(/\/$/, "")}/api/chat`;
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export default function PChats() {
  const [passengerId, setPassengerId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrating, setHydrating] = useState(true); // wait for AsyncStorage
  const socketRef = useRef<Socket | null>(null);

  // Hydrate passengerId from storage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pid = await AsyncStorage.getItem("passengerId");
        if (mounted) setPassengerId(pid);
      } finally {
        if (mounted) setHydrating(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getImageUri = (path?: string | null) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL.replace(/\/$/, "")}/${String(path).replace(/^\/+/, "")}`;
  };

  const fetchDriverProfile = useCallback(async (driverId: string) => {
    try {
      const url = `${API_BASE_URL.replace(/\/$/, "")}/api/driver/${driverId}`;
      console.log("👤 Fetching driver profile:", url);

      const res = await fetch(url);
      const data = await res.json();

      console.log("✅ Driver profile response:", driverId, data);

      return data?.driver ?? null;
    } catch (err) {
      console.error("❌ fetchDriverProfile error:", driverId, err);
      return null;
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!passengerId) return;

    try {
      const url = `${API}/sessions/passenger/${passengerId}`;
      console.log("📥 Fetching passenger sessions from:", url);
      console.log("🆔 passengerId:", passengerId);

      const res = await fetch(url);
      const data = await res.json();

      console.log("✅ Raw passenger sessions response:", data);

      const rawSessions = Array.isArray(data) ? data : [];

      const enrichedSessions = await Promise.all(
        rawSessions.map(async (item, index) => {
          console.log(`📨 Session[${index}]`, {
            bookingId: item.bookingId,
            driverId: item.driverId,
            driverName: item.driverName,
            passengerId: item.passengerId,
            lastMessage: item.lastMessage,
            lastAt: item.lastAt,
          });

          if (!item.driverId) {
            return {
              ...item,
              driverProfileImage: null,
            };
          }

          const driver = await fetchDriverProfile(String(item.driverId));

          const selfieImage = driver?.selfieImage ?? null;
          const driverName =
            item.driverName && item.driverName !== "Driver"
              ? item.driverName
              : driver?.driverName ||
                [
                  driver?.driverFirstName,
                  driver?.driverMiddleName,
                  driver?.driverLastName,
                  driver?.driverSuffix,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .trim() ||
                "Driver";

          console.log("🖼️ Enriched session:", {
            driverId: item.driverId,
            resolvedDriverName: driverName,
            selfieImage,
          });

          return {
            ...item,
            driverName,
            driverProfileImage: selfieImage,
          };
        })
      );

      setSessions(enrichedSessions);
    } catch (err) {
      console.error("❌ fetch passenger sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [passengerId, fetchDriverProfile]);

  // Socket + initial fetch whenever passengerId becomes available
  useEffect(() => {
    if (!passengerId) return;

    const s = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = s;

    fetchSessions();

    const onUpd = () => fetchSessions();
    s.emit("sessions:subscribe", { passengerId, role: "passenger" });
    s.on("sessions:update", onUpd);

    return () => {
      s.off("sessions:update", onUpd);
      s.disconnect();
      socketRef.current = null;
    };
  }, [passengerId, fetchSessions]);

  // UI states
  if (hydrating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!passengerId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>MESSAGES</Text>
        <Text style={{ marginTop: 12, marginBottom: 16 }}>
          You’re not logged in as a passenger.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/login_and_reg/plogin")}
          style={{ padding: 10, backgroundColor: "#5089A3", borderRadius: 8 }}
        >
          <Text style={{ color: "#fff" }}>Go to Passenger Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  const formatChatTime = (date?: string | null) => {
    if (!date) return "";

    const d = new Date(date);
    const now = new Date();

    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    if (sameDay) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const getLastStatusText = (item: any) => {
    const isMyLastMessage =
      item?.lastMessageSenderRole === "passenger" &&
      String(item?.lastMessageSenderId ?? "") === String(passengerId ?? "");

    if (!isMyLastMessage) return "";

    if (item?.seen) return "Seen";
    if (item?.delivered) return "Delivered";
    return "Sent";
  };

  const renderItem = ({ item }: { item: any }) => {
    const avatarUri = getImageUri(item.driverProfileImage);
    const unreadCount = Number(item?.unseenCount ?? 0);
    const isUnread = unreadCount > 0;
    const statusText = getLastStatusText(item);

    console.log("🖼️ Rendering chat row:", {
      driverId: item.driverId,
      driverName: item.driverName,
      unreadCount,
      seen: item.seen,
      delivered: item.delivered,
      lastMessageSenderRole: item.lastMessageSenderRole,
      lastMessageSenderId: item.lastMessageSenderId,
    });

    return (
      <TouchableOpacity
        style={[styles.chatCard, isUnread && styles.chatCardUnread]}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/ChatRoom",
            params: {
              bookingId: String(item.bookingId ?? ""),
              driverId: item.driverId,
              passengerId,
              role: "passenger",
              driverName: item.driverName ?? "",
              driverProfileImage: item.driverProfileImage ?? "",
            },
          })
        }
      >
        <View style={styles.avatarWrap}>
          <Image
            source={
              avatarUri
                ? { uri: avatarUri }
                : require("../../assets/images/profile-placeholder.jpg")
            }
            style={styles.avatar}
          />

          {isUnread ? <View style={styles.onlineDot} /> : null}
        </View>

        <View style={styles.chatBody}>
          <View style={styles.topRow}>
            <Text
              numberOfLines={1}
              style={[styles.booking, isUnread && styles.bookingUnread]}
            >
              {item.driverName || "Driver"}
            </Text>

            <Text style={[styles.time, isUnread && styles.timeUnread]}>
              {formatChatTime(item.lastAt)}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.previewWrap}>
              <Text
                numberOfLines={1}
                style={[styles.preview, isUnread && styles.previewUnread]}
              >
                {item.lastMessage || "— no messages yet —"}
              </Text>

              {!!statusText && !isUnread ? (
                <Text numberOfLines={1} style={styles.statusText}>
                  {statusText}
                </Text>
              ) : null}
            </View>

            {isUnread ? (
              unreadCount > 1 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : (
                <View style={styles.unreadDot} />
              )
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MESSAGES</Text>
      {sessions.length === 0 ? (
        <View style={styles.contentContainer}>
          <Image
            source={require("../../assets/images/chat.png")}
            style={styles.chatImage}
          />
          <Text style={styles.message}>
            Ang message dito ay lalabas kapag nakapag-book ka na at may kausap na driver.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(i) => `${i.driverId}-${i.bookingId ?? ""}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: 50,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    paddingHorizontal: 16,
    color: "#111827",
  },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
  },

  chatCardUnread: {
    backgroundColor: "#EEF6FF",
  },

  avatarWrap: {
    position: "relative",
    marginRight: 12,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#D1D5DB",
  },

  onlineDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 999,
    backgroundColor: "#3B82F6",
    borderWidth: 2,
    borderColor: "#fff",
  },

  chatBody: {
    flex: 1,
    minWidth: 0,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingBottom: 10,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  previewWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  booking: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginRight: 8,
  },

  bookingUnread: {
    fontWeight: "800",
    color: "#0F172A",
  },

  preview: {
    fontSize: 14,
    color: "#6B7280",
  },

  previewUnread: {
    color: "#111827",
    fontWeight: "700",
  },

  statusText: {
    marginTop: 2,
    fontSize: 12,
    color: "#9CA3AF",
  },

  time: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  timeUnread: {
    color: "#2563EB",
    fontWeight: "700",
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    marginLeft: 8,
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },

  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  chatImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
    resizeMode: "contain",
  },

  message: {
    textAlign: "center",
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 21,
  },
});