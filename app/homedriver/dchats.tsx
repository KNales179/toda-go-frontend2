import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config";
import { router } from "expo-router";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

const API = `${API_BASE_URL.replace(/\/$/, "")}/api/chat`;
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export default function DChats() {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrating, setHydrating] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const getResolvedDriverSession = useCallback(async () => {
    const [rawDriverId, rawToken, rawTodaAuth] = await Promise.all([
      AsyncStorage.getItem("driverId"),
      AsyncStorage.getItem("token"),
      AsyncStorage.getItem("toda.auth"),
    ]);

    let todaAuth: any = null;

    try {
      todaAuth = rawTodaAuth ? JSON.parse(rawTodaAuth) : null;
    } catch (e) {
      console.log("AUTH:DCHATS:getResolvedDriverSession:parse_failed", {
        rawTodaAuth,
      });
    }

    const resolvedDriverId =
      rawDriverId ||
      todaAuth?.userId ||
      todaAuth?.driverId ||
      null;

    const resolvedToken =
      rawToken ||
      todaAuth?.token ||
      null;

    console.log("AUTH:DCHATS:getResolvedDriverSession:resolved", {
      rawDriverId,
      hasRawToken: !!rawToken,
      hasTodaAuth: !!rawTodaAuth,
      todaAuthUserId: todaAuth?.userId ?? null,
      todaAuthDriverId: todaAuth?.driverId ?? null,
      hasTodaAuthToken: !!todaAuth?.token,
      resolvedDriverId,
      hasToken: !!resolvedToken,
    });

    return {
      driverId:
        resolvedDriverId &&
        resolvedDriverId !== "undefined" &&
        resolvedDriverId !== "null"
          ? String(resolvedDriverId)
          : null,
      token:
        resolvedToken &&
        resolvedToken !== "undefined" &&
        resolvedToken !== "null"
          ? String(resolvedToken)
          : null,
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const session = await getResolvedDriverSession();

        if (mounted) {
          setDriverId(session.driverId);
          setToken(session.token);
        }
      } finally {
        if (mounted) setHydrating(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [getResolvedDriverSession]);

  const getImageUri = (path?: string | null) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL.replace(/\/$/, "")}/${String(path).replace(/^\/+/, "")}`;
  };

  const fetchPassengerProfile = useCallback(
    async (passengerId: string) => {
      if (!token) return null;

      try {
        const url = `${API_BASE_URL.replace(/\/$/, "")}/api/passenger/${passengerId}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          console.error("❌ fetchPassengerProfile failed:", passengerId, res.status, raw);
          return null;
        }

        const data = await res.json().catch(() => null);
        return data?.passenger ?? null;
      } catch (err) {
        console.error("❌ fetchPassengerProfile error:", passengerId, err);
        return null;
      }
    },
    [token]
  );

  const fetchSessions = useCallback(async () => {
    if (!driverId || !token) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const url = `${API}/sessions/driver/${driverId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        console.error("❌ fetch driver sessions failed:", res.status, raw);
        setSessions([]);
        return;
      }

      const data = await res.json().catch(() => null);
      const rawSessions = Array.isArray(data) ? data : [];

      const enrichedSessions = await Promise.all(
        rawSessions.map(async (item) => {
          if (!item.passengerId) {
            return {
              ...item,
              passengerProfileImage: null,
            };
          }

          const passenger = await fetchPassengerProfile(String(item.passengerId));

          const passengerName =
            item.passengerName && item.passengerName !== "Passenger"
              ? item.passengerName
              : [
                  passenger?.firstName,
                  passenger?.middleName,
                  passenger?.lastName,
                  passenger?.suffix,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || "Passenger";

          const passengerProfileImage =
            passenger?.profileImage || null;

          return {
            ...item,
            passengerName,
            passengerProfileImage,
          };
        })
      );

      setSessions(enrichedSessions);
    } catch (err) {
      console.error("❌ fetch driver sessions:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [driverId, token, fetchPassengerProfile]);

  useEffect(() => {
    if (!driverId || !token) return;

    const s = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = s;

    fetchSessions();

    const onUpd = () => fetchSessions();

    s.emit("sessions:subscribe", { driverId, role: "driver" });
    s.on("sessions:update", onUpd);

    return () => {
      s.off("sessions:update", onUpd);
      s.disconnect();
      socketRef.current = null;
    };
  }, [driverId, token, fetchSessions]);

  if (hydrating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!driverId || !token) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>MESSAGES</Text>
        <Text style={styles.notLoggedText}>You’re not logged in as a driver.</Text>
        <TouchableOpacity
          onPress={() => router.replace("/login_and_reg/dlogin")}
          style={styles.loginBtn}
        >
          <Text style={styles.loginBtnText}>Go to Driver Login</Text>
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
      return d.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const getLastStatusText = (item: any) => {
    const isMyLastMessage =
      item?.lastMessageSenderRole === "driver" &&
      String(item?.lastMessageSenderId ?? "") === String(driverId ?? "");

    if (!isMyLastMessage) return "";

    if (item?.seen) return "Seen";
    if (item?.delivered) return "Delivered";
    return "Sent";
  };

  const renderItem = ({ item }: { item: any }) => {
    const avatarUri = getImageUri(item.passengerProfileImage);
    const unreadCount = Number(item?.unseenCount ?? 0);
    const isUnread = unreadCount > 0;

    const statusText = getLastStatusText(item);
    const isTyping = !!item?.isTyping;

    const previewText = isTyping
      ? "Typing..."
      : item?.lastMessage
      ? item.lastMessage
      : "New chat";

    return (
      <TouchableOpacity
        style={[styles.chatCard, isUnread && styles.chatCardUnread]}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/ChatRoom",
            params: {
              bookingId: String(item.bookingId ?? ""),
              driverId: driverId,
              passengerId: item.passengerId,
              role: "driver",
              passengerName: item.passengerName ?? "",
              passengerProfileImage: item.passengerProfileImage ?? "",
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
          {isUnread ? <View style={styles.unreadDotOnAvatar} /> : null}
        </View>

        <View style={styles.chatMain}>
          <View style={styles.leftContent}>
            <Text
              numberOfLines={1}
              style={[styles.name, isUnread && styles.nameUnread]}
            >
              {item.passengerName || "Passenger"}
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.preview,
                isUnread && styles.previewUnread,
                isTyping && styles.typingText,
              ]}
            >
              {previewText}
            </Text>
          </View>

          <View style={styles.rightMeta}>
            <Text style={[styles.time, isUnread && styles.timeUnread]}>
              {formatChatTime(item.lastAt)}
            </Text>

            {!!statusText ? (
              <Text style={styles.statusText} numberOfLines={1}>
                {statusText}
              </Text>
            ) : unreadCount > 0 ? (
              unreadCount > 1 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : (
                <View style={styles.rightUnreadDot} />
              )
            ) : (
              <View style={styles.statusPlaceholder} />
            )}
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
            Wala pang chat. Kapag may pasahero kang nakausap, dito lalabas yan.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(i) => `${i.passengerId}-${i.bookingId ?? ""}`}
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

  notLoggedText: {
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    color: "#374151",
    fontSize: 14,
  },

  loginBtn: {
    marginHorizontal: 16,
    padding: 10,
    backgroundColor: "#5089A3",
    borderRadius: 8,
    alignItems: "center",
  },

  loginBtnText: {
    color: "#fff",
    fontWeight: "700",
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

  unreadDotOnAvatar: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#fff",
  },

  chatMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingBottom: 10,
  },

  leftContent: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  rightMeta: {
    width: 72,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 3,
  },

  nameUnread: {
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

  typingText: {
    color: "#2563EB",
    fontStyle: "italic",
    fontWeight: "600",
  },

  time: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
  },

  timeUnread: {
    color: "#2563EB",
    fontWeight: "700",
  },

  statusText: {
    marginTop: 4,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
  },

  rightUnreadDot: {
    marginTop: 6,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },

  statusPlaceholder: {
    marginTop: 6,
    height: 10,
  },

  badge: {
    marginTop: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});