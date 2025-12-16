// homepassenger/subfile/locationUtils.ts
import * as Location from "expo-location";
import { Alert, Platform, Linking } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";

export async function ensureLocationEnabled() {
  const services = await Location.hasServicesEnabledAsync();
  const perm = await Location.getForegroundPermissionsAsync();

  if (!services || perm.status !== "granted") {
    Alert.alert(
      "Enable Location",
      "We need your location for live tracking. Please enable GPS and grant permission.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "android") {
              IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
              );
            } else {
              Linking.openURL("app-settings:");
            }
          },
        },
      ]
    );
    return false;
  }
  return true;
}
