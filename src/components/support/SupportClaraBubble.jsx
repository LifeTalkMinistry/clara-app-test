import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Heart, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import useClaraSupport from "@/hooks/useClaraSupport";
import { SUPPORT_TIER_KEYS, SUPPORT_TIERS, getChampionAvailability } from "@/lib/clara-support";
import { customSupportAvailability } from "@/lib/clara-support-billing";

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
const SUPPORT_BUBBLE_CYCLE_MS = SUPPORT_BUBBLE_VISIBLE_MS + SUPPORT_BUBBLE_TIMING.HIDDEN_MS;

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
  const elapsed = ((now - epoch) % SUPPORT_BUBBLE_CYCLE_MS + SUPPORT_BUBBLE_CYCLE_MS) % SUPPORT_BUBBLE_CYCLE_MS;

  if (elapsed < SUPPORT_BUBBLE_TIMING.ICON_FIRST_MS) {
    return SUPPORT_BUBBLE_PHASE.ICON;
  }

  if (elapsed < SUPPORT_BUBBLE_TIMING.ICON_FIRST_MS + SUPPORT_BUBBLE_TIMING.EXPANDED_MS) {
    return SUPPORT_BUBBLE_PHASE.EXPANDED;
  }

  if (elapsed < SUPPORT_BUBBLE_VISIBLE_MS) {
    return SUPPORT_BUBBLE_PHASE.ICON;
  }

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
          (active.matches?.("input, textarea, select") || active.getAttribute?.("contenteditable") === "true")
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

