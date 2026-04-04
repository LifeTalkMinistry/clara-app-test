export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">

      <div className="flex-1 min-w-0">
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          {title}
        </h1>

        {subtitle && (
          <p className="text-base text-white/60 mt-2 max-w-xl">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}

    </div>
  );
}