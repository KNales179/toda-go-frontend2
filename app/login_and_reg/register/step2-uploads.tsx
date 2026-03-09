//step2-uploads.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import RegisterProgressBar from "../components/RegisterProgressBar";
import { useRegister } from "./RegisterContext";

function Thumb({ uri }: { uri?: string }) {
  if (!uri) return null;
  return <Image source={{ uri }} style={{ width: 52, height: 52, borderRadius: 10 }} />;
}

export default function Step2Uploads() {
  const router = useRouter();
  const { state, patch } = useRegister();

  const pick = async (key: "votersIDImage" | "driversLicenseImage" | "orcrImage") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets?.length) {
      patch({ [key]: result.assets[0] } as any);
    }
  };

  const next = () => {
    if (!state.votersIDImage) {
      Alert.alert("Required", "Please upload Voter's ID / Certificate first.");
      return;
    }
    router.push("/login_and_reg/register/step3-personal");
  };

  return (
    <View style={styles.container}>
      <RegisterProgressBar step={2} total={5} title="Upload Documents" />

      <View style={styles.card}>
        <Text style={styles.note}>Tip: Use good lighting, no glare, and keep the ID flat.</Text>

        <View style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Voter's ID / Certificate</Text>
          </View>
          <Thumb uri={state.votersIDImage?.uri} />
          <TouchableOpacity style={styles.upBtn} onPress={() => pick("votersIDImage")}>
            <Text style={styles.upBtnText}>{state.votersIDImage ? "Change" : "Upload"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Driver's License</Text>
          </View>
          <Thumb uri={state.driversLicenseImage?.uri} />
          <TouchableOpacity style={styles.upBtn} onPress={() => pick("driversLicenseImage")}>
            <Text style={styles.upBtnText}>{state.driversLicenseImage ? "Change" : "Upload"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>OR/CR</Text>
          </View>
          <Thumb uri={state.orcrImage?.uri} />
          <TouchableOpacity style={styles.upBtn} onPress={() => pick("orcrImage")}>
            <Text style={styles.upBtnText}>{state.orcrImage ? "Change" : "Upload"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={next}>
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 30, backgroundColor: "#f2f2f2" },
  card: { margin: 16, backgroundColor: "#fff", borderRadius: 14, padding: 16 },
  note: { color: "#666", marginBottom: 12 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  label: { fontWeight: "700", color: "#222" },
  upBtn: { backgroundColor: "#5089A3", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  upBtnText: { color: "#fff", fontWeight: "800" },
  btn: { marginTop: 16, backgroundColor: "#5089A3", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});