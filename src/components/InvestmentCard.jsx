import { TrendingUp } from "lucide-react";

const getInvestmentShellClass = (tone = "gold") => {
  const toneMap = {
    emerald:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_36%),linear-gradient(135deg,rgba(4,25,24,0.94),rgba(3,14,24,0.98))]",
    teal:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_36%),linear-gradient(135deg,rgba(4,23,30,0.94),rgba(3,14,24,0.98))]",
    blue:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_36%),linear-gradient(135deg,rgba(8,18,52,0.94),rgba(3,14,24,0.98))]",
    gold:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_36%),linear-gradient(135deg,rgba(29,18,8,0.94),rgba(3,14,24,0.98))]",
    rose:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.15),transparent_36%),linear-gradient(135deg,rgba(40,12,18,0.94),rgba(3,14,24,0.98))]",
  };

  return toneMap[tone] || toneMap.gold;
};

export default function InvestmentCard({ item = null }) {
  const data = item?.data || {};

  return (
    <div
      className={`relative flex h-full min-h-[inherit] flex-col justify-between overflow-hidden rounded-[inherit] border p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl ${getInvestmentShellClass(item?.tone || "gold")}`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-20 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.075] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
          {data.ctaLabel || "Coming soon"}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              CLARA Financial Carousel
            </p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
              {data.title || item?.label || "Investment Fund"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/62">
              {data.subtitle || "Investment tracking is ready for setup."}
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-white/80 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="relative mt-6 rounded-3xl border border-white/12 bg-white/[0.055] p-4">
        <p className="text-sm leading-6 text-white/64">
          {data.description ||
            "This card is reserved for future investment fund data without breaking Dashboard.jsx."}
        </p>
      </div>
    </div>
  );
}
