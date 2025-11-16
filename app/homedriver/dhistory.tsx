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
  const [allItems, setAllItems] = useState<RideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // report modal stubs (if you want same functionality as PHistory)
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
    if (cached) {
      console.log("[DHistory][geocodeCoord] cache HIT:", key, "->", cached);
      return cached;
    }

    console.log("[DHistory][geocodeCoord] cache MISS, calling reverseGeocodeAsync for:", key);
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
        console.log("[DHistory][geocodeCoord] success:", key, "->", label);
        return label;
      } else {
        console.warn("[DHistory][geocodeCoord] reverseGeocodeAsync returned empty for:", key);
      }
    } catch (e) {
      console.warn("[DHistory][geocodeCoord] reverse geocode failed for", key, e);
    }

    const coordLabel = `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`;
    reverseCache.current.set(key, coordLabel);
    console.log("[DHistory][geocodeCoord] fallback to coord label:", key, "->", coordLabel);
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
    console.log("[DHistory][resolvePlaceNames] start, items:", items.length);
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
            out.pickupLabel = it.pickupPlace || "Pickup location";
          }
        }
        if (needsDest) {
          try {
            const lbl = await geocodeCoord(it.destinationLat, it.destinationLng);
            out.destinationLabel = lbl || (it.destinationPlace || "Destination");
          } catch (e) {
            out.destinationLabel = it.destinationPlace || "Destination";
          }
        }
        return out;
      });
    }

    console.log("[DHistory][resolvePlaceNames] tasks queued:", tasks.length);
    if (tasks.length === 0) return;

    const CONCURRENCY = 5;
    const results: any[] = [];
    let idx = 0;

    const runner = async () => {
      while (idx < tasks.length) {
        const i = idx++;
        try {
          const r = await tasks[i]();
          results.push(r);
          console.log("[DHistory][resolvePlaceNames] task done for id:", r.id);
        } catch (e) {
          console.warn("[DHistory][resolvePlaceNames] task error", e);
        }
      }
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(runner());
    await Promise.all(workers);

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

    console.log("[DHistory][resolvePlaceNames] done and state updated");
  };

  const fetchAll = useCallback(async () => {
    if (!driverId) { setLoading(false); setRefreshing(false); console.log("[DHistory][fetchAll] no driverId, abort"); return; }
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

      console.log("[DHistory][fetchAll] trying endpoints:", paths);
      for (let i = 0; i < paths.length; i++) {
        const url = `${base}${paths[i]}`;
        const filterLocally = i >= 2;
        try {
          console.log("[DHistory][fetchAll] fetching:", url);
          const res = await fetch(url, { headers: { "Cache-Control": "no-store" } });
          const text = await res.text();
          let data: any;
          try { data = JSON.parse(text); } catch {
            console.warn("[DHistory][fetchAll] response not JSON from", url);
            continue;
          }
          let raw: any[] = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
          if (filterLocally) raw = raw.filter((x: any) => String(x.driverId) === String(driverId));
          got = normalize(raw);
          console.log("[DHistory][fetchAll] success from:", url, "items:", got.length);
          break;
        } catch (e) {
          console.warn("[DHistory][fetchAll] fetch failed for", paths[i], e);
        }
      }

      if (!got) got = [];
      setAllItems(got);
      setVisible(Math.min(10, got.length));

      // Force geocoding for any item that has coords (either fields or parsed from label)
      const itemsWithCoords = got.filter(it =>
        (it.pickupLat != null && it.pickupLng != null) ||
        (it.destinationLat != null && it.destinationLng != null)
      );
      console.log("[DHistory][fetchAll] items with coords:", itemsWithCoords.length);

      if (itemsWithCoords.length > 0) {
        resolvePlaceNames(itemsWithCoords).catch((e) => console.warn("[DHistory][fetchAll] resolvePlaceNames failed", e));
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
      console.log("[DHistory][fetchAll] finished");
    }
  }, [driverId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

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
              } catch (e) {}
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

  const dataToShow = allItems.slice(0, visible);
  const hasMore = visible < allItems.length;

  if (!loading && allItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}><Text style={styles.heading}>HISTORY</Text></View>
        <View style={styles.emptyWrap}>
          <Image source={require("../../assets/images/tricycle.png")} style={styles.emptyImage} />
          <Text style={styles.emptyMsg}>No history yet — drive some trips to see them here.</Text>
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

  // For group: show per-person fare × pax and computed total (if totalFare available use it)
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

            {/* {String(item.bookingType).toLowerCase() === "group" && typeof item.groupCount === "number" && (
              
            )} */}
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
  groupChip: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ddd", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },

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
  feedbackInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 80, textAlignVertical: "top" },
  submitButton: { marginTop: 8, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  submitButtonText: { color: "#fff", fontWeight: "600" },
});
