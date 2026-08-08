import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { Heart, Trophy, UsersRound } from "lucide-react";
import CommunityBackend from "./CommunityBackend";
import Challenges from "./Challenges";
import MyCircle from "./MyCircle";
import { openClaraSupport } from "@/lib/open-clara-support";

export default function Community() {
  const [searchParams] = useSearchParams();
  const [headerActions, setHeaderActions] = useState(null);
  const showingChallenges = searchParams.get("view") === "challenges";
  const showingCircles = searchParams.get("view") === "circles";

  useEffect(() => {
    setHeaderActions(null);
    if (showingChallenges || showingCircles) return undefined;

    let frameId = null;
    let cancelled = false;

    const attachToHeader = () => {
      if (cancelled) return;

      const target = document.querySelector(
        ".clara-community-challenge-entry header > div > div:last-child"
      );

      if (target) {
        setHeaderActions(target);
        return;
      }

      frameId = window.requestAnimationFrame(attachToHeader);
    };

    attachToHeader();

    return () => {
      cancelled = true;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [showingChallenges, showingCircles]);

  if (showingChallenges) {
    return <Challenges />;
  }

  if (showingCircles) {
    return <MyCircle />;
  }

  return (
    <div className="clara-community-challenge-entry">
      <CommunityBackend />

      {headerActions
        ? createPortal(
            <>
              <button
                type="button"
                onClick={openClaraSupport}
                className="order-first inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/30 bg-[linear-gradient(145deg,rgba(34,211,238,.11),rgba(255,255,255,.045))] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_0_16px_rgba(34,211,238,.12)] transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.13] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.10),0_0_20px_rgba(34,211,238,.20)] active:scale-95"
                aria-label="Support CLARA"
                title="Support CLARA"
              >
                <Heart className="h-[18px] w-[18px] fill-cyan-300/30" strokeWidth={2.1} />
              </button>
              <Link
                to="/community?view=circles"
                className="order-first inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/82 transition hover:border-[#22c7b8]/35 hover:bg-[#22c7b8]/12 hover:text-[#ccfbf1]"
                aria-label="Open My Circle"
                title="My Circle"
              >
                <UsersRound className="h-[18px] w-[18px]" />
              </Link>
              <Link
                to="/community?view=challenges"
                className="order-first inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/82 transition hover:border-[#22c7b8]/35 hover:bg-[#22c7b8]/12 hover:text-[#ccfbf1]"
                aria-label="Open CLARA Challenges"
                title="CLARA Challenges"
              >
                <Trophy className="h-[18px] w-[18px]" />
              </Link>
            </>,
            headerActions
          )
        : null}
    </div>
  );
}
