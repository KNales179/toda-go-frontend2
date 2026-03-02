import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  useColorScheme,
  ImageBackground,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
  Platform,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";

// OPTIONAL (better GPS settings on Android):
// npm i expo-intent-launcher
import * as IntentLauncher from "expo-intent-launcher";

const { width, height } = Dimensions.get("window");

export default function EL() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [loading, setLoading] = useState(false);
  const [waitingForGps, setWaitingForGps] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goNext = () => {
    // small delay to feel smoother
    setTimeout(() => router.push("/location/welcome"), 300);
  };

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const openLocationSettings = async () => {
    try {
      if (Platform.OS === "android") {
        // Opens device Location toggle screen (best for Android)
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
        );
      } else {
        // iOS can only open app settings
        await Linking.openSettings();
      }
    } catch (e) {
      // fallback
      await Linking.openSettings();
    }
  };

  const ensurePermission = async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === "granted") return true;

    const req = await Location.requestForegroundPermissionsAsync();
    return req.status === "granted";
  };

  const isGpsEnabled = async () => {
    return await Location.hasServicesEnabledAsync();
  };

  const pollUntilGpsOnThenProceed = async () => {
    clearPoll();
    setWaitingForGps(true);

    // Poll every 700ms; when GPS becomes enabled, proceed
    pollTimerRef.current = setInterval(async () => {
      try {
        const enabled = await isGpsEnabled();
        if (enabled) {
          clearPoll();
          setWaitingForGps(false);

          // (Optional) fetch location once GPS is ON:
          try {
            await Location.getCurrentPositionAsync({});
          } catch {}

          setLoading(false);
          goNext();
        }
      } catch {
        // ignore polling errors
      }
    }, 700);
  };

  const handleUseMyLocation = async () => {
    if (loading) return;

    setLoading(true);

    try {
      // 1) Ensure permission
      const permitted = await ensurePermission();
      if (!permitted) {
        setLoading(false);
        Alert.alert(
          "Location Access Denied",
          "Please allow location permission to continue.",
          [{ text: "OK" }]
        );
        return;
      }

      // 2) Check GPS toggle / services enabled
      const enabled = await isGpsEnabled();
      if (!enabled) {
        setLoading(false);

        Alert.alert(
          "Turn on Location",
          "Your GPS/Location Services is off. Turn it on, then we’ll continue automatically.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: Platform.OS === "android" ? "Open Location Settings" : "Open Settings",
              onPress: openLocationSettings,
            },
          ]
        );

        // Start polling so it proceeds once they turn it ON (no need to press again)
        await pollUntilGpsOnThenProceed();
        return;
      }

      // 3) GPS already ON → proceed
      try {
        await Location.getCurrentPositionAsync({});
      } catch {}

      setLoading(false);
      goNext();
    } catch (e) {
      setLoading(false);
      Alert.alert("Error", "Something went wrong while checking location.");
    }
  };

  // Auto-check when app returns to foreground (after user toggles GPS/settings)
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active" && waitingForGps) {
        // trigger immediate check; polling is already running, but this makes it feel faster
        const enabled = await isGpsEnabled();
        if (enabled) {
          clearPoll();
          setWaitingForGps(false);
          setLoading(false);
          goNext();
        }
      }
    });

    return () => {
      sub.remove();
      clearPoll();
    };
  }, [waitingForGps]);

  // Optional: if already granted + GPS on, auto-redirect on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      const enabled = await Location.hasServicesEnabledAsync();
      if (status === "granted" && enabled) {
        Alert.alert("Location Already Enabled", "Redirecting...");
        setTimeout(() => router.push("/location/welcome"), 800);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ImageBackground source={require("../../assets/images/loc2.png")} style={styles.background}>
        <View style={styles.overlay} />

        <View style={[styles.content, { backgroundColor: isDarkMode ? "#313639" : "#f2f2f2" }]}>
          <View>
            <Image style={styles.loc} source={require("../../assets/images/loc.png")} />
          </View>

          <Text style={[styles.title, { color: isDarkMode ? "#f2f2f2" : "#414141" }]}>
            Enable your location
          </Text>

          <Text style={styles.subtitle}>
            Choose your location to start finding requests around you.
          </Text>

          <TouchableOpacity
            style={[styles.button, (loading || waitingForGps) && { opacity: 0.8 }]}
            onPress={handleUseMyLocation}
            activeOpacity={0.8}
            disabled={loading} // keep enabled if waitingForGps? you can allow press again; but not needed now
          >
            <View style={styles.btnInner}>
              {(loading || waitingForGps) && (
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
              )}
              <Text style={styles.btntext}>
                {waitingForGps ? "Waiting for GPS..." : loading ? "Checking..." : "Use my location"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Optional helper text */}
          {waitingForGps && (
            <Text style={[styles.hint, { color: isDarkMode ? "#d7d7d7" : "#666" }]}>
              Turn on Location Services, we’ll continue automatically.
            </Text>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: height,
    flex: 1,
  },
  background: {
    width: width,
    height: height,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    width: width - 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    zIndex: 1,
    paddingBottom: 24,
  },
  loc: {
    backgroundColor: "#f2f2f2",
    margin: 50,
    height: 180,
    width: 180,
    borderRadius: 100,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#414141",
    textAlign: "center",
    fontFamily: "Poppins-SemiBold",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#A0A0A0",
    textAlign: "center",
    marginTop: 10,
    marginHorizontal: 30,
    fontFamily: "Poppins-Regular",
  },
  button: {
    width: "90%",
    marginTop: 24,
    backgroundColor: "#5089A3",
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btntext: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
    fontFamily: "Poppins-Regular",
  },
});