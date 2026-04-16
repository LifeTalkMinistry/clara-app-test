import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Mail,
  Megaphone,
  MousePointerClick,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import {
  BUSINESS_CONTACT_EMAIL,
  BUSINESS_INQUIRY_URL,
} from "@/lib/business-config";

const normalizeString = (value) => String(value ?? "").trim();

const isTruthyActive = (value) => {
  return value === true || value === "true" || value === 1 || value === "1";
};

const inferMediaType = (fileOrUrl, mimeType = "") => {
  const type = normalizeString(mimeType).toLowerCase();
  const value = normalizeString(
    typeof fileOrUrl === "string" ? fileOrUrl : fileOrUrl?.name
  ).toLowerCase();

  if (type.startsWith("video/")) return "video";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";

  if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(value)) return "video";
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(value)) return "image";
  if (/\.pdf$/i.test(value)) return "pdf";
  if (value) return "file";

  return "none";
};

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="flex items-center gap-2 text-white/55">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export default function AdsModal({
  open,
  onClose,
  userEmail,
  onOpenDashboard,
}) {
  const normalizedEmail = useMemo(
    () => normalizeString(userEmail).toLowerCase(),
    [userEmail]
  );
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [viewCounts, setViewCounts] = useState({});
  const [clickCounts, setClickCounts] = useState({});

  const loadBillboards = useCallback(async () => {
    if (!open || !normalizedEmail) {
      setItems([]);
      setViewCounts({});
      setClickCounts({});
      return;
    }

    try {
      setLoading(true);

      const { data: billboards, error: billboardError } = await supabase
        .from("billboards")
        .select("*")
        .eq("owner_email", normalizedEmail)
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
      const [
        { data: viewsData, error: viewsError },
        { data: clicksData, error: clicksError },
      ] = await Promise.all([
        supabase
          .from("billboard_views")
          .select("billboard_id")
          .in("billboard_id", billboardIds),
        supabase
          .from("billboard_clicks")
          .select("billboard_id")
          .in("billboard_id", billboardIds),
      ]);

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
    } catch (error) {
      console.error("Failed to load ads modal content:", error);
      setItems([]);
      setViewCounts({});
      setClickCounts({});
    } finally {
      setLoading(false);
    }
  }, [normalizedEmail, open]);

  useEffect(() => {
    loadBillboards();
  }, [loadBillboards]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  const sortedItems = [...items].sort((left, right) => {
    return Number(isTruthyActive(right?.is_active)) - Number(isTruthyActive(left?.is_active));
  });

  const totalViews = sortedItems.reduce(
    (sum, item) => sum + Number(viewCounts[item.id] || 0),
    0
  );
  const totalClicks = sortedItems.reduce(
    (sum, item) => sum + Number(clickCounts[item.id] || 0),
    0
  );
  const activeAds = sortedItems.filter((item) => isTruthyActive(item?.is_active)).length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close ads modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,16,24,0.98)_0%,rgba(5,10,18,0.98)_100%)] shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        <div className="absolute -top-16 left-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -right-10 top-6 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative border-b border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(6,78,59,0.92)_65%,rgba(8,47,73,0.92)_100%)] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-300/75">
                Business
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {sortedItems.length > 0 ? "Your ads in CLARA" : "Advertise with CLARA"}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
                {sortedItems.length > 0
                  ? "Review your live billboard presence and jump back into your full advertiser area when you’re ready."
                  : "Want to promote your business here and reach financially disciplined users?"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />
                <p className="text-sm text-white/60">Loading your ad space...</p>
              </div>
            </div>
          ) : sortedItems.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatPill icon={Megaphone} label="Active Ads" value={activeAds} />
                <StatPill icon={BarChart3} label="Views" value={totalViews} />
                <StatPill icon={MousePointerClick} label="Taps" value={totalClicks} />
              </div>

              <div className="space-y-3">
                {sortedItems.slice(0, 3).map((item) => {
                  const type = item?.media_type || inferMediaType(item?.media_url);
                  const views = viewCounts[item.id] || 0;
                  const clicks = clickCounts[item.id] || 0;
                  const ctaTarget =
                    normalizeString(item?.cta_url) || normalizeString(item?.media_url);

                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04]"
                    >
                      <div className="grid gap-0 sm:grid-cols-[180px_minmax(0,1fr)]">
                        <div className="flex min-h-[160px] items-center justify-center border-b border-white/10 bg-black/20 p-4 sm:border-b-0 sm:border-r">
                          {type === "image" && item?.media_url ? (
                            <img
                              src={item.media_url}
                              alt={item.title || "Billboard"}
                              className="max-h-[140px] w-full rounded-2xl object-cover"
                            />
                          ) : type === "video" && item?.media_url ? (
                            <video
                              src={item.media_url}
                              controls
                              className="max-h-[140px] w-full rounded-2xl bg-black"
                            />
                          ) : type === "pdf" || type === "file" ? (
                            <div className="flex h-[140px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/65">
                              <FileText className="mb-3 h-8 w-8" />
                              <p className="text-sm font-medium">
                                {type === "pdf" ? "PDF Billboard" : "Attached File"}
                              </p>
                            </div>
                          ) : type === "video" ? (
                            <div className="flex h-[140px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/65">
                              <Video className="mb-3 h-8 w-8" />
                              <p className="text-sm font-medium">Video Billboard</p>
                            </div>
                          ) : (
                            <div className="flex h-[140px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/65">
                              <ImageIcon className="mb-3 h-8 w-8" />
                              <p className="text-sm font-medium">Billboard Preview</p>
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">
                                {item?.title || "Untitled billboard"}
                              </p>
                              <p className="mt-1 text-xs text-white/50">
                                {isTruthyActive(item?.is_active) ? "Active now" : "Saved"}
                              </p>
                            </div>
                            {isTruthyActive(item?.is_active) ? (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                                Live
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-white/65">
                              {views} views
                            </span>
                            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-white/65">
                              {clicks} taps
                            </span>
                          </div>

                          {ctaTarget ? (
                            <button
                              type="button"
                              onClick={() =>
                                window.open(ctaTarget, "_blank", "noopener,noreferrer")
                              }
                              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-200 transition hover:text-white"
                            >
                              <span>Open destination</span>
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                className="w-full text-white shadow-[0_18px_40px_rgba(16,185,129,0.22)]"
                style={{
                  background: "linear-gradient(135deg, #15803D 0%, #0EA5E9 100%)",
                }}
                onClick={onOpenDashboard}
              >
                <Megaphone className="mr-2 h-4 w-4" />
                Open Ad Dashboard
              </Button>
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-emerald-400/15 bg-emerald-400/10 text-emerald-200 shadow-[0_18px_40px_rgba(16,185,129,0.15)]">
                  <Megaphone className="h-7 w-7" />
                </div>

                <h3 className="mt-5 text-2xl font-semibold text-white">
                  Advertise with CLARA
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Want to promote your business here and reach financially disciplined users?
                </p>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Email
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {BUSINESS_CONTACT_EMAIL}
                  </p>
                </div>

                <Button
                  type="button"
                  className="mt-5 h-12 w-full text-white shadow-[0_20px_45px_rgba(16,185,129,0.25)]"
                  style={{
                    background: "linear-gradient(135deg, #16A34A 0%, #0EA5E9 100%)",
                  }}
                  onClick={() =>
                    window.open(`mailto:${BUSINESS_CONTACT_EMAIL}`, "_self")
                  }
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Now
                </Button>

                <button
                  type="button"
                  onClick={() =>
                    window.open(BUSINESS_INQUIRY_URL, "_blank", "noopener,noreferrer")
                  }
                  className="mt-4 text-sm font-medium text-white/68 transition hover:text-white"
                >
                  Or message us on Facebook
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
