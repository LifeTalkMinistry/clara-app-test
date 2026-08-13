import { Flame, Trophy, Users } from "lucide-react";

function Metric({ icon: Icon, value, label, tone = "blue" }) {
  return (
    <div className="rounded-[17px] border border-white/[0.08] bg-[#071725] px-2 py-3 text-center">
      <Icon className={`mx-auto h-3.5 w-3.5 ${tone === "gold" ? "text-[#facc15]" : "text-[#5ea8ff]"}`} />
      <p className="mt-1.5 text-lg font-black tracking-[-0.035em] text-white">{value}</p>
      <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/34">{label}</p>
    </div>
  );
}

export default function WeeklyContenderViewer() {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#2f7df6]/20 bg-[#0a1a29] p-4">
      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#2f7df6]/[0.08] blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#5ea8ff]/65">Weekly contenders</p>
            <h3 className="mt-1 text-base font-black tracking-[-0.02em] text-white">You&apos;re doing this together.</h3>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#2f7df6]/20 bg-[#2f7df6]/[0.09] text-[#78b4ff]">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric icon={Users} value="—" label="Contenders" />
          <Metric icon={Flame} value="—" label="Still in" />
          <Metric icon={Trophy} value="—" label="Qualified" tone="gold" />
        </div>

        <div className="mt-3 rounded-[17px] border border-white/[0.07] bg-white/[0.022] px-3.5 py-3 text-center">
          <p className="text-[10px] font-semibold leading-4 text-white/38">Community challenge totals will appear here when the shared weekly board is available.</p>
        </div>
      </div>
    </section>
  );
}
