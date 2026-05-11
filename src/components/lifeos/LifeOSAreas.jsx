import { Brain, HeartHandshake, ShieldAlert, Sparkles, Target } from "lucide-react";
import { Card, Kicker, Row } from "./LifeOSShared";

const areas = [
  "Food & Daily Lifestyle",
  "Work & Career",
  "Goals & Future Plans",
  "Health & Wellness",
  "Friends & Social Life",
  "Debt & Obligations",
  "Family Responsibilities",
  "Values & Giving",
];

export default function LifeOSAreas() {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Kicker>Choose life area</Kicker>
            <p className="mt-2 text-sm leading-5 text-white/55">
              CLARA uses life context to understand the reason behind money decisions.
            </p>
          </div>

          <div className="hidden rounded-full border border-pink-400/18 bg-pink-400/[.06] px-3 py-1 text-[11px] font-black uppercase tracking-[.18em] text-pink-100/70 md:block">
            Context engine
          </div>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {areas.map((item, index) => (
            <button
              key={item}
              type="button"
              className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                index === 1
                  ? "border-cyan-300/35 bg-cyan-300/[.08] text-white shadow-[0_0_18px_rgba(34,211,238,.12)]"
                  : "border-white/10 bg-white/[.025] text-white/68 hover:bg-white/[.045]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <Kicker>Guided check-in</Kicker>
        <Row icon={Sparkles} title="What happened today?" detail="Capture the real context first." />
        <Row icon={Target} title="How did it affect your spending?" detail="Track emotional or pressure-based decisions." />
        <Row icon={Brain} title="What was your emotional state?" detail="Stress, pressure, excitement, or comfort." />
        <Row icon={HeartHandshake} title="Did someone influence the decision?" detail="Social pressure matters too." />
        <Row icon={ShieldAlert} title="Was this aligned with your priorities?" detail="Protect long-term stability." />
      </Card>
    </div>
  );
}
