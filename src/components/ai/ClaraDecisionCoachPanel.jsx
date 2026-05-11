import ClaraDecisionDockPanel from "./ClaraDecisionDockPanel";

const CLARA_DOCK_VISUAL_FIX = `
  .clara-dock-card {
    background: rgba(2, 6, 23, 0.985) !important;
    border-color: rgba(255, 255, 255, 0.18) !important;
    box-shadow:
      0 24px 74px rgba(0, 0, 0, 0.72),
      0 0 0 1px rgba(255, 255, 255, 0.075),
      inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
    backdrop-filter: blur(26px) saturate(1.18) !important;
    -webkit-backdrop-filter: blur(26px) saturate(1.18) !important;
  }

  .clara-dock-card::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 0% 0%, rgba(45, 212, 191, 0.16), transparent 42%),
      radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.16), transparent 48%),
      linear-gradient(135deg, rgba(6, 47, 64, 0.52), rgba(15, 23, 42, 0.72) 44%, rgba(30, 27, 75, 0.62));
  }

  .clara-dock-card > * {
    position: relative;
    z-index: 1;
  }

  .clara-dock-tail {
    background: rgba(2, 6, 23, 0.985) !important;
    border-color: rgba(255, 255, 255, 0.18) !important;
  }

  .clara-dock-card form,
  .clara-dock-card input,
  .clara-dock-card button,
  .clara-dock-card .clara-dock-chip,
  .clara-dock-card .rounded-2xl,
  .clara-dock-card [class*="bg-white/"],
  .clara-dock-card [class*="bg-white\\/"],
  .clara-dock-card [class*="bg-slate-950/"],
  .clara-dock-card [class*="bg-slate-950\\/"] {
    backdrop-filter: blur(18px) !important;
    -webkit-backdrop-filter: blur(18px) !important;
  }

  .clara-dock-card form,
  .clara-dock-card .clara-dock-chip,
  .clara-dock-card [class*="bg-white/["],
  .clara-dock-card [class*="bg-white\\/["],
  .clara-dock-card [class*="bg-slate-950/55"],
  .clara-dock-card [class*="bg-slate-950\\/55"] {
    background-color: rgba(15, 23, 42, 0.84) !important;
    border-color: rgba(255, 255, 255, 0.14) !important;
  }

  .clara-dock-card input {
    background: transparent !important;
  }

  .clara-dock-card h2,
  .clara-dock-card p,
  .clara-dock-card span,
  .clara-dock-card input,
  .clara-dock-card button {
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.42);
  }
`;

export default function ClaraDecisionCoachPanel(props) {
  return (
    <>
      <style>{CLARA_DOCK_VISUAL_FIX}</style>
      <ClaraDecisionDockPanel {...props} />
    </>
  );
}
