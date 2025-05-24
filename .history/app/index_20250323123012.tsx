import React from "react";
import { View, Text, Image, ScrollView, Dimensions, TouchableOpacity, StatusBar } from "react-native";
import { StyleSheet, SafeAreaView} from "react-native";
const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');

export default function Index() {
  return (
    <View>
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      <Text>Hello World</Text>
    </View>
  );
}