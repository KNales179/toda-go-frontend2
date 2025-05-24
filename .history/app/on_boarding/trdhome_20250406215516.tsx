import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Dimensions, TouchableOpacity, StatusBar } from "react-native";
import { StyleSheet, SafeAreaView, useColorScheme} from "react-native";
import Svg, { Circle } from "react-native-svg";
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";
import Animated, {useSharedValue, useAnimatedProps, withTiming, Easing,} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');
const size = 80; 
const strokeWidth = 6;
const radius = (size - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

SplashScreen.preventAutoHideAsync(); 

export default function trdhome() {
  useEffect(() => {
    async function loadApp() {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreen.hideAsync(); 
      }
    }
    loadApp();
  }, []);

  const router = useRouter();

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 1000,
      easing: Easing.linear,
    });
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';


  return (
    <View>
      <View style={{paddingTop: 30}}>
        <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />
      </View>
      <View style={[styles.mainUI, { backgroundColor: isDarkMode ? "#1E1E1E" : "#f2f2f2" }]}>
        <TouchableOpacity onPress={() => router.push("../location/EL")}>
          <Text style={[styles.skip, { color: isDarkMode ? "#fff" : "#414141" }]}>Skip</Text>
        </TouchableOpacity>
        <View style={styles.picont}>
          <Image style={styles.pic} source={require('../../assets/images/pic3.png')} />
        </View>
        <Text style={[styles.made, { color: isDarkMode ? "#fff" : "#414141" }]}>Book your Trike</Text>
        <Text style={[styles.hassle, { color: isDarkMode ? "#fff" : "#414141" }]}>Late ka na ba?</Text>
        <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#5EA7C9"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Animated Progress Circle */}
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

          {/* Center Button */}
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
            onPress={() => router.push("/location/EL")}
          >
            <Ionicons name="arrow-forward" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  mainUI:{
    backgroundColor: '#f2f2f2',
    height: height,
    width: width,
  },
  skip: {
    padding: 10,
    fontSize: 18,
    fontFamily: "Poppins-Regular",
    color: "#414141",
    letterSpacing: 1,
    textAlign: 'right',
  },
  picont: {
    width: width,
    paddingTop: 50,
    backgroundColor: 'transparent',
  },
  pic: {
    width: width,
    height: width,
    backgroundColor: 'transparent',
  },
  made: {
    marginTop: -60,
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    fontWeight: "bold",
    color: "#414141",
    textTransform: "uppercase",
    textAlign: "center",
  },
  hassle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#A0A0A0",
    textAlign: "center",
    marginTop: 5,
  },
})