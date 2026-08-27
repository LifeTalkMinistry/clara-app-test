import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CreditCard, X } from "lucide-react";
import useClaraSupport from "@/hooks/useClaraSupport";
import { SUPPORT_TIER_KEYS, SUPPORT_TIERS } from "@/lib/clara-support";
import SupportPaymentSheet from "@/components/support/SupportPaymentSheet";

// Internal names and data attributes stay stable so existing runtime/CSS hooks
// do not break while the old support experience becomes CLARA Membership.
const SUPPORT_BUBBLE_WORLD_ID = "clara-support-world";
const SUPPORT_BUBBLE_EPOCH_KEY = "clara_support_bubble_cycle_epoch_v2";

const SUPPORT_BUBBLE_PHASE = Object.freeze({
  ICON: "icon",
  EXPANDED: "expanded",
  HIDDEN: "hidden",
});

const SUPPORT_BUBBLE_TIMING = Object.freeze({
  ICON_FIRST_MS: 3000,
  EXPANDED_MS: 3000,
  ICON_SECOND_MS: 3000,
  HIDDEN_MS: 10000,
});

const SUPPORT_BUBBLE_VISIBLE_MS =
  SUPPORT_BUBBLE_TIMING.ICON_FIRST_MS +
  SUPPORT_BUBBLE_TIMING.EXPANDED_MS +
  SUPPORT_BUBBLE_TIMING.ICON_SECOND_MS;
const SUPPORT_BUBBLE_CYCLE_MS =
  SUPPORT_BUBBLE_VISIBLE_MS + SUPPORT_BUBBLE_TIMING.HIDDEN_MS;

function getSupportBubbleEpoch(now = Date.now()) {
  if (typeof window === "undefined") return now;

  try {
    const stored = Number(window.localStorage.getItem(SUPPORT_BUBBLE_EPOCH_KEY));
    if (Number.isFinite(stored) && stored > 0 && stored <= now) return stored;
    window.localStorage.setItem(SUPPORT_BUBBLE_EPOCH_KEY, String(now));
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }

  return now;
}

function getSupportBubblePhase(now = Date.now()) {
  const epoch = getSupportBubbleEpoch(now);
  const elapsed =
    ((now - epoch) % SUPPORT_BUBBLE_CYCLE_MS + SUPPORT_BUBBLE_CYCLE_MS) %
    SUPPORT_BUBBLE_CYCLE_MS;

  if (elapsed < SUPPORT_BUBBLE_TIMING.ICON_FIRST_MS) {
    return SUPPORT_BUBBLE_PHASE.ICON;
  }
  if (
    elapsed <
    SUPPORT_BUBBLE_TIMING.ICON_FIRST_MS + SUPPORT_BUBBLE_TIMING.EXPANDED_MS
  ) {
    return SUPPORT_BUBBLE_PHASE.EXPANDED;
  }
  if (elapsed < SUPPORT_BUBBLE_VISIBLE_MS) return SUPPORT_BUBBLE_PHASE.ICON;
  return SUPPORT_BUBBLE_PHASE.HIDDEN;
}

function useSupportBubbleWorld() {
  const [host, setHost] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    let world = document.getElementById(SUPPORT_BUBBLE_WORLD_ID);
    if (!world) {
      world = document.createElement("div");
      world.id = SUPPORT_BUBBLE_WORLD_ID;
      world.dataset.claraSupportWorld = "true";
      Object.assign(world.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2147483000",
        pointerEvents: "none",
        isolation: "isolate",
      });
      document.body.appendChild(world);
    }

    setHost(world);
    return undefined;
  }, []);

  return host;
}

