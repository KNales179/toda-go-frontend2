// app/login_and_reg/dregister.tsx

import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert, Platform,} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import API_BASE_URL from "../../config";
import { Picker } from "@react-native-picker/picker";

export default function DriverRegister() {
  const [role, setRole] = useState("Driver"); // Default role
  const isBoth = role === "Both";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [selfie, setSelfie] = useState<ImagePickerAsset | null>(null);
  const [votersIDImage, setVotersIDImage] = useState<ImagePickerAsset | null>(null);
  const [driversLicenseImage, setDriversLicenseImage] = useState<ImagePickerAsset | null>(null);
  const [orcrImage, setOrcrImage] = useState<ImagePickerAsset | null>(null);
  
  const [franchiseNumber, setFranchiseNumber] = useState("");
  const [sector, setSector] = useState("");
  
  

  // Operator fields
  const [operatorFirstName, setOperatorFirstName] = useState("");
  const [operatorMiddleName, setOperatorMiddleName] = useState("");
  const [operatorLastName, setOperatorLastName] = useState("");
  const [operatorSuffix, setOperatorSuffix] = useState("");
  const [operatorBirthdate, setOperatorBirthdate] = useState("");
  const [showOperatorDate, setShowOperatorDate] = useState(false);
  const [operatorPhone, setOperatorPhone] = useState("");

  // Driver fields
  const [driverFirstName, setDriverFirstName] = useState("");
  const [driverMiddleName, setDriverMiddleName] = useState("");
  const [driverLastName, setDriverLastName] = useState("");
  const [driverSuffix, setDriverSuffix] = useState("");
  const [driverBirthdate, setDriverBirthdate] = useState("");
  const [showDriverDate, setShowDriverDate] = useState(false);
  const [driverPhone, setDriverPhone] = useState("");

  // Voting
  const [experienceYears, setExperienceYears] = useState("");
  const [isLucenaVoter, setIsLucenaVoter] = useState("");
  const [votingLocation, setVotingLocation] = useState("");

  const isOperator = role === "Operator" || role === "Both";
  const isDriver = role === "Driver" || role === "Both";

  const [isSamePerson, setIsSamePerson] = useState(true);
  const [todaName, setTodaName] = useState("");

  const pickImage = async (setImageFunc: (asset: ImagePickerAsset) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageFunc(result.assets[0]);
    }
  };

  const handleDateChange = (
    selectedDate: Date,
    setFunc: (val: string) => void,
    setShow: (val: boolean) => void
  ) => {
    setShow(Platform.OS === "ios");
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split("T")[0];
      setFunc(formatted);
    }
  };

  const handleSubmit = async () => {

    const formData = new FormData();
    formData.append("role", role);
    formData.append("email", email);
    formData.append("password", password);

    formData.append("isSamePerson", isSamePerson.toString());
    formData.append("franchiseNumber", franchiseNumber);
    formData.append("todaName", todaName);
    formData.append("sector", sector);

    // Operator fields
    const operatorName = `${operatorFirstName} ${operatorMiddleName} ${operatorLastName} ${operatorSuffix}`.trim();
    formData.append("operatorName", operatorName);
    formData.append("operatorFirstName", operatorFirstName);
    formData.append("operatorMiddleName", operatorMiddleName);
    formData.append("operatorLastName", operatorLastName);
    formData.append("operatorSuffix", operatorSuffix);
    formData.append("operatorBirthdate", operatorBirthdate);
    formData.append("operatorPhone", operatorPhone);

    if (!isSamePerson) {
      const driverName = `${driverFirstName} ${driverMiddleName} ${driverLastName} ${driverSuffix}`.trim();
      formData.append("driverName", driverName);
      formData.append("driverFirstName", driverFirstName);
      formData.append("driverMiddleName", driverMiddleName);
      formData.append("driverLastName", driverLastName);
      formData.append("driverSuffix", driverSuffix);
      formData.append("driverBirthdate", driverBirthdate);
      formData.append("driverPhone", driverPhone);
    }

    formData.append("experienceYears", experienceYears);
    formData.append("isLucenaVoter", isLucenaVoter);
    formData.append("votingLocation", votingLocation);

    // Images
    
    if (!votersIDImage) {
      Alert.alert("Missing Voter's ID image");
      return;
    }
    if (!selfie) {
      Alert.alert("Missing Voter's ID image");
      return;
    }
    formData.append("votersIDImage", {
      uri: votersIDImage.uri,
      type: "image/jpeg",
      name: "voter_id.jpg",
    } as any);

    formData.append("selfie", {
      uri: selfie.uri,
      type: "image/jpeg",
      name: "selfie.jpg",
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

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/driver/register-driver`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text); // ✅ only parse if JSON
      } catch (e) {
        console.error("❌ Response not JSON:", text);
        Alert.alert("Error", "Invalid server response. Check your backend.");
        return;
      }
      if (response.ok) {
        Alert.alert("Success", data.message);
      } else {
        Alert.alert("Error", data.error || "Registration failed");
      }
    } catch (err) {
      console.error("Driver registration failed:", err);
      Alert.alert("Error", "Network error or server issue");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="black" />
      <Text style={styles.title}>Driver Registration</Text>

      <Text style={styles.label}>Are you also the Driver?</Text>
      <View style={styles.optionGroup}>
        <TouchableOpacity onPress={() => setIsSamePerson(true)} style={[styles.option, isSamePerson && styles.selected]}>
          <Text>Oo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsSamePerson(false)} style={[styles.option, !isSamePerson && styles.selected]}>
          <Text>Hindi</Text>
        </TouchableOpacity>
      </View>


      {/* Group: Operator Name */}
      <Text style={styles.subheading}>Operator Information</Text>
      <TextInput style={styles.input} placeholder="First Name" value={operatorFirstName} onChangeText={setOperatorFirstName} />
      <TextInput style={styles.input} placeholder="Middle Name" value={operatorMiddleName} onChangeText={setOperatorMiddleName} />
      <TextInput style={styles.input} placeholder="Last Name" value={operatorLastName} onChangeText={setOperatorLastName} />
      <TextInput style={styles.input} placeholder="Suffix (if any)" value={operatorSuffix} onChangeText={setOperatorSuffix} />
      <TouchableOpacity style={styles.input} onPress={() => setShowOperatorDate(true)}>
        <Text style={{ color: operatorBirthdate ? "black" : "#aaa" }}>
          {operatorBirthdate || "Select Birthdate"}
        </Text>
      </TouchableOpacity>
      {showOperatorDate && (
        <DateTimePicker
          value={operatorBirthdate ? new Date(operatorBirthdate) : new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => handleDateChange(d!, setOperatorBirthdate, setShowOperatorDate)}
          maximumDate={new Date()}
        />
      )}

      <TextInput style={styles.input} placeholder="Phone" value={operatorPhone} onChangeText={setOperatorPhone} />
      <TextInput style={styles.input} placeholder="Address" value={operatorAddress} onChangeText={setOperatorAddress} />
      <TextInput style={styles.input} placeholder="Voter's ID" value={operatorVotersID} onChangeText={setOperatorVotersID} />

      {/* Group: Driver if different */}
      {!isSamePerson && (
        <>
          <Text style={styles.subheading}>Driver Information</Text>
          <TextInput style={styles.input} placeholder="First Name" value={driverFirstName} onChangeText={setDriverFirstName} />
          <TextInput style={styles.input} placeholder="Middle Name" value={driverMiddleName} onChangeText={setDriverMiddleName} />
          <TextInput style={styles.input} placeholder="Last Name" value={driverLastName} onChangeText={setDriverLastName} />
          <TextInput style={styles.input} placeholder="Suffix (if any)" value={driverSuffix} onChangeText={setDriverSuffix} />
          <TouchableOpacity style={styles.input} onPress={() => setShowDriverDate(true)}>
            <Text style={{ color: driverBirthdate ? "black" : "#aaa" }}>
              {driverBirthdate || "Select Birthdate"}
            </Text>
          </TouchableOpacity>
          {showDriverDate && (
            <DateTimePicker
              value={driverBirthdate ? new Date(driverBirthdate) : new Date()}
              mode="date"
              display="default"
              onChange={(e, d) => handleDateChange(d!, setDriverBirthdate, setShowDriverDate)}
              maximumDate={new Date()}
            />
          )}
          <TextInput style={styles.input} placeholder="Phone" value={driverPhone} onChangeText={setDriverPhone} />
          <TextInput style={styles.input} placeholder="Address" value={driverAddress} onChangeText={setDriverAddress} />
          <TextInput style={styles.input} placeholder="Voter's ID" value={driverVotersID} onChangeText={setDriverVotersID} />
        </>
      )}

      {/* Group: Voting */}
      <View style={styles.pickercontainer}>
        <Picker selectedValue={experienceYears} onValueChange={setExperienceYears} mode="dropdown">
          <Picker.Item label="Select Experience" value="" />
          <Picker.Item label="1-5 taon" value="1-5 taon" />
          <Picker.Item label="6-10 taon" value="6-10 taon" />
          <Picker.Item label="16-20 taon" value="16-20 taon" />
          <Picker.Item label="20 taon pataas" value="20 taon pataas" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>
      <View style={styles.pickercontainer}>
        <Picker
          selectedValue={isLucenaVoter} onValueChange={setIsLucenaVoter} mode="dropdown">
          <Picker.Item label="Select Lucena Voter Status" value="" />
          <Picker.Item label="Oo" value="Oo" />
          <Picker.Item label="Hindi" value="Hindi" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>
      <TextInput style={styles.input} placeholder="Lugar ng Boto (if Hindi)" value={votingLocation} onChangeText={setVotingLocation} />
      
      {/* Group: Shared */}
      <TextInput style={styles.input} placeholder="Franchise Number" value={franchiseNumber} onChangeText={setFranchiseNumber} />
      <TextInput style={styles.input} placeholder="TODA Name" value={todaName} onChangeText={setTodaName} />
      <View style={styles.pickercontainer}>
        <Picker selectedValue={sector} onValueChange={setSector} mode="dropdown">
          <Picker.Item label="East" value="East" />
          <Picker.Item label="West" value="West" />
          <Picker.Item label="North" value="North" />
          <Picker.Item label="South" value="South" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>

      
      {/* Upload Buttons with indicator */}
      <TouchableOpacity
        style={[styles.button, votersIDImage && styles.uploaded]}
        onPress={() => pickImage(setVotersIDImage)}
      >
        <Text style={styles.buttonText}>Upload Voter’s ID</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, driversLicenseImage && styles.uploaded]}
        onPress={() => pickImage(setDriversLicenseImage)}
      >
        <Text style={styles.buttonText}>Upload Driver’s License</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, orcrImage && styles.uploaded]}
        onPress={() => pickImage(setOrcrImage)}
      >
        <Text style={styles.buttonText}>Upload OR/CR</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 20, paddingTop: 50 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  label: { fontWeight: "bold", marginBottom: 5 },
  subheading: { marginTop: 20, fontWeight: "bold", fontSize: 16 },
  optionGroup: { flexDirection: "row", marginBottom: 15 },
  option: { padding: 10, borderWidth: 1, borderRadius: 8, marginHorizontal: 5 },
  selected: { backgroundColor: "#cce7ff", borderColor: "#1e90ff" },
  pickercontainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 10,
    justifyContent: 'center',
  },
  
  input: {
    width: "100%", padding: 12, borderWidth: 1, borderRadius: 10,
    marginBottom: 10, backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#aaa", padding: 12, borderRadius: 10,
    width: "100%", marginVertical: 5,
  },
  uploaded: {
    backgroundColor: "#4caf50",
  },
  submitButton: {
    backgroundColor: "#1e90ff", padding: 15, borderRadius: 10, width: "100%", marginTop: 15,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});
