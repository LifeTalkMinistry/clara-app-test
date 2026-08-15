import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

export default function ClaraBuyCheckUsagePortal({ isActive = false, disabled = false }) {
  const [targets, setTargets] = useState({ question: null, board: null });
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!isActive || disabled || typeof document === "undefined") {
      setTargets({ question: null, board: null });
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
    };
  }, [disabled, isActive]);

  useEffect(() => {
    if (!isActive || disabled || typeof window === "undefined") return undefined;

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
  }, [disabled, isActive]);

  if (!targets.question) return null;

  const showUsage = validUsage(usage);
  const remaining = showUsage ? Math.max(0, Number(usage.remaining)) : 0;

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
            <span
              className="pointer-events-none absolute bottom-3 left-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-300/32 bg-[#07152d]/92 text-[11px] font-black tabular-nums tracking-[-0.02em] text-blue-100 shadow-[0_12px_30px_rgba(23,105,255,0.20),inset_0_1px_0_rgba(255,255,255,0.06)]"
              aria-label={`${remaining} CLARA replies remaining today`}
              title={`${remaining} CLARA replies remaining today`}
            >
              {remaining}
            </span>,
            targets.board,
          )
        : null}
    </>
  );
}
