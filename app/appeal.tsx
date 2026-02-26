// app/appeal.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";

export default function AppealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const userType = (params.userType as string) || "passenger"; // passenger|driver
  const displayName = (params.name as string) || "User";
  const type = (params.type as string) || "ban";
  const reason = (params.reason as string) || "";
  const endAt = (params.endAt as string) || "";

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const maxLen = 600;

  const trimmed = useMemo(() => String(message || "").trim(), [message]);

  async function getUserId() {
    if (userType === "driver") {
      const id = await AsyncStorage.getItem("driverId");
      return id;
    }
    const id = await AsyncStorage.getItem("passengerId");
    return id;
  }

  async function handleSubmit() {
    if (busy) return;

    Keyboard.dismiss();

    const userId = await getUserId();
    if (!userId) {
      Alert.alert("Missing user", "Please log in again.");
      router.replace(userType === "driver" ? "/login_and_reg/dlogin" : "/login_and_reg/plogin");
      return;
    }

    if (!trimmed) {
      Alert.alert("Required", "Please type your appeal message.");
      return;
    }

    if (trimmed.length > maxLen) {
      Alert.alert("Too long", `Please keep your appeal under ${maxLen} characters.`);
      return;
    }

    try {
      setBusy(true);

      const res = await fetch(`${API_BASE_URL}/api/appeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType,
          userId,
          appealMessage: trimmed,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          `Failed to submit appeal (HTTP ${res.status})`;
        Alert.alert("Appeal not sent", msg);
        return;
      }

      Alert.alert(
        "Appeal Submitted",
        "Your appeal has been sent to the admin. Please wait for review."
      );

      // Go back to restriction screen (keep details)
      router.replace({
        pathname: "/restriction",
        params: {
          userType,
          name: displayName,
          type,
          reason,
          endAt,
        },
      });
    } catch (e: any) {
      console.error("[appeal] submit error:", e);
      Alert.alert("Error", e?.message || "Network/server error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Submit an Appeal</Text>
          <Text style={styles.sub}>
            {displayName} • {String(userType).toUpperCase()}
          </Text>

          <View style={styles.block}>
            <Text style={styles.label}>Restriction Type</Text>
            <Text style={styles.value}>{String(type).toUpperCase()}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Reason Shown</Text>
            <Text style={styles.reason}>
              {String(reason || "").trim() ? reason : "No reason provided."}
            </Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Your Appeal Message</Text>
            <Text style={styles.hint}>
              Explain briefly why this restriction should be removed. Keep it respectful — admin is human too. 😄
            </Text>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type your appeal here..."
              placeholderTextColor="#9ca3af"
              multiline
              style={styles.textarea}
              maxLength={maxLen}
              editable={!busy}
            />

            <Text style={styles.counter}>
              {trimmed.length}/{maxLen}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() =>
                router.replace({
                  pathname: "/restriction",
                  params: { userType, name: displayName, type, reason, endAt },
                })
              }
              disabled={busy}
            >
              <Text style={styles.btnGhostText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={busy}
            >
              <Text style={styles.btnPrimaryText}>
                {busy ? "Sending..." : "Send Appeal"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Submitting multiple appeals is blocked while one is pending.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 18,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#fff",
  },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  sub: { marginTop: 6, fontSize: 13, color: "#6b7280" },

  block: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  label: { fontSize: 12, fontWeight: "800", color: "#111827", marginBottom: 6 },
  value: { fontSize: 14, fontWeight: "800", color: "#111827" },

  reason: { fontSize: 14, color: "#111827", lineHeight: 20 },

  hint: { fontSize: 12, color: "#6b7280", lineHeight: 18, marginBottom: 10 },

  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
  },

  counter: { marginTop: 8, fontSize: 12, color: "#9ca3af", textAlign: "right" },

  actionsRow: { marginTop: 16, flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  btn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, alignItems: "center" },

  btnGhost: { borderWidth: 1, borderColor: "#5089A3", backgroundColor: "transparent" },
  btnGhostText: { color: "#5089A3", fontWeight: "900" },

  btnPrimary: { backgroundColor: "#5089A3" },
  btnPrimaryText: { color: "#fff", fontWeight: "900" },

  footer: { marginTop: 12, fontSize: 12, color: "#9ca3af", textAlign: "center" },
});
