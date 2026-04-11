// Phase A2: cloud sync for user state.
// The `user_state` Supabase table holds a single row per user with grouped
// JSONB columns. This helper handles:
//   - initial fetch of the row on login
//   - debounced per-column saves as the user interacts with the app
//   - emitting a "ft-cloud-sync" event for external observers if ever needed
//
// Offline / unauthenticated users fall back to localStorage only (existing
// behaviour) so the app still works without a session.

import { supabase } from "../supabaseClient";

// ---------------------------------------------------------------------------
// Columns

// snake_case names used in the Supabase table
export const CLOUD_COLUMNS = [
  "profile",
  "food_prefs",
  "fitness_prefs",
  "custom_foods",
  "favorite_food_keys",
  "recent_foods",
  "favorite_exercise_keys",
  "recent_exercises",
  "daily_logs",
  "weight_log",
  "saved_plans"
];

// ---------------------------------------------------------------------------
// Read

/**
 * Fetch the user_state row for the given user id.
 * Returns an object with all columns (or nulls if the row does not exist).
 */
export async function fetchCloudState(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("user_state")
      .select(CLOUD_COLUMNS.join(","))
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.warn("fetchCloudState error:", error.message);
      return null;
    }
    return data || null;
  } catch (err) {
    console.warn("fetchCloudState threw:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write

const pendingTimers = new Map();
const PENDING_DEBOUNCE_MS = 500;

/**
 * Debounced upsert of a single column.
 * Calls made within PENDING_DEBOUNCE_MS replace the previous pending write.
 */
export function saveCloudColumn(userId, column, value) {
  if (!userId || !column) return;
  if (!CLOUD_COLUMNS.includes(column)) {
    console.warn("saveCloudColumn: unknown column", column);
    return;
  }

  const key = `${userId}:${column}`;
  if (pendingTimers.has(key)) {
    clearTimeout(pendingTimers.get(key));
  }

  const timer = setTimeout(async () => {
    pendingTimers.delete(key);
    try {
      const payload = { user_id: userId, [column]: value };
      const { error } = await supabase.from("user_state").upsert(payload, { onConflict: "user_id" });
      if (error) {
        console.warn(`saveCloudColumn(${column}) error:`, error.message);
      } else if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ft-cloud-sync", { detail: { userId, column } }));
      }
    } catch (err) {
      console.warn(`saveCloudColumn(${column}) threw:`, err);
    }
  }, PENDING_DEBOUNCE_MS);

  pendingTimers.set(key, timer);
}

/**
 * Non-debounced upsert of many columns at once. Used to seed the row from
 * localStorage on the user's first login after the A2 deploy.
 */
export async function seedCloudState(userId, columns) {
  if (!userId) return false;
  try {
    const payload = { user_id: userId, ...columns };
    const { error } = await supabase.from("user_state").upsert(payload, { onConflict: "user_id" });
    if (error) {
      console.warn("seedCloudState error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("seedCloudState threw:", err);
    return false;
  }
}
