export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(90deg,#0e5f2f_0%,#148b56_45%,#1c9ed0_100%)] px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:px-7 md:py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm text-white/80">Welcome back,</p>
            <h1 className="truncate text-3xl font-bold leading-tight text-white md:text-5xl">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-2 max-w-xl text-sm text-white/75 md:text-base">
                {subtitle}
              </p>
            )}
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  );
}