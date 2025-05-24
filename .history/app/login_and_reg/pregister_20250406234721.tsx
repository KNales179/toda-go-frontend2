import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from "react-native";
import { auth } from "../database/firebase-config"; // Firebase Authentication
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";

export default function PRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      // Register user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Optionally store additional user info in Firestore
      // You could use Firestore to save user profile info here

      Alert.alert("Success", "Registration Successful");
      router.push("/login_and_reg/plogin"); // Navigate to login page after successful registration
    } catch (error: any) {
      console.error("Registration error:", error.message);
      Alert.alert("Registration Failed", error.message); // Show error message
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <Text style={styles.title}>Create a New Account</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
        <Text style={styles.registerText}>Register</Text>
      </TouchableOpacity>

      <Text style={styles.loginPrompt}>
        Already have an account?{" "}
        <Text style={styles.loginLink} onPress={() => router.push("/login_and_reg/plogin")}>
          Log In
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 40,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 8,
    padding: 10,
  },
  input: {
    fontSize: 16,
    color: "#414141",
  },
  registerBtn: {
    backgroundColor: "#5089A3",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 30,
    width: "100%",
  },
  registerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginPrompt: {
    marginTop: 20,
    fontSize: 14,
    color: "#414141",
  },
  loginLink: {
    color: "#5089A3",
    fontWeight: "600",
  },
});
