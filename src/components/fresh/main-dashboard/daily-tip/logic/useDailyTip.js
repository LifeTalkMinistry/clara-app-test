import { useEffect, useMemo, useState } from "react";
import { DAILY_TIPS } from "../data/tipsData";

const CYCLE_STORAGE_KEY = "clara_daily_tip_cycle_v2";
const SEEN_STORAGE_KEY = "clara_daily_tip_seen_date";

export default function useDailyTip() {
  const todayKey = useMemo(() => getTodayKey(), []);
  const [tip, setTip] = useState("");
  const [index, setIndex] = useState(0);
  const [hasSeenToday, setHasSeenToday] = useState(false);

  useEffect(() => {
    const seenDate = safeGet(SEEN_STORAGE_KEY);
    setHasSeenToday(seenDate === todayKey);

    const stored = safeGet(CYCLE_STORAGE_KEY);
    let cycle = safeParse(stored) || createFreshCycle();

    if (!cycle.date || cycle.date !== todayKey) {
      if (!Array.isArray(cycle.order) || cycle.order.length !== DAILY_TIPS.length) {
        cycle = createFreshCycle();
      }

      if (cycle.pointer >= cycle.order.length) {
        cycle = createFreshCycle();
      }

      cycle = {
        ...cycle,
        date: todayKey,
        currentIndex: cycle.order[cycle.pointer],
        pointer: cycle.pointer + 1,
      };

      if (cycle.pointer >= cycle.order.length) {
        cycle.nextOrder = shuffle([...Array(DAILY_TIPS.length).keys()]);
      }

      safeSet(CYCLE_STORAGE_KEY, JSON.stringify(cycle));
    }

    const currentIndex = Number.isInteger(cycle.currentIndex) ? cycle.currentIndex : 0;
    setIndex(currentIndex);
    setTip(DAILY_TIPS[currentIndex] || DAILY_TIPS[0]);
  }, [todayKey]);

  const markSeenToday = () => {
    safeSet(SEEN_STORAGE_KEY, todayKey);
    setHasSeenToday(true);
  };

  return { tip, index, hasSeenToday, markSeenToday };
}

function createFreshCycle() {
  return {
    date: null,
    order: shuffle([...Array(DAILY_TIPS.length).keys()]),
    pointer: 0,
    currentIndex: 0,
  };
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the card working even if storage is blocked.
  }
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
