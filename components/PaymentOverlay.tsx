import React, { useEffect } from "react";
import { View, Image, Text, TouchableOpacity } from "react-native";
import * as Brightness from "expo-brightness";
import { useKeepAwake } from "expo-keep-awake";

type Props = { visible: boolean; qrUrl?: string | null; onClose: () => void; };

export default function PaymentOverlay({ visible, qrUrl, onClose }: Props) {
  useKeepAwake(); // keep screen on while visible

  useEffect(() => {
    let prev: number | null = null;
    (async () => {
      if (!visible) return;
      try {
        const sys = await Brightness.getSystemBrightnessAsync();
        prev = sys;
        await Brightness.setSystemBrightnessAsync(1); // max brightness for scanning
      } catch {}
    })();
    return () => {
      if (prev !== null) Brightness.setSystemBrightnessAsync(prev).catch(() => {});
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={{ position: "absolute", inset: 0, backgroundColor: "#000", justifyContent: "center", padding: 16 }}>
      {qrUrl ? (
        <Image source={{ uri: qrUrl }} resizeMode="contain" style={{ width: "100%", height: "80%" }} />
      ) : (
        <Text style={{ color: "#fff", textAlign: "center", marginBottom: 12 }}>No QR uploaded</Text>
      )}
      <TouchableOpacity onPress={onClose} style={{ marginTop: 12, padding: 12, backgroundColor: "#111827", borderRadius: 8 }}>
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}
