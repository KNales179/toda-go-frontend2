// app/homedriver/_layout.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config";

import DHome from "./dhome";
import DHistory from "./dhistory";
import DChats from "./dchats";
import DProfile from "./dprofile";
import DSettings from "./dsettings";
import GCashSettings from "./gcashsettings";
import GCTutorial from "./gcatutorial";
import DNotifications from "./dnotifications";
import DNotifDetails from "./dnotifdetails";
import DPresident from "./dpresident";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DriverTabs() {
  const [unseenCount, setUnseenCount] = useState(0);

  // ✅ NEW: president role state
  const [isPresident, setIsPresident] = useState(false);
  const [todaPresName, setTodaPresName] = useState("");

  const fetchUnseenCount = useCallback(async () => {
    try {
      const [rawDriverId, rawToken, rawTodaAuth] = await Promise.all([
        AsyncStorage.getItem("driverId"),
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("toda.auth"),
      ]);

      let todaAuth: any = null;
      try {
        todaAuth = rawTodaAuth ? JSON.parse(rawTodaAuth) : null;
      } catch {}

      const driverId = rawDriverId || todaAuth?.userId || todaAuth?.driverId || null;
      const token = rawToken || todaAuth?.token || null;

      if (!driverId || !token) {
        setUnseenCount(0);
        return;
      }

      const url = `${API_BASE_URL}/api/notifications?userType=driver&userId=${encodeURIComponent(
        driverId
      )}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setUnseenCount(0);
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data?.items) ? data.items : [];
      const unseen = list.filter((n: any) => !n.seenAt).length;

      setUnseenCount(unseen);
    } catch (e) {
      setUnseenCount(0);
    }
  }, []);

  // ✅ NEW: fetch president role (safe now; backend route later)
  const fetchPresidentRole = useCallback(async () => {
    try {
      const [rawDriverId, rawToken, rawTodaAuth] = await Promise.all([
        AsyncStorage.getItem("driverId"),
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("toda.auth"),
      ]);

      let todaAuth: any = null;
      try {
        todaAuth = rawTodaAuth ? JSON.parse(rawTodaAuth) : null;
      } catch {}

      const driverId = rawDriverId || todaAuth?.userId || todaAuth?.driverId || null;
      const token = rawToken || todaAuth?.token || null;

      if (!driverId || !token) {
        setIsPresident(false);
        setTodaPresName("");
        await AsyncStorage.multiRemove(["driverIsPresident", "driverTodaPresName"]);
        return;
      }


      const cachedIsPres = await AsyncStorage.getItem("driverIsPresident");
      const cachedTodaPres = await AsyncStorage.getItem("driverTodaPresName");
      if (cachedIsPres != null) {
        setIsPresident(cachedIsPres === "true");
        setTodaPresName(cachedTodaPres || "");
        // still try backend quietly (optional)
      }

      const res = await fetch(`${API_BASE_URL}/api/president/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // not a president (403) or not authorized
        setIsPresident(false);
        setTodaPresName("");

        await AsyncStorage.multiRemove(["driverIsPresident", "driverTodaPresName"]);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const pres = data?.president || {};

      const nextIsPres = true;
      const nextToda = String(pres?.todaPresName || "").trim();

      setIsPresident(nextIsPres);
      setTodaPresName(nextToda);

      // cache
      await AsyncStorage.setItem("driverIsPresident", "true");
      await AsyncStorage.setItem("driverTodaPresName", nextToda);

      setIsPresident(nextIsPres);
      setTodaPresName(nextToda);

      // cache for faster UI next boot
      await AsyncStorage.setItem("driverIsPresident", String(nextIsPres));
      await AsyncStorage.setItem("driverTodaPresName", nextToda);
    } catch (e) {
      // keep silent; not fatal
    }
  }, []);

  // refresh when driver area is focused
  useFocusEffect(
    useCallback(() => {
      fetchUnseenCount();
      fetchPresidentRole();
    }, [fetchUnseenCount, fetchPresidentRole])
  );

  // optional: auto refresh every 10 seconds
  useEffect(() => {
    const id = setInterval(() => {
      fetchUnseenCount();
    }, 10000);
    return () => clearInterval(id);
  }, [fetchUnseenCount]);

  // optional: refresh president role less often (every 30s)
  useEffect(() => {
    const id = setInterval(() => {
      fetchPresidentRole();
    }, 30000);
    return () => clearInterval(id);
  }, [fetchPresidentRole]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any = "person";
          if (route.name === "dhome") iconName = "home";
          else if (route.name === "dhistory") iconName = "document-text";
          else if (route.name === "dchats") iconName = "chatbubbles";
          else if (route.name === "dpresident") iconName = "settings"; 
          else if (route.name === "dprofile") iconName = "person";

          // ✅ Red dot ONLY on Profile tab
          if (route.name === "dprofile") {
            return (
              <View style={{ position: "relative" }}>
                <Ionicons name={iconName} size={size} color={color} />
                {unseenCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: 99,
                      backgroundColor: "#d11a2a",
                      borderWidth: 2,
                      borderColor: "#fff",
                    }}
                  />
                )}
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "black",
        tabBarInactiveTintColor: "lightgray",
        tabBarStyle: {
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          height: 70,
          borderWidth: 1,
          borderColor: "black",
          bottom: 0,
          paddingBottom: 0,
        },
        tabBarLabelStyle: { fontSize: 12 },
      })}
    >
      <Tab.Screen name="dhome" component={DHome} options={{ title: "Home" }} />
      <Tab.Screen name="dhistory" component={DHistory} options={{ title: "History" }} />
      {isPresident && (
        <Tab.Screen
          name="dpresident"
          component={DPresident}
          options={{
            title: "Tools",
          }}
        />
      )}
      <Tab.Screen name="dchats" component={DChats} options={{ title: "Chats" }} />
      <Tab.Screen name="dprofile" component={DProfile} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export default function DriverStackLayout() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DriverTabs"
        component={DriverTabs}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="dnotifications"
        component={DNotifications}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="dsettings"
        component={DSettings}
        options={{
          title: "Settings",
          headerShown: false,
          headerTitleAlign: "center",
        }}
      />

      <Stack.Screen
        name="gcashsettings"
        component={GCashSettings}
        options={{
          title: "GCash Settings",
          headerShown: true,
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#0ea5e9" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold", fontSize: 18 },
        }}
      />

      <Stack.Screen
        name="gctutorial"
        component={GCTutorial}
        options={{
          title: "GCash QR Tutorial",
          headerShown: true,
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#0ea5e9" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold", fontSize: 18 },
        }}
      />

      <Stack.Screen
        name="dnotifdetails"
        component={DNotifDetails}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
