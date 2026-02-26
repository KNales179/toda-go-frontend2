// app/utils/restriction.ts
import { API_BASE_URL } from "../../config";

export type RestrictionInfo = {
  isRestricted?: boolean;
  type?: "ban" | "suspend";
  reason?: string;
  startAt?: string | Date | null;
  endAt?: string | Date | null; // null = indefinite
};

export function isRestrictionActive(r?: RestrictionInfo | null) {
  if (!r?.isRestricted) return false;
  if (!r.endAt) return true; // indefinite
  const end = new Date(r.endAt as any).getTime();
  if (Number.isNaN(end)) return true; // if bad date, treat as active (safer)
  return end > Date.now();
}

export async function fetchRestriction({
  userType,
  userId,
  token,
}: {
  userType: "passenger" | "driver";
  userId: string;
  token?: string | null;
}): Promise<RestrictionInfo | null> {
  // ✅ You can adjust these endpoints to match what you add in backend
  const url =
    userType === "passenger"
      ? `${API_BASE_URL}/api/admin/passengers/${userId}/restriction-public`
      : `${API_BASE_URL}/api/admin/drivers/${userId}/restriction-public`;

  // If you don't want admin routes for this, create /api/passengers/:id/status and /api/drivers/:id/status instead.
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    // If endpoint not ready yet, fail open (allow login) so you can deploy step-by-step
    console.log("[restriction] status fetch failed:", res.status, text?.slice?.(0, 120));
    return null;
  }

  // Accept multiple shapes:
  // { restriction: {...} } OR { user: { restriction } } OR { passenger/driver: { restriction } }
  return (
    data?.restriction ||
    data?.user?.restriction ||
    data?.passenger?.restriction ||
    data?.driver?.restriction ||
    null
  );
}
