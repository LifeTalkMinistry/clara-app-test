export default function PageHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2">
      
      {/* TEXT */}
      <div className="min-w-0">
        <p className="text-[10px] text-white/50">Welcome back,</p>

        <h1 className="text-lg font-bold text-white truncate leading-tight">
          {title}
        </h1>
      </div>

      {/* ACTION */}
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