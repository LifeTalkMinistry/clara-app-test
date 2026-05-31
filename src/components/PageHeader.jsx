export default function PageHeader({ title, subtitle = "", action }) {
  const isSavingsGoals = title === "Savings Goals";

  if (isSavingsGoals) {
    return (
      <header className="mb-5 overflow-visible rounded-[28px] border border-white/10 bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pr-1">
            <h1 className="break-words text-[18px] font-black leading-tight tracking-[-0.03em] text-[color:var(--theme-text)] sm:text-xl">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-1 max-w-[13.5rem] text-[12px] font-medium leading-relaxed text-[color:var(--theme-muted-text)] sm:max-w-none sm:text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>

          {action ? (
            <div className="shrink-0 pt-0.5">
              <div className="rounded-2xl p-0.5 [&>button]:h-9 [&>button]:rounded-2xl [&>button]:border [&>button]:border-white/12 [&>button]:bg-white/[0.065] [&>button]:px-3.5 [&>button]:text-[12px] [&>button]:font-bold [&>button]:text-white/92 [&>button]:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_26px_rgba(0,0,0,0.18)] [&>button]:backdrop-blur-sm [&>button]:transition [&>button]:hover:bg-white/[0.10] [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-cyan-300/30">
                {action}
              </div>
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className="mb-4 flex items-start justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.035] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:items-center sm:px-5">
      <div className="min-w-0 flex-1 pr-2">
        <h1 className="break-words text-[18px] font-black leading-tight tracking-[-0.03em] text-[color:var(--theme-text)] sm:text-xl">
          {title}
        </h1>

        {subtitle ? (
          <p className="mt-1 max-w-[18rem] text-[12px] font-medium leading-relaxed text-[color:var(--theme-muted-text)] sm:max-w-none sm:text-sm">
            {subtitle}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="shrink-0 pt-0.5 sm:pt-0">
          <div className="[&>button]:h-9 [&>button]:rounded-2xl [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/[0.055] [&>button]:px-3 [&>button]:text-[12px] [&>button]:font-bold [&>button]:text-white/90 [&>button]:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] [&>button]:backdrop-blur-sm [&>button]:transition [&>button]:hover:bg-white/[0.09] [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-cyan-300/30">
            {action}
          </div>
        </div>
      ) : null}
    </header>
  );
}
