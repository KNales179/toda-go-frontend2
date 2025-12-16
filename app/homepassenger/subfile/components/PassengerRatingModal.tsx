// homepassenger/subfile/PassengerRatingModal.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  notes: string;
  selectedRating: number;
  setNotes: (v: string) => void;
  setSelectedRating: (n: number) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const PassengerRatingModal: React.FC<Props> = ({
  visible,
  notes,
  selectedRating,
  setNotes,
  setSelectedRating,
  onSubmit,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.ratingModalOverlay}>
      <View style={styles.ratingModal}>
        <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="gray" />
        </TouchableOpacity>

        <Text style={styles.modalTitle}>Rate Your Driver</Text>

        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
              <Ionicons
                name={selectedRating >= star ? "star" : "star-outline"}
                size={30}
                color="#FFD700"
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.feedbackInput}
          placeholder="Leave a comment (optional)"
          placeholderTextColor="#A0A0A0"
          multiline
          numberOfLines={3}
          onChangeText={setNotes}
          value={notes}
        />

        <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PassengerRatingModal;

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
  starsContainer: { flexDirection: "row", marginBottom: 10 },
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
