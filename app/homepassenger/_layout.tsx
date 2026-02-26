// app/homepassenger/_layout.tsx
import React, { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import PHome from "./phome";
import PHistory from "./phistory";
import PChats from "./pchats";
import PProfile from "./pprofile";
import Notifications from "./notifications"; // ✅ must exist at app/homepassenger/notifications.tsx

import { AuthProvider } from "../utils/authContext";
import { API_BASE_URL } from "../../config";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function PassengerTabs() {
  const [unseenCount, setUnseenCount] = useState(0);

  const fetchUnseenCount = useCallback(async () => {
    try {
      const passengerId = await AsyncStorage.getItem("passengerId");
      const token = await AsyncStorage.getItem("token");

      if (!passengerId || !token) {
        setUnseenCount(0);
        return;
      }

      const url = `${API_BASE_URL}/api/notifications?userType=passenger&userId=${encodeURIComponent(
        passengerId
      )}`;

      const res = await fetch(url, {
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

  // refresh when this tab navigator becomes active
  useFocusEffect(
    React.useCallback(() => {
      fetchUnseenCount();
    }, [fetchUnseenCount])
  );

  // optional: keep it updated while user stays in passenger area
  useEffect(() => {
    const id = setInterval(() => {
      fetchUnseenCount();
    }, 10000); // every 10 seconds

    return () => clearInterval(id);
  }, [fetchUnseenCount]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          if (route.name === "phome") iconName = "home";
          else if (route.name === "phistory") iconName = "document-text";
          else if (route.name === "pchats") iconName = "chatbubbles";
          else iconName = "person";

          // ✅ Add red dot ONLY on Profile tab icon
          if (route.name === "pprofile") {
            return (
              <View style={{ position: "relative" }}>
                <Ionicons name={iconName as any} size={size} color={color} />
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

          return <Ionicons name={iconName as any} size={size} color={color} />;
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
      <Tab.Screen name="phome" component={PHome} options={{ title: "Home" }} />
      <Tab.Screen name="phistory" component={PHistory} options={{ title: "History" }} />
      <Tab.Screen name="pchats" component={PChats} options={{ title: "Chats" }} />
      <Tab.Screen name="pprofile" component={PProfile} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export default function PassengerStackLayout() {
  console.log("AUTH:N1:homepassenger:layout:render");

  return (
    <AuthProvider>
      <Stack.Navigator>
        {/* Tabs as the main screen */}
        <Stack.Screen
          name="PassengerTabs"
          component={PassengerTabs}
          options={{ headerShown: false }}
        />

        {/* ✅ Extra pages that are NOT tabs */}
        <Stack.Screen
          name="notifications"
          component={Notifications}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </AuthProvider>
  );
}
