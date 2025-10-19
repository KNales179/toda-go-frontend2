// index.tsx
import React, { useEffect } from "react";
import { View, Text, Image, Dimensions, TouchableOpacity, StatusBar } from "react-native";
import { StyleSheet, useColorScheme } from "react-native";
import Svg, { Circle } from "react-native-svg";
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "./utils/authStorage";  

const { width, height } = Dimensions.get("window");
const size = 80;
const strokeWidth = 6;
const radius = (size - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  // progress ring (unchanged)
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(0.33, { duration: 1000, easing: Easing.linear });
  }, []);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // ✅ Auto-skip login if we have saved auth
  useEffect(() => {
    (async () => {
      try {
        // small delay for splash polish
        await new Promise(res => setTimeout(res, __DEV__ ? 400 : 900));

        // NEW: check unified auth first
        const auth = await getAuth();
        if (auth?.role && auth?.userId) {
          router.replace(auth.role === "driver" ? "/homedriver/dhome" : "/homepassenger/phome");
          return;
        }

        // 🔁 Legacy fallback (if you previously saved per-role ids)
        const legacyDriverId = await AsyncStorage.getItem("driverId");
        const legacyPassengerId = await AsyncStorage.getItem("passengerId");
        if (legacyDriverId) {
          router.replace("/homedriver/dhome");
          return;
        }
        if (legacyPassengerId) {
          router.replace("/homepassenger/phome");
          return;
        }

        // No saved login → show onboarding as you do now
      } finally {
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  const handleLocationFlow = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (status === "granted" && isEnabled) router.push("/location/welcome");
      else router.push("/location/EL");
    } catch {
      router.push("/location/EL");
    }
  };

  return (
    <View>
      <View style={{ paddingTop: 30 }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="black" />
      </View>

      {/* your existing UI below */}
      <View style={[styles.mainUI, { backgroundColor: isDarkMode ? "#313639" : "#f2f2f2" }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.push("/login_and_reg/alogin")}>
            <Text style={[styles.admin, { color: isDarkMode ? "#313639" : "#f2f2f2" }]}>admin</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLocationFlow}>
            <Text style={[styles.skip, { color: isDarkMode ? "#f2f2f2" : "#414141" }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.picont}>
          <Image style={styles.pic} source={require("../assets/images/pic1.png")} />
        </View>
        <Text style={[styles.made, { color: isDarkMode ? "#f2f2f2" : "#414141" }]}>Made for Lucenahin</Text>
        <Text style={[styles.hassle, { color: isDarkMode ? "#f2f2f2" : "#414141" }]}>Tricycle hassle free ride</Text>

        <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#5EA7C9" strokeWidth={strokeWidth} fill="none" />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#00537A"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
            />
          </Svg>

          <TouchableOpacity
            style={{
              position: "absolute",
              width: size * 0.8,
              height: size * 0.8,
              backgroundColor: "#00537A",
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => router.push("/on_boarding/sechome")}
          >
            <Ionicons name="arrow-forward" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const { width: W, height: H } = Dimensions.get("window");
const styles = StyleSheet.create({
  mainUI: { backgroundColor: "#f2f2f2", height: H + 10, width: W },
  admin: { padding: 10, paddingTop: 20, fontSize: 18, fontFamily: "Poppins-Regular", color: "#414141", letterSpacing: 1, textAlign: "right" },
  skip: { padding: 10, paddingTop: 20, fontSize: 18, fontFamily: "Poppins-Regular", color: "#414141", letterSpacing: 1, textAlign: "right" },
  picont: { width: W, paddingTop: 30, backgroundColor: "transparent" },
  pic: { width: W, height: W, backgroundColor: "transparent" },
  made: { fontSize: 24, fontFamily: "Poppins-Bold", fontWeight: "bold", color: "#414141", textTransform: "uppercase", textAlign: "center" },
  hassle: { fontSize: 14, fontFamily: "Poppins-Regular", color: "#A0A0A0", textAlign: "center", marginTop: 5 },
});
