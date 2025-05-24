import React from "react";
import { View, Text, ImageBackground, StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export default function EL() {
  return (
    <View style={styles.container}>
      <ImageBackground source={require("../assets/images/map.png")} style={styles.background}>
        <View style={styles.overlay}>
          <Text style={styles.text}>Hello World</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    width: width,
    height: height,
    marginTop: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    width: 200,
    height: 100,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});
