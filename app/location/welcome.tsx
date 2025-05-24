import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const { height } = Dimensions.get('window');

export default function welcome() {
    const router = useRouter();
    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.back}>Back</Text>
            </TouchableOpacity>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome to TODAGo</Text>
                <Text style={styles.subtitle}>Tricycle ride in Lucena made easy</Text>
            </View>
            <View style={styles.buttons}>
                <Text style={styles.question}>Are you a</Text>
                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText} onPress={() => router.push("../login_and_reg/dlogin")}>DRIVER</Text>
                </TouchableOpacity>
                <Text style={styles.orText}>or</Text>
                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText} onPress={() => router.push("/login_and_reg/plogin")}>PASSENGER</Text>
                </TouchableOpacity>
            </View>
            
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    height: height,
    width: width,
    padding: 20,
  },
  content: {
    height: height * 0.55,
    justifyContent: "center",
    alignItems: "center",
  },
  buttons: {
    justifyContent: "center",
    alignItems: "center",
  },
  back: {
    paddingTop: 30,
    fontSize: 16,
    color: "#414141",
    marginBottom: 20,
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
