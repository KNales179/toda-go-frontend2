import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../../config";

const { width } = Dimensions.get("window");

export default function PProfile() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const passengerId = await AsyncStorage.getItem("passengerId");
        const response = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`);
        const result = await response.json();
        if (result.passenger) {
          setProfile(result.passenger);
        } else {
          console.warn("⚠️ Passenger not found");
        }
      } catch (error) {
        console.error("❌ Failed to fetch passenger profile:", error);
      }
    };

    fetchProfile();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>PROFILE</Text>
      {profile ? (
        <>
          {profile.profileImage && (
            <Image
              source={{ uri: `${API_BASE_URL}/${profile.profileImage}` }}
              style={styles.profileImage}
            />
          )}
          <Text style={styles.info}>Name: {profile.firstname} {profile.middleName} {profile.lastname}</Text>
          <Text style={styles.info}>Email: {profile.email}</Text>
          <Text style={styles.info}>Phone: {profile.contact || "Not Provided"}</Text>
          <Text style={styles.info}>Birthday: {profile.birthday || "Not Provided"}</Text>
        </>
      ) : (
        <Text style={{ color: "#888" }}>Loading profile...</Text>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => router.push("/homepassenger/phome")}><Ionicons name="home-outline" size={30} color="black" /><Text>Home</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/phistory")}><Ionicons name="document-text-outline" size={30} color="black" /><Text>History</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/pchats")}><Ionicons name="chatbubbles-outline" size={30} color="black" /><Text>Chats</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/pprofile")}><Ionicons name="person" size={30} color="black" /><Text>Profile</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  heading: { fontWeight: 'bold', fontSize: 18, marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  info: { fontSize: 14, color: '#333', marginVertical: 2 },
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
});
