import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function RegisterProgressBar({
  step,
  total,
  title,
}: {
  step: number;
  total: number;
  title: string;
}) {
  const pct = Math.max(0, Math.min(1, step / total));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.small}>
          Step {step} of {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "800", color: "#414141" },
  small: { fontSize: 12, color: "#777" },
  track: { marginTop: 8, height: 8, backgroundColor: "#E6E6E6", borderRadius: 999, overflow: "hidden" },
  fill: { height: 8, backgroundColor: "#5089A3" },
});