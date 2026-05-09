export default function DashboardEmbeddedStyles() {
  return (
    <style>{`
        .theme-page-shell {
          overscroll-behavior-x: auto;
          scroll-padding-bottom: 0;
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

        .clara-theme-nav-icon-shell-light {
          border-color: color-mix(in srgb, var(--clara-nav-icon-accent) 32%, rgba(148, 163, 184, 0.38)) !important;
          background:
            radial-gradient(circle at 32% 20%, rgba(255, 255, 255, 0.72), transparent 34%),
            radial-gradient(circle at 62% 76%, color-mix(in srgb, var(--clara-nav-icon-accent) 18%, transparent), transparent 48%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--clara-nav-icon-accent) 12%, rgba(255, 255, 255, 0.92)),
              rgba(248, 250, 252, 0.84)
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.80),
            0 8px 20px rgba(15, 23, 42, 0.08),
            0 0 18px color-mix(in srgb, var(--clara-nav-icon-accent) 12%, transparent) !important;
          color: color-mix(in srgb, var(--clara-nav-icon-accent) 42%, rgb(15, 23, 42)) !important;
        }

        .group:hover .clara-theme-nav-icon-shell {
          border-color: color-mix(in srgb, var(--clara-nav-icon-accent) 48%, rgba(255, 255, 255, 0.20)) !important;
          background:
            radial-gradient(circle at 32% 20%, rgba(255, 255, 255, 0.24), transparent 34%),
            radial-gradient(circle at 62% 76%, color-mix(in srgb, var(--clara-nav-icon-accent) 28%, transparent), transparent 50%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--clara-nav-icon-accent) 22%, rgba(255, 255, 255, 0.09)),
              color-mix(in srgb, var(--clara-nav-icon-accent) 12%, rgba(255, 255, 255, 0.045))
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 0 0 1px color-mix(in srgb, var(--clara-nav-icon-accent) 10%, transparent),
            0 0 24px color-mix(in srgb, var(--clara-nav-icon-accent) 22%, transparent) !important;
        }

        .clara-performance-mode .clara-theme-nav-icon-shell {
          background:
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--theme-glow) 10%, rgba(255, 255, 255, 0.055)),
              rgba(255, 255, 255, 0.035)
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 6px 14px rgba(0, 0, 0, 0.16) !important;
        }


        [data-emergency-card] button[aria-label*="CLARA AI"] {
          --clara-orb-accent: var(--theme-glow, #22d3ee);
          --clara-orb-border: var(--theme-border, rgba(103, 232, 249, 0.38));
          --clara-orb-surface: var(--theme-gradient-money, var(--theme-gradient-hero));
          isolation: isolate;
          overflow: visible;
          border-color: color-mix(in srgb, var(--clara-orb-accent) 52%, rgba(255, 255, 255, 0.16)) !important;
          background:
            radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.32), transparent 28%),
            radial-gradient(circle at 63% 72%, color-mix(in srgb, var(--clara-orb-accent) 42%, transparent), transparent 42%),
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--clara-orb-accent) 18%, rgba(8, 22, 30, 0.84)),
              color-mix(in srgb, var(--clara-orb-accent) 26%, rgba(7, 35, 45, 0.70)) 48%,
              rgba(3, 13, 23, 0.84)
            ) !important;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.09) inset,
            0 0 0 5px color-mix(in srgb, var(--clara-orb-accent) 10%, transparent),
            0 10px 28px rgba(0, 0, 0, 0.34),
            0 0 22px color-mix(in srgb, var(--clara-orb-accent) 34%, transparent) !important;
          color: color-mix(in srgb, var(--clara-orb-accent) 26%, white) !important;
          transform: translateZ(0);
          will-change: transform;
          animation: claraEmergencyOrbBreath 2.8s ease-in-out infinite;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"]::before {
          content: "";
          position: absolute;
          inset: -6px;
          z-index: -1;
          border-radius: 9999px;
          background:
            radial-gradient(
              circle,
              color-mix(in srgb, var(--clara-orb-accent) 36%, transparent),
              color-mix(in srgb, var(--clara-orb-accent) 14%, transparent) 48%,
              transparent 70%
            );
          opacity: 0.68;
          transform: scale(0.96);
          animation: claraEmergencyOrbHalo 2.8s ease-in-out infinite;
          pointer-events: none;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"]::after {
          content: "";
          position: absolute;
          inset: 2px;
          border-radius: 9999px;
          border: 1px solid color-mix(in srgb, var(--clara-orb-accent) 28%, rgba(255, 255, 255, 0.16));
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.20), transparent 34%),
            radial-gradient(circle at 50% 64%, color-mix(in srgb, var(--clara-orb-accent) 26%, transparent), transparent 50%);
          opacity: 0.88;
          pointer-events: none;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"] > span:first-of-type {
          inset: -4px !important;
          border-radius: 9999px !important;
          background: radial-gradient(circle, color-mix(in srgb, var(--clara-orb-accent) 34%, transparent), transparent 66%) !important;
          filter: blur(8px) !important;
          opacity: 0.52 !important;
          animation: claraEmergencyOrbSoftGlow 2.8s ease-in-out infinite !important;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"] > span:nth-of-type(2) {
          inset: 4px !important;
          border-radius: 9999px !important;
          background:
            radial-gradient(circle at 38% 24%, rgba(255, 255, 255, 0.30), transparent 30%),
            radial-gradient(circle at 56% 64%, color-mix(in srgb, var(--clara-orb-accent) 30%, transparent), transparent 48%) !important;
          opacity: 0.76 !important;
          animation: claraEmergencyOrbInner 2.8s ease-in-out infinite !important;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"] svg {
          color: color-mix(in srgb, var(--clara-orb-accent) 22%, white) !important;
          filter: drop-shadow(0 0 7px color-mix(in srgb, var(--clara-orb-accent) 72%, transparent));
          transform: translateZ(0);
          animation: claraEmergencyOrbIconGlow 2.8s ease-in-out infinite;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"]:hover {
          border-color: color-mix(in srgb, var(--clara-orb-accent) 64%, rgba(255, 255, 255, 0.18)) !important;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.11) inset,
            0 0 0 5px color-mix(in srgb, var(--clara-orb-accent) 13%, transparent),
            0 12px 30px rgba(0, 0, 0, 0.36),
            0 0 27px color-mix(in srgb, var(--clara-orb-accent) 42%, transparent) !important;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"]:active {
          transform: scale(0.94) translateZ(0) !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"],
        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"]::before,
        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"]::after,
        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] > span,
        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] svg {
          animation: none !important;
          transition-duration: 0ms !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] {
          border-color: color-mix(in srgb, var(--clara-orb-accent) 42%, rgba(255, 255, 255, 0.12)) !important;
          background:
            radial-gradient(circle at 34% 22%, rgba(255, 255, 255, 0.17), transparent 31%),
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--clara-orb-accent) 14%, rgba(8, 26, 34, 0.78)),
              rgba(5, 18, 28, 0.84)
            ) !important;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.07) inset,
            0 8px 18px rgba(0, 0, 0, 0.22),
            0 0 16px color-mix(in srgb, var(--clara-orb-accent) 18%, transparent) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          will-change: auto;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"]::before {
          opacity: 0 !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"]::after {
          opacity: 0.58 !important;
          background: transparent !important;
          border-color: color-mix(in srgb, var(--clara-orb-accent) 22%, rgba(255, 255, 255, 0.10)) !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] > span:first-of-type {
          opacity: 0 !important;
          filter: none !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] > span:nth-of-type(2) {
          opacity: 0.26 !important;
          filter: none !important;
          background: radial-gradient(circle, color-mix(in srgb, var(--clara-orb-accent) 22%, transparent), transparent 58%) !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] svg {
          filter: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          [data-emergency-card] button[aria-label*="CLARA AI"],
          [data-emergency-card] button[aria-label*="CLARA AI"]::before,
          [data-emergency-card] button[aria-label*="CLARA AI"]::after,
          [data-emergency-card] button[aria-label*="CLARA AI"] > span,
          [data-emergency-card] button[aria-label*="CLARA AI"] svg {
            animation: none !important;
            transition-duration: 0ms !important;
          }

          [data-emergency-card] button[aria-label*="CLARA AI"] {
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.08) inset,
              0 8px 18px rgba(0, 0, 0, 0.24),
              0 0 16px color-mix(in srgb, var(--clara-orb-accent) 18%, transparent) !important;
            will-change: auto;
          }
        }

        @keyframes claraEmergencyOrbBreath {
          0%, 100% {
            transform: scale(1) translateZ(0);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.09) inset,
              0 0 0 5px color-mix(in srgb, var(--clara-orb-accent) 10%, transparent),
              0 10px 28px rgba(0, 0, 0, 0.34),
              0 0 18px color-mix(in srgb, var(--clara-orb-accent) 26%, transparent) !important;
          }
          45% {
            transform: scale(1.028) translateZ(0);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.13) inset,
              0 0 0 6px color-mix(in srgb, var(--clara-orb-accent) 17%, transparent),
              0 11px 30px rgba(0, 0, 0, 0.36),
              0 0 30px color-mix(in srgb, var(--clara-orb-accent) 54%, transparent) !important;
          }
          62% {
            transform: scale(1.012) translateZ(0);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.11) inset,
              0 0 0 5px color-mix(in srgb, var(--clara-orb-accent) 13%, transparent),
              0 10px 29px rgba(0, 0, 0, 0.35),
              0 0 24px color-mix(in srgb, var(--clara-orb-accent) 40%, transparent) !important;
          }
        }

        @keyframes claraEmergencyOrbHalo {
          0%, 100% {
            opacity: 0.42;
            transform: scale(0.94);
            filter: blur(0px);
          }
          45% {
            opacity: 0.92;
            transform: scale(1.13);
            filter: blur(1px);
          }
          62% {
            opacity: 0.62;
            transform: scale(1.04);
            filter: blur(0px);
          }
        }

        @keyframes claraEmergencyOrbSoftGlow {
          0%, 100% { opacity: 0.36; transform: scale(0.96); }
          45% { opacity: 0.78; transform: scale(1.13); }
          62% { opacity: 0.54; transform: scale(1.04); }
        }

        @keyframes claraEmergencyOrbInner {
          0%, 100% { opacity: 0.58; transform: scale(0.98); }
          45% { opacity: 0.92; transform: scale(1.035); }
          62% { opacity: 0.72; transform: scale(1.01); }
        }

        @keyframes claraEmergencyOrbIconGlow {
          0%, 100% {
            opacity: 0.86;
            transform: scale(1) translateZ(0);
            filter: drop-shadow(0 0 6px color-mix(in srgb, var(--clara-orb-accent) 58%, transparent));
          }
          45% {
            opacity: 1;
            transform: scale(1.08) translateZ(0);
            filter: drop-shadow(0 0 12px color-mix(in srgb, var(--clara-orb-accent) 88%, transparent));
          }
          62% {
            opacity: 0.96;
            transform: scale(1.035) translateZ(0);
            filter: drop-shadow(0 0 9px color-mix(in srgb, var(--clara-orb-accent) 72%, transparent));
          }
        }
        @keyframes claraDashboardPanelForwardIn {
          0% { opacity: 0; transform: translate3d(32px, 0, 0) scale(0.985); filter: blur(5px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }
        @keyframes claraDashboardPanelReverseIn {
          0% { opacity: 0; transform: translate3d(-32px, 0, 0) scale(0.985); filter: blur(5px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }
      `}</style>
  );
}
