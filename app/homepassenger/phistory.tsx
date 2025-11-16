// PHistory.tsx (FULL updated)
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

const { width } = Dimensions.get("window");

const REPORT_OPTIONS = [
  "Overcharging",
  "Harassment",
  "Unproper Attire",
  "Refusal to Convey Passenger",
  "Other",
];
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type RideItem = {
  _id: string;
  bookingId?: string;
  passengerId?: string;
  driverName?: string;
  driverId?: string;

  // coordinate fields (may be undefined)
  pickupLat?: number | undefined;
  pickupLng?: number | undefined;
  destinationLat?: number | undefined;
  destinationLng?: number | undefined;

  // original place fields from backend (may be null)
  pickupPlace?: string | null;
  destinationPlace?: string | null;

  // unprocessed labels (can be either coords string or human label)
  pickupLabel?: string | undefined | null;
  destinationLabel?: string | undefined | null;

  // computed UI fields
  fare: number;
  totalFare?: number;
  bookingType?: string;
  groupCount?: number;
  createdAt: string;
  paymentMethod?: string;
  notes?: string;
};

export default function PHistory() {
  const [passengerId, setPassengerId] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<RideItem[]>([]);
  const [visible, setVisible] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // report modal state
  const [reportOpen, setReportOpen] = useState<{ id: string | null; bookingId?: string; driverId?: string }>({ id: null });
  const [reportType, setReportType] = useState("");
  const [otherReport, setOtherReport] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  // reverse geocode cache (coordKey -> label)
  const reverseCache = React.useRef<Map<string, string>>(new Map());

  useEffect(() => {
    (async () => {
      const pid = (await AsyncStorage.getItem("passengerId")) || (await AsyncStorage.getItem("userId"));
      setPassengerId(pid || null);
    })();
  }, []);

  const php = (n: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-PH", {
      year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    });

  // --- Helpers ---

  // parse "lat, lng" from a string label if it looks like coordinates
  const parseCoordsFromLabel = (s?: string | null) => {
    if (!s || typeof s !== "string") return null;
    // trim and allow variations: "13.92741, 121.62298" or "13.92741,121.62298"
    const m = s.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

  const coordKey = (lat?: number, lng?: number) =>
    lat == null || lng == null ? null : `${lat.toFixed(6)},${lng.toFixed(6)}`;

  // reverse geocode a lat/lng to a readable label (expo-location reverseGeocodeAsync)
  const geocodeCoord = async (lat?: number, lng?: number) => {
    const key = coordKey(lat, lng);
    if (!key) return null;

    const cached = reverseCache.current.get(key);
    if (cached) {
      return cached;
    }

    try {
      // Note: reverseGeocodeAsync doesn't require your app's server, it uses device/location services.
      // On some devices/OS it might need location permissions; we attempt it and gracefully fallback.
      const res = await Location.reverseGeocodeAsync({ latitude: lat!, longitude: lng! });
      if (Array.isArray(res) && res.length > 0) {
        const a = res[0];
        // Compose a useful label: prefer name/poi, then street + city/subregion
        const pieces = [
          a.name || undefined,
          a.street || undefined,
          a.subregion || a.city || a.region || undefined,
        ].filter(Boolean);
        const label = pieces.join(", ") || `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`;
        reverseCache.current.set(key, label);;
        return label;
      } else {
      }
    } catch (e) {
    }

    // fallback to the coordinate string
    const coordLabel = `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`;
    reverseCache.current.set(key, coordLabel);
    return coordLabel;
  };

  // convert an array of raw records into RideItem shape, and *extract coords from labels if present*
  const normalize = (raw: any[]): RideItem[] =>
    (raw || []).map((r: any) => {
      // initial raw labels from backend (could be coordinates string)
      const rawPickupLabel = r.pickupPlace || r.pickupLabel || r.pickupName || r.pickupAddress || null;
      const rawDestLabel = r.destinationPlace || r.destinationLabel || r.destinationName || r.destinationAddress || null;

      // parse coords if present inside labels
      const parsedPickup = parseCoordsFromLabel(typeof rawPickupLabel === "string" ? rawPickupLabel : null);
      const parsedDest = parseCoordsFromLabel(typeof rawDestLabel === "string" ? rawDestLabel : null);

      const pickupLat = Number.isFinite(r.pickupLat) ? Number(r.pickupLat) : (parsedPickup ? parsedPickup.lat : undefined);
      const pickupLng = Number.isFinite(r.pickupLng) ? Number(r.pickupLng) : (parsedPickup ? parsedPickup.lng : undefined);
      const destinationLat = Number.isFinite(r.destinationLat) ? Number(r.destinationLat) : (parsedDest ? parsedDest.lat : undefined);
      const destinationLng = Number.isFinite(r.destinationLng) ? Number(r.destinationLng) : (parsedDest ? parsedDest.lng : undefined);

      // If label was just coordinates, we null out pickupLabel/destinationLabel so resolver will produce a human label.
      // If the label is not coordinates (a real string), keep it.
      const pickupLabel = parsedPickup ? undefined : (rawPickupLabel ?? undefined);
      const destinationLabel = parsedDest ? undefined : (rawDestLabel ?? undefined);

      return {
        _id: String(r._id),
        bookingId: r.bookingId,
        passengerId: r.passengerId,
        driverName: r.driverName,
        driverId: r.driverId,  
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

  // Resolve labels (reverse geocode) for any item that has coordinates (either native fields or parsed from label)
  const resolvePlaceNames = async (items: RideItem[]) => {
    const tasks: Array<() => Promise<{ id: string; pickupLabel?: string; destinationLabel?: string }>> = [];

    for (const it of items) {
      const needsPickup = (!it.pickupLabel || it.pickupLabel === "") && (it.pickupLat != null && it.pickupLng != null);
      const needsDest = (!it.destinationLabel || it.destinationLabel === "") && (it.destinationLat != null && it.destinationLng != null);
      if (!needsPickup && !needsDest) continue;

      tasks.push(async () => {
        const out: any = { id: it._id };
        if (needsPickup) {
          try {
            const lbl = await geocodeCoord(it.pickupLat, it.pickupLng);
            out.pickupLabel = lbl || (it.pickupPlace || "Pickup location");
          } catch (e) {
            console.warn("[PHistory][resolvePlaceNames] pickup geocode failed", it._id, e);
            out.pickupLabel = it.pickupPlace || "Pickup location";
          }
        }
        if (needsDest) {
          try {
            const lbl = await geocodeCoord(it.destinationLat, it.destinationLng);
            out.destinationLabel = lbl || (it.destinationPlace || "Destination");
          } catch (e) {
            console.warn("[PHistory][resolvePlaceNames] dest geocode failed", it._id, e);
            out.destinationLabel = it.destinationPlace || "Destination";
          }
        }
        return out;
      });
    }
    if (tasks.length === 0) return;

    // concurrency limiter
    const CONCURRENCY = 5;
    const results: any[] = [];
    let idx = 0;

    const runner = async () => {
      while (idx < tasks.length) {
        const i = idx++;
        try {
          const r = await tasks[i]();
          results.push(r);
        } catch (e) {
        }
      }
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(runner());
    await Promise.all(workers);

    if (results.length === 0) return;

    // merge results into state
    setAllItems((prev) => {
      const byId = new Map(prev.map((p) => [p._id, { ...p }]));
      for (const r of results) {
        const entry = byId.get(r.id);
        if (!entry) continue;
        if (r.pickupLabel) entry.pickupLabel = r.pickupLabel;
        if (r.destinationLabel) entry.destinationLabel = r.destinationLabel;
      }
      // ensure defaults if still undefined
      return Array.from(byId.values()).map((e) => ({
        ...e,
        pickupLabel: e.pickupLabel ?? e.pickupPlace ?? "Pickup location",
        destinationLabel: e.destinationLabel ?? e.destinationPlace ?? "Destination",
      }));
    });
  };

  // fetch list from backend, normalize, and force geocode any coords (including coords embedded in labels)
  const fetchAll = useCallback(async () => {
    setErrorMsg(null);
    if (!passengerId) {
      setLoading(false);
      setRefreshing(false);
      console.log("[PHistory][fetchAll] no passengerId, abort");
      return;
    }
    try {
      const base = API_BASE_URL.replace(/\/$/, "");
      const paths = [
        `/ridehistory?passengerId=${encodeURIComponent(passengerId)}`,
        `/api/ridehistory?passengerId=${encodeURIComponent(passengerId)}`,
        `/rides`,
        `/api/rides`,
      ];
      let got: RideItem[] | null = null;

      for (let i = 0; i < paths.length; i++) {
        const url = `${base}${paths[i]}`;
        const filterLocally = i >= 2;
        try {
          console.log("[PHistory][fetchAll] trying", url);
          const res = await fetch(url, { headers: { "Cache-Control": "no-store" } });
          const text = await res.text();
          let data: any;
          try {
            data = JSON.parse(text);
          } catch {
            console.warn("[PHistory][fetchAll] response not JSON from", url, "raw:", text.slice(0, 200));
            continue;
          }

          let raw: any[] = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
          if (filterLocally) {
            raw = raw.filter((x: any) => String(x.passengerId) === String(passengerId));
          }

          // 🔍 LOG raw from backend (first 3 only)
          console.log(
            "[PHistory][fetchAll] RAW history sample from",
            url,
            JSON.stringify(raw.slice(0, 3), null, 2)
          );

          got = normalize(raw);

          // 🔍 LOG normalized items (first 3 only)
          console.log(
            "[PHistory][fetchAll] NORMALIZED sample",
            JSON.stringify(got.slice(0, 3), null, 2)
          );

          break;
        } catch (e) {
          console.warn("[PHistory][fetchAll] fetch attempt failed for", paths[i], e);
        }
      }
      if (!got) got = [];

      setAllItems(got);
      setVisible(Math.min(10, got.length));

      const itemsWithCoords = got.filter(
        (it) =>
          (it.pickupLat != null && it.pickupLng != null) ||
          (it.destinationLat != null && it.destinationLng != null)
      );

      if (itemsWithCoords.length > 0) {
        resolvePlaceNames(itemsWithCoords).catch((e) =>
          console.warn("[PHistory][fetchAll] resolvePlaceNames failed", e)
        );
      } else {
        setAllItems((prev) =>
          prev.map((p) => ({
            ...p,
            pickupLabel: p.pickupLabel ?? p.pickupPlace ?? "Pickup location",
            destinationLabel: p.destinationLabel ?? p.destinationPlace ?? "Destination",
          }))
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [passengerId]);


  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const dataToShow = allItems.slice(0, visible);
  const hasMoreLocal = visible < allItems.length;

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
                const text = await res.text();
                if (res.ok) { success = true; break; }
              } catch (e) {
              }
            }

            if (!success) {
              setAllItems(prev);
              Alert.alert("Delete failed", "Could not delete from the server.");
              await fetchAll();
            }
          } catch (e) {
            setAllItems(prev);
            Alert.alert("Delete failed", "Unexpected error.");
            await fetchAll();
          }
        },
      },
    ]);
  };

  const openReport = (item: RideItem) => {
    console.log("[PHistory][openReport] item selected:", {
      _id: item._id,
      bookingId: item.bookingId,
      driverId: (item as any).driverId,
      driverName: item.driverName,
    });

    setReportType("");
    setOtherReport("");
    setShowDropdown(false);
    setReportOpen({
      id: item._id,
      bookingId: item.bookingId,
      driverId: (item as any).driverId || undefined,
    });
  };


  const submitReport = async () => {
    if (!reportOpen.id || !passengerId) return;
    if (!reportType) return Alert.alert("Report", "Please select a violation.");
    if (reportType === "Other" && !otherReport.trim())
      return Alert.alert("Report", "Please describe the issue.");

    const payload = {
      bookingId: reportOpen.bookingId,
      passengerId,
      driverId: reportOpen.driverId,
      reportType,
      otherReport,
    };

    console.log("[PHistory][submitReport] payload:", payload);

    try {
      setSendingReport(true);
      const res = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/feedback/submit-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to submit report.");
      Alert.alert("Success", "Report submitted!");
      setReportOpen({ id: null });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Something went wrong.");
    } finally {
      setSendingReport(false);
    }
  };


  if (!loading && allItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}><Text style={styles.heading}>HISTORYY</Text></View>
        <View style={styles.emptyWrap}>
          <Image source={require("../../assets/images/tricycle.png")} style={styles.emptyImage} />
          <Text style={styles.emptyMsg}>{errorMsg || "Mag Book na para mag ka history ka."}</Text>
          <TouchableOpacity style={styles.viewMoreBtn} onPress={onRefresh}>
            <Text style={styles.viewMoreText}>Reload</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}><Text style={styles.heading}>HISTORY</Text></View>

      {loading && allItems.length === 0 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
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
              onReport={() => openReport(item)}
            />
          )}
          ListFooterComponent={
            hasMoreLocal ? (
              <TouchableOpacity
                style={styles.viewMoreBtn}
                onPress={() => setVisible((v) => Math.min(v + 10, allItems.length))}
              >
                <Text style={styles.viewMoreText}>View more</Text>
              </TouchableOpacity>
            ) : allItems.length > 0 ? (
              <Text style={styles.noMoreText}>End of history</Text>
            ) : null
          }
        />
      )}

      {/* Report modal */}
      <Modal visible={!!reportOpen.id} transparent animationType="fade" onRequestClose={() => setReportOpen({ id: null })}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: "stretch" }]}>
            <TouchableOpacity style={styles.dismissButton} onPress={() => setReportOpen({ id: null })}>
              <Ionicons name="close" size={24} color="gray" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Report Driver</Text>

            <Text style={styles.modalLabel}>Select Report Type:</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowDropdown(!showDropdown)}>
                <Text style={{ color: reportType ? "#000" : "#999" }}>{reportType || "Select a violation"}</Text>
                <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#999" />
              </TouchableOpacity>

              {showDropdown && (
                <View style={styles.dropdownMenu}>
                  {REPORT_OPTIONS.map((opt) => (
                    <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setReportType(opt); setShowDropdown(false); }}>
                      <Text style={{ color: "#000" }}>{opt}</Text>
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
                multiline numberOfLines={3}
                value={otherReport} onChangeText={setOtherReport}
              />
            )}

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: "#4CAF50", opacity: sendingReport ? 0.6 : 1 }]}
              onPress={submitReport}
              disabled={sendingReport}
            >
              <Text style={styles.submitButtonText}>{sendingReport ? "Submitting..." : "Submit Report"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HistoryCard({
  item, php, when, expanded, onToggle, onDelete, onReport,
}: {
  item: RideItem;
  php: (n: number) => string;
  when: (iso: string) => string;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  const pickup = item.pickupLabel || item.pickupPlace || "Pickup location";
  const dest = item.destinationLabel || item.destinationPlace || "Destination";
  const price = item.totalFare != null ? item.totalFare : item.fare;
  const fare = item.fare;

  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={onToggle}>
      <View style={styles.row}>
        <Image source={require("../../assets/images/tricycle.png")} style={styles.thumb} />
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color="#444" style={{ marginTop: 1 }} />
              <Text style={styles.mainText} numberOfLines={1}>{pickup}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 2 }]}>
            <MaterialIcons name="route" size={16} color="#444" />
            <Text style={styles.subText} numberOfLines={1}>{dest}</Text>
          </View>

          <View style={[styles.row, { marginTop: 4, justifyContent: "space-between" }]}>
            <Text style={styles.timeText}>{when(item.createdAt)}</Text>
          </View>
        </View>
        <View>
          {!!item.bookingType && (
            <View style={[styles.typeChip, typeChipStyle(item.bookingType)]}>
              <Text style={styles.typeChipText}>
                {String(item.bookingType).replace(/CLASSIC/i,'Classic').replace(/GROUP/i,'Group').replace(/SOLO/i,'Solo')}
              </Text>
            </View>
          )}

          {String(item.bookingType).toLowerCase() === "group" && typeof item.groupCount === "number" ? (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 12 }}>{php(fare)}</Text>
              <View style={styles.row}>
                <Text style={{ marginLeft: 4, fontSize: 12, color: "#333" }}>x {item.groupCount} </Text>
                <Ionicons name="people-outline" size={14} color="#333" />
              </View>
              <Text style={styles.priceText}>{php(price)}</Text>
            </View>
          ) : (
            <Text style={styles.priceText}>{php(price)}</Text>
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.expandBox}>
          <Text style={styles.expandTitle}>Driver: <Text style={{ fontWeight: "600" }}>{item.driverName || "—"}</Text></Text>
          {!!item.notes && <Text style={styles.expandNote} numberOfLines={4}>Note: {item.notes}</Text>}

          <View style={styles.expandFooter}>
            <View style={{ flex: 1 }}>
              {!!item.bookingId && <Text style={styles.meta}>Booking: {item.bookingId}</Text>}
              {!!item.paymentMethod && <Text style={styles.meta}>Payment: {item.paymentMethod}</Text>}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={onReport} style={styles.warnBtn}>
                <MaterialIcons name="warning-amber" size={22} color="#b00000" />
              </TouchableOpacity>
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

