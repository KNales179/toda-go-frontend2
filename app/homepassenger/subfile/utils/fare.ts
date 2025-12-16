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
  const partySize = opts?.partySize ?? 1;
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

  // 🔙 Fallback: old hardcoded logic
  const BASE_FARE = 20;
  const INCLUDED_KM = 2;
  const PER_KM = 5;

  const extra = Math.max(0, distanceKm - INCLUDED_KM);
  const steps = Math.ceil(extra);

  let fare = BASE_FARE + steps * PER_KM;
  if (discount !== "none") fare *= 0.8;

  return Math.round(fare);
}
