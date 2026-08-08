import { useEffect, useMemo, useState } from "react";
import { Check, Heart, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import useClaraSupport from "@/hooks/useClaraSupport";
import { SUPPORT_TIER_KEYS, SUPPORT_TIERS, getChampionAvailability } from "@/lib/clara-support";
import { customSupportAvailability } from "@/lib/clara-support-billing";

const SESSION_EXPANSION_KEY = "clara_support_bubble_expanded_this_session";

function elementIsVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function useSupportBubbleOcclusionGuard(modalOpen) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const check = () => {
      const viewport = window.visualViewport;
      const keyboardOpen = Boolean(viewport && window.innerHeight - viewport.height > 140);
      const active = document.activeElement;
      const typing = Boolean(
        active &&
          (active.matches?.("input, textarea, select") || active.getAttribute?.("contenteditable") === "true")
      );
      const otherDialog = Array.from(
        document.querySelectorAll('[role="dialog"], [data-radix-dialog-content], [data-vaul-drawer]')
      ).some((element) => !element.closest?.("[data-clara-support-modal]") && elementIsVisible(element));

      setBlocked(!modalOpen && (keyboardOpen || typing || otherDialog));
    };

    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    window.addEventListener("focusin", check);
    window.addEventListener("focusout", check);
    window.addEventListener("resize", check);
    window.visualViewport?.addEventListener("resize", check);

    return () => {
      observer.disconnect();
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

export default function SupportClaraBubble({ user, championCapacity = null }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const supportState = useClaraSupport(user);
  const blocked = useSupportBubbleOcclusionGuard(open);
  const customAvailability = customSupportAvailability();
  const championAvailability = useMemo(
    () => getChampionAvailability(championCapacity || {}),
    [championCapacity]
  );

  useEffect(() => {
    if (typeof window === "undefined" || supportState.isActive) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return undefined;
    if (sessionStorage.getItem(SESSION_EXPANSION_KEY) === "1") return undefined;

    const expandTimer = window.setTimeout(() => {
      if (blocked || open) return;
      sessionStorage.setItem(SESSION_EXPANSION_KEY, "1");
      setExpanded(true);
      window.setTimeout(() => setExpanded(false), 2400);
    }, 18000);

    return () => window.clearTimeout(expandTimer);
  }, [blocked, open, supportState.isActive]);

  useEffect(() => {
    if (!open) supportState.clearError();
  }, [open]);

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

  if (!user?.id) return null;

  return (
    <>
      {!open && !blocked && (
        <button
          type="button"
          aria-label={supportState.isActive ? "CLARA supporter status" : "Support CLARA"}
          onClick={() => setOpen(true)}
          className="fixed right-4 z-[62] flex h-11 max-w-[190px] items-center gap-2 overflow-hidden rounded-full border border-cyan-300/20 bg-[#07141d]/88 px-3 text-xs font-semibold text-cyan-50 shadow-[0_14px_42px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all duration-500"
          style={{ bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 112px), 28vh)" }}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-300/10">
            <Heart className="h-4 w-4 fill-cyan-300/25 text-cyan-200" />
          </span>
          <span
            className={`whitespace-nowrap transition-all duration-500 ${
              supportState.isActive || expanded ? "max-w-[132px] opacity-100" : "max-w-[58px] opacity-100"
            }`}
          >
            {supportState.isActive ? "Thank you" : expanded ? "Support CLARA" : "Support"}
          </span>
        </button>
      )}

      {open && (
        <div
          data-clara-support-modal
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-8 backdrop-blur-sm sm:items-center"
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
                  <p className="text-sm font-semibold text-white">Give a different amount</p>
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
                      className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/30"
                    />
                  </div>
                  {!customAvailability.enabled && customAmount && (
                    <p className="mt-2 text-[11px] leading-4 text-amber-200/75">
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
}
