import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BOARD_SELECTOR = '[data-clara-pause-entry-board="true"]';

function ProfileTrigger({ filledCount, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open CLARA Life Profile"
      className="absolute left-3 top-3 z-30 grid h-11 w-11 place-items-center overflow-visible rounded-full border border-[#4d8cff]/42 bg-[#07152d] text-blue-100 shadow-[0_12px_30px_rgba(23,105,255,0.20),inset_0_1px_0_rgba(255,255,255,0.07)] transition hover:border-[#4d8cff]/70 hover:bg-[#0a1d3c] active:scale-95"
      data-clara-life-profile-trigger="true"
    >
      <span className="pointer-events-none absolute inset-[3px] rounded-full border border-white/[0.055]" />
      <UserRound className="relative h-[19px] w-[19px]" strokeWidth={2.2} />
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
}) {
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);

  useEffect(() => {
    if (!isActive || disabled || typeof document === "undefined") {
      setBoard(null);
      return undefined;
    }

    const syncBoard = () => {
      const nextBoard = document.querySelector(BOARD_SELECTOR);
      setBoard((current) => (current === nextBoard ? current : nextBoard));
    };

    syncBoard();
    const observer = new MutationObserver(syncBoard);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [disabled, isActive]);

  if (!isActive || disabled || !board) return null;

  return createPortal(
    <ProfileTrigger
      filledCount={filledCount}
      onOpen={() => navigate("/life-profile", { state: { source: "buy-check" } })}
    />,
    board,
  );
}
