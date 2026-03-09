// step4-franchise-trike.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import RegisterProgressBar from "../components/RegisterProgressBar";
import { useRegister } from "./RegisterContext";

type PickerType = "experience" | "sector" | "voter" | null;

export default function Step4FranchiseTrike() {
  const router = useRouter();
  const { state, patch } = useRegister();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModalType, setSelectedModalType] = useState<PickerType>(null);

  const experienceOptions = ["1-5 taon", "6-10 taon", "16-20 taon", "20 taon pataas"];
  const sectors = ["East", "West", "North", "South", "Other"];
  const voterOptions = ["Oo", "Hindi"];

  const openPicker = (type: PickerType) => {
    setSelectedModalType(type);
    setModalVisible(true);
  };

  const pickOption = (option: string) => {
    if (selectedModalType === "experience") patch({ experienceYears: option });
    if (selectedModalType === "sector") patch({ sector: option });
    if (selectedModalType === "voter") {
      patch({
        isLucenaVoter: option,
        // if user changes to Oo, clear votingLocation
        votingLocation: option.toLowerCase() === "oo" ? "" : state.votingLocation,
      });
    }
    setModalVisible(false);
  };

  const next = () => {
    // ✅ Required validations (to prevent backend crash)
    if (!state.experienceYears?.trim()) return Alert.alert("Required", "Please select driving experience.");
    if (!state.franchiseNumber?.trim()) return Alert.alert("Required", "Please enter Franchise Number.");
    if (!state.todaName?.trim()) return Alert.alert("Required", "Please enter TODA Name.");
    if (!state.sector?.trim()) return Alert.alert("Required", "Please select Sector.");
    if (!state.isLucenaVoter?.trim()) return Alert.alert("Required", "Please select Lucena voter option.");
    if (String(state.isLucenaVoter).toLowerCase() === "hindi" && !state.votingLocation?.trim()) {
      return Alert.alert("Required", "Please enter your voting location.");
    }
    if (!state.trikeColor?.trim()) return Alert.alert("Required", "Please select tricycle color.");
    if (!state.plateNumber?.trim()) return Alert.alert("Required", "Please enter plate number.");

    router.push("/login_and_reg/register/step5-account-submit");
  };

  const modalTitle =
    selectedModalType === "experience"
      ? "Gaano katagal ng nagmamaneho?"
      : selectedModalType === "sector"
      ? "Pumili ng Sector"
      : "Ikaw ba ay botante ng Lucena city?";

  const list =
    selectedModalType === "experience"
      ? experienceOptions
      : selectedModalType === "sector"
      ? sectors
      : voterOptions;

  return (
    <View style={styles.container}>
      <RegisterProgressBar step={4} total={5} title="Franchise & Tricycle" />

      <View style={styles.card}>
        {/* ✅ Experience moved here */}
        <Text style={styles.h}>Driving Experience</Text>
        <TouchableOpacity style={styles.customPicker} onPress={() => openPicker("experience")}>
          <Text style={{ fontSize: 14, color: state.experienceYears ? "#000" : "#888" }}>
            {state.experienceYears || "Gaano katagal ng nagmamaneho?"}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#888" />
        </TouchableOpacity>

        <Text style={[styles.h, { marginTop: 10 }]}>Franchise & Voting Info</Text>

        <TextInput
          style={styles.input}
          placeholder="Franchise Number"
          value={state.franchiseNumber}
          onChangeText={(v) => patch({ franchiseNumber: v })}
        />

        <TextInput
          style={styles.input}
          placeholder="TODA Name"
          value={state.todaName}
          onChangeText={(v) => patch({ todaName: v })}
        />

        {/* ✅ Sector picker */}
        <TouchableOpacity style={styles.customPicker} onPress={() => openPicker("sector")}>
          <Text style={{ fontSize: 14, color: state.sector ? "#000" : "#888" }}>
            {state.sector || "Pumili ng Sector"}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#888" />
        </TouchableOpacity>

        {/* ✅ Lucena voter picker */}
        <TouchableOpacity style={styles.customPicker} onPress={() => openPicker("voter")}>
          <Text style={{ fontSize: 14, color: state.isLucenaVoter ? "#000" : "#888" }}>
            {state.isLucenaVoter || "Ikaw ba ay botante ng Lucena city?"}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#888" />
        </TouchableOpacity>

        {String(state.isLucenaVoter).toLowerCase() === "hindi" ? (
          <TextInput
            style={styles.input}
            placeholder="Kung hindi, saan lugar ikaw bumoboto?"
            value={state.votingLocation}
            onChangeText={(v) => patch({ votingLocation: v })}
          />
        ) : null}

        <Text style={[styles.h, { marginTop: 10 }]}>Tricycle Info</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[4, 6].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => patch({ capacity: n })}
              style={[styles.pill, state.capacity === n && styles.pillActive]}
            >
              <Text style={[styles.pillText, state.capacity === n && styles.pillTextActive]}>
                {n} seats
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          {(["yellow", "green"] as const).map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => patch({ trikeColor: c })}
              style={[styles.pill, state.trikeColor === c && styles.pillActive]}
            >
              <Text style={[styles.pillText, state.trikeColor === c && styles.pillTextActive]}>
                {c.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Plate Number (LTO)"
          autoCapitalize="characters"
          value={state.plateNumber}
          onChangeText={(v) => patch({ plateNumber: v })}
        />

        <TouchableOpacity style={styles.btn} onPress={next}>
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ Modal Picker */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>

            {list.map((option) => (
              <TouchableOpacity key={option} style={styles.optionItem} onPress={() => pickOption(option)}>
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 30, backgroundColor: "#f2f2f2" },
  card: { margin: 16, backgroundColor: "#fff", borderRadius: 14, padding: 16 },

  h: { fontSize: 16, fontWeight: "900", color: "#222", marginBottom: 10 },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
  },

  customPicker: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginBottom: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },

  pill: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  pillActive: { borderColor: "#5089A3", backgroundColor: "#5089A3" },
  pillText: { color: "#333", fontWeight: "800" },
  pillTextActive: { color: "#fff" },

  btn: { marginTop: 14, backgroundColor: "#5089A3", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "80%",
    borderRadius: 10,
    padding: 15,
    elevation: 5,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10, color: "#222" },
  optionItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  optionText: { fontSize: 16, color: "#333" },
});