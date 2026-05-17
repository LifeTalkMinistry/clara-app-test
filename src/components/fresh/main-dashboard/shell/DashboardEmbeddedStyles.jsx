export default function DashboardEmbeddedStyles() {
  return (
    <style>{`
        .theme-page-shell {
          overscroll-behavior-x: auto;
          scroll-padding-bottom: 0;
        }

        .clara-finance-bubble-wallet {
          contain: layout paint style;
          transform: translateZ(0);
          will-change: opacity, transform;
        }

        .clara-theme-nav-pill-active {
          background:
            radial-gradient(circle at top, color-mix(in srgb, var(--theme-glow) 22%, transparent), transparent 58%),
            color-mix(in srgb, var(--theme-glow) 14%, rgba(255, 255, 255, 0.08)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            0 0 18px color-mix(in srgb, var(--theme-glow) 16%, transparent);
        }

        .clara-theme-nav-pill-active .clara-theme-nav-icon-shell {
          border-color: color-mix(in srgb, var(--theme-glow) 58%, rgba(255, 255, 255, 0.18)) !important;
          background:
            radial-gradient(circle at 32% 18%, rgba(255, 255, 255, 0.26), transparent 34%),
            radial-gradient(circle at 64% 78%, color-mix(in srgb, var(--theme-glow) 34%, transparent), transparent 50%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--theme-glow) 30%, rgba(255, 255, 255, 0.11)),
              color-mix(in srgb, var(--theme-glow) 16%, rgba(255, 255, 255, 0.055))
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 0 0 1px color-mix(in srgb, var(--theme-glow) 14%, transparent),
            0 0 26px color-mix(in srgb, var(--theme-glow) 28%, transparent) !important;
          color: color-mix(in srgb, var(--theme-glow) 22%, white) !important;
        }

        .clara-theme-nav-pill-active .clara-theme-nav-icon-shell-light {
          background:
            radial-gradient(circle at 32% 18%, rgba(255, 255, 255, 0.78), transparent 34%),
            radial-gradient(circle at 64% 78%, color-mix(in srgb, var(--theme-glow) 25%, transparent), transparent 50%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--theme-glow) 18%, rgba(255, 255, 255, 0.94)),
              rgba(248, 250, 252, 0.88)
            ) !important;
          color: color-mix(in srgb, var(--theme-glow) 48%, rgb(15, 23, 42)) !important;
        }


        .clara-theme-nav-icon-shell {
          --clara-nav-icon-accent: var(--theme-glow, #22d3ee);
          border-color: color-mix(in srgb, var(--clara-nav-icon-accent) 34%, rgba(255, 255, 255, 0.14)) !important;
          background:
            radial-gradient(circle at 32% 20%, rgba(255, 255, 255, 0.20), transparent 34%),
            radial-gradient(circle at 62% 76%, color-mix(in srgb, var(--clara-nav-icon-accent) 20%, transparent), transparent 48%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--clara-nav-icon-accent) 16%, rgba(255, 255, 255, 0.075)),
              color-mix(in srgb, var(--clara-nav-icon-accent) 9%, rgba(255, 255, 255, 0.035))
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 0 0 1px color-mix(in srgb, var(--clara-nav-icon-accent) 8%, transparent),
            0 0 18px color-mix(in srgb, var(--clara-nav-icon-accent) 13%, transparent) !important;
          color: color-mix(in srgb, var(--clara-nav-icon-accent) 18%, white) !important;
        }

        @keyframes claraDashboardPanelForwardIn {
          0% {
            opacity: 0;
            transform: translate3d(18px, 0, 0);
          }

          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes claraDashboardPanelReverseIn {
          0% {
            opacity: 0;
            transform: translate3d(-18px, 0, 0);
          }

          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
  );
}
