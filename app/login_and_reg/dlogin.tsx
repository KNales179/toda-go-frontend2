import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  TextInput, StatusBar, Alert, Keyboard
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function DLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);         
  const router = useRouter();

  const loginDriver = async () => {
    if (busy) return;                     
    Keyboard.dismiss();


    if (!email.trim() || !pass) {
      Alert.alert("Missing info", "Enter your email and password.");
      return;
    }

    setBusy(true);                             
    try {
      const response = await fetch(`${API_BASE_URL}/api/login/driver/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });


      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        console.error("Server did not return JSON. Body:", text?.slice(0, 200));
        throw new Error("Invalid server response: not JSON");
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
      }


      const driverId =
        data?.driver?._id ||
        data?.user?._id ||
        data?.driverId ||
        data?._id;

      if (!driverId) throw new Error("Login succeeded but no driverId returned");

      await AsyncStorage.setItem("driverId", String(driverId));
      if (data?.token) {
        await AsyncStorage.setItem("driverToken", String(data.token));
      }

      Alert.alert("Login Successful", "Welcome!");
      router.replace("../homedriver/dhome");         
    } catch (error: any) {
      console.error("Login error (driver):", error, error?.stack);
      Alert.alert("Login Failed", error?.message || "Network/server error");
    } finally {
      setBusy(false);                             
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.push("../location/welcome")}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Sign in with your Driver or Operator account</Text>

        <View className="input-email" style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#A0A0A0"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />
        </View>

        <View className="input-pass" style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Password"
            placeholderTextColor="#A0A0A0"
            secureTextEntry={!isPasswordVisible}
            value={pass}
            onChangeText={setPass}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(prev => !prev)}>
            <MaterialIcons
              name={isPasswordVisible ? "visibility" : "visibility-off"}
              size={20}
              color="#A0A0A0"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgot}>
          <Text style={styles.forgotText}>Forget password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signInBtn, busy && { opacity: 0.6 }]}   
          onPress={loginDriver}
          disabled={busy}
        >
          <Text style={styles.signInText}>{busy ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.signupPrompt}>
          Don't have an account?{" "}
          <Text style={styles.signupLink} onPress={() => router.push("/login_and_reg/dregister")}>
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
  signInText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 25 },
  line: { flex: 1, height: 1, backgroundColor: "#D1D1D1" },
  orText: { marginHorizontal: 10, color: "#A0A0A0" },
  signupPrompt: { textAlign: "center", fontSize: 14, color: "#414141" },
  signupLink: { color: "#5089A3", fontWeight: "600" },
});
