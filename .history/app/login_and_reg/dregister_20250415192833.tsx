import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import API_BASE_URL from "../../config";
import * as ImagePicker from "expo-image-picker";

export default function DriverRegister() {
  const [photo, setPhoto] = useState<{ uri: string } | null>(null);
  const [isSamePerson, setIsSamePerson] = useState(true);

  // Shared fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [todaName, setTodaName] = useState("");

  // Operator fields (if not the same person)
  const [operatorName, setOperatorName] = useState("");
  const [operatorPhone, setOperatorPhone] = useState("");
  const [operatorAddress, setOperatorAddress] = useState("");
  const [operatorVotersID, setOperatorVotersID] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
  
    const asset = (result.assets as any)[0];
    setPhoto(asset.uri);
  };

  const handleRegister = async () => {
    try {
      console.log("📸 Preparing form data...");
  
      const formData = new FormData();
  
      formData.append("isSamePerson", isSamePerson ? "true" : "false");
      formData.append("franchiseNumber", registrationNumber);
      formData.append("todaName", todaName);
      formData.append("sector", "East"); // Change this to a dynamic field if needed
  
      formData.append("operatorName", operatorName);
      formData.append("operatorPhone", operatorPhone);
      formData.append("operatorAddress", operatorAddress);
      formData.append("operatorVotersID", operatorVotersID);
  
      if (!isSamePerson) {
        formData.append("driverName", fullName);
        formData.append("driverPhone", phone);
        formData.append("driverAddress", `${street}, ${barangay}, ${city}, ${province}`);
        formData.append("driverVotersID", ""); // Optional field, modify if needed
      }
  
      formData.append("experienceYears", "1-5 taon"); // Example value
      formData.append("isLucenaVoter", "Oo");
      formData.append("votingLocation", "Lucena");
  
      if (photo) {
        formData.append("selfie", {
          uri: photo,
          name: "driver_selfie.jpg",
          type: "image/jpeg",
        } as any);
      }
  
      console.log("🌐 Sending fetch to backend...");
      const response = await fetch(`${API_BASE_URL}/api/auth/driver/register-driver`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });
  
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        console.log("✅ Got response!", data);
  
        if (response.ok) {
          Alert.alert("Success", "Driver registered successfully!");
        } else {
          Alert.alert("Error", data?.error || "Something went wrong");
        }
      } catch (e) {
        console.error("❌ Response not JSON:", text);
        Alert.alert("Error", "Invalid server response. Check your backend.");
      }
    } catch (error) {
      console.error("❌ Network or fetch error:", error);
      Alert.alert("Error", "Network request failed. Check your internet or backend.");
    }
  };
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
        <View style={{paddingTop: 30}}>
          <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />
        </View>
      <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
        <Image
          source={photo ? { uri: photo } : require("../../assets/images/profile-placeholder.jpg")}
          style={styles.image}
        />
        <Image
          source={require("../../assets/images/camera.png")}
          style={styles.cameraIcon}
        />
      </TouchableOpacity>

      <Text style={{ marginBottom: 5, fontWeight: "bold" }}>
        Ikaw ba ay parehong Operator at Driver?
      </Text>
      <View style={{ flexDirection: "row", marginBottom: 15 }}>
        <TouchableOpacity
          style={[styles.option, isSamePerson && styles.selected]}
          onPress={() => setIsSamePerson(true)}
        >
          <Text>Oo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, !isSamePerson && styles.selected]}
          onPress={() => setIsSamePerson(false)}
        >
          <Text>Hindi</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="Buong Pangalan" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Cellphone Number Driver" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Street" value={street} onChangeText={setStreet} />
      <TextInput style={styles.input} placeholder="Barangay" value={barangay} onChangeText={setBarangay} />
      <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
      <TextInput style={styles.input} placeholder="Province" value={province} onChangeText={setProvince} />
      <TextInput style={styles.input} placeholder="Registration Number" value={registrationNumber} onChangeText={setRegistrationNumber} />
      <TextInput style={styles.input} placeholder="Pangalan ng TODA" value={todaName} onChangeText={setTodaName} />

      {!isSamePerson && (
        <>
          <TextInput style={styles.input} placeholder="Pangalan ng Operator" value={operatorName} onChangeText={setOperatorName} />
          <TextInput style={styles.input} placeholder="Cellphone Number ng Operator" value={operatorPhone} onChangeText={setOperatorPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Address ng Operator" value={operatorAddress} onChangeText={setOperatorAddress} />
          <TextInput style={styles.input} placeholder="Voter’s ID ng Operator" value={operatorVotersID} onChangeText={setOperatorVotersID} />
        </>
      )}

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
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
    marginTop: 20,
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
    width: 24,
    height: 24,
    tintColor: "#000", // Optional: tint the icon if it's a transparent PNG
  },  
  option: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  selected: {
    backgroundColor: "#d0e8ff",
    borderColor: "#1e90ff",
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
