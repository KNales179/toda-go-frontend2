import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DHome from "./dhome";
import DHistory from "./dhistory";
import DChats from "./dchats";
import DProfile from "./dprofile";

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          if (route.name === "dhome") iconName = "home";
          else if (route.name === "dhistory") iconName = "document-text";
          else if (route.name === "dchats") iconName = "chatbubbles";
          else iconName = "person";

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: "black",
        tabBarInactiveTintColor: "lightgray",
        tabBarStyle: { borderTopLeftRadius: 30, borderTopRightRadius: 30, height: 70, borderWidth: 1, borderColor: "black", bottom: 0, paddingBottom:0},
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
