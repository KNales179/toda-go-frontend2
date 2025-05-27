// phistory.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function PHistory() {
  return (
    <View style={styles.container}>
        <Text>Passenger History Page</Text>
        <View style={styles.bottomNav}>
            <TouchableOpacity><Ionicons name="home" size={30} color="black" /><Text>Home</Text></TouchableOpacity>
            <TouchableOpacity><Ionicons name="document-text-outline" size={30} color="black" /><Text>History</Text></TouchableOpacity>
            <TouchableOpacity><Ionicons name="chatbubbles-outline" size={30} color="black" /><Text>Chats</Text></TouchableOpacity>
            <TouchableOpacity><Ionicons name="person-outline" size={30} color="black" /><Text>Profile</Text></TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
