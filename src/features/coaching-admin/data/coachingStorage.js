import { COACHING_ADMIN_STORAGE_KEY } from "../constants";
import { createMockCoachingSeed } from "./mockCoachingSeed";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function readCoachingMockState() {
  if (typeof window === "undefined") return createMockCoachingSeed();

  try {
    const raw = window.localStorage.getItem(COACHING_ADMIN_STORAGE_KEY);
    if (!raw) {
      const seed = createMockCoachingSeed();
      window.localStorage.setItem(COACHING_ADMIN_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.appointments) || !Array.isArray(parsed.availability)) {
      throw new Error("Invalid coaching mock state");
    }
    return parsed;
  } catch {
    return createMockCoachingSeed();
  }
}

export function writeCoachingMockState(state) {
  const next = {
    ...clone(state),
    lastUpdatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(COACHING_ADMIN_STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

export function resetCoachingMockState() {
  const seed = createMockCoachingSeed();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COACHING_ADMIN_STORAGE_KEY, JSON.stringify(seed));
  }
  return seed;
}

export function cloneCoachingValue(value) {
  return clone(value);
}
