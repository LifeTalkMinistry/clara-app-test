import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getEligibleDayKey } from "../../../../../lib/challenge-schedule.js";
import { getDislikedDailyTipIds } from "@/lib/daily-tip-feedback";
import { fetchDailyTipLibrary } from "@/lib/daily-tip-library";
import {
  commitDailyTipAssignment,
  dailyTipCycleStorageKey,
  resolveDailyTipAssignment,
} from "./dailyTipCycle.js";
import { millisecondsUntilNextEligibleDay } from "./dailyCheckInValidation.js";
import { DAILY_TIPS } from "../data/tipsData";

const LEGACY_SEEN_STORAGE_KEY = "clara_daily_tip_seen_date";
const SIMULATION_DAILY_MONEY_TIP = "Before spending today, ask: Is this planned, needed, or just a reaction?";

export default function useDailyTip({ simulationMode = false, userId: providedUserId } = {}) {
  const { user } = useAuth();
  const userId = providedUserId || user?.id || "guest";
  const [todayKey, setTodayKey] = useState(() => getEligibleDayKey());
  const [tips, setTips] = useState(() => DAILY_TIPS);
  const [assignment, setAssignment] = useState(() =>
    simulationMode ? createSimulationAssignment() : createEmptyAssignment(todayKey)
  );
  const [hasSeenToday, setHasSeenToday] = useState(false);

  useEffect(() => {
    if (simulationMode) return undefined;
    let cancelled = false;

    fetchDailyTipLibrary()
      .then((library) => {
        if (!cancelled && Array.isArray(library) && library.length > 0) {
          setTips(library);
        }
      })
      .catch((error) => {
        // The bundled catalog remains a deliberate offline/startup fallback.
        console.warn("Unable to load Daily Money Tip library; using bundled fallback:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [simulationMode]);

  useEffect(() => {
    if (simulationMode || typeof window === "undefined") return undefined;

    let eligibleDayTimer = null;
    const refreshEligibleDay = () => setTodayKey(getEligibleDayKey());
    const scheduleEligibleDayRefresh = () => {
      if (eligibleDayTimer) window.clearTimeout(eligibleDayTimer);
      eligibleDayTimer = window.setTimeout(() => {
        refreshEligibleDay();
        scheduleEligibleDayRefresh();
      }, millisecondsUntilNextEligibleDay());
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshEligibleDay();
    };

    scheduleEligibleDayRefresh();
    window.addEventListener("focus", refreshEligibleDay);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (eligibleDayTimer) window.clearTimeout(eligibleDayTimer);
      window.removeEventListener("focus", refreshEligibleDay);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [simulationMode]);

  useEffect(() => {
    if (simulationMode) {
      setAssignment(createSimulationAssignment());
      setHasSeenToday(false);
      return undefined;
    }

    const storage = getStorage();
    const storageKey = dailyTipCycleStorageKey(userId);
    const refreshAssignment = () => {
      const nextAssignment = resolveDailyTipAssignment({
        storage,
        userId,
        dayKey: todayKey,
        tips,
        excludedTipIds: getDislikedDailyTipIds(userId, tips),
      });
      setAssignment(nextAssignment);
      setHasSeenToday(nextAssignment.committed);
      safeRemove(storage, LEGACY_SEEN_STORAGE_KEY);
    };
    const handleStorage = (event) => {
      if (event.key && event.key !== storageKey) return;
      refreshAssignment();
    };

    refreshAssignment();
    if (typeof window === "undefined") return undefined;

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [simulationMode, tips, todayKey, userId]);

  const markSeenToday = useCallback(() => {
    if (simulationMode) {
      setHasSeenToday(true);
      return;
    }

    const nextAssignment = commitDailyTipAssignment({
      storage: getStorage(),
      userId,
      dayKey: todayKey,
      tips,
    });
    setAssignment(nextAssignment);
    setHasSeenToday(nextAssignment.committed);
  }, [simulationMode, tips, todayKey, userId]);

  return {
    tip: assignment.text,
    index: assignment.index,
    tipId: assignment.tipId,
    tipRevision: assignment.tipRevision || 1,
    cycleNumber: assignment.cycleNumber,
    cycleDay: assignment.cycleDay,
    hasSeenToday,
    markSeenToday,
  };
}

function createSimulationAssignment() {
  return {
    tipId: "daily-money-tip-simulation",
    tipRevision: 1,
    text: SIMULATION_DAILY_MONEY_TIP,
    index: 0,
    cycleNumber: 0,
    cycleDay: 1,
    committed: false,
  };
}

function createEmptyAssignment(dayKey) {
  return {
    tipId: null,
    tipRevision: 1,
    text: "",
    index: 0,
    dayKey,
    cycleNumber: 0,
    cycleDay: 0,
    committed: false,
  };
}

function getStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function safeRemove(storage, key) {
  try {
    storage?.removeItem?.(key);
  } catch {
    // Ignore legacy cleanup failures.
  }
}
