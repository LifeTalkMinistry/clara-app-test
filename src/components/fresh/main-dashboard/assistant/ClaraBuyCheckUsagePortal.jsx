import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CLARA_AI_USAGE_UPDATED_EVENT,
  getClaraGeminiDailyUsage,
} from "@/lib/clara-gemini-proxy-client";

const TARGET_SELECTOR = '[data-clara-buy-check-active-question="true"]';

function validUsage(value) {
  return Boolean(
    value?.available === true &&
    Number.isFinite(Number(value.limit)) &&
    Number(value.limit) > 0 &&
    Number.isFinite(Number(value.remaining))
  );
}

export default function ClaraBuyCheckUsagePortal({ isActive = false, disabled = false }) {
  const [target, setTarget] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!isActive || disabled || typeof document === "undefined") {
      setTarget(null);
      return undefined;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      const found = document.querySelector(TARGET_SELECTOR);
      if (found) {
        setTarget(found);
        return;
      }
      secondFrame = window.requestAnimationFrame(() => {
        setTarget(document.querySelector(TARGET_SELECTOR));
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      setTarget(null);
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

  if (!target) return null;

  const showUsage = validUsage(usage);
  const remaining = showUsage ? Math.max(0, Number(usage.remaining)) : 0;
  const limit = showUsage ? Math.max(0, Number(usage.limit)) : 0;

  return createPortal(
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
        {showUsage ? (
          <span
            className="pointer-events-none absolute -left-1 top-[calc(50%+17px)] inline-flex h-7 -translate-y-1/2 items-center justify-center rounded-full border border-blue-200/20 bg-[#07162f]/88 px-2 text-[10px] font-black tabular-nums tracking-[-0.02em] text-blue-50/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_20px_rgba(0,0,0,0.22)]"
            aria-label={`${remaining} of ${limit} CLARA replies remaining today`}
            title={`${remaining} of ${limit} CLARA replies remaining today`}
          >
            <span>{remaining}</span>
            <span className="mx-0.5 text-blue-100/42">/</span>
            <span className="text-blue-100/62">{limit}</span>
          </span>
        ) : null}
        <strong className="text-[21px] font-black leading-[1.2] tracking-[-0.035em] text-white/[0.98]">
          Ask before you spend.
        </strong>
      </div>
    </>,
    target
  );
}
