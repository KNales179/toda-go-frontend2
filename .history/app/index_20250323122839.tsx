import { Text, View, StatusBar } from "react-native";

export default function Index() {
  return (
    <View>
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      <Text>Hello World</Text>
    </View>
  );
}