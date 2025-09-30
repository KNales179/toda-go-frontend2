// ChatRoom.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar, Platform } from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { API_BASE_URL } from "../config";

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
  message: string;
  createdAt: string;
};

export default function ChatRoom() {
  const raw = useLocalSearchParams();
  // Cast params safely (expo-router can give string | string[])
  const bookingId = useMemo(() => (raw.bookingId ? String(raw.bookingId) : undefined), [raw.bookingId]);
  const driverId = useMemo(() => (raw.driverId ? String(raw.driverId) : undefined), [raw.driverId]);
  const passengerId = useMemo(() => (raw.passengerId ? String(raw.passengerId) : undefined), [raw.passengerId]);
  const role = useMemo(() => (raw.role === "driver" ? "driver" : "passenger"), [raw.role]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("Chat");
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<any>(null);

  // Header name = other party
  useEffect(() => {
    const loadName = async () => {
      try {
        if (role === "passenger" && driverId) {
          const r = await fetch(`${DRIVER_API}/${driverId}`);
          const j = await r.json();
          const d = j?.driver;
          const name =
            d?.driverName ||
            [d?.firstName, d?.middleName, d?.lastName].filter(Boolean).join(" ");
          setTitle(name || "Driver");
        } else if (role === "driver" && passengerId) {
          const r = await fetch(`${PASSENGER_API}/${passengerId}`);
          const j = await r.json();
          const p = j?.passenger;
          const name = [p?.firstName, p?.middleName, p?.lastName]
            .filter(Boolean)
            .join(" ");
          setTitle(name || "Passenger");
        } else {
          setTitle(role === "passenger" ? "Driver" : "Passenger");
        }
      } catch {
        setTitle(role === "passenger" ? "Driver" : "Passenger");
      }
    };
    loadName();
  }, [driverId, passengerId, role]);

  // Fetch messages (pair-based preferred; fallback to booking-based)
  const fetchMessages = async () => {
    let url = "";
    if (driverId && passengerId) {
      url = `${CHAT_API}/${encodeURIComponent(driverId)}/${encodeURIComponent(passengerId)}`;
    } else if (bookingId) {
      // old path kept for backward-compat if you still have booking-only chats
      url = `${CHAT_API}/${encodeURIComponent(bookingId)}`;
    } else {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(url);
      if (!res.ok) {
        console.error("❌ fetchMessages error:", res.status, await res.text());
        return;
      }
      const data = (await res.json()) as Msg[] | unknown;
      setMessages(Array.isArray(data) ? (data as Msg[]) : []);
    } catch (err) {
      console.error("❌ fetchMessages error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Send message (pair-based with optional booking tag)
  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!driverId || !passengerId) {
      console.warn("Missing driverId or passengerId; cannot send.");
      return;
    }
    try {
      await fetch(`${CHAT_API}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          passengerId,
          bookingId: bookingId ? Number(bookingId) : undefined,
          senderId: role === "driver" ? driverId : passengerId,
          senderRole: role,
          message: input.trim(),
        }),
      });
      setInput("");
      fetchMessages();
    } catch (err) {
      console.error("❌ sendMessage error:", err);
    }
  };



  const renderItem = ({ item }: { item: Msg }) => (
    <View
      style={[
        styles.message,
        item.senderRole === role ? styles.myMessage : styles.theirMessage,
      ]}
    >
      <Text style={styles.text}>{item.message}</Text>
      <Text style={styles.time}>
        {new Date(item.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );

  const handleBack = () => {
    // Adjust to your real list routes
    router.replace(role === "driver" ? "/homedriver/dchats" : "/homepassenger/pchats");
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={{ color: "#007bff" }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Empty / loading hint */}
      {loading && messages.length === 0 ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: "#666" }}>Loading messages…</Text>
        </View>
      ) : null}

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8 }}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  backBtn: { paddingRight: 12, paddingVertical: 6, width: 60 },
  headerTitle: { flex: 1, textAlign: "center", fontWeight: "700", fontSize: 16 },
  message: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 10,
    borderRadius: 10,
    maxWidth: "85%",
  },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#007bff" },
  theirMessage: { alignSelf: "flex-start", backgroundColor: "#e5e5e5" },
  text: { color: "#000" },
  time: { fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: "right" },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#007bff",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },
});