function SupportTierCard({ tier, busy, disabled, onChoose, championAvailability }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChoose(tier.key)}
      className={`relative w-full rounded-2xl border px-4 py-4 text-left transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
        tier.recommended
          ? "border-cyan-300/40 bg-cyan-300/[0.08] shadow-[0_14px_44px_rgba(34,211,238,0.08)]"
          : "border-white/10 bg-white/[0.045] hover:bg-white/[0.075]"
      }`}
    >
      {tier.recommended && (
        <span className="absolute right-3 top-3 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-cyan-200">
          RECOMMENDED
        </span>
      )}
      <div className="pr-24">
        <p className="text-sm font-semibold text-white">{tier.name}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-white">
          ₱{tier.price}<span className="text-xs font-medium text-white/50"> / month</span>
        </p>
        <p className="mt-1.5 text-xs font-medium text-cyan-100/75">{tier.positioning}</p>
      </div>

      {tier.key === "champion" && championAvailability && (
        <p className="mt-3 text-[11px] font-medium text-amber-200/90">
          {championAvailability.available} / {championAvailability.cap} Champion slots available
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        {tier.benefits.map((benefit) => (
          <div key={benefit} className="flex items-start gap-2 text-[11px] leading-4 text-white/65">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end text-xs font-semibold text-cyan-200">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Support CLARA"}
      </div>
    </button>
  );
}

export default function SupportClaraBubble({ user }) {
  const [open, setOpen] = useState(false);
  const [bubblePhase, setBubblePhase] = useState(() =>
    typeof window === "undefined" ? SUPPORT_BUBBLE_PHASE.ICON : getSupportBubblePhase()
  );
  const [customAmount, setCustomAmount] = useState("");
  const portalHost = useSupportBubbleWorld();
  const supportState = useClaraSupport(user);
  const blocked = useSupportBubbleOcclusionGuard(open);
  const customAvailability = customSupportAvailability();
  const championAvailability = useMemo(
    () => getChampionAvailability(supportState.championCapacity || {}),
    [supportState.championCapacity]
  );

  useEffect(() => {
    if (typeof window === "undefined" || supportState.isActive) return undefined;

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
  }, [supportState.isActive]);

  useEffect(() => {
    if (supportState.isActive) setBubblePhase(SUPPORT_BUBBLE_PHASE.ICON);
  }, [supportState.isActive]);

  useEffect(() => {
    if (!open) supportState.clearError();
  }, [open, supportState.clearError]);

  const handleSupport = async (tierKey) => {
    try {
      const result = await supportState.startSupport(tierKey);
      if (result?.status === "active") {
        toast.success("Thank you for supporting CLARA 💙");
        setOpen(false);
      } else if (result?.status === "pending") {
        toast("Your Google Play payment is still pending.");
      }
    } catch (error) {
      if (String(error?.message || "").toLowerCase().includes("cancel")) return;
    }
  };

  if (!user?.id || !portalHost) return null;

  const expanded = supportState.isActive || bubblePhase === SUPPORT_BUBBLE_PHASE.EXPANDED;
  const visible = supportState.isActive || bubblePhase !== SUPPORT_BUBBLE_PHASE.HIDDEN;

  const supportWorld = (
    <>
      <style>{`
        @keyframes clara-support-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        @media (prefers-reduced-motion: no-preference) {
          [data-clara-support-bubble] {
            animation: clara-support-float 2.2s ease-in-out infinite;
          }
        }
      `}</style>

      {!open && !blocked && visible && (
        <button
          data-clara-support-bubble
          type="button"
          aria-label={supportState.isActive ? "CLARA supporter status" : "Support CLARA"}
          onClick={() => setOpen(true)}
          className={`pointer-events-auto fixed right-4 z-[2] flex h-12 items-center overflow-hidden rounded-full border border-cyan-300/30 bg-[#07141d] text-xs font-semibold text-cyan-50 opacity-100 shadow-[0_14px_42px_rgba(0,0,0,0.38)] backdrop-blur-xl transition-[width,padding,gap] duration-500 ease-out ${
            expanded ? "w-[116px] gap-2 px-3" : "w-12 gap-0 px-2.5"
          }`}
          style={{ bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 112px), 28vh)" }}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-300/12">
            <Heart className="h-4 w-4 fill-cyan-300/35 text-cyan-100" />
          </span>
          <span
            aria-hidden={!expanded}
            className={`whitespace-nowrap transition-[max-width,opacity] duration-400 ease-out ${
              expanded ? "max-w-[72px] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            {supportState.isActive ? "Thank you" : "Support"}
          </span>
        </button>
      )}

      {open && (
        <div
          data-clara-support-modal
          className="pointer-events-auto fixed inset-0 z-[4] flex items-end justify-center bg-black/55 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-8 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="clara-support-title"
            className="max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,24,34,.98),rgba(4,13,20,.99))] p-5 text-white shadow-[0_26px_90px_rgba(0,0,0,.55)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-200">
                  <Heart className="h-5 w-5 fill-cyan-300/20" />
                  <h2 id="clara-support-title" className="text-lg font-bold">Support CLARA</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  CLARA is free for everyone.
                </p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  If CLARA has helped you manage your money better, you can support what we're building and help us keep CLARA free for the next Filipino.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Support CLARA"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {supportState.isActive ? (
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
                <p className="text-sm font-semibold text-cyan-100">Thank you for helping keep CLARA free. 💙</p>
                <p className="mt-1.5 text-xs leading-5 text-white/60">
                  Your support is active for this support cycle. We won't keep asking you to contribute again during the same cycle.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {SUPPORT_TIER_KEYS.map((key) => {
                  const tier = SUPPORT_TIERS[key];
                  return (
                    <SupportTierCard
                      key={key}
                      tier={tier}
                      busy={supportState.purchaseTier === key}
                      disabled={Boolean(supportState.purchaseTier)}
                      onChoose={handleSupport}
                      championAvailability={tier.key === "champion" ? championAvailability : null}
                    />
                  );
                })}

                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Give a different amount</p>
                    {!customAvailability.enabled && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold tracking-[0.1em] text-white/45">
                        COMING SOON
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-white/55">
                    Larger custom support does not create extra CLARA privileges.
                  </p>
                  <div className="mt-3 flex items-center rounded-xl border border-white/10 bg-black/20 px-3">
                    <span className="text-white/55">₱</span>
                    <input
                      value={customAmount}
                      onChange={(event) => setCustomAmount(event.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      placeholder="Different amount"
                      disabled={!customAvailability.enabled}
                      className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  {!customAvailability.enabled && (
                    <p className="mt-2 text-[11px] leading-4 text-white/40">
                      {customAvailability.reason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {supportState.error && (
              <p className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.06] px-3 py-2 text-xs leading-5 text-rose-100/80">
                {supportState.error}
              </p>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/70"
            >
              Maybe Later
            </button>

            <p className="mt-3 text-center text-[10px] leading-4 text-white/35">
              App features stay free whether you support CLARA or not. Coaching benefits are separate from core app access.
            </p>
          </section>
        </div>
      )}
    </>
  );

  return createPortal(supportWorld, portalHost);
}
