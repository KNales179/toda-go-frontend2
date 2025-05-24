import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
  Platform,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import API_BASE_URL from "../../config";

export default function DriverRegister() {
  const [role, setRole] = useState("Driver");
  const isBoth = role === "Both";
  

  // Shared
  const [franchiseNumber, setFranchiseNumber] = useState("");
  const [todaName, setTodaName] = useState("");
  const [sector, setSector] = useState("East");
  const [isLucenaVoter, setIsLucenaVoter] = useState("");
  const [votingLocation, setVotingLocation] = useState("");

  // Operator info
  const [operatorFirstName, setOperatorFirstName] = useState("");
  const [operatorMiddleName, setOperatorMiddleName] = useState("");
  const [operatorLastName, setOperatorLastName] = useState("");
  const [operatorSuffix, setOperatorSuffix] = useState("");
  const [operatorBirthdate, setOperatorBirthdate] = useState("");
  const [showOperatorDate, setShowOperatorDate] = useState(false);
  const [operatorPhone, setOperatorPhone] = useState("");

  // Driver info
  const [driverFirstName, setDriverFirstName] = useState("");
  const [driverMiddleName, setDriverMiddleName] = useState("");
  const [driverLastName, setDriverLastName] = useState("");
  const [driverSuffix, setDriverSuffix] = useState("");
  const [driverBirthdate, setDriverBirthdate] = useState("");
  const [showDriverDate, setShowDriverDate] = useState(false);
  const [driverPhone, setDriverPhone] = useState("");
  const [experienceYears, setExperienceYears] = useState("");

  // Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Images
  const [votersIDImage, setVotersIDImage] = useState<ImagePickerAsset | null>(null);
  const [driversLicenseImage, setDriversLicenseImage] = useState<ImagePickerAsset | null>(null);
  const [orcrImage, setOrcrImage] = useState<ImagePickerAsset | null>(null);
  const [selfieImage, setSelfieImage] = useState<ImagePickerAsset | null>(null);

  const pickImage = async (setFunc: (img: ImagePickerAsset) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setFunc(result.assets[0]);
    }
  };

  const handleDateChange = (date: Date, setFunc: (val: string) => void, setShow: (val: boolean) => void) => {
    setShow(false);
    const formatted = date.toISOString().split("T")[0];
    setFunc(formatted);
  };

  const handleSubmit = async () => {
    if (role === "Both") {
      setDriverFirstName(operatorFirstName);
      setDriverMiddleName(operatorMiddleName);
      setDriverLastName(operatorLastName);
      setDriverSuffix(operatorSuffix);
      setDriverBirthdate(operatorBirthdate);
      setDriverPhone(operatorPhone);
    }
    if (!votersIDImage) {
      Alert.alert("Error", "Please upload Voter's ID image.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    const formData = new FormData();
    formData.append("role", role);
    formData.append("franchiseNumber", franchiseNumber);
    formData.append("todaName", todaName);
    formData.append("sector", sector);
    formData.append("isLucenaVoter", isLucenaVoter);
    formData.append("votingLocation", votingLocation);
    formData.append("email", email);
    formData.append("password", password);

    formData.append("operatorFirstName", operatorFirstName);
    formData.append("operatorMiddleName", operatorMiddleName);
    formData.append("operatorLastName", operatorLastName);
    formData.append("operatorSuffix", operatorSuffix);
    formData.append("operatorBirthdate", operatorBirthdate);
    formData.append("operatorPhone", operatorPhone);

    formData.append("driverFirstName", driverFirstName);
    formData.append("driverMiddleName", driverMiddleName);
    formData.append("driverLastName", driverLastName);
    formData.append("driverSuffix", driverSuffix);
    formData.append("driverBirthdate", driverBirthdate);
    formData.append("driverPhone", driverPhone);
    formData.append("experienceYears", experienceYears);

    formData.append("votersIDImage", {
      uri: votersIDImage.uri,
      name: "voter.jpg",
      type: "image/jpeg",
    } as any);
    if (driversLicenseImage)
      formData.append("driversLicenseImage", {
        uri: driversLicenseImage.uri,
        name: "license.jpg",
        type: "image/jpeg",
      } as any);
    if (orcrImage)
      formData.append("orcrImage", {
        uri: orcrImage.uri,
        name: "orcr.jpg",
        type: "image/jpeg",
      } as any);
    if (selfieImage)
      formData.append("selfie", {
        uri: selfieImage.uri,
        name: "selfie.jpg",
        type: "image/jpeg",
      } as any);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/driver/register-driver`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const text = await res.text();
      const data = JSON.parse(text);
      if (res.ok) Alert.alert("Success", data.message);
      else Alert.alert("Error", data.error);
    } catch (e) {
      console.error("Driver registration failed:", e);
      Alert.alert("Error", "Network error or server issue");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>Ikaw ba ay Operator o Driver?</Text>
      <Picker selectedValue={role} onValueChange={setRole} style={styles.picker}>
        <Picker.Item label="Driver" value="Driver" />
        <Picker.Item label="Operator" value="Operator" />
        <Picker.Item label="Both" value="Both" />
      </Picker>

      {/* Operator Info */}
      {(role === "Operator" || role === "Driver") && (
        <Text style={styles.header}>Operator Information</Text>
      )}
      {(role === "Both") && (
        <Text style={styles.header}>Basic Information</Text>
      )}
      <TextInput style={styles.input} placeholder="First Name" value={operatorFirstName} onChangeText={setOperatorFirstName} />
      <TextInput style={styles.input} placeholder="Middle Name" value={operatorMiddleName} onChangeText={setOperatorMiddleName} />
      <TextInput style={styles.input} placeholder="Last Name" value={operatorLastName} onChangeText={setOperatorLastName} />
      <TextInput style={styles.input} placeholder="Suffix" value={operatorSuffix} onChangeText={setOperatorSuffix} />
      <TouchableOpacity onPress={() => setShowOperatorDate(true)} style={styles.input}>
        <Text>{operatorBirthdate || "Select Birthdate"}</Text>
      </TouchableOpacity>
      {showOperatorDate && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => d && handleDateChange(d, setOperatorBirthdate, setShowOperatorDate)}
        />
      )}
      {(role === "Operator" || role === "Driver") && (
        <TextInput style={styles.input} placeholder="Phone/Contact Number ng Operator" value={operatorPhone} onChangeText={setOperatorPhone} />
      )}
      {(role === "Both") && (
        <TextInput style={styles.input} placeholder="Phone/Contact Number" value={operatorPhone} onChangeText={setOperatorPhone} />
      )}
      

      {/* Driver Info */}
      {(role === "Operator" || role === "Driver") && (
        <>
          <Text style={styles.header}>Driver Information</Text>
          <TextInput style={styles.input} placeholder="First Name" value={driverFirstName} onChangeText={setDriverFirstName} />
          <TextInput style={styles.input} placeholder="Middle Name" value={driverMiddleName} onChangeText={setDriverMiddleName} />
          <TextInput style={styles.input} placeholder="Last Name" value={driverLastName} onChangeText={setDriverLastName} />
          <TextInput style={styles.input} placeholder="Suffix" value={driverSuffix} onChangeText={setDriverSuffix} />
          <TouchableOpacity onPress={() => setShowDriverDate(true)} style={styles.input}>
            <Text>{driverBirthdate || "Select Birthdate"}</Text>
          </TouchableOpacity>
          {showDriverDate && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display="default"
              onChange={(e, d) => d && handleDateChange(d, setDriverBirthdate, setShowDriverDate)}
            />
          )}
          <TextInput style={styles.input} placeholder="Phone/Contact Number ng Driver" value={operatorPhone} onChangeText={setOperatorPhone} />
        </>
      )}
      <View style={styles.pickerBox}>
        <Picker selectedValue={experienceYears} onValueChange={setExperienceYears}>
          <Picker.Item label="Gaano katagal ng nag mamaneho ng tricycle?" value="" enabled={false} color="gray" />
          <Picker.Item label="1-5 taon" value="1-5 taon" />
          <Picker.Item label="6-10 taon" value="6-10 taon" />
          <Picker.Item label="16-20 taon" value="16-20 taon" />
          <Picker.Item label="20 taon pataas" value="20 taon pataas" />
        </Picker>
      </View>

      {/* Registration Info */}
      <Text style={styles.header}>Franchise & Voting Info</Text>
      <TextInput style={styles.input} placeholder="Franchise Number" value={franchiseNumber} onChangeText={setFranchiseNumber} />
      <TextInput style={styles.input} placeholder="TODA Name" value={todaName} onChangeText={setTodaName} />
      <View style={styles.pickerBox}>
        <Picker selectedValue={sector} onValueChange={setSector}>
          <Picker.Item label="Sector" value="" enabled={false} color="gray" />
          <Picker.Item label="East" value="East" />
          <Picker.Item label="West" value="West" />
          <Picker.Item label="North" value="North" />
          <Picker.Item label="South" value="South" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>
      <View style={styles.pickerBox}>
        <Picker selectedValue={isLucenaVoter} onValueChange={setIsLucenaVoter}>
          <Picker.Item label="Botante ng Lucena" value="" enabled={false} color="gray"  />
          <Picker.Item label="Oo" value="Oo" />
          <Picker.Item label="Hindi" value="Hindi" />
        </Picker>
      </View>
      <TextInput style={styles.input} placeholder="Kung Hindi saan Lugar ng Boto" value={votingLocation} onChangeText={setVotingLocation} />

      {/* Account Info */}
      <Text style={styles.header}>Account</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      {/* Uploads */}
      <Text style={styles.header}>Uploads</Text>
      <TouchableOpacity style={[styles.button, votersIDImage && styles.uploaded]} onPress={() => pickImage(setVotersIDImage)}>
        <Text style={styles.buttonText}>Upload Voter's ID</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, driversLicenseImage && styles.uploaded]} onPress={() => pickImage(setDriversLicenseImage)}>
        <Text style={styles.buttonText}>Upload License</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, orcrImage && styles.uploaded]} onPress={() => pickImage(setOrcrImage)}>
        <Text style={styles.buttonText}>Upload OR/CR</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, selfieImage && styles.uploaded]} onPress={() => pickImage(setSelfieImage)}>
        <Text style={styles.buttonText}>Upload Selfie</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  header: { marginTop: 20, fontWeight: "bold", fontSize: 16 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
  },
  picker: {
    borderWidth: 1,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#aaa",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  uploaded: {
    backgroundColor: "#4caf50",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#1e90ff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
});
