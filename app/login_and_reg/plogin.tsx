import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  TextInput, StatusBar, Alert, Keyboard
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveAuth } from "../utils/authStorage";
import { fetchRestriction, isRestrictionActive } from "../utils/restriction";

const { width } = Dimensions.get("window");

export default function PLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false); // (4) prevent double taps
  const router = useRouter();

  async function wakeBackend(BASE: string) {
    const healthUrl = `${BASE}/health`;
    const warmUrl = `${BASE}/warmup`;

    for (let i = 0; i < 5; i++) {
      try {
        const r = await fetch(healthUrl, { cache: "no-store" });
        if (r.ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }

    await fetch(warmUrl).catch(() => {});
    const started = Date.now();
    while (Date.now() - started < 60000) {
      try {
        const r = await fetch(healthUrl, { cache: "no-store" });
        if (r.ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 1500));
    }
    return false;
  }

  const loginUser = async () => {
    if (busy) return;
    setBusy(true);

    Keyboard.dismiss();

    try {
      console.log("AUTH:PLOGIN:start", {
        email,
        api: `${API_BASE_URL}/api/login/passenger/login`,
      });

      const response = await fetch(`${API_BASE_URL}/api/login/passenger/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      console.log("AUTH:PLOGIN:response", {
        ok: response.ok,
        status: response.status,
        rawData: data,
      });

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || `HTTP ${response.status}`
        );
      }

      const passengerId =
        data?.userId || data?.passenger?._id || data?.user?._id || data?._id;

      if (!passengerId) {
        throw new Error("Login succeeded but no passengerId returned");
      }

      const token =
        data?.token || data?.accessToken || data?.jwt || data?.authToken;

      console.log("AUTH:PLOGIN:parsed", {
        passengerId,
        hasToken: !!token,
        tokenPreview: token ? String(token).slice(0, 20) + "..." : null,
      });

      await AsyncStorage.setItem("passengerId", String(passengerId));

      const savedPassengerId = await AsyncStorage.getItem("passengerId");
      console.log("AUTH:PLOGIN:storedLegacyPassengerId", {
        savedPassengerId,
      });

      if (token) {
        await AsyncStorage.setItem("token", String(token));

        const savedToken = await AsyncStorage.getItem("token");
        console.log("AUTH:PLOGIN:storedLegacyToken", {
          hasSavedToken: !!savedToken,
          tokenPreview: savedToken ? String(savedToken).slice(0, 20) + "..." : null,
        });

        await saveAuth({
          token: String(token),
          userId: String(passengerId),
          role: "passenger",
        });

        const savedAuth = await AsyncStorage.getItem("auth");
        console.log("AUTH:PLOGIN:afterSaveAuth", {
          rawAuthStorage: savedAuth,
        });
      } else {
        throw new Error("Login succeeded but no token returned");
      }

      const infoRes = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const infoText = await infoRes.text();
      let info: any = null;
      try {
        info = infoText ? JSON.parse(infoText) : null;
      } catch {}

      console.log("AUTH:PLOGIN:passengerInfo", {
        infoStatus: infoRes.status,
        infoOk: infoRes.ok,
        info,
      });

      const passenger = info?.passenger || null;
      const r = passenger?.restriction || null;

      const isRestricted = !!r?.isRestricted;
      const endAt = r?.endAt ? new Date(r.endAt).getTime() : null;
      const active = isRestricted && (!endAt || endAt > Date.now());

      if (active) {
        console.log("AUTH:PLOGIN:restricted", {
          passengerId,
          restriction: r,
        });

        router.replace({
          pathname: "/restriction",
          params: {
            userType: "passenger",
            name: passenger?.firstName
              ? `${passenger.firstName} ${passenger.lastName || ""}`.trim()
              : "Passenger",
            type: r?.type || "ban",
            reason: r?.reason || "",
            endAt: r?.endAt ? String(r.endAt) : "",
          },
        });
        return;
      }

      console.log("AUTH:PLOGIN:navigate", {
        to: "../homepassenger/phome",
        passengerId,
        hasToken: !!token,
      });

      Alert.alert("Login Successful", "Welcome!");
      router.replace("../homepassenger/phome");
    } catch (error: any) {
      console.error("AUTH:PLOGIN:error", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      Alert.alert("Login Failed", error?.message || "Network/server error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.push("../location/welcome")}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Sign in with your email or phone</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email or Phone"
            placeholderTextColor="#A0A0A0"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Password"
            placeholderTextColor="#A0A0A0"
            secureTextEntry={!isPasswordVisible}
            value={pass}
            onChangeText={setPass}
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(prev => !prev)}>
            <MaterialIcons
              name={isPasswordVisible ? "visibility" : "visibility-off"}
              size={20}
              color="#A0A0A0"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.signInBtn, busy && styles.signInBtnDisabled]} // (4) visual + disabled
          onPress={loginUser}
          disabled={busy}
        >
          <Text style={styles.signInText}>{busy ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>

        <View className="divider" style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.signupPrompt}>
          Don't have an account?{" "}
          <Text
            style={styles.signupLink}
            onPress={() => router.push("/login_and_reg/pregister")}
          >
            Sign Up
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center" },
  inner: { width: width * 0.85, paddingTop: 60 },
  back: { fontSize: 16, color: "#414141", marginBottom: 20 },
  title: { fontSize: 20, color: "#414141", fontWeight: "600", marginBottom: 30 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 48,
    marginBottom: 15,
  },
  input: { flex: 1, fontSize: 16, color: "#414141" },
  forgot: { alignSelf: "flex-end", marginBottom: 30 },
  forgotText: { color: "#DD1F1F", fontSize: 13 },
  signInBtn: {
    backgroundColor: "#5089A3",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 25,
  },
  signInBtnDisabled: { opacity: 0.6 }, // (4)
  signInText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 25 },
  line: { flex: 1, height: 1, backgroundColor: "#D1D1D1" },
  orText: { marginHorizontal: 10, color: "#A0A0A0" },
  signupPrompt: { textAlign: "center", fontSize: 14, color: "#414141" },
  signupLink: { color: "#5089A3", fontWeight: "600" },
});