function SkeletonCard() {
  return (
    <View style={[styles.card, { overflow: "hidden" }]}>
      <View style={styles.row}>
        <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: "#eee" }} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ height: 12, backgroundColor: "#eee", borderRadius: 6, width: "70%" }} />
          <View style={{ height: 10, backgroundColor: "#eee", borderRadius: 5, width: "60%", marginTop: 8 }} />
          <View style={{ height: 10, backgroundColor: "#eee", borderRadius: 5, width: "40%", marginTop: 8 }} />
        </View>
        <View style={{ width: 60, height: 14, backgroundColor: "#eee", borderRadius: 7 }} />
      </View>
    </View>
  );
}

function typeChipStyle(t?: string) {
  switch (String(t || "").toLowerCase()) {
    case "solo":   return { borderColor: "#c9e7ff", backgroundColor: "#f2f9ff" };
    case "group":  return { borderColor: "#ffe2b6", backgroundColor: "#fff7e9" };
    case "classic":
    default:       return { borderColor: "#e0e0e0", backgroundColor: "#f7f7f7" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topBar: { paddingTop: 40, paddingHorizontal: 20, paddingBottom: 12 },
  heading: { fontWeight: "bold", fontSize: 22 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  typeChipText: { fontSize: 11, fontWeight: "700" },
  groupChip: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ddd", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },

  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  emptyImage: { width: 150, height: 150, marginBottom: 20, resizeMode: "contain" },
  emptyMsg: { textAlign: "center", fontSize: 14, color: "#333", marginBottom: 8 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14, marginTop: 12,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 3, borderWidth: 0.5, borderColor: "#eee",
  },
  row: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 48, height: 48, marginRight: 12, resizeMode: "contain" },
  mainText: { marginLeft: 6, fontSize: 14, fontWeight: "600", color: "#111", flexShrink: 1 },
  subText: { marginLeft: 6, fontSize: 13, color: "#333", flexShrink: 1 },
  timeText: { marginTop: 6, fontSize: 12, color: "#666" },
  priceText: { fontSize: 14, fontWeight: "700", color: "#111" },

  expandBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#eee" },
  expandTitle: { fontSize: 14, marginBottom: 6, color: "#111" },
  expandNote: { fontSize: 13, color: "#333", marginBottom: 8 },
  expandFooter: { flexDirection: "row", alignItems: "center", gap: 10 },
  meta: { fontSize: 12, color: "#666" },

  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  warnBtn: { borderWidth: 1, borderColor: "#f1b0b0", backgroundColor: "#fff5f5", padding: 8, borderRadius: 12 },
  trashBtn: { borderWidth: 1, borderColor: "#f1b0b0", backgroundColor: "#fff5f5", padding: 8, borderRadius: 12 },

  viewMoreBtn: { marginTop: 12, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "#ddd" },
  viewMoreText: { fontWeight: "600", color: "#111" },
  noMoreText: { textAlign: "center", color: "#666", marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  dismissButton: { position: "absolute", right: 8, top: 8, padding: 8, zIndex: 1 },
  modalTitle: { fontWeight: "700", fontSize: 16, textAlign: "center", marginBottom: 12, marginTop: 12 },
  modalLabel: { marginBottom: 6 },
  dropdownContainer: { marginBottom: 10 },
  dropdownButton: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownMenu: { marginTop: 6, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff", overflow: "hidden" },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  feedbackInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 80, textAlignVertical: "top" },
  submitButton: { marginTop: 8, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  submitButtonText: { color: "#fff", fontWeight: "600" },
});
