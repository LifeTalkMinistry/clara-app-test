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

        /*
          One-screen phone layout
          -----------------------
          Narrow Android devices lose usable height to both the status bar and
          three-button navigation. Keep every collapsed Home section visible by
          tightening only the presentation layer. Expanded cards and full pages
          retain their normal scrollable height.
        */
        @media (max-width: 430px) and (max-height: 1000px) {
          #root .clara-dashboard-main {
            padding-top: 0 !important;
            padding-bottom: calc(2px + env(safe-area-inset-bottom)) !important;
            scroll-padding-bottom: calc(2px + env(safe-area-inset-bottom)) !important;
          }

          #root .clara-dashboard-main::after {
            height: 0 !important;
            min-height: 0 !important;
          }

          #root .clara-dashboard-main [data-clara-guide-learning-hub-section="true"] > div {
            --clara-hub-rail-gap: 8px;
          }

          #root .clara-dashboard-main [data-clara-daily-tip-card="true"] > [role="button"] {
            height: clamp(132px, 17dvh, 140px) !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card][data-expanded="false"] > :last-child {
            height: 100% !important;
            min-height: 0 !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card="budget"] > :last-child {
            padding: 12px 13px 10px !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card="budget"] > :last-child > .relative {
            gap: 8px !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card="budget"] > :last-child > .relative > div:first-child {
            padding: 10px !important;
            border-radius: 22px !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card="budget"] > :last-child > .relative > div:first-child > div:last-child {
            margin-top: 8px !important;
            padding: 8px !important;
            border-radius: 19px !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card="budget"] > :last-child > .relative > div:first-child > div:last-child > div:first-child {
            margin-bottom: 8px !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card="budget"] > :last-child > .relative > div:first-child > div:last-child > div:first-child > p:first-child {
            font-size: clamp(28px, 7.4vw, 32px) !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card="budget"] > :last-child > .relative > div:first-child > div:last-child > div:first-child > p:last-child {
            margin-top: 6px !important;
            font-size: 12px !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card="budget"] > :last-child > .relative > div:last-child {
            margin-top: 0 !important;
            padding-top: 7px !important;
          }

          #root .clara-dashboard-main .clara-finance-slide-shell[data-expanded="false"] [data-finance-card="budget"] > :last-child > .relative > div:last-child button {
            padding-top: 9px !important;
            padding-bottom: 9px !important;
          }

          #root .clara-dashboard-main [data-clara-dashboard-section="money-summary"] {
            min-height: 94px !important;
          }

          #root .clara-dashboard-main [data-clara-dashboard-section="money-summary"] > [data-clara-summary-card] {
            min-height: 94px !important;
            padding: 10px 12px !important;
          }

          #root .clara-dashboard-main [data-clara-summary-card="money-left"] > div {
            padding-right: 104px !important;
          }

          #root .clara-dashboard-main [data-clara-orb-control="true"] {
            right: 12px !important;
            width: 64px !important;
            height: 64px !important;
          }
        }

        @media (max-width: 430px) and (max-height: 700px) {
          #root .clara-dashboard-main [data-clara-daily-tip-card="true"] > [role="button"] {
            height: 122px !important;
          }

          #root .clara-dashboard-main [data-clara-dashboard-section="money-summary"],
          #root .clara-dashboard-main [data-clara-dashboard-section="money-summary"] > [data-clara-summary-card] {
            min-height: 86px !important;
          }
        }
      `}</style>
  );
}
