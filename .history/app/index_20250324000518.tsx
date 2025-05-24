import React, { useEffect } from "react";
import { View, Text, Image, ScrollView, Dimensions, TouchableOpacity, StatusBar } from "react-native";
import { StyleSheet, SafeAreaView} from "react-native";
import * as SplashScreen from "expo-splash-screen";
const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');

SplashScreen.preventAutoHideAsync(); // Keep splash screen visible

export default function Index() {
  useEffect(() => {
    async function loadApp() {
      try {
        // Simulate a loading process (e.g., fetching data)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreen.hideAsync(); // Hide the splash screen when done
      }
    }
    loadApp();
  }, []);


  return (
    <View>
      <View style={{paddingTop: 40}}>
        <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      </View>
      <View style={styles.mainUI}>
        <Text style={styles.skip}>Skip</Text>
        <View style={styles.picont}>
          <Image style={styles.pic} source={require('../assets/images/pic1.png')} />
        </View>
        <Text style={styles.made}>Made for Lucenahin</Text>
        <Text style={styles.hassle}>Tricycle hassle free ride</Text>
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
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    fontWeight: "bold",
    color: "#414141",
    textTransform: "uppercase",
    textAlign: "center",
  },
  hassle: {
    fontSize: 18,
    fontFamily: "Poppins-Regular",
    color: "#A0A0A0",
    textAlign: "center",
    marginTop: 5,
  },
})