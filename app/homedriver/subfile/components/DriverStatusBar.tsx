// homedriver/subfile/DriverStatusBar.tsx
import React from "react";
import { View, Text, Switch, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

type Props = {
  isOnline: boolean;
  hasIncoming: boolean;
  capacity: number | null;
  activeJobsCount: number;
  onToggleOnline: () => void;
};

export default function DriverStatusBar({
  isOnline,
  hasIncoming,
  capacity,
  activeJobsCount,
  onToggleOnline,
}: Props) {
  return (
    <View style={styles.statusBar}>
      <Switch
        style={{ marginRight: 10 }}
        trackColor={{ false: "#ccc", true: "#37982a" }}
        thumbColor="white"
        ios_backgroundColor="black"
        onValueChange={onToggleOnline}
        value={isOnline}
      />
      <Text style={styles.statusText}>
        {isOnline
          ? hasIncoming
            ? `📦 Active ride`
            : `You're online.${capacity !== null ? ` Capacity: ${activeJobsCount}/${capacity}` : ""}`
          : "You're offline."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBar: {
    position: "absolute",
    bottom: 10,
    backgroundColor: "#80C3E1",
    width,
    padding: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: { color: "black", fontSize: 14, fontWeight: "500" },
});
