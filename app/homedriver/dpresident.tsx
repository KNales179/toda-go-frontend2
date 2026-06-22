// app/homedriver/dpresident.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config";

type Mode = "drivers" | "members";

type Row = {
  id: string;
  name: string;
  franchiseNumber?: string;
  todaName?: string;
  sector?: string;
  email?: string;
  contact?: string;
  isPresident?: boolean;
  todaPresName?: string;
  isRestricted?: boolean;
  driverVerified?: boolean;
  selfieImage?: string;
};

type DriverFull = {
  _id?: string;
  profileID?: string;

  driverFirstName?: string;
  driverMiddleName?: string;
  driverLastName?: string;
  driverSuffix?: string;
  driverName?: string;

  email?: string;
  driverPhone?: string;

  todaName?: string;
  todaPresName?: string;
  isPresident?: boolean;

  franchiseNumber?: string;
  sector?: string;
  experienceYears?: string;

  gender?: string;
  driverBirthdate?: string;

  licenseId?: string;
  restriction?: {
    isRestricted?: boolean;
    type?: string;
    reason?: string;
    startAt?: string;
    endAt?: string;
  };

  driverVerified?: boolean;
  isVerified?: boolean;

  selfieImage?: string;

  isLucenaVoter?: string;
  votingLocation?: string;

  plateNumber?: string;
  capacity?: number;

  createdAt?: string;
  updatedAt?: string;
};

const PLACEHOLDER =
  "https://via.placeholder.com/300x300.png?text=No+Profile+Image";

function resolveImage(uri?: string) {
  if (!uri) return PLACEHOLDER;
  if (/^https?:\/\//i.test(uri)) return uri;
  return `${API_BASE_URL}/${String(uri).replace(/^\//, "")}`;
}

function formatDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString();
}

