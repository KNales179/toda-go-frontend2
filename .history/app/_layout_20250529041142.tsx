import { Stack } from "expo-router";
import { LocationProvider } from "./location/GlobalLocation"; 
import {View} from "react-native";

export default function RootLayout() {

return ( 
    <LocationProvider>
      <View style={{ paddingTop: 30 }}>
        <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />
      </View>
      <Stack screenOptions={{ headerShown: false }}>
      </Stack>
    </LocationProvider>
  );
}