// homepassenger/subfile/fare.ts
export type DiscountType = "none" | "senior" | "student" | "pwd";

export type FareConfigState = {
  regular: {
    baseKm: number;
    baseFare: number;
    addlPerKm: number;
    chargeMode: "per_passenger" | "per_trip";
  };
  special: {
    baseKm: number;
    baseFare: number;
    shortKm: number;
    shortFare: number;
    addlPerKm: number;
    chargeMode: "per_passenger" | "per_trip";
  };
  discounts: {
    enabled: boolean;
    percent: number;
    appliesTo: string[];
  };
};

// UI ESTIMATE ONLY:
// Final fare must be recomputed and saved by the backend during /api/book.
export function calculateFare(
  distanceKm: number,
  discount: DiscountType = "none",
  opts?: {
    bookingType?: "CLASSIC" | "GROUP" | "SOLO";
    partySize?: number;
    config?: FareConfigState | null;
  }
) {
  if (!isFinite(distanceKm) || distanceKm <= 0) return 0;

  const bookingType = opts?.bookingType ?? "CLASSIC";
  const rawPartySize = opts?.partySize ?? 1;
  const partySize = bookingType === "GROUP" ? Math.max(1, rawPartySize) : 1;
  const cfg = opts?.config;

  // ✅ Use FareConfig if available
  if (cfg) {
    const isSolo = bookingType === "SOLO";
    const d = Math.max(distanceKm, 0);
    let fareBase = 0;
    let chargeMode: "per_passenger" | "per_trip";

    if (isSolo) {
      // SPECIAL / SOLO
      const s = cfg.special;

      if (d <= s.shortKm) {
        fareBase = s.shortFare;
      } else {
        const extra = Math.max(0, d - s.baseKm);
        const steps = Math.ceil(extra);
        fareBase = s.baseFare + steps * s.addlPerKm;
      }
      chargeMode = s.chargeMode;
    } else {
      // REGULAR (CLASSIC + GROUP)
      const r = cfg.regular;
      const extra = Math.max(0, d - r.baseKm);
      const steps = Math.ceil(extra);
      fareBase = r.baseFare + steps * r.addlPerKm;
      chargeMode = r.chargeMode;
    }

    let fare = fareBase;

    if (chargeMode === "per_passenger") {
      fare *= partySize;
    }

    // discount (no change from your logic)
    if (
      cfg.discounts?.enabled &&
      discount !== "none" &&
      Array.isArray(cfg.discounts.appliesTo) &&
      cfg.discounts.appliesTo.includes(discount)
    ) {
      const pct = cfg.discounts.percent ?? 0;
      fare *= 1 - pct / 100;
    }

    return Math.round(fare);
  }

  // No fare config loaded yet.
  // Frontend estimate must rely on fare config from backend, not hardcoded values.
  return 0;
}
