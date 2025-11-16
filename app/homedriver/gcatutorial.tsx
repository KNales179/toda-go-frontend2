// app/homedriver/gctutorial.tsx
import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function GCTutorial() {
  const navigation = useNavigation<any>();
  const Divider = () => (
    <View
      style={{
        borderBottomWidth: 1,
        borderColor: "#d1d5db",
        marginVertical: 20,
        opacity: 0.6,
      }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 12, textAlign: "center" }}>
          How to Get Your Personal GCash QR Code
        </Text>

        <Divider/>

        <Text style={{ fontSize: 18, color: "#374151", marginBottom: 12, textAlign: "center" }}>
          Step 1: Open the GCash app and log in.
        </Text>

        <Divider/>

        <Image
          source={require("../../assets/images/gcash/1.png")}
          style={{ width: "100%", height: 500, borderRadius: 8, marginBottom: 6 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 18, color: "#374151", marginBottom: 12, textAlign: "center" }}>
          Step 2: Tap the “QR” option.
        </Text>

        <Divider/>

        <Image
          source={require("../../assets/images/gcash/2.png")}
          style={{ width: "100%", height: 500, borderRadius: 8, marginBottom: 6 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 18, color: "#374151", marginBottom: 12, textAlign: "center" }}>
          step 3: Select Generate QR
        </Text>

        <Divider/>

        <Image
          source={require("../../assets/images/gcash/3.png")}
          style={{ width: "100%", height: 500, borderRadius: 8, marginBottom: 6 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 18, color: "#374151", marginBottom: 12, textAlign: "center" }}>
          Step 4: Select “Receive Money Via QR Code" to Generate QR code.
        </Text>

        <Divider/>

        <Image
          source={require("../../assets/images/gcash/4.png")}
          style={{ width: "100%", height: 500, borderRadius: 8, marginBottom: 6 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 18, color: "#374151", marginBottom: 16, textAlign: "center" }}>
          Step 5: Save your QR, then upload in GCash Settings.
        </Text>

        <Divider/>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: "#0ea5e9",
            padding: 12,
            borderRadius: 8,
            alignSelf: "center",
            minWidth: 130,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
