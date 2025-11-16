import React, { useState } from "react";
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Alert,
  Platform, ActionSheetIOS, StatusBar, Modal, TextInput, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { API_BASE_URL } from "../../config";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

export default function PProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<ImagePickerAsset | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editField, setEditField] = useState<null | { key: string; label: string; value: string }>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [firstNameEdit, setFirstNameEdit] = useState("");
  const [middleNameEdit, setMiddleNameEdit] = useState("");
  const [lastNameEdit, setLastNameEdit] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [genderOpen, setGenderOpen] = useState(false);
  const [genderChoice, setGenderChoice] = useState<string>("");
  const [genderOther, setGenderOther] = useState("");
  const [savingGender, setSavingGender] = useState(false);

  const [bdayOpen, setBdayOpen] = useState(false);
  const [bdayValue, setBdayValue] = useState<Date | null>(null);
  const [savingBday, setSavingBday] = useState(false);
  const [showAndroidBday, setShowAndroidBday] = useState(false);
  const [androidBdayConfirmOpen, setAndroidBdayConfirmOpen] = useState(false);

  const [ecOpen, setEcOpen] = useState(false);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [savingEc, setSavingEc] = useState(false);

  const resendPassengerEmail = async () => {
    if (!profile?.email) return Alert.alert("Error", "No email on file.");
    try {
      setEmailSending(true);
      const r = await fetch(`${API_BASE_URL}/api/auth/passenger/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });
      const j = await r.json();
      if (r.ok) Alert.alert("Sent", j.message || "Verification email sent.");
      else Alert.alert("Error", j.message || j.error || "Failed to send email.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Network error");
    } finally {
      setEmailSending(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const passengerId = await AsyncStorage.getItem("passengerId");
      if (!passengerId) return;
      const response = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`);
      const result = await response.json();
      if (result?.passenger) setProfile(result.passenger);
    } catch (error) {
      console.error("❌ Failed to fetch passenger profile:", error);
    }
  };

  useFocusEffect(React.useCallback(() => { fetchProfile(); }, []));

  const pickSelfieImage = async () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Take a Photo", "Choose from Gallery", "Cancel"], cancelButtonIndex: 2 },
        async (i) => {
          if (i === 0) {
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
            if (!result.canceled && result.assets.length > 0) setProfileImage(result.assets[0]);
          } else if (i === 1) {
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
    if (!profileImage) return Alert.alert("Error", "Please select an image first.");
    try {
      const passengerId = await AsyncStorage.getItem("passengerId");
      if (!passengerId) return;

      const formData = new FormData();
      formData.append("profileImage", {
        uri: profileImage.uri,
        name: "profile.jpg",
        type: (profileImage as any).mimeType || "image/jpeg",
      } as any);

      const res = await fetch(`${API_BASE_URL}/api/auth/passenger/${passengerId}/photo`, {
        method: "POST",
        body: formData,
      });


      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to upload image");

      setProfile(j.passenger);
      setProfileImage(null);
      Alert.alert("Success", "Profile image updated!");
    } catch (e: any) {
      console.error("❌ Upload error:", e);
      Alert.alert("Error", e.message || "Something went wrong. Try again.");
    }
  };

  const openEdit = (key: string, label: string, value?: string) => {
    setEditField({ key, label, value: value ?? "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editField) return;
    try {
      setEditSaving(true);
      const passengerId = await AsyncStorage.getItem("passengerId");
      if (!passengerId) throw new Error("Missing passengerId");

      const payload: Record<string, any> = {};
      payload[editField.key] = editField.value;

      const res = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to update");

      setProfile(j.passenger);
      setEditOpen(false);
      setEditField(null);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  };

  const computeAge = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age < 0 ? null : age;
  };
  const fmtDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  };

  const openName = () => {
    setFirstNameEdit(profile?.firstName || "");
    setMiddleNameEdit(profile?.middleName || "");
    setLastNameEdit(profile?.lastName || "");
    setNameOpen(true);
  };
  const saveName = async () => {
    try {
      setSavingName(true);
      const passengerId = await AsyncStorage.getItem("passengerId");
      if (!passengerId) throw new Error("No passengerId");
      const res = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstNameEdit.trim(),
          middleName: middleNameEdit.trim(),
          lastName: lastNameEdit.trim(),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to update name");
      setProfile(j.passenger);
      setNameOpen(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save");
    } finally {
      setSavingName(false);
    }
  };

  const openGender = () => {
    const current = profile?.gender || "";
    const known = ["Male", "Female", "Nonbinary", "Prefer not to say"];
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
      const passengerId = await AsyncStorage.getItem("passengerId");
      if (!passengerId) throw new Error("No passengerId");
      const res = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: value }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to update gender");
      setProfile(j.passenger);
      setGenderOpen(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save");
    } finally {
      setSavingGender(false);
    }
  };

  const openBday = () => {
    const d = profile?.birthday ? new Date(profile.birthday) : null;
    const initial = d && !Number.isNaN(d.getTime()) ? d : new Date();
    setBdayValue(initial);
    if (Platform.OS === "android") setShowAndroidBday(true);
    else setBdayOpen(true);
  };

  const saveBday = async () => {
    if (!bdayValue) return;
    const yyyy = bdayValue.getFullYear();
    const mm = String(bdayValue.getMonth() + 1).padStart(2, "0");
    const dd = String(bdayValue.getDate()).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}`;
    try {
      setSavingBday(true);
      const passengerId = await AsyncStorage.getItem("passengerId");
      if (!passengerId) throw new Error("No passengerId");
      const res = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthday: iso }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to update birthday");
      setProfile(j.passenger);
      setBdayOpen(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save");
    } finally {
      setSavingBday(false);
    }
  };

  const openEc = () => {
    setEcName(profile?.eContactName || "");
    setEcPhone(profile?.eContactPhone || "");
    setEcOpen(true);
  };
  const saveEc = async () => {
    if (!ecName.trim()) return Alert.alert("Emergency Contact", "Please enter a name.");
    if (!ecPhone.trim()) return Alert.alert("Emergency Contact", "Please enter a phone number.");
    try {
      setSavingEc(true);
      const passengerId = await AsyncStorage.getItem("passengerId");
      if (!passengerId) throw new Error("No passengerId");
      const res = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eContactName: ecName.trim(), eContactPhone: ecPhone.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to update emergency contact");
      setProfile(j.passenger);
      setEcOpen(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save");
    } finally {
      setSavingEc(false);
    }
  };

  const handleLogout = async () => {
    try {
      // remove all passenger-side auth keys
      await AsyncStorage.multiRemove(["role", "userId", "passengerId", "token"]);
      Alert.alert("Logged out", "You have been logged out successfully.");
      router.replace("../login_and_reg/plogin");
    } catch (error) {
      console.error("❌ Logout error:", error);
      Alert.alert("Error", "Failed to log out. Try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View>
        <StatusBar barStyle="light-content" translucent backgroundColor="black" />
      </View>

      <View style={styles.profileContainer}>
        <View style={styles.row}>
          <TouchableOpacity onPress={pickSelfieImage}>
            <Image
              source={
                profileImage
                  ? { uri: profileImage.uri }
                  : profile?.profileImage
                    ? { uri: `${profile.profileImage}?v=${encodeURIComponent(profile?.updatedAt || Date.now())}` }
                    : require("../../assets/images/profile-placeholder.jpg")
              }
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.username}>
              {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ")}
            </Text>
            {profileImage && (
              <TouchableOpacity style={styles.uploadButton} onPress={handleUploadSelfie}>
                <Text style={{ color: "#fff", textAlign: "center" }}>Save Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={30} color="black" />
          <Text style={styles.lagout}>LogOut</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.accountContainer}>
        <Text style={styles.sectionTitle}>My Account</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Full Name:</Text>
          <View style={styles.row}>
            <Text
              style={[
                styles.value,
                { color: (profile?.firstName || profile?.middleName || profile?.lastName) ? "#000" : "#999" },
              ]}
            >
              {profile?.firstName || ""} {profile?.middleName || ""} {profile?.lastName || ""}
            </Text>
            <TouchableOpacity onPress={openName} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

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

        <View style={styles.infoRow}>
          <Text style={styles.label}>Birthday:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.birthday ? "#000" : "#999" }]}>
              {profile?.birthday
                ? `${fmtDate(profile.birthday)} • ${computeAge(profile.birthday) ?? "-"}y`
                : "Not Provided"}
            </Text>
            <TouchableOpacity onPress={openBday} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Contact Number:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.phone ? "#000" : "#999" }]}>
              {profile?.phone || "Set Now"}
            </Text>
            <TouchableOpacity
              onPress={() => openEdit("contact", "Contact Number", profile?.contact || "")}
              style={{ marginLeft: 5 }}
            >
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email Address:</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.value, { color: profile?.email ? "#000" : "#999" }]}>
              {profile?.email || "Set Now"}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  backgroundColor: profile?.isVerified ? "#E6F7E9" : "#FFF4E5",
                  marginRight: 8,
                }}
              >
                <Text style={{ color: profile?.isVerified ? "#2E7D32" : "#B26A00", fontSize: 12 }}>
                  {profile?.isVerified ? "Verified" : "Not verified"}
                </Text>
              </View>

              {!profile?.isVerified && (
                <TouchableOpacity
                  disabled={emailSending}
                  onPress={resendPassengerEmail}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: emailSending ? "#ccc" : "#5089A3",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>
                    {emailSending ? "Sending..." : "Verify email"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Emergency Contacts:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.eContactName ? "#000" : "#999" }]}>
              {profile?.eContactName || profile?.eContactPhone
                ? `${profile?.eContactName || "—"} • ${profile?.eContactPhone || "—"}`
                : "Set Now"}
            </Text>
            <TouchableOpacity onPress={openEc} style={{ marginLeft: 5 }}>
              <MaterialIcons name="edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Edit field modal */}
      <Modal transparent visible={editOpen} animationType="fade" onRequestClose={() => { if (!editSaving) { setEditOpen(false); setEditField(null); } }}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>Edit {editField?.label}</Text>
            <TextInput
              placeholder={editField?.label}
              placeholderTextColor="#A0A0A0"
              value={editField?.value ?? ""}
              onChangeText={(t) => setEditField((p) => (p ? { ...p, value: t } : p))}
              style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
              autoCapitalize="sentences"
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <TouchableOpacity disabled={editSaving} onPress={() => { setEditOpen(false); setEditField(null); }} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={editSaving} onPress={saveEdit} style={{ backgroundColor: "#5089A3", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, minWidth: 90, alignItems: "center" }}>
                {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Name modal */}
      <Modal transparent visible={nameOpen} animationType="fade" onRequestClose={() => !savingName && setNameOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>Edit Name</Text>
            <TextInput placeholder="First name" placeholderTextColor="#A0A0A0" value={firstNameEdit} onChangeText={setFirstNameEdit} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }} />
            <TextInput placeholder="Middle name (optional)" placeholderTextColor="#A0A0A0" value={middleNameEdit} onChangeText={setMiddleNameEdit} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }} />
            <TextInput placeholder="Last name" placeholderTextColor="#A0A0A0" value={lastNameEdit} onChangeText={setLastNameEdit} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }} />
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity disabled={savingName} onPress={() => setNameOpen(false)} style={{ padding: 10, marginRight: 8 }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={savingName} onPress={saveName} style={{ backgroundColor: "#5089A3", padding: 10, borderRadius: 8, minWidth: 90, alignItems: "center" }}>
                {savingName ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gender modal */}
      <Modal transparent visible={genderOpen} animationType="fade" onRequestClose={() => !savingGender && setGenderOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 12 }}>Select Gender</Text>
            {["Male", "Female", "Nonbinary", "Prefer not to say", "Other"].map((opt) => (
              <TouchableOpacity key={opt} onPress={() => setGenderChoice(opt)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#5089A3", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                  {genderChoice === opt ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#5089A3" }} /> : null}
                </View>
                <Text>{opt}</Text>
              </TouchableOpacity>
            ))}
            {genderChoice === "Other" && (
              <TextInput placeholder="Enter your gender" placeholderTextColor="#A0A0A0" value={genderOther} onChangeText={setGenderOther} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 }} />
            )}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
              <TouchableOpacity disabled={savingGender} onPress={() => setGenderOpen(false)} style={{ padding: 10, marginRight: 8 }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={savingGender} onPress={saveGender} style={{ backgroundColor: "#5089A3", padding: 10, borderRadius: 8, minWidth: 90, alignItems: "center" }}>
                {savingGender ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Birthday modal (iOS) */}
      <Modal transparent visible={bdayOpen} animationType="fade" onRequestClose={() => !savingBday && setBdayOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 12 }}>Select Birthday</Text>
            {Platform.OS === "ios" && bdayValue && (
              <DateTimePicker mode="date" value={bdayValue} display="spinner" onChange={(_, d) => d && setBdayValue(d)} maximumDate={new Date()} />
            )}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
              <TouchableOpacity disabled={savingBday} onPress={() => setBdayOpen(false)} style={{ padding: 10, marginRight: 8 }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={savingBday} onPress={saveBday} style={{ backgroundColor: "#5089A3", padding: 10, borderRadius: 8, minWidth: 90, alignItems: "center" }}>
                {savingBday ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Android date picker */}
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

      {/* Confirm birthday (Android) */}
      <Modal transparent visible={androidBdayConfirmOpen} animationType="fade" onRequestClose={() => !savingBday && setAndroidBdayConfirmOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 12 }}>Confirm Birthday</Text>
            <Text style={{ fontSize: 14, marginBottom: 16 }}>
              {bdayValue ? bdayValue.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }) : "—"}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity disabled={savingBday} onPress={() => setAndroidBdayConfirmOpen(false)} style={{ padding: 10, marginRight: 8 }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={savingBday}
                onPress={async () => {
                  await saveBday();
                  setAndroidBdayConfirmOpen(false);
                }}
                style={{ backgroundColor: "#5089A3", padding: 10, borderRadius: 8, minWidth: 90, alignItems: "center" }}
              >
                {savingBday ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Emergency contact modal */}
      <Modal transparent visible={ecOpen} animationType="fade" onRequestClose={() => !savingEc && setEcOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>Emergency Contact</Text>
            <TextInput placeholder="Contact name" placeholderTextColor="#A0A0A0" value={ecName} onChangeText={setEcName} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }} />
            <TextInput placeholder="Phone number" placeholderTextColor="#A0A0A0" keyboardType="phone-pad" value={ecPhone} onChangeText={setEcPhone} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }} />
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity disabled={savingEc} onPress={() => setEcOpen(false)} style={{ padding: 10, marginRight: 8 }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={savingEc} onPress={saveEc} style={{ backgroundColor: "#5089A3", padding: 10, borderRadius: 8, minWidth: 90, alignItems: "center" }}>
                {savingEc ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Save</Text>}
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
  profileContainer: { alignItems: "center", paddingTop: 50, flexDirection: "row", marginHorizontal: 20, justifyContent: "space-between" },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  username: { fontSize: 18, fontWeight: "bold", marginBottom: 10, paddingLeft: 20 },
  lagout: { fontSize: 14, fontWeight: "bold" },
  uploadButton: { backgroundColor: "#5089A3", borderRadius: 8, padding: 5, marginTop: 10 },
  accountContainer: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, color: "#333" },
  value: { fontSize: 14, color: "#333" },
  deleteButton: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 20, width: width - 40 },
});
