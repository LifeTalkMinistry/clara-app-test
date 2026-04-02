export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      
      <div className="flex-1 min-w-0">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-white truncate">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm text-white/60 mt-1 line-clamp-2">
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