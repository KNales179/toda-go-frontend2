import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  Keyboard,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import RegisterProgressBar from "../components/RegisterProgressBar";
import { useRegister } from "./RegisterContext";

function getMinimumAdultBirthdate() {
  const today = new Date();
  return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
}

function isAtLeast18(dateString: string) {
  if (!dateString) return false;

  const birthdate = new Date(dateString);
  if (Number.isNaN(birthdate.getTime())) return false;

  const minimumAdultBirthdate = getMinimumAdultBirthdate();

  return birthdate <= minimumAdultBirthdate;
}

export default function Step1Personal() {
  const router = useRouter();
  const { state, patch } = useRegister();

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const colors = {
    bg: isDarkMode ? "#0F172A" : "#F8FAFC",
    card: isDarkMode ? "#111827" : "#FFFFFF",
    inputBg: isDarkMode ? "#1F2937" : "#FFFFFF",
    text: isDarkMode ? "#F9FAFB" : "#111827",
    subText: isDarkMode ? "#CBD5E1" : "#6B7280",
    placeholder: isDarkMode ? "#9CA3AF" : "#8A8F98",
    border: isDarkMode ? "#374151" : "#D1D5DB",
    softBox: isDarkMode ? "#1F2937" : "#F8FAFC",
    muted: isDarkMode ? "#CBD5E1" : "#6B7280",
  };

  const [showDatePicker, setShowDatePicker] = useState(false);

  const maximumAdultBirthdate = getMinimumAdultBirthdate();

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");

    if (selectedDate) {
      if (selectedDate > maximumAdultBirthdate) {
        Alert.alert("Invalid Birthdate", "Driver must be at least 18 years old.");
        return;
      }

      const formatted = selectedDate.toISOString().split("T")[0];
      patch({ driverBirthdate: formatted });
    }
  };

  const next = () => {
    if (!state.driverFirstName.trim()) return Alert.alert("Required", "First name is required.");
    if (!state.driverLastName.trim()) return Alert.alert("Required", "Last name is required.");
    if (!state.driverBirthdate.trim()) return Alert.alert("Required", "Birthdate is required.");

    if (!isAtLeast18(state.driverBirthdate)) {
      return Alert.alert("Invalid Birthdate", "Driver must be at least 18 years old.");
    }

    if (!state.driverPhone.trim()) return Alert.alert("Required", "Mobile number is required.");

    Keyboard.dismiss();

    setTimeout(() => {
      router.push("/login_and_reg/register/step2-franchise-license");
    }, 120);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardWrap, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={Platform.OS === "ios"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bg }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        <RegisterProgressBar step={1} total={4} title="Personal Details" />

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.header, { color: colors.text }]}>Driver Personal Information</Text>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="First Name"
            placeholderTextColor={colors.placeholder}
            value={state.driverFirstName}
            onChangeText={(v) => patch({ driverFirstName: v })}
          />

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Middle Name"
            placeholderTextColor={colors.placeholder}
            value={state.driverMiddleName}
            onChangeText={(v) => patch({ driverMiddleName: v })}
          />

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Last Name"
            placeholderTextColor={colors.placeholder}
            value={state.driverLastName}
            onChangeText={(v) => patch({ driverLastName: v })}
          />

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Suffix (optional)"
            placeholderTextColor={colors.placeholder}
            value={state.driverSuffix}
            onChangeText={(v) => patch({ driverSuffix: v })}
          />

          <TouchableOpacity
            style={[
              styles.dateInput,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: state.driverBirthdate ? colors.text : colors.placeholder }}>
              {state.driverBirthdate || "Select Birthdate"}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.ageNote, { color: colors.subText }]}>
            Driver must be at least 18 years old.
          </Text>

          {showDatePicker && (
            <DateTimePicker
              value={
                state.driverBirthdate && !isNaN(new Date(state.driverBirthdate).getTime())
                  ? new Date(state.driverBirthdate)
                  : maximumAdultBirthdate
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              maximumDate={maximumAdultBirthdate}
              themeVariant={isDarkMode ? "dark" : "light"}
              textColor={isDarkMode ? "#F2F2F2" : "#222"}
              accentColor="#5089A3"
            />
          )}

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Mobile Number (09XXXXXXXXX)"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            value={state.driverPhone}
            onChangeText={(v) => patch({ driverPhone: v })}
          />

          <TouchableOpacity style={styles.btn} onPress={next}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>

          <Text style={[styles.note, { color: colors.subText }]}>
            Make sure your mobile number is active. It will be used as your contact number.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
    marginTop: 30,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    margin: 16,
    borderRadius: 14,
    padding: 16,
  },
  header: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
  },
  dateInput: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
    borderRadius: 10,
  },
  ageNote: {
    fontSize: 11,
    marginBottom: 10,
  },
  btn: {
    marginTop: 8,
    backgroundColor: "#5089A3",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    textAlign: "center",
  },
});