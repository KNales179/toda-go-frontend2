// app/homedriver/_layout.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import DHome from "./dhome";
import DHistory from "./dhistory";
import DChats from "./dchats";
import DProfile from "./dprofile";
import DSettings from "./dsettings";     
import GCashSettings from "./gcashsettings"; 
import GCTutorial from "./gcatutorial";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any = "person";
          if (route.name === "dhome") iconName = "home";
          else if (route.name === "dhistory") iconName = "document-text";
          else if (route.name === "dchats") iconName = "chatbubbles";
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

      {/* ✅ NEW: include your renamed settings screen as a sub-route */}
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
    </Stack.Navigator>
  );
}
