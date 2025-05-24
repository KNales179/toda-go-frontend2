import React from "react";
import { View, Text, ImageBackground, StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export default function EL() {
  return (
    <View style={styles.container}>
      <ImageBackground source={require("../assets/images/map.png")} style={styles.background}>
        {/* Dark overlay */}
        <View style={styles.overlay} />

        {/* Centered Container */}
        <View style={styles.content}>
          <Text style={styles.text}>Hello World</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
  },
  background: {
    width: width,
    height: height,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject, // Makes it cover the entire background
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black overlay
  },
  content: {
    width: width - 100,
    height: 100,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    zIndex: 1, // Ensures it's above the overlay
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});
