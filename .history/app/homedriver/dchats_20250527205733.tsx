import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from 'expo-router'; 
const { width, height } = Dimensions.get("window");

export default function PHistory() {
  return (
    <View style={styles.container}>
        <Text>Passenger Chats Page</Text>
        <View style={styles.bottomNav}>
            <TouchableOpacity onPress={() => router.push("/homedriver/dhome")}><Ionicons name="home-outline" size={30} color="black" /><Text>Home</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/homedriver/dhistory")}><Ionicons name="document-text-outline" size={30} color="black" /><Text>History</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/homedriver/dchats")}><Ionicons name="chatbubbles" size={30} color="black" /><Text>Chats</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/homedriver/dprofile")}><Ionicons name="person-outline" size={30} color="black" /><Text>Profile</Text></TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
});
