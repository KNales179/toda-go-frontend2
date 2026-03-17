import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";
import * as ImagePicker from "expo-image-picker";

const API = API_BASE_URL.replace(/\/$/, "");
const CHAT_API = `${API}/api/chat`;
const DRIVER_API = `${API}/api/driver`;
const PASSENGER_API = `${API}/api/passenger`;

type Msg = {
  _id: string;
  driverId: string;
  passengerId: string;
  bookingId?: number;
  senderId: string;
  senderRole: "driver" | "passenger";
  messageType?: "text" | "image";
  message: string;
  imageUrl?: string | null;
  createdAt: string;
};

export default function ChatRoom() {
  const raw = useLocalSearchParams();

  const bookingId = useMemo(
    () => (raw.bookingId ? String(raw.bookingId) : undefined),
    [raw.bookingId]
  );

  const driverId = useMemo(
    () => (raw.driverId ? String(raw.driverId) : undefined),
    [raw.driverId]
  );

  const passengerId = useMemo(
    () => (raw.passengerId ? String(raw.passengerId) : undefined),
    [raw.passengerId]
  );

  const role = useMemo(
    () => (raw.role === "driver" ? "driver" : "passenger"),
    [raw.role]
  );

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("Chat");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const pollRef = useRef<any>(null);
  const listRef = useRef<FlatList>(null);

  const getImageUri = (path?: string | null) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${API}/${String(path).replace(/^\/+/, "")}`;
  };

  const getResolvedSession = useCallback(async () => {
    const [rawPassengerId, rawDriverId, rawToken, rawTodaAuth] = await Promise.all([
      AsyncStorage.getItem("passengerId"),
      AsyncStorage.getItem("driverId"),
      AsyncStorage.getItem("token"),
      AsyncStorage.getItem("toda.auth"),
    ]);

    let todaAuth: any = null;

    try {
      todaAuth = rawTodaAuth ? JSON.parse(rawTodaAuth) : null;
    } catch (e) {
      console.log("AUTH:CHATROOM:getResolvedSession:parse_failed", {
        rawTodaAuth,
      });
    }

    const resolvedUserId =
      role === "driver"
        ? rawDriverId || todaAuth?.userId || todaAuth?.driverId || null
        : rawPassengerId || todaAuth?.userId || todaAuth?.passengerId || null;

    const resolvedToken = rawToken || todaAuth?.token || null;

    console.log("AUTH:CHATROOM:getResolvedSession:resolved", {
      role,
      rawPassengerId,
      rawDriverId,
      hasRawToken: !!rawToken,
      hasTodaAuth: !!rawTodaAuth,
      todaAuthUserId: todaAuth?.userId ?? null,
      todaAuthPassengerId: todaAuth?.passengerId ?? null,
      todaAuthDriverId: todaAuth?.driverId ?? null,
      hasTodaAuthToken: !!todaAuth?.token,
      resolvedUserId,
      hasToken: !!resolvedToken,
    });

    return {
      userId:
        resolvedUserId &&
        resolvedUserId !== "undefined" &&
        resolvedUserId !== "null"
          ? String(resolvedUserId)
          : null,
      token:
        resolvedToken &&
        resolvedToken !== "undefined" &&
        resolvedToken !== "null"
          ? String(resolvedToken)
          : null,
    };
  }, [role]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const session = await getResolvedSession();
        if (mounted) {
          setSessionUserId(session.userId);
          setToken(session.token);
        }
      } finally {
        if (mounted) setAuthReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [getResolvedSession]);

  useEffect(() => {
    const loadHeader = async () => {
      if (!token) return;

      try {
        if (role === "passenger" && driverId) {
          const r = await fetch(`${DRIVER_API}/${driverId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!r.ok) throw new Error("Failed to load driver header");

          const j = await r.json().catch(() => null);
          const d = j?.driver;

          const name =
            d?.driverName ||
            [
              d?.driverFirstName,
              d?.driverMiddleName,
              d?.driverLastName,
              d?.driverSuffix,
            ]
              .filter(Boolean)
              .join(" ");

          setTitle(name || "Driver");
          setAvatar(
            getImageUri(
              d?.selfieImage ||
                d?.profileImage ||
                d?.driverProfileImage ||
                null
            )
          );
        } else if (role === "driver" && passengerId) {
          const r = await fetch(`${PASSENGER_API}/${passengerId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!r.ok) throw new Error("Failed to load passenger header");

          const j = await r.json().catch(() => null);
          const p = j?.passenger;

          const name = [p?.firstName, p?.middleName, p?.lastName, p?.suffix]
            .filter(Boolean)
            .join(" ");

          setTitle(name || "Passenger");
          setAvatar(
            getImageUri(
              p?.profileImage ||
                p?.selfieImage ||
                p?.validIdImage ||
                p?.passengerProfileImage ||
                null
            )
          );
        }
      } catch {
        setTitle(role === "passenger" ? "Driver" : "Passenger");
        setAvatar(null);
      }
    };

    loadHeader();
  }, [driverId, passengerId, role, token]);

  const fetchMessages = async () => {
    if (!token) return;

    let url = "";

    if (driverId && passengerId) {
      url = `${CHAT_API}/${driverId}/${passengerId}`;
    } else if (bookingId) {
      return;
    } else {
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        console.error("❌ fetchMessages failed:", res.status, raw);
        return;
      }

      const data = await res.json();
      const msgs = Array.isArray(data) ? data : [];
      setMessages(msgs);

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (err) {
      console.error("❌ fetchMessages error:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsSeen = async () => {
    if (!driverId || !passengerId || !token) return;

    try {
      await fetch(`${CHAT_API}/seen`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driverId,
          passengerId,
        }),
      });
    } catch (err) {
      console.error("❌ markAsSeen error:", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!driverId || !passengerId || !token) return;

    try {
      const res = await fetch(`${CHAT_API}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driverId,
          passengerId,
          bookingId: bookingId ? Number(bookingId) : undefined,
          message: input.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        Alert.alert("Send failed", data?.message || "Could not send message.");
        return;
      }

      setInput("");
      await fetchMessages();
      await markAsSeen();
    } catch (err) {
      console.error("❌ sendMessage error:", err);
    }
  };

  const pickAndSendImage = async () => {
    if (!driverId || !passengerId || !token) return;

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow gallery access first.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (!asset.uri) return;

      setUploadingImage(true);

      const filename = asset.fileName || `chat-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || "image/jpeg";

      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        name: filename,
        type: mimeType,
      } as any);

      formData.append("driverId", driverId);
      formData.append("passengerId", passengerId);
      if (bookingId) formData.append("bookingId", bookingId);
      formData.append("message", "");

      const res = await fetch(`${CHAT_API}/send-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("❌ send image failed:", data);
        Alert.alert("Upload failed", data?.message || "Could not send image.");
        return;
      }

      await fetchMessages();
      await markAsSeen();
    } catch (err) {
      console.error("❌ pickAndSendImage error:", err);
      Alert.alert("Upload failed", "Something went wrong while sending image.");
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (!authReady || !token) return;

    const load = async () => {
      await fetchMessages();
      await markAsSeen();
    };

    load();

    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      await fetchMessages();
      await markAsSeen();
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [driverId, passengerId, role, token, authReady]);

  const shouldShowTime = (index: number) => {
    const current = messages[index];
    const next = messages[index + 1];

    if (!current) return false;
    if (!next) return true;

    const currentTime = new Date(current.createdAt).getTime();
    const nextTime = new Date(next.createdAt).getTime();
    const diffMs = nextTime - currentTime;

    return diffMs >= 5 * 60 * 1000;
  };

  const renderItem = ({ item, index }: { item: Msg; index: number }) => {
    const isMine = item.senderRole === role;
    const showTime = shouldShowTime(index);
    const isImage = item.messageType === "image" && !!item.imageUrl;

    return (
      <View
        style={[styles.messageRow, isMine ? styles.myRow : styles.theirRow]}
      >
        {isImage ? (
          <View style={styles.imageMessageWrap}>
            <Pressable onPress={() => setPreviewImage(item.imageUrl || null)}>
              <Image source={{ uri: item.imageUrl! }} style={styles.chatImageBubble} />
            </Pressable>

            {!!item.message?.trim() && (
              <View
                style={[
                  styles.captionBubble,
                  isMine ? styles.myBubble : styles.theirBubble,
                ]}
              >
                <Text style={isMine ? styles.myText : styles.theirText}>
                  {item.message}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.bubble,
              isMine ? styles.myBubble : styles.theirBubble,
            ]}
          >
            <Text style={isMine ? styles.myText : styles.theirText}>
              {item.message}
            </Text>
          </View>
        )}

        {showTime ? (
          <Text style={styles.time}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        ) : null}
      </View>
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (role === "driver") {
      router.replace("/homedriver/dchats");
      return;
    }

    router.replace("/homepassenger/pchats");
  };

  if (!authReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!token || !sessionUserId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ marginBottom: 12 }}>Session expired. Please log in again.</Text>
          <TouchableOpacity
            onPress={() =>
              router.replace(
                role === "driver" ? "/login_and_reg/dlogin" : "/login_and_reg/plogin"
              )
            }
            style={{ padding: 12, backgroundColor: "#2563EB", borderRadius: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>

        <Image
          source={
            avatar
              ? { uri: avatar }
              : require("../assets/images/profile-placeholder.jpg")
          }
          style={styles.avatar}
        />

        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 12 }}
      />

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.imageBtn}
          onPress={pickAndSendImage}
          disabled={uploadingImage}
        >
          <Text style={styles.imageBtnText}>{uploadingImage ? "..." : "+"}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
        />

        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Send</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <Pressable
          style={styles.previewOverlay}
          onPress={() => setPreviewImage(null)}
        >
          {previewImage ? (
            <Image source={{ uri: previewImage }} style={styles.previewImage} />
          ) : null}
          <Text style={styles.previewHint}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },

  backBtn: {
    paddingRight: 12,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
    flex: 1,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ddd",
  },

  messageRow: {
    marginHorizontal: 12,
    marginVertical: 4,
    maxWidth: "80%",
  },

  myRow: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },

  theirRow: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },

  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },

  captionBubble: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },

  myBubble: {
    backgroundColor: "#2563EB",
  },

  theirBubble: {
    backgroundColor: "#E5E7EB",
  },

  myText: {
    color: "#fff",
    fontSize: 15,
  },

  theirText: {
    color: "#111",
    fontSize: 15,
  },

  imageMessageWrap: {
    padding: 0,
    backgroundColor: "transparent",
  },

  chatImageBubble: {
    width: 220,
    height: 220,
    borderRadius: 14,
    resizeMode: "cover",
    backgroundColor: "#D1D5DB",
  },

  time: {
    fontSize: 10,
    marginTop: 3,
    color: "#6B7280",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },

  imageBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  imageBtnText: {
    fontSize: 22,
    lineHeight: 22,
    color: "#2563EB",
    fontWeight: "700",
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    height: 42,
  },

  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 20,
    height: 42,
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  previewImage: {
    width: "100%",
    height: "75%",
    resizeMode: "contain",
  },

  previewHint: {
    marginTop: 16,
    color: "#fff",
    fontSize: 13,
    opacity: 0.8,
  },
});