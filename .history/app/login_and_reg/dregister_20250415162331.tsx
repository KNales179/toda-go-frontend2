import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function DriverRegister() {
  const [photo, setPhoto] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [todaName, setTodaName] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset && 'uri' in asset) {
        setPhoto(asset.uri);
      }
    }        
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
        <Image
          source={photo ? { uri: photo } : require("../assets/profile-placeholder.png")}
          style={styles.image}
        />
        <Text style={styles.cameraIcon}>📷</Text>
      </TouchableOpacity>

      <TextInput style={styles.input} placeholder="Buong Pangalan" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Cellphone Number Driver" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Street" value={street} onChangeText={setStreet} />
      <TextInput style={styles.input} placeholder="Barangay" value={barangay} onChangeText={setBarangay} />
      <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
      <TextInput style={styles.input} placeholder="Province" value={province} onChangeText={setProvince} />
      <TextInput style={styles.input} placeholder="Registration Number" value={registrationNumber} onChangeText={setRegistrationNumber} />
      <TextInput style={styles.input} placeholder="Pangalan ng TODA" value={todaName} onChangeText={setTodaName} />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 20,
  },
  imageContainer: {
    marginBottom: 20,
    position: "relative",
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    fontSize: 18,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#1e90ff",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});
