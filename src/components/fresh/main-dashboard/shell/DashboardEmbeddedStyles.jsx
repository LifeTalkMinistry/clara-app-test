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
