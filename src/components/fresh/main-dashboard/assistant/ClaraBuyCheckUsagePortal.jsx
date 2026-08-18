import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getSupportTier } from "@/lib/clara-support";
import {
  CLARA_AI_USAGE_UPDATED_EVENT,
  getClaraGeminiDailyUsage,
} from "@/lib/clara-gemini-proxy-client";

const TARGET_SELECTOR = '[data-clara-buy-check-active-question="true"]';
const BOARD_SELECTOR = '[data-clara-pause-entry-board="true"]';

function validUsage(value) {
  return Boolean(
    value?.available === true &&
    Number.isFinite(Number(value.limit)) &&
    Number(value.limit) > 0 &&
    Number.isFinite(Number(value.remaining))
  );
}

function getUsageTierLabel(tier = "") {
  const normalized = String(tier || "").trim().toLowerCase();
  if (!normalized || normalized === "free") return "Free access";
  return getSupportTier(normalized)?.name || "CLARA access";
}

export default function ClaraBuyCheckUsagePortal({
  isActive = false,
  disabled = false,
  previewUsage = null,
}) {
  const [targets, setTargets] = useState({ question: null, board: null });
  const [usage, setUsage] = useState(() => (validUsage(previewUsage) ? previewUsage : null));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasPreviewUsage = validUsage(previewUsage);

  useEffect(() => {
    if (!isActive || disabled || typeof document === "undefined") {
      setTargets({ question: null, board: null });
      setDetailsOpen(false);
      return undefined;
    }

    const syncTargets = () => {
      const question = document.querySelector(TARGET_SELECTOR);
      const board = question?.closest(BOARD_SELECTOR) || document.querySelector(BOARD_SELECTOR);
      setTargets({ question, board });
      return Boolean(question);
    };

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      if (syncTargets()) return;
      secondFrame = window.requestAnimationFrame(syncTargets);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      setTargets({ question: null, board: null });
      setDetailsOpen(false);
    };
  }, [disabled, isActive]);

  useEffect(() => {
    if (!hasPreviewUsage) return;
    setUsage(previewUsage);
  }, [hasPreviewUsage, previewUsage]);

  useEffect(() => {
    if (!isActive || disabled || hasPreviewUsage || typeof window === "undefined") return undefined;

    const controller = new AbortController();
    let cancelled = false;

    getClaraGeminiDailyUsage({ signal: controller.signal })
      .then((nextUsage) => {
        if (!cancelled && validUsage(nextUsage)) setUsage(nextUsage);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.warn("[CLARA AI Usage] Daily allowance is temporarily unavailable.", error);
        }
      });

    const handleUsageUpdate = (event) => {
      if (validUsage(event?.detail)) setUsage(event.detail);
    };
    window.addEventListener(CLARA_AI_USAGE_UPDATED_EVENT, handleUsageUpdate);

    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener(CLARA_AI_USAGE_UPDATED_EVENT, handleUsageUpdate);
    };
  }, [disabled, hasPreviewUsage, isActive]);

  useEffect(() => {
    if (!detailsOpen || typeof window === "undefined") return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailsOpen]);

  if (!targets.question) return null;

  const showUsage = validUsage(usage);
  const limit = showUsage ? Math.max(1, Number(usage.limit)) : 0;
  const used = showUsage ? Math.max(0, Number(usage.used || limit - Number(usage.remaining || 0))) : 0;
  const remaining = showUsage ? Math.max(0, Number(usage.remaining)) : 0;
  const tier = String(usage?.tier || "free").trim().toLowerCase() || "free";
  const tierLabel = getUsageTierLabel(tier);
  const highestTier = tier === "champion";

  return (
    <>
      {createPortal(
        <>
          <style>{`
            [data-clara-buy-check-active-question="true"] {
              margin-top: 22px !important;
              position: relative !important;
            }
            [data-clara-buy-check-active-question="true"] > strong,
            [data-clara-buy-check-active-question="true"] > span {
              display: none !important;
            }
          `}</style>
          <div
            data-clara-buy-check-daily-usage="true"
            className="relative flex min-h-8 items-center justify-center"
          >
            <strong className="text-[21px] font-black leading-[1.2] tracking-[-0.035em] text-white/[0.98]">
              Ask before you spend.
            </strong>
          </div>
        </>,
        targets.question,
      )}

      {showUsage && targets.board
        ? createPortal(
            <button
              type="button"
              data-clara-buy-check-usage-button="true"
              data-clara-buy-check-usage-preview={hasPreviewUsage ? "true" : undefined}
              className="absolute bottom-3 left-3 z-30 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-blue-300/32 bg-[#07152d]/92 text-[11px] font-black tabular-nums tracking-[-0.02em] text-blue-100 shadow-[0_12px_30px_rgba(23,105,255,0.20),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-150 hover:border-blue-200/55 hover:bg-[#0a1c3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/55 active:scale-[0.96]"
              aria-label={`${remaining} CLARA replies remaining today. Tap for allowance details.`}
              aria-haspopup="dialog"
              aria-expanded={detailsOpen}
              title={`${remaining} CLARA replies remaining today. Tap for details.`}
              onClick={() => setDetailsOpen(true)}
            >
              {remaining}
            </button>,
            targets.board,
          )
        : null}

      {detailsOpen && showUsage && typeof document !== "undefined"
        ? createPortal(
            <div
              data-clara-buy-check-usage-dialog="true"
              className="fixed inset-0 z-[2147482500] flex items-end justify-center bg-black/55 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-8 backdrop-blur-sm sm:items-center"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setDetailsOpen(false);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="clara-buy-check-usage-title"
                className="relative w-full max-w-[370px] overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,24,43,.99),rgba(4,12,27,.995))] p-5 text-white shadow-[0_26px_90px_rgba(0,0,0,.58)]"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[2px]"
                  style={{
                    background: "linear-gradient(90deg, #2563eb 0 58%, #facc15 58% 72%, #ef4444 72% 100%)",
                  }}
                />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black tracking-[0.18em] text-blue-200/55">CLARA AI ALLOWANCE</p>
                    <h2 id="clara-buy-check-usage-title" className="mt-1 text-[22px] font-black tracking-[-0.03em] text-white">
                      {remaining} {remaining === 1 ? "reply" : "replies"} left today
                    </h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close CLARA AI allowance details"
                    onClick={() => setDetailsOpen(false)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-lg font-medium leading-none text-white/65 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-3">
                    <p className="text-[8px] font-bold tracking-[0.12em] text-white/35">ACCESS</p>
                    <p className="mt-1 truncate text-[11px] font-bold text-white/85">{tierLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-center">
                    <p className="text-[8px] font-bold tracking-[0.12em] text-white/35">DAILY</p>
                    <p className="mt-1 text-base font-black text-blue-100">{limit}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-center">
                    <p className="text-[8px] font-bold tracking-[0.12em] text-white/35">USED</p>
                    <p className="mt-1 text-base font-black text-white/80">{used}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-4 text-[12px] leading-5 text-white/62">
                  <div>
                    <p className="font-bold text-white/88">Why do I only get this many?</p>
                    <p className="mt-1">
                      Your Ask Before You Spend replies use a daily AI allowance based on your current CLARA access tier. Your current tier includes {limit} AI {limit === 1 ? "reply" : "replies"} per day.
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-white/88">How can I get more?</p>
                    <p className="mt-1">
                      {highestTier
                        ? "You already have CLARA's highest current daily AI allowance."
                        : "Higher CLARA supporter tiers come with a larger daily AI allowance. You can view the available options in Settings → Plan & Billing or through Support CLARA."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-blue-300/12 bg-blue-400/[0.045] px-3.5 py-3 text-[10px] leading-4 text-blue-100/60">
                  This limit applies only to CLARA AI replies inside Ask Before You Spend. Core CLARA features remain free. Your allowance resets daily in {usage.timeZone || "Asia/Manila"} time.
                </div>

                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="mt-4 h-11 w-full rounded-2xl border border-blue-300/25 bg-blue-500/[0.11] text-xs font-bold text-blue-50 transition hover:bg-blue-500/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
                >
                  Got it
                </button>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}