// (trimmed unchanged imports)
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Shield,
  Edit2,
  Camera,
  Palette,
  X,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import SurvivalExpenseModal from "./SurvivalExpenseModal";

// ... KEEP EVERYTHING ABOVE UNCHANGED ...

export default function EmergencyFundCard({
  moneyLeft = 0,
  survivalExpense = 0,
  retentionRate,
  onSurvivalSaved,
  canAutoPrompt = false,
  hasSurvivalSetup = false,
  theme = null,
  onOpenThemePicker,
}) {

  // ... KEEP ALL LOGIC UNCHANGED ...

  return (
    <>

      {/* KEEP MODALS UNCHANGED */}

      <div
        className={`relative mb-3 overflow-hidden rounded-3xl border shadow-2xl transition-all duration-200 ${themeClasses.border} ${status.ring}`}
        style={{ borderColor: themeClasses.outline }}
      >

        {/* BACKGROUNDS UNCHANGED */}

        <div className="relative z-10 p-4">

          {/* HEADER UNCHANGED */}

          {/* MAIN CONTENT UNCHANGED */}

          {/* 🔥 NEW EMBEDDED CLARA BUTTON */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("clara:open-assistant", { detail: { mode: "voice" } }));
            }}
            className="absolute right-3 top-[72px] flex items-center justify-center rounded-full backdrop-blur-xl border border-white/20 transition active:scale-95"
            style={{
              width: "56px",
              height: "56px",
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent 35%), radial-gradient(circle, color-mix(in srgb, var(--theme-primary) 55%, rgba(0,0,0,0.4)) 0%, rgba(0,0,0,0.6) 75%)",
              boxShadow:
                "0 10px 24px rgba(0,0,0,0.45), 0 0 22px color-mix(in srgb, var(--theme-primary) 40%, transparent)",
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
              alt="CLARA"
              className="h-[44px] w-[44px] object-contain"
            />
          </button>

          {/* REST UNCHANGED */}

        </div>
      </div>
    </>
  );
}
