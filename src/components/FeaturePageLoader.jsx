export default function FeaturePageLoader({ label = "Loading feature..." }) {
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
        <div className="border-b border-white/10 p-5">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="mt-3 h-7 w-48 rounded-full bg-white/10" />
          <div className="mt-3 h-3 w-64 max-w-full rounded-full bg-white/5" />
        </div>

        <div className="space-y-4 p-5">
          <div className="h-24 rounded-3xl bg-white/[0.04]" />
          <div className="h-24 rounded-3xl bg-white/[0.04]" />
          <div className="h-24 rounded-3xl bg-white/[0.04]" />
        </div>

        <div className="px-5 pb-5 text-sm text-white/50">{label}</div>
      </div>
    </div>
  );
}
