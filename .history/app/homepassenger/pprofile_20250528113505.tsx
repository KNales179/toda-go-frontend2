import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Alert, Platform, ActionSheetIOS } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { API_BASE_URL } from "../../config";

const { width } = Dimensions.get("window");

export default function PProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<ImagePickerAsset | null>(null);

  useEffect(() => {
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

    fetchProfile();
  }, []);

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
            console.log("📷 Picked profile image:", cameraResult.assets[0]);
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
      console.log("Sending formData:", formData);
      const res = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}/update-profile-image`, {
        method: "PATCH",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log(`${API_BASE_URL}/api/passenger/${passengerId}/update-profile-image`)
      if (res.ok) {
        Alert.alert("Success", "Profile image updated!");
        // Refresh profile
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
      <Text style={styles.heading}>PROFILE</Text>
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

      {profileImage && (
        <TouchableOpacity style={styles.uploadButton} onPress={handleUploadSelfie}>
          <Text style={{ color: "#fff" }}>Upload New Profile Image</Text>
        </TouchableOpacity>
      )}

      {profile ? (
        <>
          <Text style={styles.info}>Name: {profile.firstName} {profile.middleName} {profile.lastName}</Text>
          <Text style={styles.info}>Email: {profile.email}</Text>
          <Text style={styles.info}>Phone: {profile.contact || "Not Provided"}</Text>
          <Text style={styles.info}>Birthday: {profile.birthday || "Not Provided"}</Text>
        </>
      ) : (
        <Text style={{ color: "#888" }}>Loading profile...</Text>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => router.push("/homepassenger/phome")}><Ionicons name="home-outline" size={30} color="black" /><Text>Home</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/phistory")}><Ionicons name="document-text-outline" size={30} color="black" /><Text>History</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/pchats")}><Ionicons name="chatbubbles-outline" size={30} color="black" /><Text>Chats</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/homepassenger/pprofile")}><Ionicons name="person" size={30} color="black" /><Text>Profile</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  heading: { fontWeight: 'bold', fontSize: 18, marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  info: { fontSize: 14, color: '#333', marginVertical: 2 },
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
  uploadButton: { backgroundColor: "#5089A3", borderRadius: 8, padding: 10, marginTop: 10 },
});
