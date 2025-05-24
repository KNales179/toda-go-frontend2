// app/login_and_reg/dregister.tsx
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
import * as ImagePicker from "expo-image-picker";
import API_BASE_URL from "../../config";

export default function DriverRegister() {
  const [photo, setPhoto] = useState<{ uri: string } | null>(null);
  const [votersIDImage, setVotersIDImage] = useState<{ uri: string } | null>(null);
  const [driversLicenseImage, setDriversLicenseImage] = useState<{ uri: string } | null>(null);
  const [orcrImage, setOrcrImage] = useState<{ uri: string } | null>(null);

  const [isSamePerson, setIsSamePerson] = useState(true);
  const [franchiseNumber, setFranchiseNumber] = useState("");
  const [todaName, setTodaName] = useState("");
  const [sector, setSector] = useState("");

  const [operatorName, setOperatorName] = useState("");
  const [operatorPhone, setOperatorPhone] = useState("");
  const [operatorAddress, setOperatorAddress] = useState("");
  const [operatorVotersID, setOperatorVotersID] = useState("");

  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverAddress, setDriverAddress] = useState("");
  const [driverVotersID, setDriverVotersID] = useState("");

  const [experienceYears, setExperienceYears] = useState("");
  const [isLucenaVoter, setIsLucenaVoter] = useState("");
  const [votingLocation, setVotingLocation] = useState("");
  const [commentOrSuggestion, setCommentOrSuggestion] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaTypeOptions.Image],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
  
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset && "uri" in asset) {
        setPhoto(asset.uri); // 👈 your useState setter
      }
    }
  };
  

  const handleSubmit = async () => {
    if (!votersIDImage) {
      Alert.alert("Missing Voter's ID image");
      return;
    }

    const formData = new FormData();

    formData.append("isSamePerson", isSamePerson.toString());
    formData.append("franchiseNumber", franchiseNumber);
    formData.append("todaName", todaName);
    formData.append("sector", sector);
    formData.append("operatorName", operatorName);
    formData.append("operatorPhone", operatorPhone);
    formData.append("operatorAddress", operatorAddress);
    formData.append("operatorVotersID", operatorVotersID);

    if (!isSamePerson) {
      formData.append("driverName", driverName);
      formData.append("driverPhone", driverPhone);
      formData.append("driverAddress", driverAddress);
      formData.append("driverVotersID", driverVotersID);
    }

    formData.append("experienceYears", experienceYears);
    formData.append("isLucenaVoter", isLucenaVoter);
    formData.append("votingLocation", votingLocation);
    formData.append("commentOrSuggestion", commentOrSuggestion);

    // Images
    formData.append("votersIDImage", {
      uri: votersIDImage.uri,
      type: "image/jpeg",
      name: "voters_id.jpg",
    } as any);

    if (driversLicenseImage) {
      formData.append("driversLicenseImage", {
        uri: driversLicenseImage.uri,
        type: "image/jpeg",
        name: "license.jpg",
      } as any);
    }

    if (orcrImage) {
      formData.append("orcrImage", {
        uri: orcrImage.uri,
        type: "image/jpeg",
        name: "orcr.jpg",
      } as any);
    }

    if (photo) {
      formData.append("selfie", {
        uri: photo.uri,
        type: "image/jpeg",
        name: "driver_selfie.jpg",
      } as any);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/driver/register-driver`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (response.ok) {
          Alert.alert("Success", data.message || "Registered!");
        } else {
          Alert.alert("Error", data.error || "Registration failed");
        }
      } catch (e) {
        console.error("Response not JSON:", text);
        Alert.alert("Error", "Invalid server response. Check your backend.");
      }
    } catch (err) {
      console.error("❌ Error submitting form:", err);
      Alert.alert("Error", "Network error");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="black" />
      <TouchableOpacity onPress={() => pickImage(setPhoto)} style={styles.imageContainer}>
        <Image
          source={photo ? { uri: photo.uri } : require("../../assets/images/profile-placeholder.jpg")}
          style={styles.image}
        />
        <Image
          source={require("../../assets/images/camera.png")}
          style={styles.cameraIcon}
        />
      </TouchableOpacity>

      <Text style={styles.label}>Are you both operator and driver?</Text>
      <View style={styles.optionGroup}>
        <TouchableOpacity onPress={() => setIsSamePerson(true)} style={[styles.option, isSamePerson && styles.selected]}>
          <Text>Oo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsSamePerson(false)} style={[styles.option, !isSamePerson && styles.selected]}>
          <Text>Hindi</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="Franchise Number" value={franchiseNumber} onChangeText={setFranchiseNumber} />
      <TextInput style={styles.input} placeholder="Pangalan ng TODA" value={todaName} onChangeText={setTodaName} />
      <TextInput style={styles.input} placeholder="Sektor (East, West...)" value={sector} onChangeText={setSector} />

      <TextInput style={styles.input} placeholder="Pangalan ng Operator" value={operatorName} onChangeText={setOperatorName} />
      <TextInput style={styles.input} placeholder="Phone ng Operator" value={operatorPhone} onChangeText={setOperatorPhone} />
      <TextInput style={styles.input} placeholder="Address ng Operator" value={operatorAddress} onChangeText={setOperatorAddress} />
      <TextInput style={styles.input} placeholder="Voter's ID ng Operator" value={operatorVotersID} onChangeText={setOperatorVotersID} />

      {!isSamePerson && (
        <>
          <TextInput style={styles.input} placeholder="Driver Name" value={driverName} onChangeText={setDriverName} />
          <TextInput style={styles.input} placeholder="Driver Phone" value={driverPhone} onChangeText={setDriverPhone} />
          <TextInput style={styles.input} placeholder="Driver Address" value={driverAddress} onChangeText={setDriverAddress} />
          <TextInput style={styles.input} placeholder="Driver Voter's ID" value={driverVotersID} onChangeText={setDriverVotersID} />
        </>
      )}

      <TextInput style={styles.input} placeholder="Experience (1-5 taon...)" value={experienceYears} onChangeText={setExperienceYears} />
      <TextInput style={styles.input} placeholder="Lucena Voter? (Oo/Hindi)" value={isLucenaVoter} onChangeText={setIsLucenaVoter} />
      <TextInput style={styles.input} placeholder="Lugar ng Boto (if Hindi)" value={votingLocation} onChangeText={setVotingLocation} />
      <TextInput style={styles.input} placeholder="Suggestions (optional)" value={commentOrSuggestion} onChangeText={setCommentOrSuggestion} />

      <TouchableOpacity style={styles.button} onPress={() => pickImage(setVotersIDImage)}>
        <Text style={styles.buttonText}>Upload Voter’s ID</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => pickImage(setDriversLicenseImage)}>
        <Text style={styles.buttonText}>Upload Driver’s License</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => pickImage(setOrcrImage)}>
        <Text style={styles.buttonText}>Upload OR/CR</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 20 },
  imageContainer: { marginBottom: 20, marginTop: 20, position: "relative" },
  image: { width: 100, height: 100, borderRadius: 50 },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
  },
  label: { fontWeight: "bold", marginBottom: 5 },
  optionGroup: { flexDirection: "row", marginBottom: 10 },
  option: { padding: 10, borderWidth: 1, borderRadius: 8, marginHorizontal: 5 },
  selected: { backgroundColor: "#d0e8ff", borderColor: "#1e90ff" },
  input: {
    width: "100%", padding: 12, borderWidth: 1, borderRadius: 10,
    marginBottom: 10, backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#ccc", padding: 12, borderRadius: 10,
    width: "100%", marginVertical: 5,
  },
  submitButton: {
    backgroundColor: "#1e90ff", padding: 15, borderRadius: 10, width: "100%", marginTop: 15,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});
