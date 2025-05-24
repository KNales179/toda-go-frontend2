import React from "react";
import { View, Text, Image, ImageBackground, StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export default function EL() {
  return (
    <View style={styles.container}>
      <ImageBackground source={require("../assets/images/map.png")} style={styles.background}>
        {/* Dark overlay */}
        <View style={styles.overlay} />

        {/* Centered Container */}
        <View style={styles.content}>
            <View>
                <Image style={styles.loc} source={require('../assets/images/loc.png')} />
            </View>
            <Text style={styles.title}>Enable your location</Text>
            <Text style={styles.subtitle}>
                Choose your location to start find the request around you
            </Text>
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
    width: width - 50,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    zIndex: 1, // Ensures it's above the overlay
  },
  loc: {
    margin: 50,
    height: 180,
    width: 180,
  },
  title: {
    fontSize: 20,
    fontWeight: "1000",
    color: "#333333",
    textAlign: "center",
    fontFamily: "Poppins-SemiBold", // Make sure this font is loaded
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: "#A0A0A0",
    textAlign: "center",
    marginTop: 5,
    fontFamily: "Poppins-Regular", // Make sure this font is loaded
  },
});
