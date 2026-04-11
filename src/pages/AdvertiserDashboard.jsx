import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Eye,
  MousePointerClick,
  BarChart3,
  Megaphone,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

const normalizeString = (value) => String(value ?? "").trim();

const isYouTubeUrl = (url = "") => {
  const value = normalizeString(url);
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)/i.test(
    value
  );
};

const getYouTubeEmbedUrl = (url = "") => {
  const value = normalizeString(url);
  if (!value) return "";

  try {
    const parsed = new URL(value);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (parsed.pathname.includes("/shorts/")) {
      const id = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (parsed.pathname.includes("/embed/")) {
      const id = parsed.pathname.split("/embed/")[1]?.split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    const id = parsed.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : "";
  } catch {
    return "";
  }
};

const inferMediaType = (fileOrUrl, mimeType = "") => {
  const type = normalizeString(mimeType).toLowerCase();
  const value = normalizeString(
    typeof fileOrUrl === "string" ? fileOrUrl : fileOrUrl?.name
  ).toLowerCase();

  if (isYouTubeUrl(value)) return "youtube";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";

  if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(value)) return "video";
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(value)) return "image";
  if (/\.pdf$/i.test(value)) return "pdf";
  if (value) return "file";

  return "none";
};

const formatDate = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

const getRangeStart = (range) => {
  const now = new Date();

  if (range === "7d") {
    const date = new Date(now);
    date.setDate(now.getDate() - 7);
    return date.toISOString();
  }

  if (range === "30d") {
    const date = new Date(now);
    date.setDate(now.getDate() - 30);
    return date.toISOString();
  }

  return null;
};

