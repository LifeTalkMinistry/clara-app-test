export default function EmptyState({
  icon: Icon,
  title = "Nothing here yet",
  description = "There’s no content available right now.",
  action = null,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-8 text-center text-white">
      {Icon ? (
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-emerald-400" />
        </div>
      ) : null}

      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>

      <p className="text-sm text-white/60 max-w-md mx-auto mb-5">
        {description}
      </p>

      {action}
    </div>
  );
}