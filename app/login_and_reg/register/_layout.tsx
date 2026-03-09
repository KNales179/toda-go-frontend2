// _layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { RegisterProvider } from "./RegisterContext";

export default function RegisterLayout() {
  return (
    <RegisterProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right", // transition
        }}
      />
    </RegisterProvider>
  );
}