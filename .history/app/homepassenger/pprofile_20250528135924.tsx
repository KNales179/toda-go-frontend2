import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Alert, Platform, ActionSheetIOS } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
        { text: "Take a Photo", onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled && result.assets.length > 0) {
              setProfileImage(result.assets[0]);
            }
          }},
        { text: "Choose from Gallery", onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled && result.assets.length > 0) {
              setProfileImage(result.assets[0]);
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
      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={pickSelfieImage}>
          <Image
            source={
              profileImage
                ? { uri: profileImage.uri }
                : profile?.profileImage
                ? { uri: `${API_BASE_URL}/${profile.profileImage.replace(/\\/g, "/")}` }
                : require("../../assets/images/profile-placeholder.jpg")
            }
            style={styles.profileImage}
          />
        </TouchableOpacity>
        <Text style={styles.username}>{profile?.firstName} {profile?.lastName}</Text>
        {profileImage && (
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadSelfie}>
            <Text style={{ color: "#fff" }}>Upload New Profile Image</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.accountContainer}>
        <Text style={styles.sectionTitle}>My Account</Text>

        <View style={styles.infoRow}><Text style={styles.label}>Full Name:</Text><Text style={styles.value}>{profile?.firstName} {profile?.middleName} {profile?.lastName}</Text></View>
        <View style={styles.infoRow}><Text style={styles.label}>Gender:</Text><Text style={styles.value}>{profile?.gender || "Not Provided"}</Text></View>
        <View style={styles.infoRow}><Text style={styles.label}>Age:</Text><Text style={styles.value}>{profile?.age || "Not Provided"}</Text></View>
        <View style={styles.infoRow}><Text style={styles.label}>Contact Number:</Text><Text style={styles.value}>{profile?.contact || "Not Provided"}</Text></View>
        <View style={styles.infoRow}><Text style={styles.label}>Email Address:</Text><Text style={styles.value}>{profile?.email}</Text></View>
        <View style={styles.infoRow}><Text style={styles.label}>Emergency Contacts:</Text><Text style={styles.value}>None</Text></View>

        <TouchableOpacity style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color="red" />
          <Text style={{ color: "red", marginLeft: 5 }}>Delete Account</Text>
        </TouchableOpacity>
      </View>

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
  container: {paddingHorizontal:20, flex: 1, backgroundColor: "#fff" },
  profileContainer: { alignItems: "center", paddingTop: 50, flexDirection:"row", },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  username: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  uploadButton: { backgroundColor: "#5089A3", borderRadius: 8, padding: 10, marginTop: 10 },
  accountContainer: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  label: { fontSize: 14, color: "#333" },
  value: { fontSize: 14, color: "#333" },
  deleteButton: { flexDirection: "row", justifyContent:'flex-end', alignItems: "center", marginTop: 20, width: width-40},
  bottomNav: { position: "absolute", bottom: 0, flexDirection: "row", justifyContent: "space-around", width: width, height: 70, backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "black" },
});

