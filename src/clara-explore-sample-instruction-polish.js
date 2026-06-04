const STYLE_ID = "clara-explore-sample-instruction-polish";
const PICKER_ID = "clara-explore-sample-picker";

function installSampleInstructionPolish() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${PICKER_ID}[data-open="true"] .clara-explore-sample-intro {
      position: relative !important;
      overflow: hidden !important;
      border-radius: 26px !important;
      border: 1px solid rgba(52, 211, 153, 0.28) !important;
      background:
        radial-gradient(circle at 0% 0%, rgba(52, 211, 153, 0.18), transparent 42%),
        radial-gradient(circle at 100% 0%, rgba(34, 211, 238, 0.12), transparent 45%),
        linear-gradient(135deg, rgba(6, 78, 59, 0.26), rgba(15, 23, 42, 0.44)) !important;
      padding: 1.15rem 1.1rem !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.075),
        0 14px 32px rgba(0, 0, 0, 0.16),
        0 0 22px rgba(52, 211, 153, 0.055) !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-sample-intro::before {
      content: "Instruction";
      display: inline-flex;
      align-items: center;
      width: fit-content;
      margin-bottom: 0.6rem;
      border-radius: 999px;
      border: 1px solid rgba(52, 211, 153, 0.25);
      background: rgba(16, 185, 129, 0.12);
      padding: 0.32rem 0.7rem;
      color: rgba(209, 250, 229, 0.9);
      font-size: 0.62rem;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-sample-intro p {
      font-size: 1rem !important;
      line-height: 1.25 !important;
      font-weight: 950 !important;
      letter-spacing: -0.025em !important;
      color: rgba(255, 255, 255, 0.96) !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-sample-intro span {
      margin-top: 0.55rem !important;
      display: block !important;
      max-width: 34ch !important;
      color: rgba(209, 250, 229, 0.68) !important;
      font-size: 0.8rem !important;
      font-weight: 750 !important;
      line-height: 1.55 !important;
    }
  `;

  document.head.appendChild(style);
}

if (typeof window !== "undefined") {
  installSampleInstructionPolish();
}
