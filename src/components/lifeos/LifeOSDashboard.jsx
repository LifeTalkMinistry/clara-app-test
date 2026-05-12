import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { Card, Kicker } from "./LifeOSShared";

const detailContent = {
  climate: {
    kicker: "Decision climate",
    title: "Lower flexibility detected today",
    body: "CLARA is reading today as a lower-flexibility day because your short-term pressure is higher than usual.",
    points: [
      "A bill is close enough to affect today’s decisions.",
      "Emergency protection should stay untouched unless necessary.",
      "Optional spending may feel riskier because timing is tight.",
    ],
    action: "Avoid unplanned spending today unless it protects your priority.",
  },
  focus: {
    kicker: "Current focus",
    title: "Pay debt",
    body: "Today’s focus is about protecting progress. Debt payment should stay ahead of comfort spending.",
    points: [
      "Debt pressure quietly reduces future flexibility.",
      "Small optional spending can delay bigger recovery.",
      "Protecting the payment first keeps momentum stable.",
    ],
    action: "Protect your debt payment before optional spending.",
  },
  protect: {
    kicker: "Protection priority",
    title: "Emergency fund",
    body: "Your emergency fund is not extra money. It is your safety layer when life becomes unpredictable.",
    points: [
      "Emergency money protects you from borrowing under pressure.",
      "Keeping it untouched gives CLARA more room to guide decisions safely.",
      "Protection matters more when bills or timing pressure are close.",
    ],
    action: "Keep emergency money untouched unless necessary.",
  },
  timing: {
    kicker: "Timing awareness",
    title: "Bill in 3 days",
    body: "The bill is close enough that today’s spending should already respect it.",
    points: [
      "Upcoming payments reduce real spendable flexibility.",
      "Spending before the bill arrives can create false confidence.",
      "CLARA should treat the bill as already reserved.",
    ],
    action: "Spend as if the bill already exists.",
  },
  action: {
    kicker: "Next best action",
    title: "Protect your focus today",
    body: "The dashboard is already tracking the numbers. LifeOS only needs to guide the next behavior.",
    points: [
      "Keep today simple and intentional.",
      "Delay optional spending when the reason is unclear.",
      "Ask CLARA before making a decision that can disturb your priority.",
    ],
    action: "Ask CLARA before spending outside the plan.",
  },
};

