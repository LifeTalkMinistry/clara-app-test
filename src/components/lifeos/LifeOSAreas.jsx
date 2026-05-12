import {
  BriefcaseBusiness,
  HeartPulse,
  Landmark,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Card, Kicker } from "./LifeOSShared";

const areas = [
  {
    icon: Landmark,
    title: "Financial Focus",
    detail: "Debt, savings, bills, budget pressure, and spending priorities.",
  },
  {
    icon: HeartPulse,
    title: "Health & Energy",
    detail: "Energy level, stress, rest, food choices, and convenience spending.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Career / Work",
    detail: "Work pressure, income timing, ambition, burnout, and productivity patterns.",
  },
  {
    icon: ShieldCheck,
    title: "Personal Discipline",
    detail: "Habits, routines, impulses, consistency, and follow-through.",
  },
  {
    icon: UsersRound,
    title: "Relationships / Family",
    detail: "Family needs, social pressure, support, giving, and shared responsibilities.",
  },
  {
    icon: Sparkles,
    title: "Spiritual / Growth",
    detail: "Values, purpose, reflection, learning, and long-term direction.",
  },
];

export default function LifeOSAreas() {
  return (
    <div className="space-y-4">
      <Card className="border-cyan-300/22 bg-[linear-gradient(135deg,rgba(17,94,89,.22),rgba(59,7,100,.30))]">
        <Kicker>Life areas</Kicker>
        <h2 className="mt-3 text-xl font-black leading-tight text-white">
          Help CLARA understand the context behind the spending.
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Life Areas help CLARA understand the user's broader context, so money advice can consider pressure, responsibilities, energy, goals, and values.
        </p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {areas.map((area) => {
          const Icon = area.icon;

          return (
            <button
              key={area.title}
              type="button"
              aria-label={`Open ${area.title}`}
              className="group rounded-[24px] border border-white/10 bg-white/[.035] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/24 hover:bg-white/[.055] hover:shadow-[0_0_22px_rgba(34,211,238,.10)] active:translate-y-0 active:scale-[.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/14 bg-cyan-300/[.045] text-cyan-100/78 transition duration-200 group-hover:scale-105 group-hover:text-cyan-100">
                <Icon className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-base font-black text-white">{area.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/56">{area.detail}</p>

              <p className="mt-3 text-[11px] font-black uppercase tracking-[.16em] text-white/34 transition duration-200 group-hover:text-cyan-100/60">
                Context card
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
