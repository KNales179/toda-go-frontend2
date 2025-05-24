import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import API_BASE_URL from "../../config";


export default function PRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    console.log("Register function called"); // ✅ checkpoint
  
    if (!name || !email || !password || !confirmPassword) {
      console.log("Missing fields");
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
  
    if (password !== confirmPassword) {
      console.log("Password mismatch");
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
  
    try {
      console.log("Sending fetch...");
      const response = await fetch(`${API_BASE_URL}/api/auth/passenger/register-passenger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
  
      const data = await response.json();
      console.log("Fetch complete", data);
      console.log("✅ Got response!", response); 
  
      if (response.ok) {
        Alert.alert('Success', data.message);
        router.push('/login_and_reg/plogin');
      } else {
        Alert.alert('Error', data.error || 'Registration failed');
      }
    } catch (error) {
      console.log("❌ Error during fetch:", error);
      console.error("Registration error:", error);
      Alert.alert('Error', 'Network request failed. Please check your connection or server.');
    }
  };
  

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Text style={styles.title}>Passenger Registration</Text>

      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <Text style={styles.switchText}>
        Already have an account?{' '}
        <Text style={styles.link} onPress={() => router.push('/login_and_reg/plogin')}>
          Log In
        </Text>
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    padding: 20 
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 30 
  },
  input: { 
    width: "100%", 
    borderWidth: 1, 
    borderColor: "#ccc", 
    padding: 10, 
    marginBottom: 15, 
    borderRadius: 8 
  },
  button: { 
    backgroundColor: "#5089A3", 
    padding: 15, 
    borderRadius: 8, 
    width: "100%", 
    alignItems: "center" 
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
  switchText: { 
    marginTop: 20 
  },
  link: {
    color: "#5089A3", 
    fontWeight: "bold" 
  },
});
