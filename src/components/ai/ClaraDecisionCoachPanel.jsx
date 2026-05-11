import ClaraDecisionDockPanel from "./ClaraDecisionDockPanel";

const CLARA_DOCK_VISUAL_FIX = `
  .clara-dock-wrap {
    transform: translateY(18px) !important;
  }

  .clara-dock-card {
    background: rgba(2, 6, 23, 0.99) !important;
    border-color: rgba(255, 255, 255, 0.16) !important;
    border-radius: 1.5rem !important;
    box-shadow:
      0 26px 76px rgba(0, 0, 0, 0.78),
      0 0 0 1px rgba(255, 255, 255, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.09) !important;
    backdrop-filter: blur(30px) saturate(1.18) !important;
    -webkit-backdrop-filter: blur(30px) saturate(1.18) !important;
  }

  .clara-dock-card::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 0% 0%, rgba(45, 212, 191, 0.07), transparent 34%),
      radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.07), transparent 38%),
      linear-gradient(135deg, rgba(6, 47, 64, 0.30), rgba(15, 23, 42, 0.84) 44%, rgba(30, 27, 75, 0.48));
  }

  .clara-dock-card::after {
    content: "";
    position: absolute;
    right: 38px;
    bottom: -46px;
    width: 2px;
    height: 46px;
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(103, 232, 249, 0.38), rgba(103, 232, 249, 0));
    box-shadow: 0 0 14px rgba(103, 232, 249, 0.22);
  }

  .clara-dock-card > * {
    position: relative;
    z-index: 1;
  }

  .clara-dock-tail {
    background: rgba(2, 6, 23, 0.99) !important;
    border-color: rgba(255, 255, 255, 0.16) !important;
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
    background-color: rgba(15, 23, 42, 0.90) !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
  }

  .clara-dock-card input {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.92) !important;
  }

  .clara-dock-card input::placeholder {
    color: rgba(203, 213, 225, 0.62) !important;
  }

  .clara-dock-card h2 {
    font-size: 1.28rem !important;
    line-height: 1.04 !important;
    letter-spacing: -0.03em !important;
  }

  .clara-dock-card h2,
  .clara-dock-card p,
  .clara-dock-card span,
  .clara-dock-card input,
  .clara-dock-card button {
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.42);
  }

  .clara-dock-card .clara-dock-chip {
    min-height: 34px !important;
    padding-top: .45rem !important;
    padding-bottom: .45rem !important;
  }

  .clara-dock-card .clara-dock-chip:first-of-type {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(14, 165, 233, 0.16)) !important;
    border-color: rgba(110, 231, 183, 0.30) !important;
    box-shadow: 0 0 0 1px rgba(110, 231, 183, 0.08), 0 10px 24px rgba(16, 185, 129, 0.12) !important;
  }

  .clara-dock-card .rounded-2xl:last-child {
    border-radius: 999px !important;
    background: rgba(15, 23, 42, 0.94) !important;
    opacity: 0.86;
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
