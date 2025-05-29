import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Alert, Platform, ActionSheetIOS } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { API_BASE_URL } from "../../config";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function DProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [selfieImage, setProfileImage] = useState<ImagePickerAsset | null>(null);

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

  const pickSelfieImage = async () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Take a Photo", "Choose from Gallery", "Cancel"],
          cancelButtonIndex: 2,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled && result.assets.length > 0) {
              setProfileImage(result.assets[0]);
            }
          } else if (buttonIndex === 1) {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled && result.assets.length > 0) {
              setProfileImage(result.assets[0]);
            }
          }
        }
      );
    } else {
      Alert.alert("Select Option", "", [
        {
          text: "Take a Photo", onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled && result.assets.length > 0) {
              setProfileImage(result.assets[0]);
            }
          }
        },
        {
          text: "Choose from Gallery", onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled && result.assets.length > 0) {
              setProfileImage(result.assets[0]);
            }
          }
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleUploadSelfie = async () => {
    if (!selfieImage) {
      Alert.alert("Error", "Please select an image first.");
      return;
    }
    try {
      const driverId = await AsyncStorage.getItem("driverId");
      if (!driverId) return;
      const formData = new FormData();
      formData.append("profileImage", {
        uri: selfieImage.uri,
        name: "profile.jpg",
        type: "image/jpeg",
      } as any);
      const res = await fetch(`${API_BASE_URL}/api/auth/driver/${driverId}/update-profile-image`, {
        method: "PATCH",
        body: formData,
      });
      if (res.ok) {
        Alert.alert("Success", "Profile image updated!");
        const updatedProfile = await res.json();
        setProfile(updatedProfile.driver);
        setProfileImage(null);
      } else {
        Alert.alert("Error", "Failed to upload image.");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      Alert.alert("Error", "Something went wrong. Try again.");
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

  // For drivers, show driver info (modify the fields as per your Driver model)
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
          <Text style={styles.username}>
            {profile?.driverFirstName || ""}{profile?.driverLastName || ""}
          </Text>
        </View>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={30} color="black" />
          <Text style={styles.lagout}>LogOut</Text>
        </TouchableOpacity>
        {selfieImage && (
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadSelfie}>
            <Text style={{ color: "#fff" }}>Upload New Profile Image</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.accountContainer}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Full Name:</Text>
          <View style={styles.row}>
            <Text style={[
              styles.value,
              { color: (profile?.driverFirstName || profile?.driverMiddleName || profile?.driverLastName) ? "#000" : "#999" },
            ]}>
              {profile?.driverFirstName || ""} {profile?.driverMiddleName || ""} {profile?.driverLastName || ""}
            </Text>
            <MaterialIcons name="edit" size={20} color="#888" style={{ marginLeft: 5 }} />
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Gender:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.gender ? "#000" : "#999" }]}>
              {profile?.gender || "Set Now"}
            </Text>
            <MaterialIcons name="edit" size={20} color="#888" style={{ marginLeft: 5 }} />
          </View>
        </View>

        {/* <View style={styles.infoRow}>
          <Text style={styles.label}>Age:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.age ? "#000" : "#999" }]}>
              {profile?.age || "Set Now"}
            </Text>
            <MaterialIcons name="edit" size={20} color="#888" style={{ marginLeft: 5 }} />
          </View>
        </View> */}

        <View style={styles.infoRow}>
          <Text style={styles.label}>Contact Number:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.driverPhone ? "#000" : "#999" }]}>
              {profile?.driverPhone || "Set Now"}
            </Text>
            <MaterialIcons name="edit" size={20} color="#888" style={{ marginLeft: 5 }} />
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Birthday:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.driverBirthdate ? "#000" : "#999" }]}>
              {profile?.driverBirthdate ? profile.driverBirthdate.slice(0, 10) : "Not Provided"}
            </Text>
            <MaterialIcons name="edit" size={20} color="#888" style={{ marginLeft: 5 }} />
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email Address:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.email ? "#000" : "#999" }]}>
              {profile?.email || "Set Now"}
            </Text>
            <MaterialIcons name="edit" size={20} color="#888" style={{ marginLeft: 5 }} />
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>License Number:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.licenseId ? "#000" : "#999" }]}>
              {profile?.licenseId || "Set Now"}
            </Text>
            <MaterialIcons name="edit" size={20} color="#888" style={{ marginLeft: 5 }} />
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Francise Number:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.franchiseNumber ? "#000" : "#999" }]}>
              {profile?.franchiseNumber || "Set Now"}
            </Text>
            <MaterialIcons name="edit" size={20} color="#888" style={{ marginLeft: 5 }} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Francise Number:</Text>
          <View style={styles.row}>
            <Text style={[styles.value, { color: profile?.franchiseNumber ? "#000" : "#999" }]}>
              {profile?.franchiseNumber || "Set Now"}
            </Text>
            <MaterialIcons name="edit" size={20} color="#888" style={{ marginLeft: 5 }} />
          </View>
        </View>
        {/* Add more driver-specific fields as needed! */}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => router.push("/homedriver/dhome")}><Ionicons name="home-outline" size={30} color="black" /><Text>Home</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homedriver/dhistory")}><Ionicons name="document-text-outline" size={30} color="black" /><Text>History</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homedriver/dchats")}><Ionicons name="chatbubbles-outline" size={30} color="black" /><Text>Chats</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homedriver/dprofile")}><Ionicons name="person" size={30} color="black" /><Text>Profile</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  profileContainer: { alignItems: "center", paddingTop: 50, flexDirection: "row", marginHorizontal: 20, justifyContent: "space-between" },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  username: { fontSize: 18, fontWeight: "bold", marginBottom: 10, paddingLeft: 20 },
  lagout: { fontSize: 14, fontWeight: "bold" },
  uploadButton: { backgroundColor: "#5089A3", borderRadius: 8, padding: 10, marginTop: 10 },
  accountContainer: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontWeight: "bold", fontSize: 16, marginVertical: 15 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, color: "#333" },
  value: { fontSize: 14, color: "#333" },
  deleteButton: { flexDirection: "row", justifyContent: 'flex-end', alignItems: "center", marginTop: 20, width: width - 40 },
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
});
