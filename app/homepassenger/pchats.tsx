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

  const fetchSessions = useCallback(async () => {
    if (!passengerId) return;
    try {
      const res = await fetch(`${API}/sessions/passenger/${passengerId}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ fetch passenger sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [passengerId]);

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

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        router.push({
          pathname: "/ChatRoom",
          params: {
            bookingId: String(item.bookingId ?? ""),
            driverId: item.driverId,
            passengerId, // from AsyncStorage
            role: "passenger",
          },
        })
      }
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.booking}>{item.driverName || "Driver"}</Text>
        <Text numberOfLines={1} style={styles.preview}>
          {item.lastMessage || "— no messages yet —"}
        </Text>
      </View>
      <Text style={styles.time}>
        {item.lastAt ? new Date(item.lastAt).toLocaleString() : ""}
      </Text>
    </TouchableOpacity>
  );

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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 50 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  row: { padding: 12, borderBottomWidth: 1, borderColor: "#eee", flexDirection: "row", alignItems: "center" },
  booking: { fontWeight: "700" },
  preview: { color: "#333", marginTop: 4, maxWidth: 220 },
  time: { fontSize: 11, color: "#888" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  contentContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  chatImage: { width: 150, height: 150, marginBottom: 20, resizeMode: "contain" },
  message: { textAlign: "center", fontSize: 14, color: "#333" },
});
