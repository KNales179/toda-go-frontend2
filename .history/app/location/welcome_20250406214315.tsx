import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function welcome() {
    const router = useRouter();
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome to TODAGo</Text>
                <Text style={styles.subtitle}>Tricycle ride in Lucena made easy</Text>
                <Text style={styles.question}>Are you a</Text>
                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText} onPress={() => router.push("../login_and_reg/dlogin")}>DRIVER</Text>
                </TouchableOpacity>
                <Text style={styles.orText}>or</Text>
                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText} onPress={() => router.push("../login_and_reg/plogin")}>PASSENGER</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: width * 0.8,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#414141",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#A0A0A0",
    textAlign: "center",
    marginTop: 5,
  },
  question: {
    fontSize: 16,
    color: "#5089A3",
    marginTop: 40,
  },
  button: {
    backgroundColor: "#5089A3",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  orText: {
    fontSize: 16,
    color: "#A0A0A0",
    marginVertical: 5,
  },
});
