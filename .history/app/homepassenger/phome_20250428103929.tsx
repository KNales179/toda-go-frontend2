// 📍 Passenger HomePage - phome.tsx

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TextInput } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocation } from "../location/GlobalLocation";


const { width, height } = Dimensions.get("window");

export default function PHome() {
  const { location, loading } = useLocation();
  const router = useRouter();
  console.log(location)

  if (loading || !location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 20 }}>Loading Map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          title="You are here"
        />
      </MapView>

      {/* Floating Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader} />

        <TouchableOpacity style={styles.inputBox}>
          <Ionicons name="location-outline" size={20} color="#616161" />
          <Text style={styles.inputText}>Saan ka papunta ngayon?</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="#616161" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputBox}>
          <MaterialIcons name="swap-vert" size={20} color="#616161" />
          <Text style={styles.inputText}>Saan ka ihahatid?</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="#616161" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputBoxSimple}>
          <MaterialIcons name="edit" size={20} color="#616161" />
          <Text style={styles.inputText}>Notes sa driver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputBox}>
          <MaterialIcons name="payments" size={20} color="#616161" />
          <Text style={styles.inputText}>Paano ka magbabayad</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="#616161" />
        </TouchableOpacity>

        <View style={styles.totalFareContainer}>
          <View style={styles.fareBox}>
            <Text style={styles.totalFareText}>Total Fare: 9999</Text>
          </View>
          <TouchableOpacity style={styles.bookNowButton}>
            <Text style={styles.bookNowText}>BOOK NOW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity>
          <Ionicons name="home" size={30} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="document-text-outline" size={30} color="black" />
          <Text>History</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="chatbubbles-outline" size={30} color="black" />
          <Text>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="person-outline" size={30} color="black" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    position: "absolute",
    bottom: 80,
    backgroundColor: "#81C3E1",
    width: width * 0.9,
    alignSelf: "center",
    borderRadius: 10,
    padding: 15,
  },
  cardHeader: {
    width: 50,
    height: 4,
    backgroundColor: "black",
    alignSelf: "center",
    borderRadius: 5,
    marginBottom: 10,
  },
  inputBox: {
    backgroundColor: "white",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 5,
  },
  inputBoxSimple: {
    backgroundColor: "white",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 5,
  },
  inputText: { flex: 1, marginLeft: 10, fontSize: 15, color: "#616161" },
  totalFareContainer: { flexDirection: "row", marginTop: 10 },
  fareBox: {
    flex: 1,
    borderRadius: 3
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginRight: 5,
  },
  totalFareText: { fontSize: 16, fontWeight: "bold" },
  bookNowButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    marginLeft: 5,
  },
  bookNowText: { fontSize: 16, fontWeight: "bold" },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    width: width,
    height: 70,
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: "center",
  },
});
