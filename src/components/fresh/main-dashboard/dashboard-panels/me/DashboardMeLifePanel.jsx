export default function DashboardMeLifePanel() {
  return (
    <div className="h-[calc(100svh-126px)] min-h-[520px] overflow-hidden pb-0">
      <section className="relative flex h-full min-h-0 overflow-hidden rounded-[30px] border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,55,69,.94),rgba(15,23,48,.97)_48%,rgba(47,23,83,.95))] p-[clamp(12px,3.4vw,18px)] shadow-[0_14px_46px_rgba(0,0,0,.20)]">
        <div className="relative flex min-h-0 w-full flex-col">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/40">Personal Cabinet</p>
          <h2 className="mt-1 text-[clamp(22px,7vw,30px)] font-black leading-none text-white">Me</h2>
          <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.026] p-5 text-sm font-semibold leading-6 text-white/62">Panel restored.</div>
        </div>
      </section>
    </div>
  );
}
