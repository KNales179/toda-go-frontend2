import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons"; // Importing icon for edit button

const { width, height } = Dimensions.get("window");

export default function WelcomeLocation() {
  const [address, setAddress] = useState(""); // Store user input
  const [isEditing, setIsEditing] = useState(false); // Track if editing

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hmmm, we couldn't get your location</Text>
        <Text style={styles.subtitle}>
          Update your address manually to continue using the app
        </Text>

        {/* Editable Input Field */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your address"
            placeholderTextColor="#A0A0A0"
            value={address}
            onChangeText={setAddress}
            editable={isEditing}
          />
          {/* Edit Button */}
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <MaterialIcons name="edit" size={20} color="#5089A3" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Button at the Bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Use This Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "space-between", // Push content & button apart
    alignItems: "center",
    paddingVertical: 40, // Ensures spacing
  },
  content: {
    width: width * 0.8,
    alignItems: "center",
    marginTop: 40, // Prevents overlapping with status bar
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#414141",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#A0A0A0",
    textAlign: "center",
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 8,
    paddingHorizontal: 10,
    width: "100%",
    marginTop: 20,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#414141",
  },
  buttonContainer: {
    width: width * 0.8,
    marginBottom: 40, // Keeps button at bottom
  },
  button: {
    backgroundColor: "#5089A3",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
});
