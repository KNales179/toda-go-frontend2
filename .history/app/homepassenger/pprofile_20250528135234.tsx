import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Alert, Platform, ActionSheetIOS, ScrollView } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { API_BASE_URL } from "../../config";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function PProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<ImagePickerAsset | null>(null);

  const fetchProfile = async () => {
    try {
      const passengerId = await AsyncStorage.getItem("passengerId");
      const response = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`);
      const result = await response.json();
      if (result.passenger) {
        setProfile(result.passenger);
      } else {
        console.warn("⚠️ Passenger not found");
      }
    } catch (error) {
      console.error("❌ Failed to fetch passenger profile:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  const pickSelfieImage = async (setFunc: (img: ImagePickerAsset) => void) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Take a Photo", "Choose from Gallery", "Cancel"],
          cancelButtonIndex: 2,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            const cameraResult = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
            });
            if (!cameraResult.canceled && cameraResult.assets.length > 0) {
              setFunc(cameraResult.assets[0]);
            }
          } else if (buttonIndex === 1) {
            const galleryResult = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
            });
            if (!galleryResult.canceled && galleryResult.assets.length > 0) {
              setFunc(galleryResult.assets[0]);
            }
          }
        }
      );
    } else {
      Alert.alert("Select Option", "", [
        { text: "Take a Photo", onPress: async () => {
          const cameraResult = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
          });
          if (!cameraResult.canceled && cameraResult.assets.length > 0) {
            setFunc(cameraResult.assets[0]);
          }
        }},
        { text: "Choose from Gallery", onPress: async () => {
          const galleryResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
          });
          if (!galleryResult.canceled && galleryResult.assets.length > 0) {
            setFunc(galleryResult.assets[0]);
          }
        }},
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleUploadSelfie = async () => {
    if (!profileImage) {
      Alert.alert("Error", "Please select an image first.");
      return;
    }

    try {
      const passengerId = await AsyncStorage.getItem("passengerId");
      const formData = new FormData();
      formData.append("profileImage", {
        uri: profileImage.uri,
        name: "profile.jpg",
        type: "image/jpeg",
      } as any);
      const res = await fetch(`${API_BASE_URL}/api/auth/passenger/${passengerId}/update-profile-image`, {
        method: "PATCH",
        body: formData,
      });
      if (res.ok) {
        Alert.alert("Success", "Profile image updated!");
        const updatedProfile = await res.json();
        setProfile(updatedProfile.passenger);
        setProfileImage(null);
      } else {
        Alert.alert("Error", "Failed to upload image.");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      Alert.alert("Error", "Something went wrong. Try again.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileContainer}>
          <TouchableOpacity onPress={() => pickSelfieImage(setProfileImage)}>
            <Image
              source={
                profileImage
                  ? { uri: profileImage.uri }
                  : profile?.profileImage
                  ? { uri: `${API_BASE_URL}/${profile.profileImage}` }
                  : require("../../assets/images/profile-placeholder.jpg")
              }
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <Text style={styles.userName}>{profile ? `${profile.firstName} ${profile.middleName} ${profile.lastName}` : "User Name"}</Text>
          {profileImage && (
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadSelfie}>
              <Text style={{ color: "#fff" }}>Upload New Profile Image</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>My Account</Text>
          {renderRow("Full Name", `${profile?.firstName || ""} ${profile?.middleName || ""} ${profile?.lastName || ""}`)}
          {renderRow("Gender", profile?.gender || "Not Provided")}
          {renderRow("Age", profile?.age?.toString() || "Not Provided")}
          {renderRow("Contact Number", profile?.contact || "Not Provided")}
          {renderRow("Email Address", profile?.email || "Not Provided")}
          {renderRow("Emergency Contacts", "Not Provided")}
        </View>

        <TouchableOpacity style={styles.deleteAccountContainer}>
          <MaterialIcons name="delete" size={24} color="red" />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => router.push("/homepassenger/phome")}><Ionicons name="home-outline" size={30} color="black" /><Text>Home</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/phistory")}><Ionicons name="document-text-outline" size={30} color="black" /><Text>History</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/pchats")}><Ionicons name="chatbubbles-outline" size={30} color="black" /><Text>Chats</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/pprofile")}><Ionicons name="person" size={30} color="black" /><Text>Profile</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const renderRow = (label: string, value: string) => (
  <TouchableOpacity style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
    <Ionicons name="chevron-forward-outline" size={20} color="#888" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 20 },
  profileContainer: { alignItems: "center", marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  userName: { fontWeight: "bold", fontSize: 16 },
  uploadButton: { backgroundColor: "#5089A3", borderRadius: 8, padding: 10, marginTop: 10 },
  sectionTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 10 },
  accountSection: { marginTop: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" },
  label: { color: "#888" },
  value: { flex: 1, marginLeft: 10, fontWeight: "bold" },
  deleteAccountContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 },
  deleteAccountText: { color: "red", marginLeft: 5, fontWeight: "bold" },
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
});
