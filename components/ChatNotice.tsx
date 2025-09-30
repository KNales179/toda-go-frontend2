// components/ChatNotice.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  bookingId: string;
  role: "driver" | "passenger";
  onGoToChat: () => void; // navigation handler from parent
};

const KEY = (id: string) => `chatNoticeDismissed:${id}`;

export default function ChatNotice({ bookingId, role, onGoToChat }: Props) {
  const [hidden, setHidden] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const val = await AsyncStorage.getItem(KEY(bookingId));
        if (mounted) setHidden(val === "1");
      } catch {
        if (mounted) setHidden(false);
      }
    })();
    return () => { mounted = false; };
  }, [bookingId]);

  if (hidden) return null;

  const copy =
    role === "driver"
      ? {
          title: "Booking accepted.",
          body: "Pwede mong i-chat ang pasahero para kumpirmahin ang eksaktong pickup point at detalye.",
          cta: "Buksan ang chats ⇒",
        }
      : {
          title: "Driver found!",
          body: "Pwede kang makipag-chat sa driver para mas malinaw ang direksyon at lokasyon ng tagpuan.",
          cta: "Buksan ang chats ⇒",
        };

  const dismiss = async () => {
    setHidden(true);
    try { await AsyncStorage.setItem(KEY(bookingId), "1"); } catch {}
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Ionicons name="chatbubbles-outline" size={22} />
      </View>

      <View style={styles.center}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        <TouchableOpacity onPress={onGoToChat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.link}>{copy.cta}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={dismiss} style={styles.right} accessibilityLabel="Isara ang paalala">
        <Ionicons name="close" size={18} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#F8FAFF",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  left: { paddingTop: 2 },
  center: { flex: 1 },
  right: { padding: 6 },
  title: { fontWeight: "700", fontSize: 14, marginBottom: 2 },
  body: { fontSize: 13, color: "#333" },
  link: { marginTop: 6, fontWeight: "700", fontSize: 13, textDecorationLine: "underline" },
});
