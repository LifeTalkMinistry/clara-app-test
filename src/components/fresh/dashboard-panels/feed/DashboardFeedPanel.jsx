import { useEffect } from "react";

export default function DashboardFeedPanel({ onBack }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.hash = "/community";
    }
  }, []);

  return (
    <div className="flex min-h-[240px] items-center justify-center p-6 text-center text-sm text-white/60">
      <div>
        <p>Opening the CLARA Community feed…</p>
        {typeof onBack === "function" ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 rounded-full border border-white/10 px-4 py-2 text-xs text-white/70"
          >
            Back
          </button>
        ) : null}
      </div>
    </div>
  );
}
