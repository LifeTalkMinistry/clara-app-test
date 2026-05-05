import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const normalizeString = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeString(value).toLowerCase();

const DASHBOARD_FALLBACK_BILLBOARD = {
  id: "clara-fallback-billboard",
  is_active: true,
  title: "CLARA is ready offline",
  subtitle: "Your wallet, budget, savings, and emergency fund stay available on this phone.",
  tag: "Offline-first",
  cta_label: "Keep tracking",
  media_type: "none",
  local_fallback: true,
};

const DASHBOARD_BILLBOARD_LOOKUP_VALUES = [
  "dashboard",
  "home",
  "clara-dashboard",
  "clara-home",
  "clara-fallback-billboard",
  "clara-dashboard-billboard",
];

const DASHBOARD_BILLBOARD_LOOKUP_FIELDS = [
  "slug",
  "key",
  "section_key",
  "placement",
  "location",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const dashboardRuntimeBillboards = new Map();

const isClaraOnline = () =>
  typeof navigator === "undefined" ? true : navigator.onLine !== false;

const isTruthyActive = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

const isValidUuid = (value) => UUID_PATTERN.test(normalizeString(value));

const isLocalFallbackBillboard = (item) =>
  Boolean(
    item?.local_fallback ||
      item?.localFallback ||
      item?.id === DASHBOARD_FALLBACK_BILLBOARD.id
  );

const getSafeBillboards = (items = []) => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const activeItems = safeItems.filter(
    (item) =>
      isTruthyActive(item?.is_active) ||
      item?.is_active === null ||
      item?.is_active === undefined
  );

  return activeItems.length > 0 ? activeItems : [DASHBOARD_FALLBACK_BILLBOARD];
};

const billboardMatchesDashboardPlacement = (item) => {
  if (!item) return false;

  return DASHBOARD_BILLBOARD_LOOKUP_FIELDS.some((field) => {
    const value = normalizeLower(item?.[field]);
    return value && DASHBOARD_BILLBOARD_LOOKUP_VALUES.includes(value);
  });
};

const getDashboardBillboardRuntimeKey = (user) =>
  `dashboard_billboards_${normalizeString(user?.id || user?.email || "guest")}`;

const getRuntimeCachedBillboards = (user, fallback = []) => {
  const key = getDashboardBillboardRuntimeKey(user);
  const cached = dashboardRuntimeBillboards.get(key);
  return getSafeBillboards(Array.isArray(cached) && cached.length ? cached : fallback);
};

const setRuntimeCachedBillboards = (user, items = []) => {
  const key = getDashboardBillboardRuntimeKey(user);
  const safeItems = getSafeBillboards(items);
  dashboardRuntimeBillboards.set(key, safeItems);
  return safeItems;
};

const canTrackBillboardAnalytics = (itemOrId) => {
  const id =
    typeof itemOrId === "object" && itemOrId !== null ? itemOrId.id : itemOrId;

  if (!id || !isValidUuid(id)) return false;
  if (typeof itemOrId === "object" && isLocalFallbackBillboard(itemOrId)) return false;

  return true;
};

const getBillboardMediaType = (item) => {
  const explicitType = normalizeString(item?.media_type).toLowerCase();
  if (explicitType) return explicitType;

  const url = normalizeString(
    item?.media_url ||
      item?.image_url ||
      item?.thumbnail_url ||
      item?.photo_url ||
      ""
  ).toLowerCase();

  if (!url) return "none";

  if (
    url.includes(".mp4") ||
    url.includes(".webm") ||
    url.includes(".mov") ||
    url.includes(".m4v") ||
    url.includes("video")
  ) {
    return "video";
  }

  if (
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".png") ||
    url.includes(".webp") ||
    url.includes(".gif") ||
    url.includes(".svg")
  ) {
    return "image";
  }

  if (url.includes(".pdf")) return "pdf";

  return "file";
};

const fetchDashboardBillboardsOfflineFirst = async ({ user, fallback = [] } = {}) => {
  const runtimeFallback = getRuntimeCachedBillboards(user, fallback);

  if (!isClaraOnline()) {
    return runtimeFallback;
  }

  try {
    let response = await supabase
      .from("billboards")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20);

    if (response?.error) {
      response = await supabase.from("billboards").select("*").limit(20);
    }

    if (response?.error) {
      return runtimeFallback;
    }

    const rows = Array.isArray(response?.data) ? response.data.filter(Boolean) : [];
    const activeRows = getSafeBillboards(rows).filter(
      (item) => !isLocalFallbackBillboard(item)
    );
    const dashboardRows = activeRows.filter(billboardMatchesDashboardPlacement);
    const selectedRows = dashboardRows.length ? dashboardRows : activeRows;

    return setRuntimeCachedBillboards(user, selectedRows);
  } catch {
    return runtimeFallback;
  }
};

const trackBillboardEvent = async (billboardId, eventType) => {
  if (!canTrackBillboardAnalytics(billboardId)) return;

  try {
    await supabase.from("billboard_events").insert({
      billboard_id: billboardId,
      event_type: eventType,
      source: "dashboard",
    });
  } catch (error) {
    console.error(`CLARA billboard ${eventType} tracking failed:`, error);
  }
};

const getDashboardGlowCardClass = () =>
  "overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl";

const dashboardScale = {
  billboard: "h-[118px] overflow-hidden rounded-[28px]",
  billboardPad: "px-5 py-4",
  billboardTitle: "mt-1 text-lg",
  billboardText: "mt-1 line-clamp-1 text-xs leading-5",
  billboardCta: "mt-2",
  billboardIcon: "h-11 w-11 rounded-2xl",
};

export default function useDashboardBillboard({ user = null, show = true } = {}) {
  const [billboards, setBillboards] = useState(() => getRuntimeCachedBillboards(user));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadBillboards = async () => {
      if (!show) return;
      setLoading(true);
      const nextBillboards = await fetchDashboardBillboardsOfflineFirst({
        user,
        fallback: billboards,
      });
      if (mounted) {
        setBillboards(nextBillboards);
        setLoading(false);
      }
    };

    loadBillboards();

    return () => {
      mounted = false;
    };
  }, [show, user?.email, user?.id]);

  const activeBillboard = useMemo(
    () => getSafeBillboards(billboards)[0] || DASHBOARD_FALLBACK_BILLBOARD,
    [billboards]
  );

  const onTrackView = useCallback(
    (billboardId) => trackBillboardEvent(billboardId, "view"),
    []
  );

  const onTrackClick = useCallback(
    (billboardId) => trackBillboardEvent(billboardId, "click"),
    []
  );

  return {
    activeBillboard,
    billboards,
    billboardLoading: loading,
    canTrackBillboardAnalytics,
    dashboardScale,
    getBillboardMediaType,
    getDashboardGlowCardClass,
    onTrackClick,
    onTrackView,
    show,
  };
}
