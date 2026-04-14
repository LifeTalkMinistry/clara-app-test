export default function PageHeader({ title, subtitle = "", action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2">
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-white truncate leading-tight">
          {title}
        </h1>

        {subtitle ? (
          <p className="mt-1 text-sm text-white/55">{subtitle}</p>
        ) : null}
      </div>

      {action && (
        <div className="shrink-0">
          <div className="scale-90 origin-right">
            {action}
          </div>
        </div>
      )}
    </div>
  );
}
