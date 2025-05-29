import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from 'expo-router'; 
const { width, height } = Dimensions.get("window");

export default function PHistory() {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>HISTORY</Text>
      </View>

      <View style={styles.container2}>
        <Image source={require('../../assets/images/tricycle.png')} style={styles.chatImage} />
        <Text style={styles.message}>Mag Book na para mag ka history ka.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  topBar: { marginTop: 40, marginBottom: 20 }, // Adjust top margin as needed
  heading: { fontWeight: 'bold', fontSize: 22 },
  container2: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatImage: { width: 150, height: 150, marginBottom: 20, resizeMode: 'contain' },
  message: { textAlign: 'center', fontSize: 14, color: '#333' },
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
});
