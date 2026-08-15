import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OVERLAY_SELECTOR = '[data-clara-pause-overlay="true"]';

function ProfileTrigger({ filledCount, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open CLARA Life Profile"
      className="absolute left-3 top-[10px] z-[90] grid h-[42px] w-[42px] place-items-center overflow-visible rounded-full border border-[#4d8cff]/42 bg-[#07152d] text-blue-100 shadow-[0_12px_30px_rgba(23,105,255,0.20),inset_0_1px_0_rgba(255,255,255,0.07)] transition hover:border-[#4d8cff]/70 hover:bg-[#0a1d3c] active:scale-95"
      data-clara-life-profile-trigger="true"
    >
      <span className="pointer-events-none absolute inset-[3px] rounded-full border border-white/[0.055]" />
      <UserRound className="relative h-[18px] w-[18px]" strokeWidth={2.2} />
      <span
        className="pointer-events-none absolute -bottom-[2px] left-1/2 flex -translate-x-1/2 gap-[2px]"
        aria-hidden="true"
      >
        <span className="h-[2px] w-[7px] rounded-full bg-[#4d8cff]" />
        <span className="h-[2px] w-[4px] rounded-full bg-[#ffd42f]" />
        <span className="h-[2px] w-[7px] rounded-full bg-[#ff4d55]" />
      </span>
      {filledCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[17px] rounded-full border border-[#07152d] bg-[#1769ff] px-1 py-0.5 text-[8px] font-black leading-none text-white shadow-[0_4px_12px_rgba(23,105,255,0.38)]">
          {filledCount > 99 ? "99+" : filledCount}
        </span>
      ) : null}
    </button>
  );
}

export default function ClaraLifeProfilePortal({
  isActive = false,
  disabled = false,
  filledCount = 0,
  onBeforeOpen,
}) {
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    if (!isActive || disabled || typeof document === "undefined") {
      setOverlay(null);
      return undefined;
    }

    const syncOverlay = () => {
      const nextOverlay = document.querySelector(OVERLAY_SELECTOR);
      setOverlay((current) => (current === nextOverlay ? current : nextOverlay));
    };

    syncOverlay();
    const observer = new MutationObserver(syncOverlay);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [disabled, isActive]);

  if (!isActive || disabled || !overlay) return null;

  const openLifeProfile = () => {
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
      {createPortal(
        <ProfileTrigger filledCount={filledCount} onOpen={openLifeProfile} />,
        overlay,
      )}
    </>
  );
}
