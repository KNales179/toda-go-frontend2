import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions } from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function PassengerHome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <View style={styles.inner}>
        <Text style={styles.title}>Welcome, Passenger!</Text>
        <Text style={styles.subtitle}>You are now logged in.</Text>

        <TouchableOpacity
          style={styles.button}
        //   onPress={() => router.push("/somewhere")} // Replace with your real pages later
        >
          <Text style={styles.buttonText}>Go to Available Rides</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#DD1F1F" }]}
          onPress={() => router.push("/login_and_reg/plogin")} // Simulate logout (go back to login)
        >
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  inner: { width: width * 0.85, alignItems: "center" },
  title: { fontSize: 26, fontWeight: "bold", color: "#414141", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 30 },
  button: {
    width: "100%",
    backgroundColor: "#5089A3",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
