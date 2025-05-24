import React from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";

const { width, height } = Dimensions.get("window");

export default function EL() {
  return (
    <View style={styles.container}>
      {/* Static Map Image */}
      <Image
        source={{ uri: "https://via.placeholder.com/600x400.png?text=Static+Map" }} // Replace with an actual map image
        style={styles.map}
      />
      
      {/* Centered Overlay Container */}
      <View style={styles.overlay}>
        <Text style={styles.text}>Hello World</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  map: {
    width: width,
    height: height,
    resizeMode: "cover",
  },
  overlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 200,
    height: 100,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    transform: [{ translateX: -100 }, { translateY: -50 }],
  },
  text: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
