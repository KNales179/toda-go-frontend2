// homepassenger/subfile/PassengerReportModal.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const REPORT_OPTIONS = [
  "Overcharging",
  "Harassment",
  "Unproper Attire",
  "Refusal to Convey Passenger",
  "Other",
];

type Props = {
  visible: boolean;
  reportType: string;
  setReportType: (t: string) => void;
  otherReport: string;
  setOtherReport: (t: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const PassengerReportModal: React.FC<Props> = ({
  visible,
  reportType,
  setReportType,
  otherReport,
  setOtherReport,
  onSubmit,
  onClose,
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);

  if (!visible) return null;

  return (
    <View style={styles.ratingModalOverlay}>
      <View style={[styles.ratingModal, { alignItems: "stretch" }]}>
        <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="gray" />
        </TouchableOpacity>

        <Text style={styles.modalTitle}>Report Driver</Text>

        <Text style={styles.modalLabel}>Select Report Type:</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={{ color: reportType ? "#000" : "#999" }}>
              {reportType || "Select a violation"}
            </Text>
            <Ionicons
              name={showDropdown ? "chevron-up" : "chevron-down"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>

          {showDropdown && (
            <View style={styles.dropdownMenu}>
              {REPORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setReportType(option);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={{ color: "#000" }}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {reportType === "Other" && (
          <TextInput
            style={styles.feedbackInput}
            placeholder="Describe the issue"
            placeholderTextColor="#A0A0A0"
            multiline
            numberOfLines={3}
            value={otherReport}
            onChangeText={setOtherReport}
          />
        )}

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: "#4CAF50" }]}
          onPress={onSubmit}
        >
          <Text style={styles.submitButtonText}>Submit Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PassengerReportModal;

const styles = StyleSheet.create({
  ratingModalOverlay: {
    position: "absolute",
    top: -100,
    left: 0,
    right: 0,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  ratingModal: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  dismissButton: { position: "absolute", top: 10, right: 10, zIndex: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  modalLabel: { marginTop: 5, marginBottom: 5, fontSize: 14, color: "#333", fontWeight: "500" },
  dropdownContainer: { width: "100%", marginVertical: 5 },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  dropdownMenu: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginTop: 2,
  },
  dropdownItem: { padding: 10 },
  feedbackInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#4caf50",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  submitButtonText: { color: "#fff", fontWeight: "bold" },
});
