import { ChevronDown, ChevronUp } from "lucide-react";

export default function BudgetExpandToggle({ expanded = false, onToggleDetails }) {
  return (
    <button
      type="button"
      onClick={onToggleDetails}
      className="flex w-full items-center justify-between rounded-2xl border border-cyan-200/15 bg-white/[0.055] px-3 py-2.5 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-cyan-200/25 hover:bg-white/10"
    >
      <span className="font-medium">
        {expanded ? "Hide details" : "Show details"}
      </span>
      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}
