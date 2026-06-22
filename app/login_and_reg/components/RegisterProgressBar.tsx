import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";

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

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const colors = {
    title: isDarkMode ? "#F2F2F2" : "#414141",
    small: isDarkMode ? "#C9C9C9" : "#777",
    track: isDarkMode ? "#50575C" : "#E6E6E6",
    fill: "#5089A3",
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.title }]}>{title}</Text>
        <Text style={[styles.small, { color: colors.small }]}>
          Step {step} of {total}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.track }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: colors.fill }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  small: {
    fontSize: 12,
  },
  track: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: 8,
  },
});