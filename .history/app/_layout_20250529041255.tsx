import { Stack } from "expo-router";
import { LocationProvider } from "./location/GlobalLocation"; 
import { View, StatusBar } from "react-native";

export default function RootLayout() {

return ( 
    <LocationProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <View style={{ paddingTop: 30 }}>
          <StatusBar barStyle="light-content" translucent={true} backgroundColor="black" />
        </View>
      </Stack>
    </LocationProvider>
  );
}