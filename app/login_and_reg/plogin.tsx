import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  TextInput, StatusBar, Alert, Keyboard
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveAuth } from "../utils/authStorage";

const { width } = Dimensions.get("window");

export default function PLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false); // (4) prevent double taps
  const router = useRouter();

  async function wakeBackend(BASE: string) {
    const healthUrl = `${BASE}/health`;
    const warmUrl = `${BASE}/warmup`;

    for (let i = 0; i < 5; i++) {
      try {
        const r = await fetch(healthUrl, { cache: "no-store" });
        if (r.ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }

    await fetch(warmUrl).catch(() => {});
    const started = Date.now();
    while (Date.now() - started < 60000) {
      try {
        const r = await fetch(healthUrl, { cache: "no-store" });
        if (r.ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 1500));
    }
    return false;
  }

  const loginUser = async () => {
    if (busy) return;            // (4) bail if already logging in
    setBusy(true);               // (4) lock the button

    Keyboard.dismiss();

    try {
      // if (__DEV__) { await wakeBackend(API_BASE_URL); }

      const response = await fetch(`${API_BASE_URL}/api/login/passenger/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });

      // (5) defensive JSON parsing
      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        console.log("[plogin] non-JSON body (first 200):", text.slice(0, 200));
      }

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || `HTTP ${response.status}`
        );
      }

      const passengerId =
        data?.userId || data?.passenger?._id || data?.user?._id || data?._id;

      if (!passengerId)
        throw new Error("Login succeeded but no passengerId returned");

      // await saveAuth({
      //   role: "passenger",
      //   userId: String(passengerId),
      //   token: data?.token,
      // });
      await AsyncStorage.setItem("passengerId", String(passengerId));

      Alert.alert("Login Successful", "Welcome!");
      router.replace("../homepassenger/phome");
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.log("[login] fetch aborted (backend slow or cold start?)");
      }
      console.error("Login error (passenger):", error, error?.stack);
      Alert.alert("Login Failed", error?.message || "Network/server error");
    } finally {
      setBusy(false);            // (4) unlock the button
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.push("../location/welcome")}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Sign in with your email or phone</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email or Phone"
            placeholderTextColor="#A0A0A0"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Password"
            placeholderTextColor="#A0A0A0"
            secureTextEntry={!isPasswordVisible}
            value={pass}
            onChangeText={setPass}
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(prev => !prev)}>
            <MaterialIcons
              name={isPasswordVisible ? "visibility" : "visibility-off"}
              size={20}
              color="#A0A0A0"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.signInBtn, busy && styles.signInBtnDisabled]} // (4) visual + disabled
          onPress={loginUser}
          disabled={busy}
        >
          <Text style={styles.signInText}>{busy ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>

        <View className="divider" style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.signupPrompt}>
          Don't have an account?{" "}
          <Text
            style={styles.signupLink}
            onPress={() => router.push("/login_and_reg/pregister")}
          >
            Sign Up
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center" },
  inner: { width: width * 0.85, paddingTop: 60 },
  back: { fontSize: 16, color: "#414141", marginBottom: 20 },
  title: { fontSize: 20, color: "#414141", fontWeight: "600", marginBottom: 30 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 48,
    marginBottom: 15,
  },
  input: { flex: 1, fontSize: 16, color: "#414141" },
  forgot: { alignSelf: "flex-end", marginBottom: 30 },
  forgotText: { color: "#DD1F1F", fontSize: 13 },
  signInBtn: {
    backgroundColor: "#5089A3",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 25,
  },
  signInBtnDisabled: { opacity: 0.6 }, // (4)
  signInText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 25 },
  line: { flex: 1, height: 1, backgroundColor: "#D1D1D1" },
  orText: { marginHorizontal: 10, color: "#A0A0A0" },
  signupPrompt: { textAlign: "center", fontSize: 14, color: "#414141" },
  signupLink: { color: "#5089A3", fontWeight: "600" },
});
