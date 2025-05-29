import { Stack } from "expo-router";
import { LocationProvider } from "./location/GlobalLocation"; 

export default function RootLayout() {

return ( 
    <LocationProvider>
      <Stack screenOptions={{ headerShown: false }}>
      </Stack>
    </LocationProvider>
  );
}