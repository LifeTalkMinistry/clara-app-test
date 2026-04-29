import { useCallback, useEffect, useMemo } from "react";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Play,
} from "lucide-react";

const normalizeString = (value) => String(value ?? "").trim();

export default function DashboardBillboard({
  activeBillboard,
  dashboardScale,
  getDashboardGlowCardClass,
  canTrackBillboardAnalytics,
  getBillboardMediaType,
  onTrackView,
  onTrackClick,
  show = true,
}) {
  const billboardMediaUrl = useMemo(
    () =>
      normalizeString(
        activeBillboard?.media_url ||
          activeBillboard?.image_url ||
          activeBillboard?.thumbnail_url ||
          activeBillboard?.photo_url ||
          ""
      ),
    [activeBillboard]
  );

  const billboardTitle = useMemo(
    () =>
      normalizeString(
        activeBillboard?.title ||
          activeBillboard?.headline ||
          activeBillboard?.name ||
          ""
      ),
    [activeBillboard]
  );

  const billboardSubtitle = useMemo(
    () =>
      normalizeString(
        activeBillboard?.body ||
          activeBillboard?.subtitle ||
          activeBillboard?.description ||
          activeBillboard?.caption ||
          ""
      ),
    [activeBillboard]
  );

  const billboardTag = useMemo(
    () =>
      normalizeString(
        activeBillboard?.tag_label ||
          activeBillboard?.tag ||
          activeBillboard?.badge ||
          ""
      ),
    [activeBillboard]
  );

  const billboardCta = useMemo(
    () =>
      normalizeString(
        activeBillboard?.cta_label || activeBillboard?.button_text || ""
      ),
    [activeBillboard]
  );

  const billboardTargetUrl = useMemo(
    () => normalizeString(activeBillboard?.cta_url || billboardMediaUrl || ""),
    [activeBillboard, billboardMediaUrl]
  );

  const billboardMediaType = useMemo(
    () => getBillboardMediaType?.(activeBillboard) || "none",
    [activeBillboard, getBillboardMediaType]
  );

  const hasBillboardContent = Boolean(
    billboardMediaUrl || billboardTitle || billboardSubtitle
  );

  const billboardClickable = Boolean(billboardTargetUrl);

  useEffect(() => {
    if (!show || !activeBillboard) return;
    if (canTrackBillboardAnalytics?.(activeBillboard)) {
      onTrackView?.(activeBillboard.id);
    }
  }, [
    activeBillboard,
    activeBillboard?.id,
    canTrackBillboardAnalytics,
    onTrackView,
    show,
  ]);

  const openBillboardTarget = useCallback(async () => {
    if (!billboardTargetUrl) return;

    if (canTrackBillboardAnalytics?.(activeBillboard)) {
      await onTrackClick?.(activeBillboard.id);
    }

    window.open(billboardTargetUrl, "_blank", "noopener,noreferrer");
  }, [
    activeBillboard,
    activeBillboard?.id,
    billboardTargetUrl,
    canTrackBillboardAnalytics,
    onTrackClick,
  ]);

  if (!show || !hasBillboardContent) return null;

  return (
    <div
      className={`${getDashboardGlowCardClass?.("teal") || ""} ${
        billboardClickable ? "cursor-pointer" : ""
      }`}
      onClick={billboardClickable ? openBillboardTarget : undefined}
      role={billboardClickable ? "button" : undefined}
      tabIndex={billboardClickable ? 0 : undefined}
      onKeyDown={
        billboardClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openBillboardTarget();
              }
            }
          : undefined
      }
    >
      <div className={`relative ${dashboardScale?.billboard || ""}`}>
        {billboardMediaUrl ? (
          billboardMediaType === "video" ? (
            <video
              src={billboardMediaUrl}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              onClick={(event) => event.stopPropagation()}
            />
          ) : billboardMediaType === "image" ? (
            <img
              src={billboardMediaUrl}
              alt={billboardTitle || "Billboard"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-[#141B3A] via-[#251B4A] to-[#0E3A54]">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.075] px-3 py-1.5 text-white/85">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {billboardMediaType === "pdf" ? "PDF Attached" : "File Attached"}
                </span>
              </div>
            </div>
          )
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-[#141B3A] via-[#251B4A] to-[#0E3A54]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />

        <div className={`absolute inset-0 flex items-center justify-between ${dashboardScale?.billboardPad || ""}`}>
          <div className="min-w-0 max-w-[72%]">
            {Boolean(billboardTag) && (
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                {billboardTag}
              </p>
            )}

            {Boolean(billboardTitle) && (
              <h3 className={`line-clamp-1 font-bold leading-tight text-white ${dashboardScale?.billboardTitle || ""}`}>
                {billboardTitle}
              </h3>
            )}

            {Boolean(billboardSubtitle) && (
              <p className={`${dashboardScale?.billboardText || ""} text-white/80`}>
                {billboardSubtitle}
              </p>
            )}

            {Boolean(billboardCta) && (
              <div className={`flex items-center gap-2 ${dashboardScale?.billboardCta || ""}`}>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/90">
                  <span>{billboardCta}</span>
                  {billboardClickable && <ExternalLink className="h-3 w-3" />}
                </span>
              </div>
            )}
          </div>

          <div className="shrink-0">
            <div className={`flex items-center justify-center border border-white/15 bg-black/25 backdrop-blur-sm ${dashboardScale?.billboardIcon || ""}`}>
              {billboardMediaType === "video" ? (
                <Play className="h-5 w-5 fill-emerald-300 text-emerald-300" />
              ) : billboardMediaType === "image" ? (
                <ImageIcon className="h-5 w-5 text-emerald-300" />
              ) : billboardMediaType === "pdf" || billboardMediaType === "file" ? (
                <FileText className="h-5 w-5 text-emerald-300" />
              ) : (
                <Play className="h-5 w-5 fill-emerald-300 text-emerald-300" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
