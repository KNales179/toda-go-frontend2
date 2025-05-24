import React from "react";
import { View, Text, Image, ImageBackground, StyleSheet, Dimensions, TouchableOpacity, Alert } from "react-native";
import * as Location from "expo-location";

const { width, height } = Dimensions.get("window");

export default function EL() {
    const router = useRouter();
    // Function to request location permissions
    const requestLocationPermission = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
        Alert.alert(
            "Location Access Denied",
            "Please enable location services in your settings.",
            [{ text: "OK", onPress: () => Location.requestForegroundPermissionsAsync() }]
        );
        return;
        }

        // Get user's location
        const location = await Location.getCurrentPositionAsync({});
        console.log("User's location:", location);
        Alert.alert("Location Enabled", "Your location has been accessed successfully.");

        Alert.alert("Location Enabled", "Your location has been accessed successfully.", [
            { text: "OK", onPress: () => router.push("/welcome") } // Navigate after success
        ]);
    };

    return (
        <View style={styles.container}>
            <ImageBackground source={require("../assets/images/loc2.png")} style={styles.background}>
                {/* Dark overlay */}
                <View style={styles.overlay} />
                {/* Centered Container */}
                <View style={styles.content}>
                    <View>
                        <Image style={styles.loc} source={require("../assets/images/loc.png")} />
                    </View>
                    <Text style={styles.title}>Enable your location</Text>
                    <Text style={styles.subtitle}>
                        Choose your location to start finding requests around you.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={requestLocationPermission}>
                        <Text style={styles.btntext}>Use my location</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginBottom: 40 }}>
                        <Text style={styles.btntext2}>Skip for now</Text>
                    </TouchableOpacity>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    width: width - 50,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    zIndex: 1,
  },
  loc: {
    margin: 50,
    height: 180,
    width: 180,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#414141",
    textAlign: "center",
    fontFamily: "Poppins-SemiBold",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#A0A0A0",
    textAlign: "center",
    marginTop: 10,
    marginHorizontal: 30,
    fontFamily: "Poppins-Regular",
  },
  button: {
    width: "90%",
    margin: 30,
  },
  btntext: {
    textAlign: "center",
    color: "#FFFFFF",
    backgroundColor: "#5089A3",
    borderRadius: 10,
    fontSize: 20,
    padding: 20,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  btntext2: {
    textAlign: "center",
    color: "#B8B8B8",
    borderRadius: 10,
    fontSize: 20,
    padding: 20,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
});
