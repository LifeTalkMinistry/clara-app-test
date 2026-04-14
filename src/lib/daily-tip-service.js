import {
  formatSupabaseError,
  isSchemaMismatchError,
} from "@/lib/admin-panel-utils";
import {
  getFallbackTipForDate,
  getTodayDateString,
  normalizeTip,
  resolveDashboardTip,
} from "@/lib/daily-tip-utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const DASHBOARD_CACHE_KEY = "clara_daily_tip_cache_v2";

function readDashboardTipCache() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.today || !parsed?.tip?.text) return null;

    return {
      ...parsed,
      tip: normalizeTip(parsed.tip),
    };
  } catch (error) {
    console.error("Failed to read daily tip cache:", error);
    return null;
  }
}

function writeDashboardTipCache(snapshot) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error("Failed to cache daily tip:", error);
  }
}

function emptyTableResponse() {
  return {
    tableReady: false,
    tips: [],
    missingTable: true,
    configured: true,
    error: null,
  };
}

export function getInitialDashboardTipState() {
  const today = getTodayDateString();
  const fallback = getFallbackTipForDate();
  const cached = readDashboardTipCache();

  if (cached?.today === today && cached.tip?.text) {
    return {
      tip: cached.tip,
      source: cached.source || "fallback",
      usingFallback: cached.source !== "admin",
      loading: false,
      hydratedFromCache: true,
      tableReady: cached.tableReady ?? null,
      today,
    };
  }

  return {
    tip: fallback,
    source: "fallback",
    usingFallback: true,
    loading: true,
    hydratedFromCache: false,
    tableReady: null,
    today,
  };
}

export async function fetchDailyTipsSnapshot() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      tableReady: false,
      tips: [],
      missingTable: false,
      configured: false,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("daily_tips")
    .select("*")
    .order("scheduled_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isSchemaMismatchError(error)) {
      return emptyTableResponse();
    }

    throw error;
  }

    return {
      tableReady: true,
      tips: (data || []).map(normalizeTip),
      missingTable: false,
      configured: true,
      error: null,
    };
}

export async function getDashboardTipState() {
  const today = getTodayDateString();
  const snapshot = await fetchDailyTipsSnapshot();
  const resolved = resolveDashboardTip(snapshot.tips, { today, date: new Date() });
  const result = {
    ...resolved,
    today,
    loading: false,
    tableReady: snapshot.tableReady,
    configured: snapshot.configured,
    tips: snapshot.tips,
  };

  writeDashboardTipCache({
    today,
    source: result.source,
    tableReady: snapshot.tableReady,
    tip: result.tip,
  });

  return result;
}

export function subscribeToDailyTips(onChange) {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel("daily-tip-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "daily_tips" },
      () => {
        onChange?.();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function submitStudentTipSuggestion(payload) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Daily tip suggestions need a connected Supabase project.");
  }

  const { error } = await supabase.from("daily_tips").insert([
    {
      title: payload.title || null,
      text: payload.text,
      category: payload.category || "money",
      audience: payload.audience || "all",
      status: "pending",
      source: "student",
      created_by: payload.created_by || null,
      scheduled_date: null,
    },
  ]);

  if (error) {
    throw new Error(formatSupabaseError(error, "Failed to submit tip."));
  }
}

export async function loadAdminDailyTips() {
  const snapshot = await fetchDailyTipsSnapshot();

  return {
    ...snapshot,
    setupRequired: snapshot.missingTable,
    configured: snapshot.configured,
  };
}

export async function saveAdminDailyTip({ editingId, form, approverEmail }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Daily tip management needs a connected Supabase project.");
  }

  const payload = {
    title: form.title || null,
    text: form.text,
    category: form.category || "money",
    audience: form.audience || "all",
    status: form.status || "inactive",
    source: "admin",
    scheduled_date: form.scheduled_date || null,
    approved_by: form.status === "active" ? approverEmail || null : null,
  };

  if (editingId) {
    const { error } = await supabase.from("daily_tips").update(payload).eq("id", editingId);
    if (error) {
      throw new Error(formatSupabaseError(error, "Failed to save daily tip."));
    }

    if (payload.status === "active") {
      await activateAdminDailyTip(editingId, approverEmail);
    }

    return editingId;
  }

  const { data, error } = await supabase
    .from("daily_tips")
    .insert([payload])
    .select("id")
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error, "Failed to save daily tip."));
  }

  if (payload.status === "active" && data?.id) {
    await activateAdminDailyTip(data.id, approverEmail);
  }

  return data?.id || null;
}

export async function activateAdminDailyTip(tipId, approverEmail) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Daily tip management needs a connected Supabase project.");
  }

  const { error: deactivateError } = await supabase
    .from("daily_tips")
    .update({
      status: "inactive",
      approved_by: null,
    })
    .eq("source", "admin")
    .eq("status", "active")
    .neq("id", tipId);

  if (deactivateError) {
    throw new Error(formatSupabaseError(deactivateError, "Failed to update live tip."));
  }

  const { error: activateError } = await supabase
    .from("daily_tips")
    .update({
      status: "active",
      approved_by: approverEmail || null,
    })
    .eq("id", tipId);

  if (activateError) {
    throw new Error(formatSupabaseError(activateError, "Failed to activate tip."));
  }
}

export async function updateDailyTipStatus(tipId, updates) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Daily tip management needs a connected Supabase project.");
  }

  const { error } = await supabase.from("daily_tips").update(updates).eq("id", tipId);
  if (error) {
    throw new Error(formatSupabaseError(error, "Failed to update daily tip."));
  }
}

export async function deleteDailyTip(tipId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Daily tip management needs a connected Supabase project.");
  }

  const { error } = await supabase.from("daily_tips").delete().eq("id", tipId);
  if (error) {
    throw new Error(formatSupabaseError(error, "Failed to delete daily tip."));
  }
}
