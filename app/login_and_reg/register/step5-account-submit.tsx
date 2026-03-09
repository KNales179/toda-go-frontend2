//step5-account-submit.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import RegisterProgressBar from "../components/RegisterProgressBar";
import { useRegister } from "./RegisterContext";
import { API_BASE_URL } from "../../../config";
import { ImagePickerAsset } from "expo-image-picker";

const asFile = (a: ImagePickerAsset | null, fallback = "photo.jpg") =>
  a
    ? ({
        uri: a.uri,
        name: (a as any).fileName || fallback,
        type: (a as any).mimeType || "image/jpeg",
      } as any)
    : null;

export default function Step5AccountSubmit() {
  const router = useRouter();
  const { state, patch, reset } = useRegister();

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const submit = async () => {
    if (submitting) return;

    // ✅ validate same as old file
    if (!state.votersIDImage) return Alert.alert("Missing", "Please upload Voter's ID image.");
    if (!state.selfieImage) return Alert.alert("Missing", "Please upload your selfie.");
    if (!state.email) return Alert.alert("Missing", "Email is required.");
    if (!state.password) return Alert.alert("Missing", "Password is required.");
    if (state.password !== state.confirmPassword) return Alert.alert("Error", "Passwords do not match.");
    if (!state.experienceYears) return Alert.alert("Missing", "Driving experience is required.");

    setSubmitting(true);

    try {
        const fd = new FormData();

        // shared fields
        fd.append("role", state.role);
        fd.append("franchiseNumber", state.franchiseNumber);
        fd.append("todaName", state.todaName);
        fd.append("sector", state.sector);
        fd.append("isLucenaVoter", state.isLucenaVoter);
        fd.append("votingLocation", state.votingLocation);

        // operator fields
        fd.append("operatorFirstName", state.operatorFirstName);
        fd.append("operatorMiddleName", state.operatorMiddleName);
        fd.append("operatorLastName", state.operatorLastName);
        fd.append("operatorSuffix", state.operatorSuffix);
        fd.append("operatorBirthdate", state.operatorBirthdate);
        fd.append("operatorPhone", state.operatorPhone);

        // driver fields
        fd.append("driverFirstName", state.driverFirstName || state.operatorFirstName);
        fd.append("driverMiddleName", state.driverMiddleName || state.operatorMiddleName);
        fd.append("driverLastName", state.driverLastName || state.operatorLastName);
        fd.append("driverSuffix", state.driverSuffix || state.operatorSuffix);
        fd.append("driverBirthdate", state.driverBirthdate || state.operatorBirthdate);
        fd.append("driverPhone", state.driverPhone || state.operatorPhone);

        fd.append("experienceYears", state.experienceYears);
        fd.append("capacity", String(state.capacity));
        fd.append("trikeColor", state.trikeColor || "");
        fd.append("plateNumber", state.plateNumber);

        // role-based email/password
        if (state.role === "Driver") {
        fd.append("driverEmail", state.email);
        fd.append("driverPassword", state.password);
        } else if (state.role === "Operator") {
        fd.append("operatorEmail", state.email);
        fd.append("operatorPassword", state.password);
        } else {
        fd.append("driverEmail", state.email);
        fd.append("driverPassword", state.password);
        fd.append("operatorEmail", state.email);
        fd.append("operatorPassword", state.password);
        }

        // ✅ FILES (THIS IS WHAT YOU LOST)
        const V = asFile(state.votersIDImage, "voter.jpg");
        if (V) fd.append("votersIDImage", V);

        const L = asFile(state.driversLicenseImage, "license.jpg");
        if (L) fd.append("driversLicenseImage", L);

        const O = asFile(state.orcrImage, "orcr.jpg");
        if (O) fd.append("orcrImage", O);

        const S = asFile(state.selfieImage, "selfie.jpg");
        if (S) fd.append("selfie", S); // backend expects "selfie"

        const res = await fetch(`${API_BASE_URL}/api/auth/driver/register-driver`, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
        });

        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch {}

        if (!res.ok) {
        Alert.alert("Registration Failed", data?.error || data?.message || text);
        return;
        }

        Alert.alert("Success", "Registration successful", [
        {
            text: "Proceed",
            onPress: () => {
            reset();
            router.replace("/login_and_reg/dlogin");
            },
        },
        ]);
    } catch (e: any) {
        Alert.alert("Error", e?.message || "Network error");
    } finally {
        setSubmitting(false);
    }
    };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <RegisterProgressBar step={5} total={5} title="Account" />

      <View style={styles.card}>
        <Text style={styles.header}>Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={state.email}
          onChangeText={(v) => patch({ email: v })}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password */}
        <View style={{ position: "relative" }}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={state.password}
            onChangeText={(v) => patch({ password: v })}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eye}
          >
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <View style={{ position: "relative" }}>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={state.confirmPassword}
            onChangeText={(v) => patch({ confirmPassword: v })}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eye}
          >
            <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#888" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.6 }]}
          onPress={submit}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Submitting..." : "Submit"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.signupPrompt}>
          Already have an account?{" "}
          <Text style={styles.signupLink} onPress={() => router.replace("/login_and_reg/dlogin")}>
            Log In
          </Text>
        </Text>
        <View style={styles.footerTextContainer}>
            <Text style={styles.agreementText}>
                By signing up, you agree to the
                <Text style={styles.linkText}> Terms of service </Text>
                and
                <Text style={styles.linkText}> Privacy policy.</Text>
            </Text>

            <Text style={styles.helpTitle}>
                {"\n"}Kaylangan ng tulong sa registration?
            </Text>
            <Text style={styles.helpSubtitle}>
                Pumunta sa TFRO - Lucena Office upang magpaturo
            </Text>
            </View>
      </View>

    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30,
    backgroundColor: "#f2f2f2",
  },
  card: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  header: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 15,
    borderRadius: 10,
  },
  eye: {
    position: "absolute",
    right: 10,
    top: 14,
  },
  submitButton: {
    backgroundColor: "#5089A3",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  signupPrompt: {
    textAlign: "center",
    marginTop: 15,
  },
  signupLink: {
    color: "#5089A3",
    fontWeight: "600",
  },
  footerTextContainer: {
    marginTop: 20,
    alignItems: "center",
    paddingHorizontal: 20,
    },
    agreementText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    },
    linkText: {
    color: "#1e90ff",
    fontWeight: "bold",
    },
    helpTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    },
    helpSubtitle: {
    fontSize: 11,
    color: "#333",
    textAlign: "center",
    marginTop: 2,
    },
});