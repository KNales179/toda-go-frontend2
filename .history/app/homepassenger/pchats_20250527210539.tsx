import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { router } from 'expo-router';

const { width } = Dimensions.get("window");

export default function PChats() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>MESSAGES</Text>
      <Image source={require('../../assets/chat.png')} style={styles.chatImage} />
      <Text style={styles.message}>Ang message dito ay lalabas kapag naka pag book ka na ng ride sa iyong driver.</Text>

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => router.push("/homepassenger/phome")}>
          <Ionicons name="home-outline" size={30} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/phistory")}>
          <Ionicons name="document-text-outline" size={30} color="black" />
          <Text>History</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/pchats")}>
          <Ionicons name="chatbubbles" size={30} color="black" />
          <Text>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/pprofile")}>
          <Ionicons name="person-outline" size={30} color="black" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  heading: { fontWeight: 'bold', fontSize: 18, marginBottom: 20 },
  chatImage: { width: 150, height: 150, marginBottom: 20, resizeMode: 'contain' },
  message: { textAlign: 'center', fontSize: 14, color: '#333' },
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
});
