// app/homepassenger/notifications.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from "../../config";

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  category: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
      try {
        setLoading(true);

        const passengerId = await AsyncStorage.getItem("passengerId");
        const token = await AsyncStorage.getItem("token");
        console.log("[NOTIFS] passengerId =", passengerId);
        console.log("[NOTIFS] token exists =", !!token);

        if (!passengerId) {
          console.log("❌ [NOTIFS] Missing passengerId");
          setNotifications([]);
          return;
        }

        const url = `${API_BASE_URL}/api/notifications?userType=passenger&userId=${encodeURIComponent(
          passengerId
        )}`;


        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const text = await res.text();
        let data: any = null;

        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          console.log("❌ [NOTIFS] non-JSON body (first 200):", text.slice(0, 200));
        }

        if (!res.ok) {
          console.log("❌ [NOTIFS] fetch failed:", res.status, data);
          setNotifications([]);
          return;
        }

        const list = Array.isArray(data?.items) ? data.items : [];
        setNotifications(list);
      } catch (err) {
        console.error("❌ Failed to fetch notifications:", err);
        setNotifications([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };


  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        console.log("❌ [NOTIFS] markAsRead failed:", res.status, data);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
    } catch (err) {
      console.error("❌ [NOTIFS] Failed to mark as read:", err);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.readAt;

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => markAsRead(item._id)}
        activeOpacity={0.85}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{item.title}</Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.message}>{item.message}</Text>

        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5089A3" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        <TouchableOpacity onPress={fetchNotifications}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#5089A3"
          style={{ marginTop: 40 }}
        />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    backgroundColor: "#5089A3",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#999",
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#5089A3",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
    fontSize: 15,
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    color: "#555",
  },
  date: {
    marginTop: 8,
    fontSize: 12,
    color: "#999",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5089A3",
  },
});
