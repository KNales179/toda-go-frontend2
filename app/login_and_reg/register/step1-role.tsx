//step1-role.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import RegisterProgressBar from "../components/RegisterProgressBar";
import { useRegister, Role } from "./RegisterContext";

export default function Step1Role() {
  const router = useRouter();
  const { state, patch } = useRegister();

  const roles: Role[] = ["Driver", "Operator", "Both"];

  return (
    <View style={styles.container}>
      <RegisterProgressBar step={1} total={5} title="Choose Role" />

      <View style={styles.card}>
        <Text style={styles.h}>Ikaw ba ay Operator o Driver?</Text>

        <View style={styles.row}>
          {roles.map((r) => {
            const active = state.role === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => patch({ role: r })}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => router.push("/login_and_reg/register/step2-uploads")}>
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 30, backgroundColor: "#f2f2f2" },
  card: { margin: 16, backgroundColor: "#fff", borderRadius: 14, padding: 16 },
  h: { fontSize: 18, fontWeight: "800", color: "#222", marginBottom: 14 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  pill: { borderWidth: 1, borderColor: "#ccc", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#fff" },
  pillActive: { borderColor: "#5089A3", backgroundColor: "#5089A3" },
  pillText: { color: "#333", fontWeight: "700" },
  pillTextActive: { color: "#fff" },
  btn: { marginTop: 18, backgroundColor: "#5089A3", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});