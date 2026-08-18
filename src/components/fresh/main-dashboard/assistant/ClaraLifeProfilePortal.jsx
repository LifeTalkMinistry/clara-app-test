import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OVERLAY_SELECTOR = '[data-clara-pause-overlay="true"]';
const BOARD_SELECTOR = '[data-clara-pause-entry-board="true"]';

function ProfileTrigger({ onOpen, previewOnly = false }) {
  return (
    <button
      type="button"
      onClick={previewOnly ? undefined : onOpen}
      aria-label={previewOnly ? "CLARA Life Profile preview" : "Open CLARA Life Profile"}
      aria-disabled={previewOnly ? "true" : undefined}
      className="absolute left-3 top-[10px] z-[90] grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-full border border-[#4d8cff]/42 bg-[#07152d] text-blue-100 shadow-[0_12px_30px_rgba(23,105,255,0.20),inset_0_1px_0_rgba(255,255,255,0.07)] transition hover:border-[#4d8cff]/70 hover:bg-[#0a1d3c] active:scale-95"
      data-clara-life-profile-trigger="true"
      data-clara-life-profile-preview={previewOnly ? "true" : undefined}
    >
      <span className="pointer-events-none absolute inset-[3px] rounded-full border border-white/[0.055]" />
      <UserRound className="relative h-[18px] w-[18px]" strokeWidth={2.2} />
    </button>
  );
}

function CloseTrigger({ onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close CLARA Ask Before You Spend"
      className="absolute right-3 top-[10px] z-[90] grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-full border border-[#4d8cff]/42 bg-[#07152d] text-white/90 shadow-[0_12px_30px_rgba(23,105,255,0.16),inset_0_1px_0_rgba(255,255,255,0.07)] transition hover:border-[#4d8cff]/70 hover:bg-[#0a1d3c] active:scale-95"
      data-clara-buy-check-contained-close="true"
    >
      <span className="pointer-events-none absolute inset-[3px] rounded-full border border-white/[0.055]" />
      <X className="relative h-4 w-4" strokeWidth={2} />
    </button>
  );
}

export default function ClaraLifeProfilePortal({
  isActive = false,
  disabled = false,
  previewOnly = false,
  onBeforeOpen,
  onClose,
}) {
  const navigate = useNavigate();
  const [targets, setTargets] = useState({ overlay: null, board: null });

  useEffect(() => {
    if (!isActive || disabled || typeof document === "undefined") {
      setTargets({ overlay: null, board: null });
      return undefined;
    }

    const syncTargets = () => {
      const overlay = document.querySelector(OVERLAY_SELECTOR);
      const board = overlay?.querySelector(BOARD_SELECTOR) || null;
      setTargets((current) =>
        current.overlay === overlay && current.board === board ? current : { overlay, board }
      );
    };

    syncTargets();
    const observer = new MutationObserver(syncTargets);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [disabled, isActive]);

  if (!isActive || disabled) return null;

  const target = targets.board || targets.overlay;
  if (!target) return null;

  const openLifeProfile = () => {
    if (previewOnly) return;
    onBeforeOpen?.();
    navigate("/profile?view=life-context", { state: { source: "buy-check" } });
  };

  return (
    <>
      <style>{`
        body.clara-ai-environment-active
          [data-clara-pause-overlay="true"]
          > main[data-clara-ai-message-viewport="true"]
          > div.flex.min-h-full.flex-col.justify-center {
          justify-content: flex-start !important;
          padding-top: 4px !important;
        }
      `}</style>
      {targets.board ? (
        <style>{`
          body.clara-ai-environment-active
            [data-clara-pause-overlay="true"]
            [data-clara-buy-check-header="true"]
            > button[aria-label="Close CLARA Ask Before You Spend"] {
            display: none !important;
          }
        `}</style>
      ) : null}
      {createPortal(
        <>
          <ProfileTrigger onOpen={openLifeProfile} previewOnly={previewOnly} />
          {targets.board ? <CloseTrigger onClose={onClose} /> : null}
        </>,
        target,
      )}
    </>
  );
}