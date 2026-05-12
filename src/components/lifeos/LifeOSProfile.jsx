import {
  BadgeDollarSign,
  Calendar,
  Heart,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { Card, Kicker } from "./LifeOSShared";

const profileItems = [
  {
    title: "Birthday",
    detail: "Used only for age-aware life context and pacing.",
    icon: Calendar,
  },
  {
    title: "Income cycle",
    detail: "Helps CLARA understand payday confidence and low-cash windows.",
    icon: BadgeDollarSign,
  },
  {
    title: "Pay schedule",
    detail: "Connects timing pressure with daily spending decisions.",
    icon: Calendar,
  },
  {
    title: "Main goals",
    detail: "Keeps advice aligned with what the user is building toward.",
    icon: Target,
  },
  {
    title: "Savings priorities",
    detail: "Protects future plans before optional purchases.",
    icon: PiggyBank,
  },
  {
    title: "Debt situation",
    detail: "Guides CLARA when progress should be protected first.",
    icon: ShieldCheck,
  },
  {
    title: "Family responsibilities",
    detail: "Adds real-life responsibility context without judging the user.",
    icon: Heart,
  },
  {
    title: "Personal values",
    detail: "Helps CLARA support decisions that match who the user wants to become.",
    icon: UserRound,
  },
  {
    title: "Spending boundaries",
    detail: "Creates safer guardrails for emotional or pressure-based spending.",
    icon: ShieldCheck,
  },
];

export default function LifeOSProfile() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-cyan-300/22 bg-[linear-gradient(135deg,rgba(17,94,89,.24),rgba(59,7,100,.32))]">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-3xl border border-cyan-300/18 bg-cyan-300/[.06] text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,.12)]">
            <UserRound className="h-6 w-6" />
          </div>

          <div>
            <Kicker>Life profile</Kicker>
            <h2 className="mt-3 text-xl font-black leading-tight text-white">
              Stable context creates smarter financial guidance.
            </h2>
            <p className="mt-2 max-w-[560px] text-sm leading-6 text-white/62">
              Life Profile gives CLARA the baseline context it needs without making the app feel invasive or overwhelming.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {profileItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.title}
              type="button"
              aria-label={`Open ${item.title}`}
              className="group rounded-[24px] border border-white/10 bg-white/[.035] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/24 hover:bg-white/[.055] hover:shadow-[0_0_22px_rgba(34,211,238,.10)] active:translate-y-0 active:scale-[.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/14 bg-cyan-300/[.045] text-cyan-100/78 transition duration-200 group-hover:scale-105 group-hover:text-cyan-100">
                  <Icon className="h-5 w-5" />
                </div>

                <span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-white/42">
                  Private
                </span>
              </div>

              <h3 className="mt-4 text-base font-black text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/56">{item.detail}</p>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-pink-400/18 bg-pink-400/[.055] text-pink-100">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <Kicker>Privacy-first memory</Kicker>
            <p className="mt-1 text-sm leading-5 text-white/62">
              This category should feel like a protected profile, not a form. Keep the user in control of what CLARA can consider.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
