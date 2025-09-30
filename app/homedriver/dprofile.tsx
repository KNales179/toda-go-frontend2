import React, { useState } from "react";
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Alert,
  Platform, ActionSheetIOS, Modal, TextInput, ActivityIndicator, ScrollView
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { API_BASE_URL } from "../../config";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

// enums (mirror backend)
const SECTORS = ["East", "West", "North", "South", "Other"] as const;
const EXP_YEARS = ["1-5 taon", "6-10 taon", "16-20 taon", "20 taon pataas"] as const;

export default function DProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [selfieImage, setProfileImage] = useState<ImagePickerAsset | null>(null);
  const [emailSending, setEmailSending] = useState(false);

  // Modals state
  const [nameOpen, setNameOpen] = useState(false);
  const [firstNameEdit, setFirstNameEdit] = useState("");
  const [middleNameEdit, setMiddleNameEdit] = useState("");
  const [lastNameEdit, setLastNameEdit] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [genderOpen, setGenderOpen] = useState(false);
  const [genderChoice, setGenderChoice] = useState<string>("");
  const [genderOther, setGenderOther] = useState("");
  const [savingGender, setSavingGender] = useState(false);

  const [bdayOpen, setBdayOpen] = useState(false);           // if you don’t already have it
  const [bdayValue, setBdayValue] = useState<Date | null>(null);
  const [savingBday, setSavingBday] = useState(false);
  const [showAndroidBday, setShowAndroidBday] = useState(false);
  const [androidBdayConfirmOpen, setAndroidBdayConfirmOpen] = useState(false);

  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const [addrOpen, setAddrOpen] = useState(false);
  const [addrValue, setAddrValue] = useState("");
  const [savingAddr, setSavingAddr] = useState(false);

  const [vehOpen, setVehOpen] = useState(false);
  const [franchiseValue, setFranchiseValue] = useState("");
  const [todaValue, setTodaValue] = useState("");
  const [sectorValue, setSectorValue] = useState<string>("");
  const [expValue, setExpValue] = useState<string>("");
  const [licenseValue, setLicenseValue] = useState("");
  const [savingVeh, setSavingVeh] = useState(false);

  const resendDriverEmail = async () => {
    if (!profile?.email) return Alert.alert("Error", "No email on file.");
    try {
      setEmailSending(true);
      const r = await fetch(`${API_BASE_URL}/api/auth/driver/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });
      const j = await r.json();
      if (r.ok) Alert.alert("Sent", j.message || "Verification email sent.");
      else Alert.alert("Error", j.message || j.error || "Failed to send email.");
    } catch (e:any) {
      Alert.alert("Error", e.message || "Network error");
    } finally {
      setEmailSending(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const driverId = await AsyncStorage.getItem("driverId");
      if (!driverId) return;
      const response = await fetch(`${API_BASE_URL}/api/driver/${driverId}`);
      const result = await response.json();
      if (result.driver) setProfile(result.driver);
    } catch (error) {
      console.error("❌ Failed to fetch driver profile:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  // ---- Selfie upload (unchanged) ----
  const pickSelfieImage = async () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Take a Photo", "Choose from Gallery", "Cancel"], cancelButtonIndex: 2 },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
            if (!result.canceled && result.assets.length > 0) setProfileImage(result.assets[0]);
          } else if (buttonIndex === 1) {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
            if (!result.canceled && result.assets.length > 0) setProfileImage(result.assets[0]);
          }
        }
      );
    } else {
      Alert.alert("Select Option", "", [
        { text: "Take a Photo", onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
          if (!result.canceled && result.assets.length > 0) setProfileImage(result.assets[0]);
        }},
        { text: "Choose from Gallery", onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
          if (!result.canceled && result.assets.length > 0) setProfileImage(result.assets[0]);
        }},
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleUploadSelfie = async () => {
    if (!selfieImage) return Alert.alert("Error", "Please select an image first.");
    try {
      const driverId = await AsyncStorage.getItem("driverId");
      if (!driverId) return;

      const formData = new FormData();
      formData.append("selfieImage", { uri: selfieImage.uri, name: "selfie.jpg", type: "image/jpeg" } as any);

      const res = await fetch(`${API_BASE_URL}/api/driver/${driverId}/photo`, { method: "POST", body: formData });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to upload image");

      setProfile(j.driver);
      setProfileImage(null);
      Alert.alert("Success", "Profile image updated!");
    } catch (e: any) {
      console.error("❌ Upload error:", e);
      Alert.alert("Error", e.message || "Something went wrong. Try again.");
    }
  };

  // ---- Helpers ----
  const fmtDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  };

  const patchDriver = async (payload: Record<string, any>) => {
    const driverId = await AsyncStorage.getItem("driverId");
    if (!driverId) throw new Error("Missing driverId");
    const res = await fetch(`${API_BASE_URL}/api/driver/${driverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.message || "Update failed");
    setProfile(j.driver);
  };

  // ---- Name modal ----
  const openName = () => {
    setFirstNameEdit(profile?.driverFirstName || "");
    setMiddleNameEdit(profile?.driverMiddleName || "");
    setLastNameEdit(profile?.driverLastName || "");
    setNameOpen(true);
  };
  const saveName = async () => {
    try {
      setSavingName(true);
      await patchDriver({
        driverFirstName: firstNameEdit.trim(),
        driverMiddleName: middleNameEdit.trim(),
        driverLastName: lastNameEdit.trim(),
      });
      setNameOpen(false);
    } catch (e:any) {
      Alert.alert("Error", e.message || "Failed to save name");
    } finally {
      setSavingName(false);
    }
  };

  // ---- Gender modal ----
  const openGender = () => {
    const current = profile?.gender || "";
    const known = ["Male","Female","Nonbinary","Prefer not to say"];
    if (known.includes(current)) {
      setGenderChoice(current);
      setGenderOther("");
    } else if (current) {
      setGenderChoice("Other");
      setGenderOther(current);
    } else {
      setGenderChoice("");
      setGenderOther("");
    }
    setGenderOpen(true);
  };
  const saveGender = async () => {
    const value = genderChoice === "Other" ? genderOther.trim() : genderChoice;
    if (!value) return Alert.alert("Gender", "Please choose an option.");
    if (genderChoice === "Other" && !genderOther.trim()) {
      return Alert.alert("Gender", "Please enter a custom gender.");
    }
    try {
      setSavingGender(true);
      await patchDriver({ gender: value });
      setGenderOpen(false);
    } catch (e:any) {
      Alert.alert("Error", e.message || "Failed to save gender");
    } finally {
      setSavingGender(false);
    }
  };

  // ---- Birthday modal / picker ----
  const openBday = () => {
    const d = profile?.driverBirthdate ? new Date(profile.driverBirthdate) : null;
    const initial = d && !Number.isNaN(d.getTime()) ? d : new Date();
    setBdayValue(initial);

    if (Platform.OS === "android") {
      setShowAndroidBday(true);               
    } else {
      setBdayOpen(true);                      
    }
  };


  const saveBday = async () => {
    if (!bdayValue) return;
    const yyyy = bdayValue.getFullYear();
    const mm = String(bdayValue.getMonth()+1).padStart(2,"0");
    const dd = String(bdayValue.getDate()).padStart(2,"0");
    const iso = `${yyyy}-${mm}-${dd}`;
    try {
      setSavingBday(true);
      await patchDriver({ driverBirthdate: iso });
      setBdayOpen(false);
    } catch (e:any) {
      Alert.alert("Error", e.message || "Failed to save birthday");
    } finally {
      setSavingBday(false);
    }
  };

  // ---- Phone ----
  const openPhone = () => {
    setPhoneValue(profile?.driverPhone || "");
    setPhoneOpen(true);
  };
  const savePhone = async () => {
    if (!phoneValue.trim()) return Alert.alert("Phone", "Enter a phone number.");
    try {
      setSavingPhone(true);
      await patchDriver({ driverPhone: phoneValue.trim() });
      setPhoneOpen(false);
    } catch (e:any) {
      Alert.alert("Error", e.message || "Failed to save phone");
    } finally {
      setSavingPhone(false);
    }
  };

  // ---- Address ----
  const openAddr = () => {
    setAddrValue(profile?.homeAddress || "");
    setAddrOpen(true);
  };
  const saveAddr = async () => {
    try {
      setSavingAddr(true);
      await patchDriver({ homeAddress: addrValue.trim() });
      setAddrOpen(false);
    } catch (e:any) {
      Alert.alert("Error", e.message || "Failed to save address");
    } finally {
      setSavingAddr(false);
    }
  };

  // ---- Vehicle block (franchise/toda/sector/experience/licenseId) ----
  const openVeh = () => {
    setFranchiseValue(profile?.franchiseNumber || "");
    setTodaValue(profile?.todaName || "");
    setSectorValue(profile?.sector || "");
    setExpValue(profile?.experienceYears || "");
    setLicenseValue(profile?.licenseId || "");
    setVehOpen(true);
  };
  const saveVeh = async () => {
    if (sectorValue && !SECTORS.includes(sectorValue as any)) {
      return Alert.alert("Sector", "Please select a valid sector.");
    }
    if (expValue && !EXP_YEARS.includes(expValue as any)) {
      return Alert.alert("Experience", "Please select a valid experience range.");
    }
    try {
      setSavingVeh(true);
      await patchDriver({
        franchiseNumber: franchiseValue.trim(),
        todaName: todaValue.trim(),
        sector: sectorValue.trim(),
        experienceYears: expValue.trim(),
        licenseId: licenseValue.trim(),
      });
      setVehOpen(false);
    } catch (e:any) {
      Alert.alert("Error", e.message || "Failed to save vehicle details");
    } finally {
      setSavingVeh(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("driverId");
      Alert.alert("Logged out", "You have been logged out successfully.");
      router.replace("../login_and_reg/dlogin");
    } catch (error) {
      console.error("❌ Logout error:", error);
      Alert.alert("Error", "Failed to log out. Try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileContainer}>
        <View style={styles.row}>
          <TouchableOpacity onPress={pickSelfieImage}>
            <Image
              source={
                selfieImage
                  ? { uri: selfieImage.uri }
                  : profile?.selfieImage
                    ? { uri: `${API_BASE_URL}/${profile.selfieImage.replace(/\\/g, "/")}` }
                    : require("../../assets/images/profile-placeholder.jpg")
              }
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.username}>
              {[profile?.driverFirstName, profile?.driverLastName].filter(Boolean).join(" ")}
            </Text>
            {selfieImage && (
              <TouchableOpacity style={styles.uploadButton} onPress={handleUploadSelfie}>
                <Text style={{ color: "#fff" }}>Upload Profile Pic</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={30} color="black" />
          <Text style={styles.lagout}>LogOut</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.accountContainer} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        {/* Full Name */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Full Name:</Text>
          <View style={styles.row}>
            <Text style={[
              styles.value,
              { color: (profile?.driverFirstName || profile?.driverMiddleName || profile?.driverLastName) ? "#000" : "#999" }
            ]}>
              {profile?.driverFirstName || ""} {profile?.driverMiddleName || ""} {profile?.driverLastName || ""}
            </Text>
            <TouchableOpacity onPress={openName} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gender */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Gender:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.gender ? "#000" : "#999" }]}>
              {profile?.gender || "Set Now"}
            </Text>
            <TouchableOpacity onPress={openGender} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Phone */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Contact Number:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.driverPhone ? "#000" : "#999" }]}>
              {profile?.driverPhone || "Set Now"}
            </Text>
            <TouchableOpacity onPress={openPhone} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Birthday */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Birthday:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.driverBirthdate ? "#000" : "#999" }]}>
              {profile?.driverBirthdate ? (fmtDate(profile.driverBirthdate) || profile.driverBirthdate) : "Not Provided"}
            </Text>
            <TouchableOpacity onPress={openBday} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Email + verify */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email Address:</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.value, { color: profile?.email ? "#000" : "#999" }]}>
              {profile?.email || "Set Now"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <View style={{
                paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
                backgroundColor: profile?.isVerified ? "#E6F7E9" : "#FFF4E5",
                marginRight: 8,
              }}>
                <Text style={{ color: profile?.isVerified ? "#2E7D32" : "#B26A00", fontSize: 12 }}>
                  {profile?.isVerified ? "Verified" : "Not verified"}
                </Text>
              </View>
              {!profile?.isVerified && (
                <TouchableOpacity
                  disabled={emailSending}
                  onPress={resendDriverEmail}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: emailSending ? "#ccc" : "#5089A3" }}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>
                    {emailSending ? "Sending..." : "Verify email"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Address */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Home Address:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.homeAddress ? "#000" : "#999" }]}>
              {profile?.homeAddress || "Set Now"}
            </Text>
            <TouchableOpacity onPress={openAddr} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Vehicle Details</Text>

        {/* License ID */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>License Number:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.licenseId ? "#000" : "#999" }]}>
              {profile?.licenseId || "Set Now"}
            </Text>
            <TouchableOpacity onPress={openVeh} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Franchise */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Franchise Number:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.franchiseNumber ? "#000" : "#999" }]}>
              {profile?.franchiseNumber || "Set Now"}
            </Text>
            <TouchableOpacity onPress={openVeh} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* TODA */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>TODA Name:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.todaName ? "#000" : "#999" }]}>
              {profile?.todaName || "Set Now"}
            </Text>
            <TouchableOpacity onPress={openVeh} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sector */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Sector:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.sector ? "#000" : "#999" }]}>
              {profile?.sector || "Set Now"}
            </Text>
            <TouchableOpacity onPress={openVeh} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Experience */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Experience:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.experienceYears ? "#000" : "#999" }]}>
              {profile?.experienceYears || "Set Now"}
            </Text>
            <TouchableOpacity onPress={openVeh} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ------- Modals ------- */}

      {/* Name */}
      <Modal transparent visible={nameOpen} animationType="fade" onRequestClose={() => !savingName && setNameOpen(false)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Name</Text>

            <TextInput placeholder="First name" value={firstNameEdit} onChangeText={setFirstNameEdit} style={styles.input} />
            <TextInput placeholder="Middle name (optional)" value={middleNameEdit} onChangeText={setMiddleNameEdit} style={styles.input} />
            <TextInput placeholder="Last name" value={lastNameEdit} onChangeText={setLastNameEdit} style={styles.input} />

            <View style={styles.modalBtns}>
              <TouchableOpacity disabled={savingName} onPress={() => setNameOpen(false)} style={styles.btnGhost}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingName} onPress={saveName} style={styles.btnPrimary}>
                {savingName ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gender */}
      <Modal transparent visible={genderOpen} animationType="fade" onRequestClose={() => !savingGender && setGenderOpen(false)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Gender</Text>

            {["Male","Female","Nonbinary","Prefer not to say","Other"].map((opt) => (
              <TouchableOpacity key={opt} onPress={() => setGenderChoice(opt)} style={{ flexDirection:"row", alignItems:"center", paddingVertical:8 }}>
                <View style={styles.radioOuter}>
                  {genderChoice === opt ? <View style={styles.radioInner} /> : null}
                </View>
                <Text>{opt}</Text>
              </TouchableOpacity>
            ))}

            {genderChoice === "Other" && (
              <TextInput placeholder="Enter your gender" value={genderOther} onChangeText={setGenderOther} style={[styles.input, { marginTop:8 }]} />
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity disabled={savingGender} onPress={() => setGenderOpen(false)} style={styles.btnGhost}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingGender} onPress={saveGender} style={styles.btnPrimary}>
                {savingGender ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Birthday (iOS styled modal) */}
      <Modal transparent visible={bdayOpen && Platform.OS === "ios"} animationType="fade" onRequestClose={() => !savingBday && setBdayOpen(false)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Birthday</Text>

            {bdayValue && (
              <DateTimePicker
                mode="date"
                value={bdayValue}
                display="spinner"
                onChange={(_, d) => d && setBdayValue(d)}
                maximumDate={new Date()}
              />
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity disabled={savingBday} onPress={() => setBdayOpen(false)} style={styles.btnGhost}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingBday} onPress={saveBday} style={styles.btnPrimary}>
                {savingBday ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Android Date Picker */}
      {Platform.OS === "android" && showAndroidBday && (
        <DateTimePicker
          mode="date"
          value={bdayValue ?? new Date()}
          display="calendar"
          maximumDate={new Date()}
          onChange={(_, date) => {
            setShowAndroidBday(false);            
            if (date) {
              setBdayValue(date);                 
              setAndroidBdayConfirmOpen(true);    
            }
          }}
        />
      )}

      <Modal
        transparent
        visible={androidBdayConfirmOpen}
        animationType="fade"
        onRequestClose={() => !savingBday && setAndroidBdayConfirmOpen(false)}
      >
        <View style={{ flex:1, backgroundColor:"rgba(0,0,0,0.4)", justifyContent:"center", alignItems:"center", padding:20 }}>
          <View style={{ width:"100%", maxWidth:420, backgroundColor:"#fff", borderRadius:12, padding:16 }}>
            <Text style={{ fontWeight:"bold", fontSize:16, marginBottom:12 }}>Confirm Birthday</Text>

            <Text style={{ fontSize:14, marginBottom:16 }}>
              {bdayValue
                ? bdayValue.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" })
                : "—"}
            </Text>

            <View style={{ flexDirection:"row", justifyContent:"flex-end" }}>
              <TouchableOpacity
                disabled={savingBday}
                onPress={() => setAndroidBdayConfirmOpen(false)}
                style={{ padding:10, marginRight:8 }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={savingBday}
                onPress={async () => {
                  await saveBday();                 // uses your existing saveBday()
                  setAndroidBdayConfirmOpen(false); // close after save
                }}
                style={{ backgroundColor:"#5089A3", padding:10, borderRadius:8, minWidth:90, alignItems:"center" }}
              >
                {savingBday ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>




      {/* Phone */}
      <Modal transparent visible={phoneOpen} animationType="fade" onRequestClose={() => !savingPhone && setPhoneOpen(false)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Contact Number</Text>
            <TextInput placeholder="Phone number" keyboardType="phone-pad" value={phoneValue} onChangeText={setPhoneValue} style={styles.input} />

            <View style={styles.modalBtns}>
              <TouchableOpacity disabled={savingPhone} onPress={() => setPhoneOpen(false)} style={styles.btnGhost}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingPhone} onPress={savePhone} style={styles.btnPrimary}>
                {savingPhone ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Address */}
      <Modal transparent visible={addrOpen} animationType="fade" onRequestClose={() => !savingAddr && setAddrOpen(false)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Home Address</Text>
            <TextInput placeholder="Home address" value={addrValue} onChangeText={setAddrValue} style={styles.input} />

            <View style={styles.modalBtns}>
              <TouchableOpacity disabled={savingAddr} onPress={() => setAddrOpen(false)} style={styles.btnGhost}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingAddr} onPress={saveAddr} style={styles.btnPrimary}>
                {savingAddr ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vehicle details */}
      <Modal transparent visible={vehOpen} animationType="fade" onRequestClose={() => !savingVeh && setVehOpen(false)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Vehicle / Franchise</Text>

            <TextInput placeholder="License Number" value={licenseValue} onChangeText={setLicenseValue} style={styles.input} />
            <TextInput placeholder="Franchise Number" value={franchiseValue} onChangeText={setFranchiseValue} style={styles.input} />
            <TextInput placeholder="TODA Name" value={todaValue} onChangeText={setTodaValue} style={styles.input} />

            <Text style={{ marginTop: 8, marginBottom: 6, fontWeight: "600" }}>Sector</Text>
            {SECTORS.map((s) => (
              <TouchableOpacity key={s} onPress={() => setSectorValue(s)} style={{ flexDirection:"row", alignItems:"center", paddingVertical:6 }}>
                <View style={styles.radioOuter}>{sectorValue === s ? <View style={styles.radioInner} /> : null}</View>
                <Text>{s}</Text>
              </TouchableOpacity>
            ))}

            <Text style={{ marginTop: 12, marginBottom: 6, fontWeight: "600" }}>Experience</Text>
            {EXP_YEARS.map((e) => (
              <TouchableOpacity key={e} onPress={() => setExpValue(e)} style={{ flexDirection:"row", alignItems:"center", paddingVertical:6 }}>
                <View style={styles.radioOuter}>{expValue === e ? <View style={styles.radioInner} /> : null}</View>
                <Text>{e}</Text>
              </TouchableOpacity>
            ))}

            <View style={[styles.modalBtns, { marginTop: 12 }]}>
              <TouchableOpacity disabled={savingVeh} onPress={() => setVehOpen(false)} style={styles.btnGhost}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingVeh} onPress={saveVeh} style={styles.btnPrimary}>
                {savingVeh ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  profileContainer: { alignItems: "center", paddingTop: 50, flexDirection:"row", marginHorizontal:20, justifyContent: "space-between"},
  profileImage: { width: 100, height: 100, borderRadius: 50},
  username: { fontSize: 18, fontWeight: "bold", paddingLeft:20 },
  lagout: { fontSize: 14, fontWeight: "bold"},
  uploadButton: { backgroundColor: "#5089A3", borderRadius: 8, padding: 10, marginTop: 10 },
  accountContainer: { marginTop: 10, paddingHorizontal: 20 },
  sectionTitle: { fontWeight: "bold", fontSize: 16, marginVertical: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, color: "#333" },
  value: { fontSize: 14, color: "#333", maxWidth: width * 0.55 },

  // modal
  modalBack: { flex:1, backgroundColor:"rgba(0,0,0,0.4)", justifyContent:"center", alignItems:"center", padding:20 },
  modalCard: { width:"100%", maxWidth:420, backgroundColor:"#fff", borderRadius:12, padding:16 },
  modalTitle: { fontWeight:"bold", fontSize:16, marginBottom:8 },
  input: { borderWidth:1, borderColor:"#ddd", borderRadius:8, paddingHorizontal:12, paddingVertical:10, marginBottom:8 },

  modalBtns: { flexDirection:"row", justifyContent:"flex-end", gap: 12 },
  btnGhost: { paddingVertical:10, paddingHorizontal:14 },
  btnPrimary: { backgroundColor:"#5089A3", paddingVertical:10, paddingHorizontal:14, borderRadius:8, minWidth:90, alignItems:"center" },

  radioOuter: { width:18, height:18, borderRadius:9, borderWidth:2, borderColor:"#5089A3", alignItems:"center", justifyContent:"center", marginRight:10 },
  radioInner: { width:10, height:10, borderRadius:5, backgroundColor:"#5089A3" },
});
