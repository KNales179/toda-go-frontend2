// step3-personal.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import RegisterProgressBar from "../components/RegisterProgressBar";
import { useRegister } from "./RegisterContext";
import { API_BASE_URL } from "../../../config";

const PROFILE_PLACEHOLDER = require("../../../assets/images/profile-placeholder.jpg");

function applyIfEmpty(current: string, incoming?: string) {
  if (current?.trim()) return current;
  return (incoming || "").trim();
}

export default function Step3Personal() {
  const router = useRouter();
  const { state, patch } = useRegister();
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "done">("idle");
  const scanOnceRef = useRef(false);

  const pickSelfie = async () => {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (camPerm.status !== "granted" && libPerm.status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera or photo library access.");
      return;
    }

    const takePhoto = async () => {
      const cameraResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!cameraResult.canceled && cameraResult.assets?.length) {
        patch({ selfieImage: cameraResult.assets[0] });
      }
    };

    const chooseFromGallery = async () => {
      const galleryResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!galleryResult.canceled && galleryResult.assets?.length) {
        patch({ selfieImage: galleryResult.assets[0] });
      }
    };

    if (Platform.OS === "ios") {
      const { ActionSheetIOS } = await import("react-native");
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Take a Photo", "Choose from Gallery", "Cancel"],
          cancelButtonIndex: 2,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) await takePhoto();
          if (buttonIndex === 1) await chooseFromGallery();
        }
      );
    } else {
      Alert.alert("Select Option", "", [
        { text: "Take a Photo", onPress: takePhoto },
        { text: "Choose from Gallery", onPress: chooseFromGallery },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  // 🔇 Silent scan once (uses ID images from step2 if present)
  useEffect(() => {
    if (scanOnceRef.current) return;
    scanOnceRef.current = true;

    if (!state.votersIDImage && !state.driversLicenseImage) return;

    (async () => {
      try {
        setScanStatus("scanning");

        const fd = new FormData();

        if (state.votersIDImage) {
          fd.append(
            "votersIDImage",
            {
              uri: state.votersIDImage.uri,
              name: "voter.jpg",
              type: "image/jpeg",
            } as any
          );
        }

        if (state.driversLicenseImage) {
          fd.append(
            "driversLicenseImage",
            {
              uri: state.driversLicenseImage.uri,
              name: "license.jpg",
              type: "image/jpeg",
            } as any
          );
        }

        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 120000);

        const res = await fetch(`${API_BASE_URL}/api/auth/driver/scan-id`, {
          method: "POST",
          body: fd,
          headers: { Accept: "application/json" },
          signal: ctrl.signal,
        }).finally(() => clearTimeout(t));

        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setScanStatus("done");
          return;
        }

        const f = data.fields || {};

        // ✅ Autofill behavior matches your "old reg" logic:
        // - If role is Both: fill BOTH driver + operator
        // - If role is Driver: fill driver only
        // - If role is Operator: fill operator only
        if (state.role === "Both") {
          patch({
            operatorFirstName: applyIfEmpty(state.operatorFirstName, f.firstName),
            operatorMiddleName: applyIfEmpty(state.operatorMiddleName, f.middleName),
            operatorLastName: applyIfEmpty(state.operatorLastName, f.lastName),
            operatorBirthdate: applyIfEmpty(state.operatorBirthdate, f.birthdate),

            driverFirstName: applyIfEmpty(state.driverFirstName, f.firstName),
            driverMiddleName: applyIfEmpty(state.driverMiddleName, f.middleName),
            driverLastName: applyIfEmpty(state.driverLastName, f.lastName),
            driverBirthdate: applyIfEmpty(state.driverBirthdate, f.birthdate),
          });
        } else if (state.role === "Driver") {
          patch({
            driverFirstName: applyIfEmpty(state.driverFirstName, f.firstName),
            driverMiddleName: applyIfEmpty(state.driverMiddleName, f.middleName),
            driverLastName: applyIfEmpty(state.driverLastName, f.lastName),
            driverBirthdate: applyIfEmpty(state.driverBirthdate, f.birthdate),
          });
        } else {
          patch({
            operatorFirstName: applyIfEmpty(state.operatorFirstName, f.firstName),
            operatorMiddleName: applyIfEmpty(state.operatorMiddleName, f.middleName),
            operatorLastName: applyIfEmpty(state.operatorLastName, f.lastName),
            operatorBirthdate: applyIfEmpty(state.operatorBirthdate, f.birthdate),
          });
        }

        setScanStatus("done");
      } catch {
        setScanStatus("done");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    if (!state.selfieImage) return Alert.alert("Required", "Please upload your profile photo (selfie).");

    // ✅ Validation based on old behavior
    if (state.role === "Both") {
      // one set only (operator fields)
      if (!state.operatorFirstName.trim()) return Alert.alert("Required", "First name is required.");
      if (!state.operatorLastName.trim()) return Alert.alert("Required", "Last name is required.");
      if (!state.operatorBirthdate.trim()) return Alert.alert("Required", "Birthdate is required.");
      if (!state.operatorPhone.trim()) return Alert.alert("Required", "Contact number is required.");
    } else if (state.role === "Driver") {
      if (!state.driverFirstName.trim()) return Alert.alert("Required", "Driver first name is required.");
      if (!state.driverLastName.trim()) return Alert.alert("Required", "Driver last name is required.");
      if (!state.driverBirthdate.trim()) return Alert.alert("Required", "Driver birthdate is required.");
      if (!state.driverPhone.trim()) return Alert.alert("Required", "Driver contact number is required.");
    } else {
      if (!state.operatorFirstName.trim()) return Alert.alert("Required", "Operator first name is required.");
      if (!state.operatorLastName.trim()) return Alert.alert("Required", "Operator last name is required.");
      if (!state.operatorBirthdate.trim()) return Alert.alert("Required", "Operator birthdate is required.");
      if (!state.operatorPhone.trim()) return Alert.alert("Required", "Operator contact number is required.");
    }

    router.push("/login_and_reg/register/step4-franchise-trike");
  };

  const title =
    scanStatus === "scanning" ? "Scanning ID for autofill…" : scanStatus === "done" ? "You can continue." : "";

  const showDriverSection = state.role === "Driver" || state.role === "Operator"; // matches your old reg: dedicated driver inputs when NOT Both
  const showOperatorSection = state.role === "Driver" || state.role === "Operator"; // dedicated operator inputs when NOT Both

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <RegisterProgressBar step={3} total={5} title="Personal Details" />

      <View style={styles.card}>
        {!!title && <Text style={styles.scan}>{title}</Text>}

        <View style={styles.selfieWrap}>
          <TouchableOpacity onPress={pickSelfie}>
            <Image
              source={state.selfieImage ? { uri: state.selfieImage.uri } : PROFILE_PLACEHOLDER}
              style={styles.selfie}
            />
            <View style={styles.badge}>
              <Text style={{ color: "#fff", fontWeight: "900" }}>📷</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ✅ OLD behavior: if Both => only 1 set of inputs (Personal) */}
        {state.role === "Both" ? (
          <>
            <Text style={styles.h}>Personal Information</Text>

            <TextInput
              style={styles.in}
              placeholder="First Name"
              value={state.operatorFirstName}
              onChangeText={(v) => patch({ operatorFirstName: v })}
            />
            <TextInput
              style={styles.in}
              placeholder="Middle Name"
              value={state.operatorMiddleName}
              onChangeText={(v) => patch({ operatorMiddleName: v })}
            />
            <TextInput
              style={styles.in}
              placeholder="Last Name"
              value={state.operatorLastName}
              onChangeText={(v) => patch({ operatorLastName: v })}
            />
            <TextInput
              style={styles.in}
              placeholder="Suffix"
              value={state.operatorSuffix}
              onChangeText={(v) => patch({ operatorSuffix: v })}
            />
            <TextInput
              style={styles.in}
              placeholder="Birthdate (YYYY-MM-DD)"
              value={state.operatorBirthdate}
              onChangeText={(v) => patch({ operatorBirthdate: v })}
            />
            <TextInput
              style={styles.in}
              placeholder="Phone/Contact Number"
              keyboardType="phone-pad"
              value={state.operatorPhone}
              onChangeText={(v) => patch({ operatorPhone: v })}
            />

            {/* keep driver fields synced so backend won't miss if it expects them */}
            <TouchableOpacity
              style={styles.syncBtn}
              onPress={() =>
                patch({
                  driverFirstName: state.operatorFirstName,
                  driverMiddleName: state.operatorMiddleName,
                  driverLastName: state.operatorLastName,
                  driverSuffix: state.operatorSuffix,
                  driverBirthdate: state.operatorBirthdate,
                  driverPhone: state.operatorPhone,
                })
              }
            >
              <Text style={styles.syncText}>Sync Driver info = Personal info</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* ✅ OLD behavior: dedicated Operator + Driver inputs when role is Driver or Operator */}
            {showOperatorSection ? (
              <>
                <Text style={styles.h}>Operator Information</Text>

                <TextInput
                  style={styles.in}
                  placeholder="First Name"
                  value={state.operatorFirstName}
                  onChangeText={(v) => patch({ operatorFirstName: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Middle Name"
                  value={state.operatorMiddleName}
                  onChangeText={(v) => patch({ operatorMiddleName: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Last Name"
                  value={state.operatorLastName}
                  onChangeText={(v) => patch({ operatorLastName: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Suffix"
                  value={state.operatorSuffix}
                  onChangeText={(v) => patch({ operatorSuffix: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Birthdate (YYYY-MM-DD)"
                  value={state.operatorBirthdate}
                  onChangeText={(v) => patch({ operatorBirthdate: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Phone/Contact Number ng Operator"
                  keyboardType="phone-pad"
                  value={state.operatorPhone}
                  onChangeText={(v) => patch({ operatorPhone: v })}
                />
              </>
            ) : null}

            {showDriverSection ? (
              <>
                <Text style={[styles.h, { marginTop: 12 }]}>Driver Information</Text>

                <TextInput
                  style={styles.in}
                  placeholder="First Name"
                  value={state.driverFirstName}
                  onChangeText={(v) => patch({ driverFirstName: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Middle Name"
                  value={state.driverMiddleName}
                  onChangeText={(v) => patch({ driverMiddleName: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Last Name"
                  value={state.driverLastName}
                  onChangeText={(v) => patch({ driverLastName: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Suffix"
                  value={state.driverSuffix}
                  onChangeText={(v) => patch({ driverSuffix: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Birthdate (YYYY-MM-DD)"
                  value={state.driverBirthdate}
                  onChangeText={(v) => patch({ driverBirthdate: v })}
                />
                <TextInput
                  style={styles.in}
                  placeholder="Phone/Contact Number ng Driver"
                  keyboardType="phone-pad"
                  value={state.driverPhone}
                  onChangeText={(v) => patch({ driverPhone: v })}
                />
              </>
            ) : null}
          </>
        )}

        <TouchableOpacity style={styles.btn} onPress={next}>
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.small}>Note: Autofill is best-effort. If nothing appears, just type manually.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 30, backgroundColor: "#f2f2f2" },
  card: { margin: 16, backgroundColor: "#fff", borderRadius: 14, padding: 16 },
  scan: { color: "#666", marginBottom: 10 },
  selfieWrap: { alignItems: "center", marginBottom: 12 },
  selfie: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#D0D0D0" },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#5089A3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  h: { fontSize: 16, fontWeight: "900", color: "#222", marginBottom: 10 },
  in: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc", padding: 12, marginBottom: 10, borderRadius: 10 },
  btn: { marginTop: 8, backgroundColor: "#5089A3", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  small: { marginTop: 10, fontSize: 12, color: "#777" },

  syncBtn: {
    marginTop: 2,
    marginBottom: 8,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#EAF3F7",
    borderWidth: 1,
    borderColor: "#C7DFEA",
  },
  syncText: { color: "#2D6D86", fontWeight: "800", fontSize: 12 },
});