function formatDateTime(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

async function getResolvedDriverSession() {
  const [rawDriverId, rawToken, rawTodaAuth] = await Promise.all([
    AsyncStorage.getItem("driverId"),
    AsyncStorage.getItem("token"),
    AsyncStorage.getItem("toda.auth"),
  ]);

  let todaAuth: any = null;
  try {
    todaAuth = rawTodaAuth ? JSON.parse(rawTodaAuth) : null;
  } catch {}

  const driverId = rawDriverId || todaAuth?.userId || todaAuth?.driverId || null;
  const token = rawToken || todaAuth?.token || null;

  return {
    driverId: driverId ? String(driverId) : null,
    token: token ? String(token) : null,
  };
}

export default function DPresident() {
  const [mode, setMode] = useState<Mode>("drivers");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  // profile modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [full, setFull] = useState<DriverFull | null>(null);

  const endpoint = useMemo(() => {
    const base =
      mode === "drivers"
        ? `${API_BASE_URL}/api/president/drivers`
        : `${API_BASE_URL}/api/president/members`;
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    return base + qs;
  }, [mode, q]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const session = await getResolvedDriverSession();
      const token = session.token;

      if (!token) {
        setItems([]);
        setError("Missing driver token. Please login again.");
        return;
      }

      const res = await fetch(endpoint, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.error === "not_president"
            ? "You are not a President."
            : data?.error === "restricted"
            ? "Account restricted."
            : data?.details || data?.error || data?.message || `HTTP ${res.status}`;
        setItems([]);
        setError(msg);
        return;
      }

      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
    } catch (e: any) {
      setError("Failed to load list.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  // open full profile when card pressed
  const openProfile = useCallback(async (row: Row) => {
    setSelected(row);
    setFull(null);
    setProfileError(null);
    setProfileOpen(true);

    try {
      setProfileLoading(true);

      const session = await getResolvedDriverSession();
      const token = session.token;

      if (!token) {
        setProfileError("Missing driver token. Please login again.");
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/president/driver/${encodeURIComponent(row.id)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(data?.message || data?.error || `HTTP ${res.status}`);
        return;
      }

      const drv = data?.driver || null;
      if (!drv) {
        setProfileError("No driver data returned.");
        return;
      }

      setFull(drv);
    } catch (e: any) {
      setProfileError("Failed to load driver profile.");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const onAdd = useCallback(
    async (driverId: string, name: string) => {
      try {
        const session = await getResolvedDriverSession();
        const token = session.token;
        if (!token) return Alert.alert("Error", "Missing driver token.");

        Alert.alert("Add Member", `Add "${name}" to your TODA?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add",
            onPress: async () => {
              try {
                const res = await fetch(
                  `${API_BASE_URL}/api/president/members/${encodeURIComponent(
                    driverId
                  )}/add`,
                  {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );

                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  Alert.alert(
                    "Failed",
                    data?.details || data?.error || data?.message || "Request failed."
                  );
                  return;
                }

                load();
              } catch {
                Alert.alert("Error", "Server error while adding member.");
              }
            },
          },
        ]);
      } catch {
        Alert.alert("Error", "Server error while adding member.");
      }
    },
    [load]
  );

  const onKick = useCallback(
    async (driverId: string, name: string) => {
      try {
        const session = await getResolvedDriverSession();
        const token = session.token;
        if (!token) return Alert.alert("Error", "Missing driver token.");

        Alert.alert("Kick Member", `Remove "${name}" from your TODA?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Kick",
            style: "destructive",
            onPress: async () => {
              try {
                const url = `${API_BASE_URL}/api/president/members/${encodeURIComponent(
                  driverId
                )}/kick`;

                const res = await fetch(url, {
                  method: "PATCH",
                  headers: { Authorization: `Bearer ${token}` },
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  const msg =
                    data?.details ||
                    data?.error ||
                    data?.message ||
                    `Kick failed (HTTP ${res.status})`;
                  Alert.alert("Failed", msg);
                  return;
                }

                load();
              } catch (e: any) {
                Alert.alert("Error", "Server error while kicking member.");
              }
            },
          },
        ]);
      } catch {
        Alert.alert("Error", "Server error while kicking member.");
      }
    },
    [load]
  );

  const title = mode === "drivers" ? "Manage Driver" : "Manage Member";

  const ProfileRow = ({ label, value }: { label: string; value?: any }) => (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "800" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, color: "#111", fontWeight: "800" }}>
        {value != null && String(value).trim() !== "" ? String(value) : "—"}
      </Text>
    </View>
  );

  const VerificationBadge = () => {
    const isVerified = !!(full?.isVerified || full?.driverVerified);
    const label = isVerified ? "Verified" : "Not Verified";
    return (
      <View
        style={{
          marginTop: 8,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.15)",
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontWeight: "900", color: "#111", fontSize: 12 }}>
          {label}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{title}</Text>

      {/* Toggle tabs */}
      <View style={styles.toggleWrap}>
        <TouchableOpacity
          onPress={() => setMode("drivers")}
          style={[styles.toggleBtn, mode === "drivers" && styles.toggleBtnActive]}
        >
          <Text
            style={[
              styles.toggleText,
              mode === "drivers" && styles.toggleTextActive,
            ]}
          >
            Drivers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode("members")}
          style={[styles.toggleBtn, mode === "members" && styles.toggleBtnActive]}
        >
          <Text
            style={[
              styles.toggleText,
              mode === "members" && styles.toggleTextActive,
            ]}
          >
            Members
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons
          name="search"
          size={18}
          color="#111"
          style={{ marginRight: 8 }}
        />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search name / franchise / TODA"
          placeholderTextColor="#6b7280"
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color="#111" />
        </TouchableOpacity>
      </View>

      {!!error && (
        <Text style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>
          {error}
        </Text>
      )}

      {loading ? (
        <View style={{ paddingTop: 18 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => {
            const showAction = mode === "drivers" ? "add" : "kick";

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => openProfile(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sub}>
                    {item.franchiseNumber
                      ? `Franchise: ${item.franchiseNumber}`
                      : "Franchise: —"}
                  </Text>
                  <Text style={styles.sub}>
                    TODA: {item.todaName ? item.todaName : "Unassigned"}
                    {item.sector ? ` • Sector: ${item.sector}` : ""}
                  </Text>
                </View>

                {showAction === "add" ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={(e) => {
                      // @ts-ignore
                      e?.stopPropagation?.();
                      onAdd(item.id, item.name);
                    }}
                    disabled={!!item.isRestricted}
                  >
                    <Text style={styles.actionText}>
                      {item.isRestricted ? "Restricted" : "Add"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.kickBtn]}
                    onPress={(e) => {
                      // @ts-ignore
                      e?.stopPropagation?.();
                      onKick(item.id, item.name);
                    }}
                  >
                    <Text style={[styles.actionText, { color: "#fff" }]}>
                      Kick
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 18 }}>
              <Text style={{ color: "#6b7280" }}>
                {mode === "drivers" ? "No drivers found." : "No members found."}
              </Text>
            </View>
          }
        />
      )}

      {/* Full Profile Modal */}
      <Modal
        visible={profileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileOpen(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Driver Profile</Text>
              <TouchableOpacity
                onPress={() => setProfileOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#111" />
              </TouchableOpacity>
            </View>

            {profileLoading ? (
              <View style={{ paddingVertical: 18 }}>
                <ActivityIndicator />
              </View>
            ) : profileError ? (
              <Text style={{ color: "#b91c1c", fontWeight: "800" }}>
                {profileError}
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile header */}
                <View style={{ alignItems: "center", marginBottom: 12 }}>
                  <Image
                    source={{ uri: resolveImage(full?.selfieImage) }}
                    style={{
                      width: 110,
                      height: 110,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                  />
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 16,
                      fontWeight: "900",
                      color: "#111",
                    }}
                  >
                    {full?.driverName || selected?.name || "—"}
                  </Text>

                  <VerificationBadge />

                  {!!full?.isPresident && (
                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 12.5,
                        color: "#111",
                        fontWeight: "900",
                      }}
                    >
                      👑 President of {String(full?.todaPresName || "").trim() || "—"}
                    </Text>
                  )}
                </View>

                {/* Account */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Account</Text>
                  <ProfileRow label="Profile ID" value={full?.profileID} />
                  <ProfileRow label="Email" value={full?.email} />
                  <ProfileRow label="Contact" value={full?.driverPhone} />
                  <ProfileRow
                    label="Registered At"
                    value={formatDateTime(full?.createdAt)}
                  />
                </View>

                {/* TODA / Work */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>TODA / Work</Text>
                  <ProfileRow label="TODA Name" value={full?.todaName} />
                  <ProfileRow
                    label="Franchise Number"
                    value={full?.franchiseNumber}
                  />
                  <ProfileRow label="Sector" value={full?.sector} />
                  <ProfileRow label="Plate Number" value={full?.plateNumber} />
                  <ProfileRow label="Capacity" value={full?.capacity} />
                  <ProfileRow label="Experience" value={full?.experienceYears} />
                </View>

                {/* Personal (NO ADDRESS) */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal</Text>
                  <ProfileRow label="Gender" value={full?.gender} />
                  <ProfileRow label="Birthdate" value={formatDate(full?.driverBirthdate)} />
                  <ProfileRow label="License ID" value={full?.licenseId} />
                </View>

                {/* Voting */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Voting</Text>
                  <ProfileRow label="Lucena Voter" value={full?.isLucenaVoter} />
                  <ProfileRow label="Voting Location" value={full?.votingLocation} />
                </View>

                {/* Restriction */}
                {!!full?.restriction?.isRestricted && (
                  <View
                    style={[
                      styles.section,
                      { borderColor: "#fecaca", backgroundColor: "#fff7f7" },
                    ]}
                  >
                    <Text style={[styles.sectionTitle, { color: "#991b1b" }]}>
                      Restriction
                    </Text>
                    <ProfileRow label="Restricted" value="Yes" />
                    <ProfileRow label="Type" value={full?.restriction?.type} />
                    <ProfileRow label="Reason" value={full?.restriction?.reason} />
                    <ProfileRow
                      label="Start"
                      value={formatDateTime(full?.restriction?.startAt)}
                    />
                    <ProfileRow
                      label="End"
                      value={formatDateTime(full?.restriction?.endAt)}
                    />
                  </View>
                )}

                {/* Quick actions */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  {mode === "drivers" ? (
                    <TouchableOpacity
                      style={[
                        styles.modalActionBtn,
                        { borderColor: "#111", backgroundColor: "#fff" },
                      ]}
                      onPress={() => {
                        if (!selected) return;
                        setProfileOpen(false);
                        onAdd(selected.id, selected.name);
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: "#111" }}>
                        Add to my TODA
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.modalActionBtn,
                        { backgroundColor: "#111", borderColor: "#111" },
                      ]}
                      onPress={() => {
                        if (!selected) return;
                        setProfileOpen(false);
                        onKick(selected.id, selected.name);
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: "#fff" }}>
                        Kick from my TODA
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 14 },
  header: { fontSize: 20, fontWeight: "900", marginBottom: 10 },

  toggleWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  toggleBtnActive: { backgroundColor: "#111" },
  toggleText: { fontWeight: "900", color: "#111" },
  toggleTextActive: { color: "#fff" },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111" },
  refreshBtn: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    gap: 10,
  },
  name: { fontSize: 15, fontWeight: "900", marginBottom: 2 },
  sub: { fontSize: 12.5, color: "#4b5563", fontWeight: "700" },

  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111",
    backgroundColor: "#fff",
  },
  kickBtn: { backgroundColor: "#111" },
  actionText: { fontWeight: "900", color: "#111" },

  // modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 14,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    maxHeight: "86%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },

  section: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: "#111", marginBottom: 6 },

  modalActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
});
