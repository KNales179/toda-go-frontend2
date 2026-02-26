// DHistory.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Dimensions, Image, FlatList,
  RefreshControl, TouchableOpacity, Alert, Modal, TextInput,
  LayoutAnimation, Platform, UIManager,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { API_BASE_URL } from "../../config";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";

const { width } = Dimensions.get("window");

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type RideItem = {
  _id: string;
  bookingId?: string;
  passengerId?: string;
  driverName?: string;

  pickupLat?: number | undefined;
  pickupLng?: number | undefined;
  destinationLat?: number | undefined;
  destinationLng?: number | undefined;

  pickupPlace?: string | null;
  destinationPlace?: string | null;

  pickupLabel?: string | undefined | null;
  destinationLabel?: string | undefined | null;

  fare: number;
  totalFare?: number;
  bookingType?: string;
  groupCount?: number;

  createdAt: string;
  paymentMethod?: string;
  notes?: string;
};

export default function DHistory() {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string>("");
  const [allItems, setAllItems] = useState<RideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // PDF download modal
  const [dlOpen, setDlOpen] = useState(false);
  const [dlMode, setDlMode] = useState<"all" | "month" | "year">("all");
  const [dlYear, setDlYear] = useState<number>(new Date().getFullYear());
  const [dlMonth, setDlMonth] = useState<number>(new Date().getMonth() + 1);

  // report modal stubs (unused)
  const [reportOpen, setReportOpen] = useState<{ id: string | null; bookingId?: string }>({ id: null });
  const [reportType, setReportType] = useState("");
  const [otherReport, setOtherReport] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  const reverseCache = React.useRef<Map<string, string>>(new Map());

  useEffect(() => {
    (async () => {
      const id = (await AsyncStorage.getItem("driverId")) || (await AsyncStorage.getItem("userId"));
      setDriverId(id || null);
      console.log("[DHistory] loaded driverId:", id);

      if (!id) return;

      // Try common driver endpoints (adjust if your backend uses a different route)
      const base = API_BASE_URL.replace(/\/$/, "");
      const candidates = [
        `${base}/drivers/${id}`,
        `${base}/api/drivers/${id}`,
        `${base}/driver/${id}`,
        `${base}/api/driver/${id}`,
      ];

      for (const url of candidates) {
        try {
          const res = await fetch(url, { headers: { "Cache-Control": "no-store" } });
          if (!res.ok) continue;
          const data = await res.json();

          // Accept several possible fields
          const name =
            data?.driverName ||
            data?.name ||
            [data?.driverFirstName, data?.driverMiddleName, data?.driverLastName]
              .filter(Boolean)
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();

          if (name) {
            setDriverName(String(name));
            console.log("[DHistory] loaded driverName:", name);
            break;
          }
        } catch (e) {
          // ignore, try next url
        }
      }
    })();
  }, []);

  

  const php = (n: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-PH", {
      year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    });

  const parseCoordsFromLabel = (s?: string | null) => {
    if (!s || typeof s !== "string") return null;
    const m = s.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

  const coordKey = (lat?: number, lng?: number) =>
    lat == null || lng == null ? null : `${lat.toFixed(6)},${lng.toFixed(6)}`;

  const geocodeCoord = async (lat?: number, lng?: number) => {
    const key = coordKey(lat, lng);
    if (!key) return null;

    const cached = reverseCache.current.get(key);
    if (cached) return cached;

    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat!, longitude: lng! });
      if (Array.isArray(res) && res.length > 0) {
        const a = res[0];
        const pieces = [
          a.name || undefined,
          a.street || undefined,
          a.subregion || a.city || a.region || undefined,
        ].filter(Boolean);
        const label = pieces.join(", ") || `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`;
        reverseCache.current.set(key, label);
        return label;
      }
    } catch {}

    const coordLabel = `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`;
    reverseCache.current.set(key, coordLabel);
    return coordLabel;
  };

  const normalize = (raw: any[]): RideItem[] =>
    (raw || []).map((r: any) => {
      const rawPickupLabel = r.pickupPlace || r.pickupLabel || r.pickupName || r.pickupAddress || null;
      const rawDestLabel = r.destinationPlace || r.destinationLabel || r.destinationName || r.destinationAddress || null;

      const parsedPickup = parseCoordsFromLabel(typeof rawPickupLabel === "string" ? rawPickupLabel : null);
      const parsedDest = parseCoordsFromLabel(typeof rawDestLabel === "string" ? rawDestLabel : null);

      const pickupLat = Number.isFinite(r.pickupLat) ? Number(r.pickupLat) : (parsedPickup ? parsedPickup.lat : undefined);
      const pickupLng = Number.isFinite(r.pickupLng) ? Number(r.pickupLng) : (parsedPickup ? parsedPickup.lng : undefined);
      const destinationLat = Number.isFinite(r.destinationLat) ? Number(r.destinationLat) : (parsedDest ? parsedDest.lat : undefined);
      const destinationLng = Number.isFinite(r.destinationLng) ? Number(r.destinationLng) : (parsedDest ? parsedDest.lng : undefined);

      const pickupLabel = parsedPickup ? undefined : (rawPickupLabel ?? undefined);
      const destinationLabel = parsedDest ? undefined : (rawDestLabel ?? undefined);

      return {
        _id: String(r._id),
        bookingId: r.bookingId,
        passengerId: r.passengerId,
        driverName: r.driverName,
        pickupLat,
        pickupLng,
        destinationLat,
        destinationLng,
        pickupPlace: r.pickupPlace ?? null,
        destinationPlace: r.destinationPlace ?? null,
        pickupLabel,
        destinationLabel,
        fare: Number(r.fare || 0),
        totalFare: r.totalFare != null ? Number(r.totalFare) : undefined,
        bookingType: r.bookingType,
        groupCount: r.groupCount != null ? Number(r.groupCount) : undefined,
        createdAt: r.createdAt || r.completedAt || new Date().toISOString(),
        paymentMethod: r.paymentMethod || "",
        notes: r.notes || "",
      } as RideItem;
    });

  const resolvePlaceNames = async (items: RideItem[]) => {
    const tasks: Array<() => Promise<{ id: string; pickupLabel?: string; destinationLabel?: string }>> = [];

    for (const it of items) {
      const needsPickup = (!it.pickupLabel || it.pickupLabel === "") && (it.pickupLat != null && it.pickupLng != null);
      const needsDest = (!it.destinationLabel || it.destinationLabel === "") && (it.destinationLat != null && it.destinationLng != null);
      if (!needsPickup && !needsDest) continue;

      tasks.push(async () => {
        const out: any = { id: it._id };
        if (needsPickup) out.pickupLabel = (await geocodeCoord(it.pickupLat, it.pickupLng)) || (it.pickupPlace || "Pickup location");
        if (needsDest) out.destinationLabel = (await geocodeCoord(it.destinationLat, it.destinationLng)) || (it.destinationPlace || "Destination");
        return out;
      });
    }

    if (tasks.length === 0) return;

    const CONCURRENCY = 5;
    const results: any[] = [];
    let idx = 0;

    const runner = async () => {
      while (idx < tasks.length) {
        const i = idx++;
        try { results.push(await tasks[i]()); } catch {}
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, runner));

    if (results.length === 0) return;

    setAllItems((prev) => {
      const byId = new Map(prev.map((p) => [p._id, { ...p }]));
      for (const r of results) {
        const entry = byId.get(r.id);
        if (!entry) continue;
        if (r.pickupLabel) entry.pickupLabel = r.pickupLabel;
        if (r.destinationLabel) entry.destinationLabel = r.destinationLabel;
      }
      return Array.from(byId.values()).map((e) => ({
        ...e,
        pickupLabel: e.pickupLabel ?? e.pickupPlace ?? "Pickup location",
        destinationLabel: e.destinationLabel ?? e.destinationPlace ?? "Destination",
      }));
    });
  };

  const fetchAll = useCallback(async () => {
    if (!driverId) { setLoading(false); setRefreshing(false); return; }
    try {
      setLoading(true);
      const base = API_BASE_URL.replace(/\/$/, "");
      const paths = [
        `/ridehistory?driverId=${encodeURIComponent(driverId)}`,
        `/api/ridehistory?driverId=${encodeURIComponent(driverId)}`,
        `/rides`,
        `/api/rides`,
      ];
      let got: RideItem[] | null = null;

      for (let i = 0; i < paths.length; i++) {
        const url = `${base}${paths[i]}`;
        const filterLocally = i >= 2;
        try {
          const res = await fetch(url, { headers: { "Cache-Control": "no-store" } });
          const text = await res.text();
          let data: any;
          try { data = JSON.parse(text); } catch { continue; }
          let raw: any[] = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
          if (filterLocally) raw = raw.filter((x: any) => String(x.driverId) === String(driverId));
          got = normalize(raw);
          break;
        } catch {}
      }

      if (!got) got = [];
      setAllItems(got);
      setVisible(Math.min(10, got.length));

      const itemsWithCoords = got.filter(it =>
        (it.pickupLat != null && it.pickupLng != null) ||
        (it.destinationLat != null && it.destinationLng != null)
      );

      if (itemsWithCoords.length > 0) {
        resolvePlaceNames(itemsWithCoords).catch(() => {});
      } else {
        setAllItems((prev) => prev.map(p => ({
          ...p,
          pickupLabel: p.pickupLabel ?? p.pickupPlace ?? "Pickup location",
          destinationLabel: p.destinationLabel ?? p.destinationPlace ?? "Destination",
        })));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
  };

  const formatDateRangeLabel = (mode: "all" | "month" | "year", year?: number, month?: number) => {
    if (mode === "all") return "All Time";
    if (mode === "year") return `Year ${year}`;
    const d = new Date(year!, (month ?? 1) - 1, 1);
    const m = d.toLocaleDateString("en-PH", { month: "long" });
    return `${m} ${year}`;
  };

  const filterByRange = (items: RideItem[], mode: "all" | "month" | "year", year?: number, month?: number) => {
    if (mode === "all") return items;
    return items.filter((it) => {
      const d = new Date(it.createdAt);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (mode === "year") return y === year;
      if (mode === "month") return y === year && m === month;
      return true;
    });
  };

  const computeTotals = (items: RideItem[]) => {
    let trips = items.length;
    let soloTrips = 0;
    let groupTrips = 0;
    let paxTotal = 0;
    let gross = 0;

    for (const it of items) {
      const perFare = it.fare ?? 0;
      const pax = it.groupCount ?? 1;
      const isGroup = String(it.bookingType || "").toLowerCase() === "group";

      if (isGroup) groupTrips++;
      else soloTrips++;

      paxTotal += isGroup ? pax : 1;

      const total = it.totalFare != null ? it.totalFare : (isGroup ? perFare * pax : perFare);
      gross += Number(total || 0);
    }

    return { trips, soloTrips, groupTrips, paxTotal, gross };
  };

  const esc = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const buildReportHTML = (items: RideItem[], rangeLabel: string, driverIdStr: string) => {
    const now = new Date();
    const printedAt = now.toLocaleString("en-PH", {
      year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    });

    const totals = computeTotals(items);
    const sorted = [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    const rows = sorted
      .map((it, idx) => {
        const pickup = it.pickupLabel || it.pickupPlace || "Pickup location";
        const dest = it.destinationLabel || it.destinationPlace || "Destination";

        const perFare = it.fare ?? 0;
        const pax = it.groupCount ?? 1;
        const isGroup = String(it.bookingType || "").toLowerCase() === "group";
        const total = it.totalFare != null ? it.totalFare : isGroup ? perFare * pax : perFare;

        return `
          <tr>
            <td class="c">${idx + 1}</td>
            <td>${esc(formatDateShort(it.createdAt))}</td>
            <td>${esc(String(it.bookingType || "—").toUpperCase())}</td>
            <td>${esc(pickup)}</td>
            <td>${esc(dest)}</td>
            <td class="c">${isGroup ? pax : 1}</td>
            <td class="r">${esc(php(Number(perFare || 0)))}</td>
            <td class="r">${esc(php(Number(total || 0)))}</td>
          </tr>
        `;
      })
      .join("");

    return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; color: #111; font-size: 12px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px; }
        .title { font-size: 18px; font-weight: 700; margin:0; }
        .sub { margin: 2px 0; color:#444; }
        .pill { display:inline-block; border:1px solid #ddd; padding:6px 10px; border-radius: 999px; font-size: 12px; }
        .summary { margin: 10px 0 14px; border:1px solid #eee; border-radius: 10px; padding: 10px; }
        .summaryGrid { display:flex; gap: 14px; flex-wrap:wrap; }
        .box { border:1px solid #eee; border-radius: 10px; padding: 10px; min-width: 160px; }
        .k { color:#666; font-size: 11px; }
        .v { font-weight: 700; font-size: 14px; margin-top: 2px; }
        table { width:100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #eee; padding: 8px; vertical-align: top; }
        th { text-align:left; font-size: 11px; color:#444; }
        .c { text-align:center; }
        .r { text-align:right; white-space:nowrap; }
        .foot { margin-top: 12px; color:#666; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <p class="title">Driver Ride Report</p>
          <p class="sub">Driver ID: ${esc(driverIdStr)}</p>
          <p class="sub">Coverage: <span class="pill">${esc(rangeLabel)}</span></p>
        </div>
        <div style="text-align:right">
          <p class="sub">Generated: ${esc(printedAt)}</p>
          <p class="sub">Toda-GO</p>
        </div>
      </div>

      <div class="summary">
        <div class="summaryGrid">
          <div class="box"><div class="k">Trips</div><div class="v">${totals.trips}</div></div>
          <div class="box"><div class="k">Solo Trips</div><div class="v">${totals.soloTrips}</div></div>
          <div class="box"><div class="k">Group Trips</div><div class="v">${totals.groupTrips}</div></div>
          <div class="box"><div class="k">Total Passengers</div><div class="v">${totals.paxTotal}</div></div>
          <div class="box"><div class="k">Gross Earnings</div><div class="v">${esc(php(totals.gross))}</div></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="c">#</th>
            <th>Date</th>
            <th>Type</th>
            <th>Pickup</th>
            <th>Destination</th>
            <th class="c">Pax</th>
            <th class="r">Fare</th>
            <th class="r">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="8" class="c">No records in this range.</td></tr>`}
        </tbody>
      </table>

      <div class="foot">
        Group totals are fare × pax unless totalFare is provided by server.
      </div>
    </body>
    </html>
    `;
  };

  // ✅ Save pdf to Downloads/Documents via SAF (user picks folder)
  const savePdfToFolder = async (pdfUri: string, suggestedName: string) => {
    if (Platform.OS !== "android") {
      Alert.alert("Not supported", "Saving directly to Downloads/Documents is Android-only for this setup.");
      return;
    }

    try {
      const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Cancelled", "Folder access was not granted.");
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        suggestedName,
        "application/pdf"
      );

      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert("Saved ✅", `Saved to selected folder as:\n${suggestedName}`);
    } catch (e) {
      console.warn("[DHistory] savePdfToFolder failed:", e);
      Alert.alert("Save failed", "Could not save the PDF to the selected folder.");
    }
  };

  const downloadHistoryPDF = async (mode: "all" | "month" | "year", year?: number, month?: number) => {
    try {
      if (!driverId) return Alert.alert("Missing driver ID", "Please login again.");
      if (allItems.length === 0) return Alert.alert("No history", "No ride history to export yet.");

      const filtered = filterByRange(allItems, mode, year, month);
      const rangeLabel = formatDateRangeLabel(mode, year, month);
      const html = buildReportHTML(filtered, rangeLabel, String(driverId));

      const { uri } = await Print.printToFileAsync({ html });

      const clean = (s: string) =>
        String(s || "")
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_\-]/g, ""); // remove weird chars (slashes, emojis, etc)

      const who = clean(driverName) || clean(String(driverId)) || "Driver";

      const fileName =
        mode === "all"
          ? `TodaGO_DriverReport_${who}_ALL.pdf`
          : mode === "year"
            ? `TodaGO_DriverReport_${who}_${year}.pdf`
            : `TodaGO_DriverReport_${who}_${year}-${pad2(month!)}.pdf`;


      await savePdfToFolder(uri, fileName);
    } catch (e) {
      console.warn("[DHistory] PDF export failed:", e);
      Alert.alert("Export failed", "Could not generate the PDF.");
    }
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const askDelete = (id: string) => {
    Alert.alert("Delete ride", "Are you sure you want to delete this history item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const prev = allItems;
          setAllItems((list) => list.filter((x) => x._id !== id));
          try {
            const base = API_BASE_URL.replace(/\/$/, "");
            const candidates = [`${base}/ridehistory/${id}`, `${base}/api/ridehistory/${id}`];
            let success = false;
            for (const url of candidates) {
              try {
                const res = await fetch(url, { method: "DELETE" });
                if (res.ok) { success = true; break; }
              } catch {}
            }
            if (!success) {
              setAllItems(prev);
              Alert.alert("Delete failed", "Could not delete from the server.");
              await fetchAll();
            }
          } catch {
            setAllItems(prev);
            Alert.alert("Delete failed", "Unexpected error.");
            await fetchAll();
          }
        },
      },
    ]);
  };

  const dataToShow = allItems.slice(0, visible);
  const hasMore = visible < allItems.length;

  if (!loading && allItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
          <Text style={styles.heading}>HISTORY</Text>
          <TouchableOpacity onPress={() => setDlOpen(true)} style={{ padding: 8, borderWidth: 1, borderColor: "#ddd", borderRadius: 999 }}>
            <Ionicons name="download-outline" size={20} color="#111" />
          </TouchableOpacity>
        </View>

        <View style={styles.emptyWrap}>
          <Image source={require("../../assets/images/tricycle.png")} style={styles.emptyImage} />
          <Text style={styles.emptyMsg}>No history yet — drive some trips to see them here.</Text>
          <TouchableOpacity style={styles.viewMoreBtn} onPress={onRefresh}>
            <Text style={styles.viewMoreText}>Reload</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={dlOpen} transparent animationType="fade" onRequestClose={() => setDlOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>Download Ride Report (PDF)</Text>

              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {(["all", "month", "year"] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setDlMode(m)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: dlMode === m ? "#111" : "#ddd",
                      backgroundColor: dlMode === m ? "#f3f3f3" : "#fff",
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>
                      {m === "all" ? "All" : m === "month" ? "Monthly" : "Yearly"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {dlMode !== "all" && (
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Year</Text>
                    <TextInput
                      value={String(dlYear)}
                      onChangeText={(t) => {
                        const y = Number(t.replace(/[^\d]/g, ""));
                        if (Number.isFinite(y) && y >= 2000 && y <= 2100) setDlYear(y);
                      }}
                      keyboardType="numeric"
                      style={[styles.feedbackInput, { minHeight: 44 }]}
                    />
                  </View>

                  {dlMode === "month" && (
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Month (1-12)</Text>
                      <TextInput
                        value={String(dlMonth)}
                        onChangeText={(t) => {
                          let m = Number(t.replace(/[^\d]/g, ""));
                          if (!Number.isFinite(m)) return;
                          if (m < 1) m = 1;
                          if (m > 12) m = 12;
                          setDlMonth(m);
                        }}
                        keyboardType="numeric"
                        style={[styles.feedbackInput, { minHeight: 44 }]}
                      />
                    </View>
                  )}
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
                <TouchableOpacity onPress={() => setDlOpen(false)} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
                  <Text style={{ fontWeight: "700", color: "#666" }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    setDlOpen(false);
                    if (dlMode === "all") return downloadHistoryPDF("all");
                    if (dlMode === "year") return downloadHistoryPDF("year", dlYear);
                    return downloadHistoryPDF("month", dlYear, dlMonth);
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#111", backgroundColor: "#111" }}
                >
                  <Text style={{ fontWeight: "700", color: "#fff" }}>Save PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
        <Text style={styles.heading}>HISTORY</Text>
        <TouchableOpacity onPress={() => setDlOpen(true)} style={{ padding: 8, borderWidth: 1, borderColor: "#ddd", borderRadius: 999 }}>
          <Ionicons name="download-outline" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dataToShow}
        keyExtractor={(it) => it._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <HistoryCard
            item={item}
            php={php}
            when={when}
            expanded={expandedId === item._id}
            onToggle={() => toggleExpand(item._id)}
            onDelete={() => askDelete(item._id)}
          />
        )}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={styles.viewMoreBtn} onPress={() => setVisible(v => Math.min(v + 10, allItems.length))}>
              <Text style={styles.viewMoreText}>View more</Text>
            </TouchableOpacity>
          ) : allItems.length > 0 ? (
            <Text style={styles.noMoreText}>End of history</Text>
          ) : null
        }
      />

      <Modal visible={dlOpen} transparent animationType="fade" onRequestClose={() => setDlOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>Download Ride Report (PDF)</Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {(["all", "month", "year"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setDlMode(m)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: dlMode === m ? "#111" : "#ddd",
                    backgroundColor: dlMode === m ? "#f3f3f3" : "#fff",
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>
                    {m === "all" ? "All" : m === "month" ? "Monthly" : "Yearly"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {dlMode !== "all" && (
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Year</Text>
                  <TextInput
                    value={String(dlYear)}
                    onChangeText={(t) => {
                      const y = Number(t.replace(/[^\d]/g, ""));
                      if (Number.isFinite(y) && y >= 2000 && y <= 2100) setDlYear(y);
                    }}
                    keyboardType="numeric"
                    style={[styles.feedbackInput, { minHeight: 44 }]}
                  />
                </View>

                {dlMode === "month" && (
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Month (1-12)</Text>
                    <TextInput
                      value={String(dlMonth)}
                      onChangeText={(t) => {
                        let m = Number(t.replace(/[^\d]/g, ""));
                        if (!Number.isFinite(m)) return;
                        if (m < 1) m = 1;
                        if (m > 12) m = 12;
                        setDlMonth(m);
                      }}
                      keyboardType="numeric"
                      style={[styles.feedbackInput, { minHeight: 44 }]}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
              <TouchableOpacity onPress={() => setDlOpen(false)} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
                <Text style={{ fontWeight: "700", color: "#666" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setDlOpen(false);
                  if (dlMode === "all") return downloadHistoryPDF("all");
                  if (dlMode === "year") return downloadHistoryPDF("year", dlYear);
                  return downloadHistoryPDF("month", dlYear, dlMonth);
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#111", backgroundColor: "#111" }}
              >
                <Text style={{ fontWeight: "700", color: "#fff" }}>Save PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HistoryCard({
  item, php, when, expanded, onToggle, onDelete,
}: {
  item: RideItem;
  php: (n: number) => string;
  when: (iso: string) => string;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const pickup = item.pickupLabel || item.pickupPlace || "Pickup location";
  const dest = item.destinationLabel || item.destinationPlace || "Destination";

  const perFare = item.fare ?? 0;
  const pax = item.groupCount ?? 1;
  const total = item.totalFare != null ? item.totalFare : (String(item.bookingType).toLowerCase() === "group" ? perFare * pax : perFare);

  return (
    <TouchableOpacity activeOpacity={0.95} style={styles.card} onPress={onToggle}>
      <View style={styles.row}>
        <Image source={require("../../assets/images/tricycle.png")} style={styles.thumb} />
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color="#444" style={{ marginTop: 1 }} />
              <Text style={styles.mainText} numberOfLines={1}>{pickup}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 6 }]}>
            <MaterialIcons name="route" size={16} color="#444" />
            <Text style={styles.subText} numberOfLines={1}>{dest}</Text>
          </View>

          <View style={[styles.row, { marginTop: 6, justifyContent: "space-between" }]}>
            <Text style={styles.timeText}>{when(item.createdAt)}</Text>
          </View>
        </View>

        <View>
          {!!item.bookingType && (
            <View style={[styles.typeChip, typeChipStyle(item.bookingType)]}>
              <Text style={styles.typeChipText}>{String(item.bookingType).replace(/CLASSIC/i,'Classic').replace(/GROUP/i,'Group').replace(/SOLO/i,'Solo')}</Text>
            </View>
          )}
          {String(item.bookingType).toLowerCase() === "group" && typeof item.groupCount === "number" ? (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 12 }}>{php(perFare)}</Text>
              <View style={styles.row}>
                <Text style={{ marginLeft: 6, fontSize: 12 }}>x {item.groupCount} </Text>
                <Ionicons name="people-outline" size={14} color="#333" />
              </View>
              <Text style={styles.priceText}>{php(total)}</Text>
            </View>
          ) : (
            <Text style={styles.priceText}>{php(total)}</Text>
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.expandBox}>
          <Text style={styles.expandTitle}>Passenger: <Text style={{ fontWeight: "600" }}>{item.passengerId || "—"}</Text></Text>
          {!!item.notes && <Text style={styles.expandNote} numberOfLines={4}>Note: {item.notes}</Text>}

          <View style={styles.expandFooter}>
            <View style={{ flex: 1 }}>
              {!!item.bookingId && <Text style={styles.meta}>Booking: {item.bookingId}</Text>}
              {!!item.paymentMethod && <Text style={styles.meta}>Payment: {item.paymentMethod}</Text>}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={onDelete} style={styles.trashBtn}>
                <Ionicons name="trash-bin-outline" size={22} color="#b00000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function typeChipStyle(t?: string) {
  switch (String(t || "").toLowerCase()) {
    case "solo": return { borderColor: "#c9e7ff", backgroundColor: "#f2f9ff" };
    case "group": return { borderColor: "#ffe2b6", backgroundColor: "#fff7e9" };
    default: return { borderColor: "#e0e0e0", backgroundColor: "#f7f7f7" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topBar: { paddingTop: 40, paddingHorizontal: 20, paddingBottom: 12 },
  heading: { fontWeight: "bold", fontSize: 22 },
  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginTop: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 2, borderWidth: 0.5, borderColor: "#eee",
  },
  row: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 48, height: 48, marginRight: 12, resizeMode: "contain" },
  mainText: { marginLeft: 6, fontSize: 14, fontWeight: "600", color: "#111", flexShrink: 1 },
  subText: { marginLeft: 6, fontSize: 13, color: "#333", flexShrink: 1 },
  timeText: { fontSize: 12, color: "#666" },
  priceText: { fontSize: 14, fontWeight: "700", color: "#111" },
  typeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  typeChipText: { fontSize: 11, fontWeight: "700" },

  expandBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#eee" },
  expandTitle: { fontSize: 14, marginBottom: 6 },
  expandNote: { fontSize: 13, color: "#333", marginBottom: 8 },
  expandFooter: { flexDirection: "row", alignItems: "center", gap: 10 },
  meta: { fontSize: 12, color: "#666" },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  trashBtn: { borderWidth: 1, borderColor: "#f1b0b0", backgroundColor: "#fff5f5", padding: 8, borderRadius: 12 },

  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  emptyImage: { width: 150, height: 150, marginBottom: 20, resizeMode: "contain" },
  emptyMsg: { textAlign: "center", fontSize: 14, color: "#333", marginBottom: 8 },

  viewMoreBtn: { marginTop: 12, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "#ddd" },
  viewMoreText: { fontWeight: "600", color: "#111" },
  noMoreText: { textAlign: "center", color: "#666", marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  feedbackInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, textAlignVertical: "top" },
});
