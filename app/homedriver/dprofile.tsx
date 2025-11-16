// app/homedriver/dprofile.tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Alert, ScrollView,
  ActionSheetIOS, Platform, Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../config";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";

const { width } = Dimensions.get("window");
type WindowKey = "today" | "7d" | "30d" | "overall";
type ReportKey = "day" | "week" | "month" | "overall";

export default function DProfile() {
  const navigation = useNavigation<any>();

  const [driverId, setDriverId] = useState<string | null>(null);

  const [profile, setProfile] = useState<{name:string; selfieUrl?:string|null; avgRating:number; ratingCount:number; totalTrips:number} | null>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [reportRows, setReportRows] = useState<any[]>([]);

  const [win, setWin] = useState<WindowKey>("7d");
  const [reportWin, setReportWin] = useState<ReportKey>("day");
  const [menuOpen, setMenuOpen] = useState(false); // android fallback

  // ---- load driver id ----
  useEffect(() => {
    AsyncStorage.getItem("driverId").then(setDriverId);
  }, []);

  // ---- fetchers ----
  const fetchProfile = async (id: string) => {
    const r = await fetch(`${API_BASE_URL}/api/stats/driver/${id}/profile`);
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || "profile failed");
    setProfile(j);
  };

  const fetchSummary = async (id: string, windowKey: WindowKey) => {
    const r = await fetch(`${API_BASE_URL}/api/stats/driver/${id}/summary?window=${windowKey}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || "summary failed");
    setKpis(j.kpis);
    setDaily(j.daily || []);
  };

  const fetchMonthly = async (id: string) => {
    const year = new Date().getFullYear();
    const r = await fetch(`${API_BASE_URL}/api/stats/driver/${id}/monthly?year=${year}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || "monthly failed");
    setMonthly(j.months || []);
  };

  const fetchReport = async (id: string, windowKey: ReportKey) => {
    const r = await fetch(`${API_BASE_URL}/api/stats/driver/${id}/report?window=${windowKey}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || "report failed");
    setReportRows(j.rows || []);
  };

  useEffect(() => {
    if (!driverId) return;
    (async () => {
      try {
        await Promise.all([
          fetchProfile(driverId),
          fetchSummary(driverId, win),
          fetchMonthly(driverId),
          fetchReport(driverId, reportWin),
        ]);
      } catch (e:any) {
        Alert.alert("Stats", e.message || "Failed to load stats");
      }
    })();
  }, [driverId]);

  // refresh when window changes
  useEffect(() => {
    if (!driverId) return;
    fetchSummary(driverId, win).catch(() => {});
  }, [win, driverId]);

  useEffect(() => {
    if (!driverId) return;
    fetchReport(driverId, reportWin).catch(() => {});
  }, [reportWin, driverId]);

  // ---- logout (AsyncStorage only) ----
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("driverId");
      Alert.alert("Logged out", "You have been logged out successfully.");
      router.replace("../../login_and_reg/dlogin");
    } catch (error:any) {
      Alert.alert("Error", error.message || "Failed to log out.");
    }
  };

  // ---- menu handlers ----
  const openMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Settings", "Logout", "Cancel"],
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
        },
        (i) => {
          if (i === 0) navigation.navigate("dsettings");
          if (i === 1) handleLogout();
        }
      );
    } else {
      setMenuOpen(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection:"row", alignItems:"center"}}>
          <Image
            source={
              profile?.selfieUrl
                ? { uri: `${profile.selfieUrl}?t=${Date.now()}` }
                : require("../../assets/images/profile-placeholder.jpg") // ✅ fixed relative path
            }
            style={styles.avatar}
          />
          <View>
            <Text style={styles.name} numberOfLines={1}>
              {profile?.name || "Driver"}
            </Text>
            <Text style={styles.rating}>
              ★ {profile?.avgRating?.toFixed?.(2) || "0.00"} ({profile?.ratingCount || 0})
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={openMenu} hitSlop={{ top:10, left:10, right:10, bottom:10 }}>
          <Ionicons name="ellipsis-vertical" size={24} color="#222" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Window Toggle */}
        <View style={styles.toggleRow}>
          {(["today","7d","30d","overall"] as WindowKey[]).map((w) => (
            <TouchableOpacity
              key={w}
              onPress={() => setWin(w)}
              style={[styles.toggleBtn, win === w && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleTxt, win === w && styles.toggleTxtActive]}>
                {w === "7d" ? "7d" : w}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <KPI label="Income" value={`₱ ${fmtMoney(kpis?.income)}`} />
          <KPI label="Trips" value={kpis?.trips ?? 0} />
          <KPI label="Hours" value={`${(kpis?.hoursOnline ?? 0).toFixed(1)}h`} />
        </View>
        <View style={styles.kpiRow}>
          <KPI label="Avg Fare" value={`₱ ${fmtMoney(kpis?.avgFare)}`} />
          <KPI label="Complete" value={`${pct(kpis?.completeRate)}%`} />
          <KPI label="Cancel" value={`${pct(kpis?.cancelRate)}%`} />
        </View>

        {/* Charts */}
        <Text style={styles.sectionTitle}>Monthly Income</Text>
        <MiniBars data={monthly} />

        <Text style={styles.sectionTitle}>Daily Performance</Text>
        <MiniLine data={daily} metric="income" />

        {/* Report Table */}
        <View style={styles.reportHeader}>
          <Text style={styles.sectionTitle}>Report</Text>
          <View style={styles.toggleRowSmall}>
            {(["day","week","month","overall"] as ReportKey[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setReportWin(r)}
                style={[styles.toggleSm, reportWin === r && styles.toggleSmActive]}
              >
                <Text style={[styles.toggleSmTxt, reportWin === r && styles.toggleSmTxtActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.table}>
          {reportRows.map((row) => (
            <View key={row.key} style={styles.row}>
              <Text style={styles.cellLeft}>{row.label}</Text>
              <Text style={styles.cellRight}>
                {formatCell(row)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Android menu */}
      <Modal transparent visible={menuOpen} onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.sheet}>
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => { setMenuOpen(false); navigation.navigate("dsettings"); }}
            >
              <Text style={styles.sheetItemTxt}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => { setMenuOpen(false); handleLogout(); }}
            >
              <Text style={[styles.sheetItemTxt, {color:"#C00"}]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// --- small UI helpers (no external chart lib; lightweight visuals) ---
function KPI({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{String(value)}</Text>
    </View>
  );
}

function MiniBars({ data }: { data: { month:number; income:number }[] }) {
  if (!data || !data.length) return <Text style={styles.empty}>No data</Text>;
  const max = Math.max(1, ...data.map(d => d.income || 0));
  return (
    <View style={styles.barsWrap}>
      {data.map((d, i) => {
        const h = Math.max(4, (120 * d.income) / max);
        return (
          <View key={i} style={styles.barCol}>
            <View style={[styles.bar, { height: h }]} />
            <Text style={styles.barLabel}>{d.month}</Text>
          </View>
        );
      })}
    </View>
  );
}

function MiniLine({ data, metric }: { data: any[]; metric: "income"|"trips" }) {
  if (!data || !data.length) return <Text style={styles.empty}>No data</Text>;
  const vals = data.map(d => Number(d[metric] || 0));
  const max = Math.max(1, ...vals);
  const H = 120, W = width - 40;
  return (
    <View style={{ height: H, marginHorizontal: 20 }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent:"flex-end" }}>
        <View style={{ height:1, backgroundColor:"#EEE" }} />
      </View>
      <View style={{ flex:1, flexDirection:"row", alignItems:"flex-end" }}>
        {vals.map((v, i) => {
          const h = Math.max(2, (H * v) / max);
          return <View key={i} style={{ width: Math.max(2, W/vals.length - 4), height: h, marginHorizontal:2, backgroundColor:"#5089A3", borderRadius:2 }} />;
        })}
      </View>
    </View>
  );
}

// formatters
const fmtMoney = (n?: number) =>
  (Number(n || 0).toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const pct = (n?: number) => Math.round(Number(n || 0) * 100);

function formatCell(row: any) {
  if (row.key === "income") return `₱ ${fmtMoney(row.value)}`;
  if (row.key === "distance") return `${Number(row.value || 0).toFixed(1)} km`;
  if (row.key === "avgRating") return `${Number(row.value || 0).toFixed(2)} ★`;
  if (row.key === "hoursOnline") return `${Number(row.value || 0).toFixed(1)} h`;
  if (row.key === "acceptance" || row.key === "cancellation") return `${pct(row.value)}%`;
  return String(row.value ?? "—");
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 12, backgroundColor:"#eee" },
  name: { fontSize: 18, fontWeight: "700", maxWidth: width * 0.55 },
  rating: { color: "#666", marginTop: 4 },

  toggleRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 8 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth:1, borderColor:"#ddd" },
  toggleBtnActive: { backgroundColor: "#5089A3" },
  toggleTxt: { color: "#333", fontWeight: "600" },
  toggleTxtActive: { color: "#fff" },

  kpiRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 },
  kpi: { backgroundColor: "#F6FAFC", padding: 12, borderRadius: 12, minWidth: (width-60)/3, alignItems: "center" },
  kpiLabel: { color: "#555", fontSize: 12 },
  kpiValue: { fontSize: 16, fontWeight: "700", marginTop: 4 },

  sectionTitle: { fontWeight: "700", fontSize: 16, marginHorizontal: 20, marginTop: 16, marginBottom: 8 },

  barsWrap: { flexDirection: "row", alignItems: "flex-end", height: 150, paddingHorizontal: 10, marginHorizontal: 10 },
  barCol: { alignItems: "center", justifyContent: "flex-end", flex: 1 },
  bar: { width: 12, backgroundColor: "#5089A3", borderRadius: 4 },
  barLabel: { fontSize: 10, color: "#666", marginTop: 4 },

  reportHeader: { marginTop: 12, marginHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleRowSmall: { flexDirection: "row", gap: 6 },
  toggleSm: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, borderWidth:1, borderColor:"#ddd" },
  toggleSmActive: { backgroundColor:"#5089A3" },
  toggleSmTxt: { fontSize: 12, color:"#333" },
  toggleSmTxtActive: { color:"#fff" },

  table: { marginTop: 8, marginHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: "#eee" },
  row: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee", flexDirection:"row", justifyContent:"space-between" },
  cellLeft: { color: "#333" },
  cellRight: { fontWeight: "700" },

  empty: { marginHorizontal: 20, color: "#888" },

  // android sheet
  backdrop: { flex:1, backgroundColor:"rgba(0,0,0,0.25)", justifyContent:"flex-end" },
  sheet: { backgroundColor:"#fff", paddingBottom: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetItem: { padding: 16 },
  sheetItemTxt: { fontSize: 16, color: "#222", textAlign:"center" },
});