function StatCard({ icon: Icon, label, value, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : "border-white/10 bg-white/5 text-white";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function CompactMetric({ icon: Icon, label, value, accent = false }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        accent
          ? "border-emerald-500/20 bg-emerald-500/10"
          : "border-white/10 bg-black/15"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent ? "text-emerald-300" : "text-white/65"}`} />
        <span
          className={`text-[11px] uppercase tracking-wide ${
            accent ? "text-emerald-300" : "text-white/60"
          }`}
        >
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdvertiserDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [items, setItems] = useState([]);
  const [viewCounts, setViewCounts] = useState({});
  const [clickCounts, setClickCounts] = useState({});
  const [range, setRange] = useState("all");
  const [errorText, setErrorText] = useState("");

  const fetchUserAndItems = useCallback(async (selectedRange) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    const email = normalizeString(user?.email);
    setUserEmail(email);

    if (!email) {
      setItems([]);
      setViewCounts({});
      setClickCounts({});
      return;
    }

    const { data: billboards, error: billboardError } = await supabase
      .from("billboards")
      .select("*")
      .eq("owner_email", email)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (billboardError) throw billboardError;

    const billboardItems = billboards || [];
    setItems(billboardItems);

    if (billboardItems.length === 0) {
      setViewCounts({});
      setClickCounts({});
      return;
    }

    const billboardIds = billboardItems.map((item) => item.id);
    const startDate = getRangeStart(selectedRange);

    let viewsQuery = supabase
      .from("billboard_views")
      .select("billboard_id, created_at")
      .in("billboard_id", billboardIds);

    let clicksQuery = supabase
      .from("billboard_clicks")
      .select("billboard_id, created_at")
      .in("billboard_id", billboardIds);

    if (startDate) {
      viewsQuery = viewsQuery.gte("created_at", startDate);
      clicksQuery = clicksQuery.gte("created_at", startDate);
    }

    const [
      { data: viewsData, error: viewsError },
      { data: clicksData, error: clicksError },
    ] = await Promise.all([viewsQuery, clicksQuery]);

    if (viewsError) throw viewsError;
    if (clicksError) throw clicksError;

    const nextViewCounts = {};
    const nextClickCounts = {};

    for (const row of viewsData || []) {
      const key = row.billboard_id;
      nextViewCounts[key] = (nextViewCounts[key] || 0) + 1;
    }

    for (const row of clicksData || []) {
      const key = row.billboard_id;
      nextClickCounts[key] = (nextClickCounts[key] || 0) + 1;
    }

    setViewCounts(nextViewCounts);
    setClickCounts(nextClickCounts);
  }, []);

  const loadDashboard = useCallback(
    async (selectedRange = range, silent = false) => {
      try {
        setErrorText("");

        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        await fetchUserAndItems(selectedRange);
      } catch (error) {
        console.error("Failed to load advertiser dashboard:", error);
        setErrorText(
          error?.message
            ? `Failed to load advertiser dashboard: ${error.message}`
            : "Failed to load advertiser dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchUserAndItems, range]
  );

  useEffect(() => {
    loadDashboard(range);

    const channel = supabase
      .channel("advertiser-billboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billboards" },
        () => loadDashboard(range, true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billboard_views" },
        () => loadDashboard(range, true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billboard_clicks" },
        () => loadDashboard(range, true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard, range]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const orderA = Number(a?.sort_order) || 0;
      const orderB = Number(b?.sort_order) || 0;

      if (orderA !== orderB) return orderA - orderB;

      const dateA = new Date(a?.created_at || 0).getTime();
      const dateB = new Date(b?.created_at || 0).getTime();

      return dateB - dateA;
    });
  }, [items]);

  const totals = useMemo(() => {
    let totalViews = 0;
    let totalClicks = 0;

    for (const item of items) {
      totalViews += viewCounts[item.id] || 0;
      totalClicks += clickCounts[item.id] || 0;
    }

    const ctr =
      totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

    return {
      totalAds: items.length,
      totalViews,
      totalClicks,
      ctr,
    };
  }, [items, viewCounts, clickCounts]);

  const rangeLabel =
    range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "All time";

  const hasMultipleAds = sortedItems.length > 1;
  const hasSingleAd = sortedItems.length === 1;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading advertiser dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div
          className="px-5 py-6 md:px-6"
          style={{
            background:
              "linear-gradient(135deg, rgba(2,6,23,0.95) 0%, rgba(21,128,61,0.88) 58%, rgba(14,165,233,0.82) 100%)",
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                <Megaphone className="h-3.5 w-3.5" />
                Advertiser Dashboard
              </div>

              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Your Ads Performance
              </h1>

              <p className="mt-2 text-sm text-white/75">
                Monitor your billboard views, taps, and CTR in one clean dashboard.
              </p>

              <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  Account: {userEmail || "No advertiser account detected"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-xl border border-white/10 bg-black/20 p-1">
                {[
                  { value: "7d", label: "7D" },
                  { value: "30d", label: "30D" },
                  { value: "all", label: "All" },
                ].map((option) => {
                  const active = range === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRange(option.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-white text-[#071018]"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => loadDashboard(range, true)}
                disabled={refreshing}
                className="border-white/15 bg-black/20 text-white hover:bg-white/10"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {!!errorText && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {hasMultipleAds && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Overview
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    Campaign summary
                  </h2>
                </div>
                <p className="text-xs text-white/50">{rangeLabel}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <StatCard icon={Megaphone} label="Ads Running" value={totals.totalAds} />
                <StatCard icon={Eye} label="Total Reach" value={totals.totalViews} />
                <StatCard
                  icon={MousePointerClick}
                  label="Total Engagement"
                  value={totals.totalClicks}
                />
                <StatCard
                  icon={BarChart3}
                  label="Average CTR"
                  value={`${totals.ctr}%`}
                  tone="green"
                />
              </div>
            </div>
          )}

          {hasSingleAd && (
            <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.03] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Single Ad Overview
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    One ad is running right now
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {rangeLabel} summary for your current billboard.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 md:min-w-[420px]">
                  <CompactMetric icon={Eye} label="Views" value={totals.totalViews} />
                  <CompactMetric
                    icon={MousePointerClick}
                    label="Taps"
                    value={totals.totalClicks}
                  />
                  <CompactMetric
                    icon={BarChart3}
                    label="CTR"
                    value={`${totals.ctr}%`}
                    accent
                  />
                </div>
              </div>
            </div>
          )}

          {sortedItems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Megaphone className="h-6 w-6 text-white/70" />
              </div>
              <h2 className="text-lg font-semibold text-white">Want to advertise here?</h2>
              <p className="mt-2 text-sm text-white/60">
                Contact us now to inquire how to get your ads posted inside the app.
              </p>

              <Button
                type="button"
                className="mt-5 text-white"
                style={{
                  background: "linear-gradient(135deg, #15803D 0%, #0EA5E9 100%)",
                }}
                onClick={() =>
                  window.open("https://your-contact-link.com", "_blank", "noopener,noreferrer")
                }
              >
                <Megaphone className="mr-2 h-4 w-4" />
                Contact Us Now
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedItems.map((item) => {
                const type = item?.media_type || inferMediaType(item?.media_url);
                const views = viewCounts[item.id] || 0;
                const clicks = clickCounts[item.id] || 0;
                const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";
                const ctaTarget =
                  normalizeString(item?.cta_url) || normalizeString(item?.media_url);
                const youtubeEmbed =
                  type === "youtube" ? getYouTubeEmbedUrl(item?.media_url) : "";
                const hasTag = !!normalizeString(item?.tag_label);
                const hasCta = !!normalizeString(item?.cta_label);

                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
                  >
                    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[340px_minmax(0,1fr)]">
                      <div className="border-b border-white/10 bg-black/15 lg:border-b-0 lg:border-r">
                        <div className="flex h-full min-h-[220px] items-center justify-center p-4">
                          {type === "image" && item?.media_url ? (
                            <img
                              src={item.media_url}
                              alt={item.title || "Billboard"}
                              className="max-h-[260px] w-full rounded-2xl object-cover"
                            />
                          ) : type === "video" && item?.media_url ? (
                            <video
                              src={item.media_url}
                              controls
                              className="max-h-[260px] w-full rounded-2xl bg-black"
                            />
                          ) : type === "youtube" && youtubeEmbed ? (
                            <div className="w-full overflow-hidden rounded-2xl border border-white/10">
                              <iframe
                                src={youtubeEmbed}
                                title={item.title || "YouTube Video"}
                                className="aspect-video w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            </div>
                          ) : type === "pdf" ? (
                            <div className="flex h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
                              <FileText className="mb-3 h-10 w-10" />
                              <p className="text-sm font-medium">PDF Billboard</p>
                            </div>
                          ) : type === "file" ? (
                            <div className="flex h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
                              <FileText className="mb-3 h-10 w-10" />
                              <p className="text-sm font-medium">Attached File</p>
                            </div>
                          ) : type === "video" || type === "youtube" ? (
                            <div className="flex h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
                              <Video className="mb-3 h-10 w-10" />
                              <p className="text-sm font-medium">Video Billboard</p>
                            </div>
                          ) : (
                            <div className="flex h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
                              <ImageIcon className="mb-3 h-10 w-10" />
                              <p className="text-sm font-medium">Billboard Preview</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 md:p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-white/70">
                                {type}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  item?.is_active
                                    ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                    : "border border-white/10 bg-white/5 text-white/60"
                                }`}
                              >
                                {item?.is_active ? "Active" : "Inactive"}
                              </span>

                              {hasTag && (
                                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/75">
                                  {item.tag_label}
                                </span>
                              )}
                            </div>

                            <h2 className="text-xl font-bold text-white">
                              {item?.title || "Untitled billboard"}
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-white/65">
                              {item?.body || "No description provided."}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/55">
                              <span>Order: {Number(item?.sort_order) || 1}</span>
                              <span>•</span>
                              <span>Created: {formatDate(item?.created_at)}</span>
                            </div>
                          </div>

                          {hasCta && ctaTarget ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="border-white/15 bg-black/20 text-white hover:bg-white/10"
                              onClick={() =>
                                window.open(ctaTarget, "_blank", "noopener,noreferrer")
                              }
                            >
                              <Link2 className="mr-2 h-4 w-4" />
                              {item.cta_label}
                            </Button>
                          ) : item?.media_url ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="border-white/15 bg-black/20 text-white hover:bg-white/10"
                              onClick={() =>
                                window.open(item.media_url, "_blank", "noopener,noreferrer")
                              }
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Media
                            </Button>
                          ) : null}
                        </div>

                        {hasMultipleAds && (
                          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <CompactMetric icon={Eye} label="Views" value={views} />
                            <CompactMetric
                              icon={MousePointerClick}
                              label="Taps"
                              value={clicks}
                            />
                            <CompactMetric
                              icon={BarChart3}
                              label="CTR"
                              value={`${ctr}%`}
                              accent
                            />
                          </div>
                        )}

                        {!!normalizeString(item?.file_name) && (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/65">
                            File:{" "}
                            <span className="font-medium text-white/85">
                              {item.file_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}