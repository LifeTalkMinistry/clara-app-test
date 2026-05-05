import React from "react";

export default function ObligationDebt() {
  return (
    <div className="relative w-full rounded-2xl border border-white/10 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#22d3ee,transparent_40%),radial-gradient(circle_at_center,#1e3a8a,transparent_60%),radial-gradient(circle_at_bottom_right,#7c3aed,transparent_60%)] opacity-80" />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xl" />

      {/* Glow */}
      <div className="absolute inset-0 bg-cyan-400/10 blur-2xl opacity-40" />

      {/* Content */}
      <div className="relative z-10 p-5 text-white">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-300 mb-2">
          Obligations
        </div>

        <div className="text-2xl font-bold mb-1">
          ₱0
        </div>

        <div className="text-sm text-white/70">
          Manage your debts and responsibilities wisely.
        </div>
      </div>
    </div>
  );
}
