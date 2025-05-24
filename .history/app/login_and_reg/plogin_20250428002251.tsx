import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  StatusBar,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import API_BASE_URL from "../../config"; // 🔥 make sure you have this

const { width } = Dimensions.get("window");

export default function PLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();

  const loginUser = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/passenger/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
  
      const text = await response.text();  // 🔥 Read it as plain text first
  
      console.log("Raw server response:", text);  // 🔥 Debug print to see what server replied
  
      let data;
      try {
        data = JSON.parse(text);  // 🔥 Then try to parse it safely
      } catch (jsonError) {
        console.error("Server did not return JSON:", text);
        throw new Error("Invalid server response: not JSON");
      }
  
      if (response.ok) {
        Alert.alert("Login Successful", "Welcome!");
        console.log("Passenger ID:", data.userId);
        router.push("../homepassenger/phome");
      } else {
        Alert.alert("Login Failed", data.error || "Invalid credentials");
      }
  
    } catch (error: any) {
      console.error("Login error (catch block):", error);
      const errorMessage = error?.message || "An error occurred during login";
      Alert.alert("Login Failed", errorMessage);
    }
  };  

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()}>
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

        <TouchableOpacity style={styles.forgot}>
          <Text style={styles.forgotText}>Forget password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signInBtn} onPress={loginUser}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.signupPrompt}>
          Don't have an account?{" "}
          <Text style={styles.signupLink} onPress={() => router.push("/login_and_reg/pregister")}>
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
