import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  CreditCard,
  ListChecks,
  Lock,
  Settings,
  Target,
  UserRound,
  WalletCards,
} from "lucide-react";

import LifeOSDashboard from "../components/lifeos/LifeOSDashboard";
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

function CalendarContent() {
  return (
    <div className="space-y-4">
      <Card>
        <Kicker>May 2025</Kicker>
        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-white/38">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm font-bold text-white/80">
          {Array.from({ length: 35 }, (_, i) => {
            const date = i < 3 ? 27 + i : i - 2;
            return <span key={i} className={date === 8 ? "rounded-full border border-cyan-300/70 bg-cyan-400/10 py-2 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,.26)]" : "py-2"}>{date}</span>;
          })}
        </div>
      </Card>

      <Card>
        <Kicker>Upcoming schedule</Kicker>
        <Row icon={CreditCard} title="Electric bill due in 3 days" right="May 10" />
        <Row icon={WalletCards} title="Payday on Friday" right="May 9" />
        <Row icon={Clock3} title="Planned purchase reminder" right="May 30" />
      </Card>
    </div>
  );
}

function AreasContent() {
  return (
    <div className="space-y-4">
      <Card>
        <Kicker>Choose life area</Kicker>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {["Food & Daily Lifestyle", "Work & Career", "Goals & Future Plans", "Health & Wellness", "Friends & Social Life", "Debt & Obligations", "Family Responsibilities", "Values & Giving"].map((item) => (
            <button key={item} type="button" className="rounded-2xl border border-white/10 bg-white/[.025] px-3 py-3 text-left text-sm font-semibold text-white/68 transition hover:bg-white/[.045]">{item}</button>
          ))}
        </div>
      </Card>

      <Card>
        <Kicker>Guided check-in</Kicker>
        <Row icon={Target} title="What happened today?" />
        <Row icon={ListChecks} title="How did it affect your spending?" />
      </Card>
    </div>
  );
}

function ProfileContent() {
  return (
    <div className="space-y-4">
      <Card>
        <Kicker>Why life profile</Kicker>
        <p className="mt-3 text-sm leading-6 text-white/70">Life Profile helps CLARA understand your situation without making the app feel invasive.</p>
      </Card>

      <Card>
        <Kicker>Profile details</Kicker>
        {["Birthday", "Work status", "Income cycle", "Pay schedule", "Main goals", "Savings priorities", "Debt situation", "Family responsibilities", "Personal values", "Spending boundaries"].map((item) => <Row key={item} icon={UserRound} title={item} />)}
      </Card>
    </div>
  );
}

function Content({ active }) {
  if (active === "dashboard") return <LifeOSDashboard />;
  if (active === "calendar") return <CalendarContent />;
  if (active === "areas") return <AreasContent />;
  if (active === "profile") return <ProfileContent />;

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
