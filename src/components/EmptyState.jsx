export default function EmptyState({
  icon: Icon,
  title = "Nothing here yet",
  description = "",
  action = null,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      <h3 className="font-heading font-semibold text-lg mb-1">{title}</h3>

      {description ? (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      ) : null}

      {action ? <div>{action}</div> : null}
    </div>
  );
}