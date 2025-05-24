import React from "react";
import { View, Text, Image, ScrollView, Dimensions, TouchableOpacity, StatusBar } from "react-native";
import { StyleSheet, SafeAreaView} from "react-native";
const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');

export default function Index() {
  return (
    <View>
      <View style={{paddingTop: 40}}>
        <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />
      </View>
      <View style={styles.mainUI}>
        <Text>Hello World</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainUI:{
    backgroundColor: '#f2f2f2',
    height: height,
    width: width,

  },
})