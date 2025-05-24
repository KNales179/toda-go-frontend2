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
      mediaTypes: [ImagePicker.MediaType.Images],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
  
    const asset = (result.assets as any)[0];
    setPhoto(asset.uri);
  };

  const handleRegister = async () => {
    
    const formData = new FormData();
    

    formData.append("isSamePerson", isSamePerson.toString());

    formData.append("driverName", fullName);
    formData.append("driverPhone", phone);
    formData.append("email", email);
    formData.append("street", street);
    formData.append("barangay", barangay);
    formData.append("city", city);
    formData.append("province", province);
    formData.append("franchiseNumber", registrationNumber);
    formData.append("todaName", todaName);

    if (!isSamePerson) {
      formData.append("operatorName", operatorName);
      formData.append("operatorPhone", operatorPhone);
      formData.append("operatorAddress", operatorAddress);
      formData.append("operatorVotersID", operatorVotersID);
    }

    if (photo) {
      formData.append("selfie", {
        uri: photo.uri,
        type: "image/jpeg",
        name: "driver_selfie.jpg",
      } as any);
    }

    try {
      const response = await fetch("https://toda-go-backend-1.onrender.com/api/auth/driver/register-driver", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const text = await response.text();
      console.log("Raw response:", text); // ← this will show the HTML or error
      try {
        const data = JSON.parse(text);
        if (response.ok) {
          Alert.alert("Success", "Driver registered successfully!");
        } else {
          Alert.alert("Error", data?.error || "Something went wrong");
        }
      } catch (e) {
        console.error("Response not JSON:", text);
        Alert.alert("Error", "Invalid server response. Check your backend.");
      }
    } catch (error) {
      console.error("Fetch error", error);
      Alert.alert("Error", "Something went wrong");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
        <View style={{paddingTop: 30}}>
          <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />
        </View>
      <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
      <Image
        source={photo ? { uri: photo.uri } : require("../../assets/images/profile-placeholder.jpg")}
        style={styles.image}
      />
        <Text style={styles.cameraIcon}>📷</Text>
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
    fontSize: 18,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
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
