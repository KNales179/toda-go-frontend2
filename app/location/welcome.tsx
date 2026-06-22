import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  useColorScheme,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function Welcome() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = useMemo(() => getColors(isDark), [isDark]);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { backgroundColor: colors.background },
      ]}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View
            style={[
              styles.logoWrap,
              {
                backgroundColor: colors.logoBg,
                borderColor: colors.border,
              },
            ]}
          >
            <Image
              source={require("../../assets/images/3.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Welcome to TODA Go
          </Text>

          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Tricycle ride in Lucena made easy
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.question, { color: colors.primary }]}>
            Continue as
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("../login_and_reg/dlogin")}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>DRIVER</Text>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.placeholder }]}>or</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/login_and_reg/plogin")}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>PASSENGER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function getColors(isDark: boolean) {
  return {
    background: isDark ? "#0F172A" : "#F8FAFC",
    card: isDark ? "#111827" : "#F8FAFC",
    logoBg: isDark ? "#111827" : "#F8FAFC",
    text: isDark ? "#F9FAFB" : "#111827",
    muted: isDark ? "#CBD5E1" : "#6B7280",
    placeholder: isDark ? "#9CA3AF" : "#8A8F98",
    border: isDark ? "#374151" : "#D1D5DB",
    primary: "#5089A3",
  };
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 62,
    paddingBottom: 32,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 2,
  },
  content: {
    minHeight: height * 0.48,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  logo: {
    width: 185,
    height: 185,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 7,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  card: {
    padding: 16,
  },
  question: {
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#5089A3",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 13,
  },
  line: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 13,
    marginHorizontal: 10,
  },
});