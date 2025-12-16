// homedriver/subfile/AcceptedPassengersList.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  isOnline: boolean;
  activeJobs: any[];
  capacity: number | null;
  onSelectJob: (job: any) => void;
};

export default function AcceptedPassengersList({
  isOnline,
  activeJobs,
  capacity,
  onSelectJob,
}: Props) {
  if (!isOnline || activeJobs.length === 0) return null;

  return (
    <View style={[styles.popup, { backgroundColor: "#eef6ff" }]}>
      <Text style={styles.popupTitle}>
        👥 Accepted Passengers ({activeJobs.length}
        {capacity !== null ? ` / ${capacity}` : ""})
      </Text>

      {activeJobs.map((job: any) => (
        <TouchableOpacity
          key={job.id}
          style={{ paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1 }}
          onPress={() => onSelectJob(job)}
        >
          <Text style={styles.Name}>
            {job?.displayName ? ` • ${job.displayName}` : ""}
            {" • "}
            {job.bookingType
              ? ` • ${
                  job.bookingType === "GROUP"
                    ? `Group(${job.partySize || 1})`
                    : job.bookingType === "SOLO"
                    ? "Solo(VIP)"
                    : "Classic"
                }`
              : ""}
          </Text>
          {job.bookedFor ? (
            <Text style={{ color: "#c0392b", fontWeight: "600" }}>
              👤 For someone else
            </Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  Name: {
    fontWeight: "bold",
    fontSize: 15
  },
  popup: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
    zIndex: 99,
  },
  popupTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 5 },
});
