// PChats.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Image, RefreshControl
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const API = `${API_BASE_URL.replace(/\/$/, "")}/api/chat`;

export default function PChats() {
  const [passengerId, setPassengerId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem("passengerId")
      .then(v => setPassengerId(v))
      .catch(() => setPassengerId(null));
  }, []);

  const fetchSessions = async () => {
    if (!passengerId) return;
    try {
      if (!refreshing) setLoading(sessions.length === 0); // keep UI calm if already have data
      const res = await fetch(`${API}/sessions/passenger/${passengerId}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ fetch passenger sessions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch whenever screen gains focus + start light polling
  useFocusEffect(
    React.useCallback(() => {
      fetchSessions();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(fetchSessions, 5000); // 5s is light + responsive
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [passengerId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => {
        router.push({
          pathname: "/ChatRoom",
          params: {
            // bookingId kept for legacy/tagging, but chat is pair-based
            bookingId: String(item.bookingId ?? ""),
            driverId: item.driverId,
            passengerId: passengerId!,
            role: "passenger",
          },
        });
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.driverName || "Driver"}</Text>
        <Text numberOfLines={1} style={styles.preview}>
          {item.lastMessage || "— no messages yet —"}
        </Text>
      </View>
      <Text style={styles.time}>
        {item.lastAt ? new Date(item.lastAt).toLocaleString() : ""}
      </Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.loading}><ActivityIndicator /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MESSAGES</Text>
      {sessions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Image source={require('../../assets/images/chat.png')} style={styles.chatImage} />
          <Text style={styles.message}>
            Ang message dito ay lalabas kapag nakapag-book ka na at may kausap na driver.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(i) => `${i.driverId}`}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 50 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  row: { padding: 12, borderBottomWidth: 1, borderColor: "#eee", flexDirection: "row", alignItems: "center" },
  name: { fontWeight: "700" },
  preview: { color: "#333", marginTop: 4, maxWidth: 220 },
  time: { fontSize: 11, color: "#888" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  chatImage: { width: 150, height: 150, marginBottom: 20, resizeMode: 'contain' },
  message: { textAlign: 'center', fontSize: 14, color: '#333' },
});
