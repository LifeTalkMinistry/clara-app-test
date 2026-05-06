export default function FinanceField({ label, children, helper }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white/85">{label}</span>
      {children}
      {helper ? <p className="text-xs leading-5 text-white/50">{helper}</p> : null}
    </label>
  );
}
