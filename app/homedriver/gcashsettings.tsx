import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

type LocalAsset = { uri: string; name?: string; type?: string };

export default function GCashSettings() {
  const [driverId, setDriverId] = useState<string>("");
  const [gcashNumber, setGcashNumber] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [lastGoodQrUrl, setLastGoodQrUrl] = useState<string | null>(null);
  const [localQR, setLocalQR] = useState<LocalAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const [imgVersion, setImgVersion] = useState(0);

  // Centralized fetcher
  const fetchPaymentInfo = async (id: string): Promise<string | null> => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/auth/driver/${id}/payment-info`, {
        headers: { Accept: "application/json" },
      });
      const j = await r.json();
      if (j?.ok && j.gcashQRUrl) {
        const url = String(j.gcashQRUrl || "").trim();
        if (url) {
          setQrUrl(url);
          setLastGoodQrUrl(url);
          setImgVersion((v) => v + 1);
          return url;
        }
      }
      return null;
    } catch (e: any) {
      console.error("fetchPaymentInfo error:", e.message || e);
      return null; 
    }
  };


  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem("driverId");
        if (!id) {
          Alert.alert("Auth", "Driver ID not found. Please log in again.");
          return;
        }
        setDriverId(id);
        await fetchPaymentInfo(id);
      } catch (e) {
        console.error("useEffect error:", e);
      }
    })();
  }, []);

  // Re-fetch whenever screen refocuses
  useFocusEffect(
    React.useCallback(() => {
      if (driverId) fetchPaymentInfo(driverId);
    }, [driverId])
  );

  const chooseQR = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow Photos to select a QR.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;

    const a = result.assets[0];
    setLocalQR({
      uri: a.uri,
      name: "gcashqr.jpg",
      type: a.mimeType || "image/jpeg",
    });
  };

  const saveQR = async () => {
    if (!driverId) return Alert.alert("Missing ID", "Driver ID is not loaded yet.");
    if (!localQR) return Alert.alert("No image", "Choose a QR image first.");

    try {
      setLoading(true);
      const form = new FormData();
      // @ts-ignore RN file
      form.append("qr", {
        uri: localQR.uri,
        name: localQR.name || "gcashqr.jpg",
        type: localQR.type || "image/jpeg",
      });

      const r = await fetch(`${API_BASE_URL}/api/auth/driver/${driverId}/gcash-qr`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Upload failed");

      let confirmedUrl = (j.gcashQRUrl ? String(j.gcashQRUrl).trim() : "") || "";
      if (!confirmedUrl) {
        const fetched = await fetchPaymentInfo(driverId);
        confirmedUrl = fetched || "";
      }

      if (confirmedUrl) {
        setQrUrl(confirmedUrl);
        setLastGoodQrUrl(confirmedUrl);
        setImgVersion((v) => v + 1);
        setLocalQR(null);
      }

      Alert.alert("Saved", "GCash QR updated.");
    } catch (e: any) {
      console.error("saveQR error:", e.message || e);
      Alert.alert("Error", e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const saveNumber = async () => {
    if (!driverId) return Alert.alert("Missing ID", "Driver ID is not loaded yet.");
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE_URL}/api/auth/driver/${driverId}/gcash-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcashNumber }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Save failed");

      setGcashNumber(j.gcashNumber);
      Alert.alert("Saved", "GCash number updated.");
    } catch (e: any) {
      console.error("saveNumber error:", e.message || e);
      Alert.alert("Error", e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  // Preview priority
  const previewUri = (localQR?.uri || qrUrl || lastGoodQrUrl || "").trim();
  const previewSource = previewUri ? { uri: `${previewUri}?v=${imgVersion}` } : undefined;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>GCash Settings</Text>

      {/* GCash Number Section */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: "600" }}>GCash Number (09XXXXXXXXX)</Text>
        <TextInput
          value={gcashNumber}
          onChangeText={setGcashNumber}
          placeholder="09171234567"
          keyboardType="phone-pad"
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 }}
        />
        <TouchableOpacity
          onPress={saveNumber}
          style={{ backgroundColor: "#0ea5e9", padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
            Save Number
          </Text>
        </TouchableOpacity>
      </View>

      {/* GCash QR Section */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontWeight: "600" }}>GCash QR</Text>

        {previewSource ? (
          <Image
            source={previewSource}
            style={{ width: "100%", aspectRatio: 1, borderRadius: 12, minHeight: 250 }}
          />
        ) : (
          <Text style={{ color: "#6b7280" }}>No QR uploaded yet.</Text>
        )}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={chooseQR}
            style={{ flex: 1, backgroundColor: "#64748b", padding: 12, borderRadius: 8 }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
              {localQR ? "Choose Another" : "Choose Image"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={saveQR}
            disabled={!localQR || loading}
            style={{
              flex: 1,
              backgroundColor: !localQR || loading ? "#9ca3af" : "#22c55e",
              padding: 12,
              borderRadius: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
                Save QR
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {qrUrl ? (
          <TouchableOpacity
            onPress={() => {
              if (qrUrl) Clipboard.setStringAsync(qrUrl);
              Alert.alert("Copied", "QR URL copied.");
            }}
            style={{ backgroundColor: "#334155", padding: 10, borderRadius: 8 }}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>Copy Saved QR URL</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Footer Info */}
      <View
        style={{
          marginTop: 30,
          borderTopWidth: 1,
          borderColor: "#e5e7eb",
          paddingTop: 16,
        }}
      >
        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 10 }}>
          💡 <Text style={{ fontWeight: "bold" }}>Reminder:</Text> It’s highly recommended
          that the GCash QR code and GCash number belong to the same account. This ensures
          passengers can send payment directly without errors.
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("gctutorial")}
          style={{
            backgroundColor: "#0ea5e9",
            padding: 12,
            borderRadius: 8,
            marginTop: 4,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
            Help: How to Get My GCash QR Code
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
