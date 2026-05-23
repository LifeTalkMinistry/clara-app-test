import{j as a}from"./react-vendor-DVG3ZxCM.js";function t(){return null}const o=`
  .clara-dock-wrap {
    transform: translateY(28px) !important;
  }

  .clara-dock-card {
    background: rgba(2, 6, 23, 0.995) !important;
    border-color: rgba(255, 255, 255, 0.145) !important;
    border-radius: 1.45rem !important;

    box-shadow:
      0 26px 76px rgba(0, 0, 0, 0.78),
      0 0 0 1px rgba(255, 255, 255, 0.055),
      inset 0 1px 0 rgba(255, 255, 255, 0.085) !important;

    backdrop-filter: blur(30px) saturate(1.16) !important;
    -webkit-backdrop-filter: blur(30px) saturate(1.16) !important;
  }

  .clara-dock-card::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;

    background:
      radial-gradient(circle at 0% 0%, rgba(45, 212, 191, 0.055), transparent 30%),
      radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.055), transparent 36%),
      linear-gradient(
        135deg,
        rgba(6, 47, 64, 0.24),
        rgba(15, 23, 42, 0.88) 44%,
        rgba(30, 27, 75, 0.42)
      );
  }

  .clara-dock-card::after {
    content: "";
    position: absolute;
    right: 38px;
    bottom: -42px;
    width: 2px;
    height: 42px;
    pointer-events: none;

    background:
      linear-gradient(
        to bottom,
        rgba(103, 232, 249, 0.32),
        rgba(103, 232, 249, 0)
      );

    box-shadow:
      0 0 14px rgba(103, 232, 249, 0.18);
  }

  .clara-dock-card > * {
    position: relative;
    z-index: 1;
  }

  .clara-dock-tail {
    background: rgba(2, 6, 23, 0.995) !important;
    border-color: rgba(255, 255, 255, 0.145) !important;
  }

  .clara-dock-card form,
  .clara-dock-card .clara-dock-chip {
    background-color: rgba(15, 23, 42, 0.92) !important;
    border-color: rgba(255, 255, 255, 0.115) !important;

    backdrop-filter: blur(18px) !important;
    -webkit-backdrop-filter: blur(18px) !important;
  }

  .clara-dock-card input {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.94) !important;
  }

  .clara-dock-card input::placeholder {
    color: rgba(203, 213, 225, 0.64) !important;
  }

  .clara-dock-card h2 {
    font-size: 1.22rem !important;
    line-height: 1.03 !important;
    letter-spacing: -0.03em !important;
  }

  .clara-dock-card p {
    color: rgba(226, 232, 240, 0.78) !important;
  }

  .clara-dock-card h2,
  .clara-dock-card p,
  .clara-dock-card span,
  .clara-dock-card input,
  .clara-dock-card button {
    text-shadow:
      0 1px 12px rgba(0, 0, 0, 0.40);
  }

  .clara-dock-card .clara-dock-chip {
    min-height: 32px !important;
    padding-top: 0.42rem !important;
    padding-bottom: 0.42rem !important;
  }

  .clara-dock-card .clara-dock-chip:first-of-type {
    background:
      linear-gradient(
        135deg,
        rgba(16, 185, 129, 0.26),
        rgba(14, 165, 233, 0.16)
      ) !important;

    border-color: rgba(110, 231, 183, 0.32) !important;

    box-shadow:
      0 0 0 1px rgba(110, 231, 183, 0.08),
      0 10px 24px rgba(16, 185, 129, 0.12) !important;
  }

  .clara-dock-card .rounded-2xl:last-child {
    border-radius: 999px !important;
    background: rgba(15, 23, 42, 0.94) !important;
    opacity: 0.82;
  }

  @media (max-height: 740px) {
    .clara-dock-wrap {
      transform: translateY(34px) !important;
    }

    .clara-dock-card h2 {
      font-size: 1.16rem !important;
    }

    .clara-dock-card .clara-dock-chip {
      min-height: 30px !important;
      padding-top: 0.36rem !important;
      padding-bottom: 0.36rem !important;
    }
  }
`;function n(r){return a.jsxs(a.Fragment,{children:[a.jsx("style",{children:o}),a.jsx(t,{...r})]})}export{n as C};
