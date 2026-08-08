import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, UsersRound } from "lucide-react";
import CommunityBackend from "./CommunityBackend";
import Challenges from "./Challenges";
import MyCircle from "./MyCircle";

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
