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
import Notifications from "./notifications";

import { AuthProvider } from "../utils/authContext";
import { API_BASE_URL } from "../../config";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function PassengerTabs() {
  const [unseenCount, setUnseenCount] = useState(0);

  const getResolvedPassengerSession = useCallback(async () => {
    const [rawPassengerId, rawToken, rawTodaAuth] = await Promise.all([
      AsyncStorage.getItem("passengerId"),
      AsyncStorage.getItem("token"),
      AsyncStorage.getItem("toda.auth"),
    ]);

    let todaAuth: any = null;

    try {
      todaAuth = rawTodaAuth ? JSON.parse(rawTodaAuth) : null;
    } catch (e) {
    }

    const passengerId =
      rawPassengerId ||
      todaAuth?.userId ||
      todaAuth?.passengerId ||
      null;

    const token =
      rawToken ||
      todaAuth?.token ||
      null;

    return { passengerId, token };
  }, []);

  const fetchUnseenCount = useCallback(async () => {
    try {
      const { passengerId, token } = await getResolvedPassengerSession();

      if (
        !passengerId ||
        passengerId === "undefined" ||
        passengerId === "null" ||
        !token
      ) {
        setUnseenCount(0);
        return;
      }

      const url =
        `${API_BASE_URL}/api/notifications` +
        `?userType=passenger&userId=${encodeURIComponent(passengerId)}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const rawText = await res.text();

      if (!res.ok) {
        setUnseenCount(0);
        return;
      }

      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (e) {
        setUnseenCount(0);
        return;
      }

      const list = Array.isArray(data?.items) ? data.items : [];
      const unseen = list.filter((n: any) => !n.seenAt).length;

      setUnseenCount(unseen);
    } catch (e: any) {
      setUnseenCount(0);
    }
  }, [getResolvedPassengerSession]);

  useFocusEffect(
    React.useCallback(() => {
      fetchUnseenCount();
    }, [fetchUnseenCount])
  );

  useEffect(() => {
    const id = setInterval(() => {
      fetchUnseenCount();
    }, 10000);

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
        tabBarActiveTintColor: "#236685",
        tabBarInactiveTintColor: "#a0a0a0",
        tabBarStyle: {
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          height: 70,
          borderWidth: 1,
          borderColor: "#0d5779",
          bottom: 0,
          paddingBottom: 0,
          zIndex:99999,
          overflow: "hidden",
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

  return (
    <AuthProvider>
      <Stack.Navigator>
        <Stack.Screen
          name="PassengerTabs"
          component={PassengerTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="notifications"
          component={Notifications}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </AuthProvider>
  );
}