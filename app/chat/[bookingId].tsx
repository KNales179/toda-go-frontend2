// app/chat/[bookingId].tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function ChatRoom() {
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log("ChatRoom params:", params);
  }, [params]);

  const bookingId = params.bookingId;
  const driverId = params.driverId;
  const passengerId = params.passengerId;
  const role = params.role;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ChatRoom Debug</Text>
      <Text style={styles.line}>bookingId: {String(bookingId ?? "—")}</Text>
      <Text style={styles.line}>driverId: {String(driverId ?? "—")}</Text>
      <Text style={styles.line}>passengerId: {String(passengerId ?? "—")}</Text>
      <Text style={styles.line}>role: {String(role ?? "—")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
    width,
    height,
  },
  title: {
    fontWeight: "700",
    fontSize: 20,
    marginBottom: 12,
  },
  line: {
    fontSize: 16,
    marginBottom: 6,
  },
});
