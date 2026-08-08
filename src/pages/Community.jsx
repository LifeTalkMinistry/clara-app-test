import { Link, useSearchParams } from "react-router-dom";
import { Trophy } from "lucide-react";
import CommunityBackend from "./CommunityBackend";
import Challenges from "./Challenges";

export default function Community() {
  const [searchParams] = useSearchParams();

  if (searchParams.get("view") === "challenges") {
    return <Challenges />;
  }

  return (
    <div className="clara-community-challenge-entry">
      <CommunityBackend />

      <style>{`
        .clara-community-challenge-entry header > div > div:last-child {
          margin-left: 52px;
        }
      `}</style>

      <Link
        to="/community?view=challenges"
        className="fixed right-[168px] top-[max(12px,env(safe-area-inset-top))] z-[95] inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#22c7b8]/25 bg-[#22c7b8]/10 text-[#ccfbf1] transition hover:border-[#5eead4]/45 hover:bg-[#22c7b8]/16 sm:right-[176px] lg:right-[calc((100vw-64rem)/2+176px)]"
        aria-label="Open CLARA Challenges"
        title="CLARA Challenges"
      >
        <Trophy className="h-[18px] w-[18px]" />
      </Link>
    </div>
  );
}
