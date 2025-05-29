import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import PHome from "./phome";
import PHistory from "./phistory";
import PChats from "./pchats";
import PProfile from "./pprofile";

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          if (route.name === "phome") iconName = "home";
          else if (route.name === "phistory") iconName = "document-text-outline";
          else if (route.name === "pchats") iconName = "chatbubbles-outline";
          else iconName = "person-outline";

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: "black",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: { borderTopLeftRadius: 30, borderTopRightRadius: 30, height: 70, borderWidth: 1, borderColor: "black", bottom: 0},
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
