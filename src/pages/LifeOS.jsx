import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock3,
  Lock,
  Settings,
  Target,
  WalletCards,
} from "lucide-react";

import LifeOSAreas from "../components/lifeos/LifeOSAreas";
import LifeOSCalendar from "../components/lifeos/LifeOSCalendar";
import LifeOSDashboard from "../components/lifeos/LifeOSDashboard";
import LifeOSProfile from "../components/lifeos/LifeOSProfile";
import {
  Card,
  Chips,
  Header,
  InsightCard,
  Kicker,
  Rail,
  Row,
  Signal,
} from "../components/lifeos/LifeOSShared";

function Content({ active }) {
  if (active === "dashboard") return <LifeOSDashboard />;
  if (active === "calendar") return <LifeOSCalendar />;
  if (active === "areas") return <LifeOSAreas />;
  if (active === "profile") return <LifeOSProfile />;

  if (active === "history") {
    return (
      <Card>
        <Kicker>Recent history</Kicker>
        <Row icon={Clock3} title="Work stress affected spending" right="Apr 27" />
        <Row icon={Target} title="CLARA advised delaying a purchase" right="Apr 21" />
      </Card>
    );
  }

  if (active === "insights") {
    return (
      <Card>
        <Kicker>Key insights</Kicker>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Signal icon={Target} title="Risk" value="Moderate" />
          <Signal icon={WalletCards} title="Protect" value="Food budget" />
          <Signal icon={Clock3} title="Pause" value="When stress is high" />
        </div>
      </Card>
    );
  }

  if (active === "settings") {
    return (
      <Card>
        <Kicker>Privacy & access</Kicker>
        <Row icon={Lock} title="Memory control" detail="Choose what CLARA can use." />
        <Row icon={Settings} title="LifeOS preferences" detail="Calendar, reminders, and access." />
      </Card>
    );
  }

  return <InsightCard>LifeOS active.</InsightCard>;
}

export default function LifeOS() {
  const [active, setActive] = useState("dashboard");
  const navigate = useNavigate();
  const topRef = useRef(null);

  useEffect(() => {
    const scrollParent = topRef.current?.closest("main");
    scrollParent?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const scrollParent = topRef.current?.closest("main");
    scrollParent?.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  return (
    <div ref={topRef} className="min-h-screen bg-[#030713] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(34,211,238,.14),transparent_29%),radial-gradient(circle_at_95%_10%,rgba(236,72,153,.14),transparent_28%),linear-gradient(180deg,#030713_0%,#040817_52%,#050713_100%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-5 md:px-5 md:py-4">
        <Rail active={active} setActive={setActive} back={() => navigate("/dashboard")} />

        <main className="min-w-0 flex-1 md:py-4">
          <button onClick={() => navigate("/dashboard")} className="mb-4 rounded-2xl border border-white/12 bg-white/[.04] px-3 py-2 text-xs font-bold text-white/62 md:hidden">
            Back to Dashboard
          </button>

          <Header active={active} />
          <Chips active={active} setActive={setActive} />
          <Content active={active} />
        </main>
      </div>
    </div>
  );
}