function useSupportBubbleOcclusionGuard(modalOpen) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const check = () => {
      if (modalOpen) {
        setBlocked(false);
        return;
      }

      const viewport = window.visualViewport;
      const active = document.activeElement;
      const typing = Boolean(
        active &&
          (active.matches?.("input, textarea, select") ||
            active.getAttribute?.("contenteditable") === "true")
      );
      const keyboardOpen = viewport
        ? window.innerHeight - viewport.height > 140
        : typing && window.innerWidth <= 768;

      setBlocked(keyboardOpen);
    };

    check();
    window.addEventListener("focusin", check);
    window.addEventListener("focusout", check);
    window.addEventListener("resize", check);
    window.visualViewport?.addEventListener("resize", check);

    return () => {
      window.removeEventListener("focusin", check);
      window.removeEventListener("focusout", check);
      window.removeEventListener("resize", check);
      window.visualViewport?.removeEventListener("resize", check);
    };
  }, [modalOpen]);

  return blocked;
}

function MembershipTierCard({ tier, onChoose }) {
  return (
    <button
      type="button"
      onClick={() => onChoose(tier.key)}
      className={`relative w-full rounded-[20px] border px-4 py-4 text-left transition duration-200 ${
        tier.recommended
          ? "border-[#ffd42f]/30 bg-[#ffd42f]/[0.055] shadow-[0_14px_44px_rgba(255,212,47,0.06)]"
          : tier.key === "champion"
            ? "border-[#ff4d55]/20 bg-[#ff4d55]/[0.035] hover:bg-[#ff4d55]/[0.055]"
            : "border-[#4d8cff]/18 bg-[#4d8cff]/[0.035] hover:bg-[#4d8cff]/[0.06]"
      }`}
    >
      {tier.recommended ? (
        <span className="absolute right-3 top-3 rounded-full border border-[#ffd42f]/28 bg-[#ffd42f]/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#ffe37a]/90">
          Popular
        </span>
      ) : null}

      <div className="pr-24">
        <p className="text-[8px] font-black uppercase tracking-[0.17em] text-white/42">
          CLARA Membership
        </p>
        <p className="mt-1 text-[16px] font-black tracking-[-0.025em] text-white">
          {tier.name}
        </p>
        <p className="mt-1 text-[22px] font-black tracking-tight text-white">
          ₱{tier.price}
          <span className="ml-1 text-[9px] font-semibold text-white/35">/ month</span>
        </p>
        <p className="mt-1.5 text-[10px] font-semibold leading-4 text-white/52">
          {tier.positioning}
        </p>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
        {tier.benefits.map((benefit) => (
          <div
            key={benefit}
            className="flex items-start gap-2 text-[10px] font-semibold leading-4 text-white/58"
          >
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ffd42f]/85" />
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-right text-[10px] font-black text-[#9ab9ff]">
        Choose {tier.name} →
      </div>
    </button>
  );
}

export default function SupportClaraBubble({ user }) {
  const [open, setOpen] = useState(false);
  const [bubblePhase, setBubblePhase] = useState(() =>
    typeof window === "undefined"
      ? SUPPORT_BUBBLE_PHASE.ICON
      : getSupportBubblePhase()
  );
  const [selectedTierKey, setSelectedTierKey] = useState("");
  const portalHost = useSupportBubbleWorld();
  const membershipState = useClaraSupport(user);
  const blocked = useSupportBubbleOcclusionGuard(open);

  useEffect(() => {
    if (typeof window === "undefined" || membershipState.isActive) return undefined;

    const syncPhase = () => setBubblePhase(getSupportBubblePhase(Date.now()));
    syncPhase();

    const timer = window.setInterval(syncPhase, 250);
    window.addEventListener("focus", syncPhase);
    document.addEventListener("visibilitychange", syncPhase);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncPhase);
      document.removeEventListener("visibilitychange", syncPhase);
    };
  }, [membershipState.isActive]);

  useEffect(() => {
    if (!open) {
      membershipState.clearError();
      setSelectedTierKey("");
    }
  }, [open, membershipState.clearError]);

  if (!user?.id || !portalHost || membershipState.isActive) return null;

  const expanded = bubblePhase === SUPPORT_BUBBLE_PHASE.EXPANDED;
  const visible = bubblePhase !== SUPPORT_BUBBLE_PHASE.HIDDEN;
  const selectedTier = selectedTierKey ? SUPPORT_TIERS[selectedTierKey] : null;

  const membershipWorld = (
    <>
      <style>{`
        @keyframes clara-membership-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes clara-membership-halo {
          0%, 100% { opacity: .48; transform: scale(.92); }
          50% { opacity: .88; transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: no-preference) {
          [data-clara-support-bubble] {
            animation: clara-membership-float 2.2s ease-in-out infinite;
          }
          [data-clara-support-halo] {
            animation: clara-membership-halo 2.2s ease-in-out infinite;
          }
        }
      `}</style>

      {!open && !blocked && visible ? (
        <button
          data-clara-support-bubble
          type="button"
          aria-label="CLARA Membership"
          onClick={() => setOpen(true)}
          className={`pointer-events-auto fixed right-4 z-[2] flex items-center rounded-full border text-xs font-semibold text-white opacity-100 backdrop-blur-2xl transition-[width,padding,gap,box-shadow] duration-500 ease-out ${
            expanded ? "justify-start gap-2" : "justify-center gap-0"
          }`}
          style={{
            bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 112px), 28vh)",
            width: expanded ? "138px" : "52px",
            height: "52px",
            padding: expanded ? "6px 14px 6px 7px" : "0",
            overflow: "visible",
            borderColor: "rgba(77,140,255,.44)",
            background:
              "linear-gradient(145deg, rgba(11,31,68,.98), rgba(4,13,38,.99) 56%, rgba(24,14,55,.98))",
            boxShadow:
              "0 0 0 1px rgba(77,140,255,.08) inset, 0 0 18px rgba(77,140,255,.24), 0 14px 38px rgba(0,0,0,.48)",
          }}
        >
          <span
            data-clara-support-halo
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: expanded ? "-5px" : "-7px",
              background:
                "radial-gradient(circle, rgba(77,140,255,.22) 0%, rgba(255,212,47,.07) 50%, transparent 72%)",
              filter: "blur(4px)",
              zIndex: -1,
            }}
          />

          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#7aa8ff]/45 bg-[#4d8cff]/10 text-[#b8cdff]">
            <CreditCard className="h-[17px] w-[17px]" strokeWidth={2.2} />
          </span>

          <span
            aria-hidden={!expanded}
            className={`relative z-[1] overflow-hidden whitespace-nowrap text-[11px] font-black transition-[max-width,opacity,transform] duration-400 ease-out ${
              expanded
                ? "max-w-[82px] translate-x-0 opacity-100"
                : "max-w-0 -translate-x-1 opacity-0"
            }`}
          >
            Membership
          </span>
        </button>
      ) : null}

      {open ? (
        <div
          data-clara-support-modal
          className="pointer-events-auto fixed inset-0 z-[4] flex items-end justify-center bg-black/65 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-8 backdrop-blur-md sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="clara-membership-title"
            className="max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-[28px] border border-[#4d8cff]/18 bg-[linear-gradient(180deg,rgba(7,18,43,.995),rgba(3,8,25,.998))] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,.62)]"
          >
            {selectedTier ? (
              <SupportPaymentSheet
                tier={selectedTier}
                onBack={() => setSelectedTierKey("")}
                onClose={() => setOpen(false)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#9ab9ff]/60">
                      CLARA Access
                    </p>
                    <h2
                      id="clara-membership-title"
                      className="mt-1 text-[22px] font-black tracking-[-0.035em] text-white"
                    >
                      Choose your membership
                    </h2>
                    <p className="mt-2 max-w-[330px] text-[11px] font-semibold leading-5 text-white/52">
                      Choose how much accountability you want after your trial. Payment is handled through the CLARA methods configured by the admin.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close CLARA Membership"
                    onClick={() => setOpen(false)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/65"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {SUPPORT_TIER_KEYS.map((key) => (
                    <MembershipTierCard
                      key={key}
                      tier={SUPPORT_TIERS[key]}
                      onChoose={setSelectedTierKey}
                    />
                  ))}
                </div>

                <p className="mt-5 text-center text-[9px] font-semibold leading-4 text-white/32">
                  GCash, Maya, and Security Bank availability comes from your live CLARA payment settings. Membership activates after payment verification.
                </p>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );

  return createPortal(membershipWorld, portalHost);
}