function PressableShell({ children, className = "", onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-[26px] border border-white/10 bg-[#061026]/68 p-4 text-left shadow-[0_14px_42px_rgba(0,0,0,.22),inset_0_1px_0_rgba(255,255,255,.045)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/28 hover:bg-[#0a1430]/78 hover:shadow-[0_18px_48px_rgba(0,0,0,.26),0_0_24px_rgba(34,211,238,.08),inset_0_1px_0_rgba(255,255,255,.06)] active:translate-y-0 active:scale-[.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="absolute -bottom-12 left-6 h-28 w-28 rounded-full bg-pink-400/10 blur-2xl" />
      </div>
      <div className="relative">{children}</div>
    </button>
  );
}

function HeroClimateCard({ onOpen }) {
  return (
    <PressableShell
      onClick={() => onOpen("climate")}
      ariaLabel="Open decision climate details"
      className="border-cyan-300/24 bg-[linear-gradient(135deg,rgba(8,83,93,.42),rgba(25,22,78,.58)_50%,rgba(72,12,105,.46))] p-5 shadow-[0_16px_52px_rgba(0,0,0,.30),0_0_32px_rgba(34,211,238,.09),0_0_30px_rgba(236,72,153,.06),inset_0_1px_0_rgba(255,255,255,.065)]"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-pink-400/12 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl" />

      <Kicker>Today&apos;s decision climate</Kicker>
      <div className="mt-5 flex items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[24px] border border-pink-400/22 bg-pink-400/[.08] text-pink-200 shadow-[0_0_26px_rgba(236,72,153,.16)] transition duration-200 group-hover:scale-105 group-hover:shadow-[0_0_32px_rgba(236,72,153,.22)]">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-black leading-tight text-white md:text-2xl">
            Lower flexibility detected today.
          </h2>
          <p className="mt-2 max-w-[520px] text-sm leading-6 text-white/68">
            Upcoming bill pressure + emergency fund protection means optional spending may feel riskier right now.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-cyan-100/68">
            Understand why
            <CheckCircle2 className="h-3.5 w-3.5" />
          </p>
        </div>
      </div>
    </PressableShell>
  );
}

function LifeStateRow({ icon: Icon, title, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${title} details`}
      className="group flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[.026] px-3.5 py-3 text-left transition duration-200 hover:border-cyan-300/20 hover:bg-white/[.045] active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/12 bg-cyan-300/[.04] text-cyan-100/74 transition duration-200 group-hover:text-cyan-100">
        <Icon className="h-4.5 w-4.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">{title}</p>
        <p className="mt-0.5 truncate text-sm font-black text-white">{value}</p>
      </div>

      <span className="text-[11px] font-bold text-white/32 transition duration-200 group-hover:text-cyan-100/62">
        View
      </span>
    </button>
  );
}

function NextBestAction({ onOpen }) {
  return (
    <PressableShell
      onClick={() => onOpen("action")}
      ariaLabel="Open next best action"
      className="border-pink-400/20 bg-[linear-gradient(135deg,rgba(8,83,93,.22),rgba(36,17,78,.52),rgba(72,12,105,.34))] p-5"
    >
      <div className="pointer-events-none absolute -right-10 -bottom-12 h-36 w-36 rounded-full bg-pink-400/12 blur-3xl" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <Kicker>Next best action</Kicker>
          <h2 className="mt-3 text-xl font-black leading-tight text-white">
            Protect your focus today.
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/62">
            Avoid unplanned spending unless it supports your priority.
          </p>
        </div>

        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/[.055] text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,.14)]">
          <MessageCircle className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-5 inline-flex rounded-2xl border border-cyan-300/24 bg-cyan-300/[.075] px-4 py-2.5 text-sm font-black text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.10)]">
        Ask CLARA
      </div>
    </PressableShell>
  );
}

function DetailSheet({ detail, onClose }) {
  useEffect(() => {
    if (!detail) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/56 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm md:items-center md:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lifeos-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-[30px] border border-cyan-300/22 bg-[#071026]/95 p-5 shadow-[0_22px_80px_rgba(0,0,0,.55),0_0_40px_rgba(34,211,238,.12),inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Kicker>{detail.kicker}</Kicker>
            <h2 id="lifeos-detail-title" className="mt-3 text-2xl font-black leading-tight text-white">
              {detail.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/62">{detail.body}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close LifeOS detail"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-white/60 transition hover:bg-white/[.08] hover:text-white active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {detail.points.map((point) => (
            <div
              key={point}
              className="flex gap-3 rounded-2xl border border-white/8 bg-white/[.035] px-4 py-3"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100/78" />
              <p className="text-sm leading-5 text-white/70">{point}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-pink-400/18 bg-pink-400/[.06] px-4 py-4">
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-pink-100/70">
            Suggested next action
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/86">{detail.action}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border border-cyan-300/24 bg-cyan-300/[.08] px-4 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/[.12] active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function LifeOSDashboard() {
  const [activeDetailKey, setActiveDetailKey] = useState(null);

  const activeDetail = useMemo(() => {
    if (!activeDetailKey) return null;
    return detailContent[activeDetailKey] || null;
  }, [activeDetailKey]);

  return (
    <div className="space-y-5">
      <HeroClimateCard onOpen={setActiveDetailKey} />

      <Card className="border-white/12 bg-[#060b1d]/62 p-4 shadow-[0_12px_36px_rgba(0,0,0,.22),inset_0_1px_0_rgba(255,255,255,.045)]">
        <Kicker>Today&apos;s life state</Kicker>
        <p className="mt-2 text-sm leading-5 text-white/52">
          Quick context CLARA should consider before giving advice.
        </p>

        <div className="mt-4 space-y-2.5">
          <LifeStateRow
            icon={Target}
            title="Focus"
            value="Pay debt"
            onClick={() => setActiveDetailKey("focus")}
          />
          <LifeStateRow
            icon={WalletCards}
            title="Protect"
            value="Emergency fund"
            onClick={() => setActiveDetailKey("protect")}
          />
          <LifeStateRow
            icon={CalendarDays}
            title="Timing"
            value="Bill in 3 days"
            onClick={() => setActiveDetailKey("timing")}
          />
        </div>
      </Card>

      <NextBestAction onOpen={setActiveDetailKey} />

      <DetailSheet detail={activeDetail} onClose={() => setActiveDetailKey(null)} />
    </div>
  );
}
