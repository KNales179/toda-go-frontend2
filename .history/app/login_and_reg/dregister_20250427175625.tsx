import React, { useState } from "react";
import { View, Text, TextInput, Dimensions ,TouchableOpacity, ScrollView, StyleSheet, Alert, StatusBar, Platform, Image, Modal, FlatList } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import API_BASE_URL from "../../config";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
const { width } = Dimensions.get('window');


export default function DriverRegister() {
  const navigation = useNavigation();
  const router = useRouter();
  const [role, setRole] = useState("Driver");

  // Shared
  const [franchiseNumber, setFranchiseNumber] = useState("");
  const [todaName, setTodaName] = useState("");
  const [sector, setSector] = useState("");
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


  // picker choices
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModalType, setSelectedModalType] = useState("");
  const experienceOptions = [
    "1-5 taon",
    "6-10 taon",
    "16-20 taon",
    "20 taon pataas",
  ];
  const roles = ["Driver", "Operator", "Both"];
  const sectors = ["East", "West", "North", "South", "Other"];
  const voterOptions = ["Oo", "Hindi"];

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

  const generateProfileID = () => {
    return Math.random().toString(36).substring(2, 9) + Date.now(); 
  };
  const [profileID] = useState(generateProfileID());
  

  const handleSubmit = async () => {
    console.log("submit clicked")
    if (!votersIDImage) {
      Alert.alert("Error", "Please upload Voter's ID image.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    const formData = new FormData();

    formData.append("profileID", profileID); 

    formData.append("franchiseNumber", franchiseNumber);
    formData.append("todaName", todaName);
    formData.append("sector", sector);
    formData.append("isLucenaVoter", isLucenaVoter);
    formData.append("votingLocation", votingLocation);

    // Operator fields
    formData.append("operatorFirstName", operatorFirstName);
    formData.append("operatorMiddleName", operatorMiddleName);
    formData.append("operatorLastName", operatorLastName);
    formData.append("operatorSuffix", operatorSuffix);
    formData.append("operatorBirthdate", operatorBirthdate);
    formData.append("operatorPhone", operatorPhone);

    // Driver fields
    formData.append("driverFirstName", driverFirstName);
    formData.append("driverMiddleName", driverMiddleName);
    formData.append("driverLastName", driverLastName);
    formData.append("driverSuffix", driverSuffix);
    formData.append("driverBirthdate", driverBirthdate);
    formData.append("driverPhone", driverPhone);

    formData.append("experienceYears", experienceYears);

    // 📩 Email/password handling:
    if (role === "Driver") {
      formData.append("driverEmail", email);
      formData.append("driverPassword", password);
    }

    if (role === "Operator") {
      formData.append("operatorEmail", email);
      formData.append("operatorPassword", password);
    }

    if (role === "Both") {
      formData.append("driverEmail", email);
      formData.append("driverPassword", password);
      formData.append("operatorEmail", email);
      formData.append("operatorPassword", password);
    }
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
      
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Not a JSON response:", text);
          throw new Error(text); // handle non-JSON response cleanly
        }
      
        if (res.ok) {
          Alert.alert("Success", data.message || "Registration successful", [
            {
              text: "OK",
              onPress: () => {
                router.push("/login_and_reg/dlogin"); // 👉 navigate to dlogin.tsx
              },
            },
          ]);
        }
        else Alert.alert("Error", data.error || text);
      
      } catch (e: any) {
        console.error("Driver registration failed:", e);
        Alert.alert("Error", e.message || "Network error or server issue");
      }      
  };
  const UploadItem = ({ label, onPress, uploaded }: { label: string; onPress: () => void; uploaded: boolean }) => (
    <View style={styles.uploadRow}>
      <Text style={styles.uploadLabel}>{label}</Text>
      <TouchableOpacity style={[styles.uploadButton, uploaded && styles.uploaded]} onPress={onPress}>
        <Text style={styles.uploadButtonText}>UPLOAD</Text>
      </TouchableOpacity>
    </View>
  );
  

  return (
    <ScrollView>
      <View style={{paddingTop: 30}}>
        <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />
      </View>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver’s Profile</Text>
      </View>
      <View style={{padding: 20}}>
        <View style={styles.selfieContainer}>
          <TouchableOpacity onPress={() => pickImage(setSelfieImage)}>
            {selfieImage ? (
              <Image source={{ uri: selfieImage.uri }} style={styles.selfieImage} />
            ) : (
              <View style={styles.placeholderCircle}>
                <MaterialIcons name="camera-alt" size={24} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Ikaw ba ay Operator o Driver?</Text>
        <TouchableOpacity
          style={styles.customPicker}
          onPress={() => {
            setSelectedModalType("role");
            setModalVisible(true);
          }}        
        >
          <Text style={{ fontSize: 14, color: role ? "#000" : "#888" }}>
            {role || "Pumili ng Role"}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#888" />
        </TouchableOpacity>
        {/* Operator Info */}
        {(role === "Operator" || role === "Driver") && (
          <Text style={styles.header}>Operator Information</Text>
        )}
        {(role === "Both") && (
          <Text style={styles.header}>Personal Information</Text>
        )}
        <TextInput style={styles.input} placeholder="First Name" value={operatorFirstName} onChangeText={setOperatorFirstName} />
        <TextInput style={styles.input} placeholder="Middle Name" value={operatorMiddleName} onChangeText={setOperatorMiddleName} />
        <TextInput style={styles.input} placeholder="Last Name" value={operatorLastName} onChangeText={setOperatorLastName} />
        <TextInput style={styles.input} placeholder="Suffix" value={operatorSuffix} onChangeText={setOperatorSuffix} />
        <TouchableOpacity onPress={() => setShowOperatorDate(true)} style={styles.input}>
          <Text style={{ fontSize: 14, color: operatorBirthdate ? "#000" : "#888" }}>{operatorBirthdate || "Select Birthdate"}</Text>
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
          <TextInput style={styles.input} placeholder="Phone/Contact Number ng Operator" value={operatorPhone} onChangeText={setOperatorPhone} keyboardType="phone-pad" autoComplete="off" importantForAutofill="no" />
        )}
        {(role === "Both") && (
          <TextInput style={styles.input} placeholder="Phone/Contact Number" value={operatorPhone} onChangeText={setOperatorPhone} keyboardType="phone-pad" autoComplete="off" importantForAutofill="no"/>
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
              <Text style={{ fontSize: 14, color: driverBirthdate ? "#000" : "#888" }}>{driverBirthdate || "Select Birthdate"}</Text>
            </TouchableOpacity>
            {showDriverDate && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="default"
                onChange={(e, d) => d && handleDateChange(d, setDriverBirthdate, setShowDriverDate)}
              />
            )}
            <TextInput style={styles.input} placeholder="Phone/Contact Number ng Driver" value={driverPhone} onChangeText={setDriverPhone} keyboardType="phone-pad" autoComplete="off" importantForAutofill="no"/>
          </>
        )}
        <TouchableOpacity
          style={styles.customPicker}
          onPress={() => {
            setSelectedModalType("experience");
            setModalVisible(true);
          }}
        >
          <Text style={{ fontSize: 14, color: experienceYears ? "#000" : "#888" }}>
            {experienceYears || "Gaano katagal ng nagmamaneho?"}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#888" />
        </TouchableOpacity>

        {/* Registration Info */}
        <Text style={styles.header}>Franchise & Voting Info</Text>
        <TextInput style={styles.input} placeholder="Franchise Number" value={franchiseNumber} onChangeText={setFranchiseNumber} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="TODA Name" value={todaName} onChangeText={setTodaName} />
        <TouchableOpacity
          style={styles.customPicker}
          onPress={() => {
            setSelectedModalType("sector");
            setModalVisible(true);
          }}
        >
          <Text style={{ fontSize: 14, color: sector ? "#000" : "#888" }}>
            {sector || "Pumili ng Sector"}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.customPicker}
          onPress={() => {
            setSelectedModalType("voter");
            setModalVisible(true);
          }}
        >
          <Text style={{ fontSize: 14, color: isLucenaVoter ? "#000" : "#888" }}>
            {isLucenaVoter || "Ikaw ba ay botante ng Lucena city?"}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#888" />
        </TouchableOpacity>
        <TextInput style={styles.input} placeholder="Kung hindi saang  lugar ikaw bumoboto?" value={votingLocation} onChangeText={setVotingLocation} />

        {/* Account Info */}
        <Text style={styles.header}>Account</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        {/* Uploads */}
        <Text style={styles.header}>Uploads</Text>
        {/* Other Documents Uploads */}
        <UploadItem label="I-upload ang picture ng iyong Voter's ID o Certificate" onPress={() => pickImage(setVotersIDImage)} uploaded={!!votersIDImage} />
        <UploadItem label="I-upload ang picture ng iyong Driver's License" onPress={() => pickImage(setDriversLicenseImage)} uploaded={!!driversLicenseImage} />
        <UploadItem label="I-upload ang picture ng OR at CR ng Tricycle" onPress={() => pickImage(setOrcrImage)} uploaded={!!orcrImage} />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
        <Text style={styles.signupPrompt}>
          already have an account?{" "}
          <Text style={styles.signupLink} onPress={() => router.push("/login_and_reg/dlogin")}>
            Log In
          </Text>
        </Text>


        {/* models */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              {/* Modal Picker Content */}
              {(() => {
                let xdata: string[] = [];

                if (selectedModalType === "experience") xdata = experienceOptions;
                else if (selectedModalType === "role") xdata = roles;
                else if (selectedModalType === "sector") xdata = sectors;
                else if (selectedModalType === "voter") xdata = voterOptions;

                return (
                  <>
                    {xdata.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.optionItem}
                        onPress={() => {
                          if (selectedModalType === "experience") setExperienceYears(option);
                          if (selectedModalType === "role") {
                            setRole(option);
                            if (option === "Both") {
                              setDriverFirstName(operatorFirstName);
                              setDriverMiddleName(operatorMiddleName);
                              setDriverLastName(operatorLastName);
                              setDriverSuffix(operatorSuffix);
                              setDriverBirthdate(operatorBirthdate);
                              setDriverPhone(operatorPhone);
                            }
                          }
                          if (selectedModalType === "sector") setSector(option);
                          if (selectedModalType === "voter") setIsLucenaVoter(option);
                          setModalVisible(false);
                        }}
                      >
                        <Text style={styles.optionText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                );
              })()}
            </View>
          </TouchableOpacity>
        </Modal>

      </View>
      


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  backText: {
    fontSize: 16,
    color: '#555',
    width: "100%"
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: "center",
  },
  
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
  customPicker: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginBottom: 10,
    justifyContent: "space-between", 
    alignItems: "center"
  },
  
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  
  modalContent: {
    backgroundColor: "#fff",
    width: "80%",
    borderRadius: 10,
    padding: 15,
    elevation: 5,
  },
  
  optionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  
  optionText: {
    fontSize: 16,
    color: "#333",
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
    backgroundColor: "#5089A3",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  signupPrompt: {
    textAlign: "center",
    fontSize: 14,
    color: "#414141",
  },
  signupLink: {
    color: "#5089A3",
    fontWeight: "600",
  },
  selfieContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  uploadButton: {
    backgroundColor: '#5089A3',
    paddingVertical: 4,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  uploadButtonText: {
    color: '#fff',
  },  
});
