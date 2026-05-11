import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import { Card, InsightCard, Kicker, Signal } from "./LifeOSShared";

function HeroClimateCard() {
  return (
    <Card className="overflow-hidden border-cyan-300/24 bg-[linear-gradient(135deg,rgba(17,94,89,.34),rgba(59,7,100,.42))]">
      <div className="absolute inset-0 opacity-30" />
      <div className="relative">
        <Kicker>Today's decision climate</Kicker>
        <div className="mt-4 flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl border border-pink-400/20 bg-pink-400/[.08] text-pink-200 shadow-[0_0_25px_rgba(236,72,153,.15)]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black leading-tight text-white">Lower flexibility detected today.</h2>
            <p className="mt-2 max-w-[520px] text-sm leading-6 text-white/66">
              Upcoming bill pressure + emergency fund protection means optional spending may feel riskier right now.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AwarenessCard() {
  return (
    <Card>
      <Kicker>LifeOS awareness</Kicker>
      <div className="mt-4 space-y-3">
        {[
          "Stress increases convenience spending.",
          "Payday boosts confidence purchases.",
          "Evenings trigger impulsive browsing.",
        ].map((item) => (
          <div key={item} className="rounded-2xl border border-white/8 bg-white/[.03] px-4 py-3 text-sm font-medium text-white/72">
            • {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function LifeOSDashboard() {
  return (
    <div className="space-y-5">
      <HeroClimateCard />

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Kicker>Today's life state</Kicker>
            <p className="mt-2 text-sm leading-5 text-white/55">
              The current life context CLARA should consider before giving advice.
            </p>
          </div>
          <div className="hidden rounded-full border border-cyan-300/18 bg-cyan-300/[.05] px-3 py-1 text-[11px] font-black uppercase tracking-[.18em] text-cyan-100/70 md:block">
            Connected intelligence
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Signal icon={Target} title="Focus" value="Pay debt" />
          <Signal icon={WalletCards} title="Protect" value="Emergency fund" />
          <Signal icon={CalendarDays} title="Timing" value="Bill in 3 days" />
        </div>
      </Card>

      <Card className="border-pink-400/20">
        <Kicker>Timing risk</Kicker>
        <p className="mt-3 text-lg font-bold leading-7 text-white/90">
          Your electric bill is approaching, so non-essential spending may quietly hurt next week's flexibility.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-white/52">
          <Clock3 className="h-4 w-4 text-cyan-100/70" />
          Review before spending.
        </div>
      </Card>

      <AwarenessCard />

      <InsightCard>
        LifeOS now feels connected instead of isolated — timing, pressure, patterns, and priorities work together before money decisions happen.
      </InsightCard>
    </div>
  );
}
