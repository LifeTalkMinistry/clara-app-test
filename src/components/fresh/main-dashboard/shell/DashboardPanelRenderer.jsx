import { useEffect, useRef, useState } from "react";
import { Lock, LogOut, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  launchGooglePlayPurchase,
  persistGooglePlayPurchase,
  waitForGooglePlayEntitlement,
} from "@/lib/google-play-billing";
import {
  COMMITTED_PLAN_KEY,
  COMMITTED_PRODUCT_ID,
  readDeveloperMembershipPreview,
} from "@/lib/membership";
import useUserRole from "@/hooks/useUserRole";
import DashboardMeLifePanel from "@/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel";
import DashboardSchedulePanel from "@/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel";
import {
  OPEN_COMMITMENT_BOOKLET_EVENT,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";

const CLARA_COMMITMENT_PRODUCT_ID = COMMITTED_PRODUCT_ID;
const CLARA_COMMITMENT_UNLOCK_PLAN = COMMITTED_PLAN_KEY;
const POST_ONBOARDING_BOOKLET_INTENT_KEY = "clara_open_commitment_booklet_after_onboarding";
const TRIAL_PURCHASE_INTENT = "trial_7d";

const CLARA_COMMITMENT_BOOKLET_PAGES = [
  {
    label: "Page 1",
    title: "Ready to know who CLARA is?",
    paragraphs: [
      "Most people think CLARA is a budgeting app.",
      "That's understandable.",
      "You record income.",
      "Track expenses.",
      "Create budgets.",
      "But that's not what CLARA was built to do.",
      "Let's discover CLARA one letter at a time.",
    ],
  },
  {
    label: "Page 2",
    title: "C — Commitment",
    paragraphs: [
      "Most financial apps sell access.",
      "CLARA sells commitment.",
      "The truth is...",
      "Most people already know what they should do with money.",
      "Save more.",
      "Spend less.",
      "Avoid impulse purchases.",
      "Build an emergency fund.",
      "Follow a budget.",
      "Knowledge is rarely the problem.",
      "Consistency is.",
      "That's why CLARA begins with a commitment.",
      "Not because you need another subscription.",
      "But because meaningful change usually starts when someone decides.",
    ],
  },
  {
    label: "Page 3",
    title: "L — Lifestyle Clarity",
    paragraphs: [
      "Money doesn't exist in isolation.",
      "It follows your lifestyle.",
      "Your habits.",
      "Your responsibilities.",
      "Your emotions.",
      "Your goals.",
      "CLARA helps you understand where your money goes and why it goes there.",
      "Because clarity often comes before control.",
      "When you can see your financial behavior clearly, better decisions become easier.",
    ],
  },
  {
    label: "Page 4",
    title: "A — Ask Before You Spend",
    paragraphs: [
      "One question can change a financial future.",
      "Should I buy this?",
      "Many financial mistakes happen in moments.",
      "Not because people are irresponsible.",
      "But because decisions are made too quickly.",
      "CLARA was built around one simple principle:",
      "Ask Before You Spend.",
      "That small pause can be the difference between impulse and intention.",
    ],
  },
  {
    label: "Page 5",
    title: "R — Real Guidance",
    paragraphs: [
      "Records tell you what happened.",
      "Guidance helps you decide what happens next.",
      "CLARA is designed to be more than a tracker.",
      "It creates an environment where you can:",
    ],
    bullets: ["Reflect", "Learn", "Plan", "Improve"],
    closingParagraphs: [
      "Because tracking money is useful.",
      "But understanding your behavior is powerful.",
    ],
  },
  {
    label: "Page 6",
    title: "A — Advocacy",
    paragraphs: [
      "Your commitment doesn't stop with you.",
      "10% of every monthly commitment goes into the CLARA Charity Fund.",
      "This fund helps support:",
    ],
    bullets: ["Students in need", "Calamity assistance", "Community support initiatives"],
    closingParagraphs: [
      "As CLARA grows, so does its ability to help others.",
      "Improving your financial life can also help improve someone else's.",
    ],
  },
  {
    label: "Final Page",
    title: "Ready to Commit?",
    paragraphs: ["You're not just unlocking tools.", "You're unlocking:"],
    checks: [
      "Commitment",
      "Lifestyle Clarity",
      "Ask Before You Spend",
      "Real Guidance",
      "Advocacy",
    ],
    closingParagraphs: [
      "The tools are simply the vehicle.",
      "The real goal is helping you become someone who consistently makes better money decisions.",
    ],
  },
];

function readPlanPreview() {
  return readDeveloperMembershipPreview();
}

function readTrialIntentFromSession() {
  if (typeof window === "undefined") return null;

  try {
    const rawIntent = window.sessionStorage.getItem(POST_ONBOARDING_BOOKLET_INTENT_KEY);
    if (!rawIntent) return null;
    window.sessionStorage.removeItem(POST_ONBOARDING_BOOKLET_INTENT_KEY);

    const parsed = JSON.parse(rawIntent);
    return parsed?.intent === TRIAL_PURCHASE_INTENT ? parsed : null;
  } catch (error) {
    console.warn("Unable to read CLARA post-onboarding booklet intent", error);
    try {
      window.sessionStorage.removeItem(POST_ONBOARDING_BOOKLET_INTENT_KEY);
    } catch {
      // Best effort cleanup only.
    }
    return null;
  }
}

async function openGooglePlayCommitmentPurchase({ userId, userEmail, purchaseIntent }) {
  return launchGooglePlayPurchase({
    productId: CLARA_COMMITMENT_PRODUCT_ID,
    planKey: CLARA_COMMITMENT_UNLOCK_PLAN,
    userId,
    userEmail,
    purchaseIntent,
    trialDays: purchaseIntent === TRIAL_PURCHASE_INTENT ? 7 : undefined,
  });
}

function ClaraCommitmentBookletModal({ open, onClose, purchaseIntent = "" }) {
  const [bookletPage, setBookletPage] = useState(0);
  const [commitmentOfferOpen, setCommitmentOfferOpen] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const carouselRef = useRef(null);
  const { user, refreshUser } = useUserRole();
  const isTrialIntent = purchaseIntent === TRIAL_PURCHASE_INTENT;

  useEffect(() => {
    if (!open) return;

    setBookletPage(0);
    setCommitmentOfferOpen(false);
    setPurchaseBusy(false);
    setPurchaseMessage("");

    window.requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ left: 0, behavior: "auto" });
    });
  }, [open, purchaseIntent]);

  if (!open) return null;

  const activateCommitmentAccess = async (purchaseResult) => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const activeUserId = user?.id || authUser?.id;
    const purchaseToken =
      purchaseResult?.purchaseToken ||
      purchaseResult?.purchase_token ||
      purchaseResult?.raw?.purchaseToken ||
      purchaseResult?.raw?.purchase_token ||
      "";
    const orderId =
      purchaseResult?.orderId ||
      purchaseResult?.order_id ||
      purchaseResult?.raw?.orderId ||
      purchaseResult?.raw?.order_id ||
      "";

    if (!activeUserId) {
      throw new Error("Please sign in first before starting your CLARA commitment.");
    }
    if (!purchaseToken) {
      throw new Error("Google Play did not return a purchase token, so CLARA did not activate access.");
    }

    await persistGooglePlayPurchase({
      supabase,
      userId: activeUserId,
      planKey: CLARA_COMMITMENT_UNLOCK_PLAN,
      productId: CLARA_COMMITMENT_PRODUCT_ID,
      purchaseToken,
      orderId,
      bridgePayload: {
        ...(purchaseResult?.raw || purchaseResult),
        purchaseIntent,
      },
    });

    const entitlement = await waitForGooglePlayEntitlement({
      supabase,
      userId: activeUserId,
      expectedPlanKey: CLARA_COMMITMENT_UNLOCK_PLAN,
    });
    if (!["active", "trialing"].includes(entitlement.status)) {
      throw new Error("Your purchase was verified, but membership activation is still syncing.");
    }

    await refreshUser?.();
  };

  const handleGooglePlayCommitment = async () => {
    if (purchaseBusy) return;

    setPurchaseBusy(true);
    setPurchaseMessage(isTrialIntent ? "Opening Google Play..." : "Opening Google Play...");

    try {
      const purchaseResult = await openGooglePlayCommitmentPurchase({
        userId: user?.id,
        userEmail: user?.email,
        purchaseIntent,
      });
      setPurchaseMessage("Verifying your CLARA commitment...");
      await activateCommitmentAccess(purchaseResult);
      setPurchaseMessage("Commitment active. Unlocking CLARA...");
      onClose();
    } catch (error) {
      console.error("CLARA Google Play commitment failed:", error);
      setPurchaseMessage(error?.message || "Google Play purchase could not be completed yet.");
    } finally {
      setPurchaseBusy(false);
    }
  };

  const goToPage = (targetPage) => {
    const nextPage = Math.min(Math.max(targetPage, 0), CLARA_COMMITMENT_BOOKLET_PAGES.length - 1);
    const carousel = carouselRef.current;

    setBookletPage(nextPage);

    if (carousel) {
      carousel.scrollTo({
        left: carousel.clientWidth * nextPage,
        behavior: "smooth",
      });
    }
  };

  const handleCarouselScroll = (event) => {
    const carousel = event.currentTarget;
    if (!carousel.clientWidth) return;

    const currentPage = Math.round(carousel.scrollLeft / carousel.clientWidth);
    const safePage = Math.min(Math.max(currentPage, 0), CLARA_COMMITMENT_BOOKLET_PAGES.length - 1);

    if (safePage !== bookletPage) setBookletPage(safePage);
  };

  const renderBookletPage = (bookletItem, index) => {
    const isFinalPage = index === CLARA_COMMITMENT_BOOKLET_PAGES.length - 1;
    const isDensePage =
      (bookletItem.paragraphs?.length || 0) +
        (bookletItem.bullets?.length || 0) +
        (bookletItem.checks?.length || 0) +
        (bookletItem.closingParagraphs?.length || 0) >
      10;
    const pageTextClass = isDensePage
      ? "mt-4 space-y-2.5 text-[clamp(0.84rem,2.95vw,0.98rem)] font-bold leading-[1.5] text-slate-100/88"
      : "mt-5 space-y-3 text-[clamp(0.92rem,3.05vw,1.03rem)] font-bold leading-[1.62] text-slate-100/88";

    return (
      <article
        key={bookletItem.label}
        className="flex h-full min-h-0 w-full min-w-full snap-center snap-always flex-col justify-center overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(135deg,#108b90_0%,#1d2f6d_44%,#2c1664_100%)] px-[clamp(24px,6vw,32px)] py-[clamp(24px,5.2vw,32px)] text-left shadow-[0_22px_58px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-24px_42px_rgba(0,0,0,0.16)]"
      >
        <div className={isDensePage ? "" : "-translate-y-[3%]"}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/48">
            {index + 1 < 10 ? `0${index + 1}` : index + 1} / {bookletItem.label.toUpperCase()}
          </p>

          <h2 className="mt-3 text-[clamp(1.58rem,6.4vw,2.1rem)] font-black leading-[1.05] tracking-[-0.055em] text-white">
            {bookletItem.title}
          </h2>

          <div className={pageTextClass}>
            {bookletItem.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

            {bookletItem.bullets ? (
              <ul className="space-y-2">
                {bookletItem.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2.5">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/70" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {bookletItem.checks ? (
              <ul className="space-y-2">
                {bookletItem.checks.map((check) => (
                  <li key={check} className="flex gap-2.5 text-white/92">
                    <span className="shrink-0 text-cyan-100/72">✓</span>
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {bookletItem.closingParagraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

            {isFinalPage ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPurchaseMessage("");
                  setCommitmentOfferOpen(true);
                }}
                className="mt-4 w-full rounded-full border border-white/18 bg-white/[0.1] px-4 py-3 text-sm font-black text-white/92 transition hover:bg-white/[0.14] active:scale-[0.99]"
              >
                {isTrialIntent ? "Start 7-day trial" : "Start My Commitment"}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#020817] px-[clamp(18px,5vw,30px)] pt-[max(18px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      <section
        className="relative mx-auto flex h-[min(88dvh,760px)] w-[92vw] max-w-[470px] flex-col overflow-hidden rounded-[38px] border border-cyan-100/14 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.16),transparent_40%),#081122] px-4 pb-5 pt-5 text-white shadow-[0_28px_86px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.08)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full border border-white/14 bg-white/[0.06] p-2 text-white/58 transition hover:bg-white/[0.1] hover:text-white/88"
          aria-label="Close commitment booklet"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10 shrink-0 pr-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-100/58">CLARA Commitment Booklet</p>
        </div>

        <div
          ref={carouselRef}
          className="relative z-10 mt-5 flex min-h-0 flex-1 snap-x snap-mandatory touch-pan-x overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={handleCarouselScroll}
        >
          {CLARA_COMMITMENT_BOOKLET_PAGES.map(renderBookletPage)}
        </div>

        <div className="relative z-10 mt-4 flex justify-center gap-1.5">
          {CLARA_COMMITMENT_BOOKLET_PAGES.map((bookletItem, index) => (
            <button
              key={bookletItem.label}
              type="button"
              onClick={() => goToPage(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === bookletPage ? "w-6 bg-cyan-100/64" : "w-1.5 bg-cyan-100/22"}`}
              aria-label={`Go to ${bookletItem.label}`}
            />
          ))}
        </div>

        {commitmentOfferOpen ? (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-[#020817]/84 px-5 backdrop-blur-sm"
            onClick={() => {
              if (!purchaseBusy) setCommitmentOfferOpen(false);
            }}
          >
            <div
              className="relative w-full max-w-[340px] rounded-[32px] border border-cyan-100/16 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.16),transparent_42%),#081122] px-6 py-6 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.08)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  if (!purchaseBusy) setCommitmentOfferOpen(false);
                }}
                className="absolute right-4 top-4 rounded-full border border-white/14 bg-white/[0.06] p-2 text-white/58 transition hover:bg-white/[0.1] hover:text-white/88"
                aria-label="Close commitment price"
                disabled={purchaseBusy}
              >
                <X className="h-4 w-4" />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/48">
                {isTrialIntent ? "Trial Offer" : "Monthly Commitment"}
              </p>
              <h3 className="mt-4 text-[1.55rem] font-black leading-tight tracking-[-0.05em] text-white">So? You are ready to commit?</h3>
              <p className="mx-auto mt-3 max-w-[260px] text-sm font-bold leading-6 text-white/68">
                {isTrialIntent
                  ? "Start free first, then continue CLARA’s guided money decision experience for ₱249/month."
                  : "Start your journey toward financial freedom with CLARA’s guided money decision experience."}
              </p>

              <div className="mt-5 rounded-[26px] border border-white/14 bg-white/[0.08] px-5 py-5">
                <p className="text-[2.05rem] font-black leading-tight tracking-[-0.065em] text-white">
                  CLARA Commitment
                </p>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/48">
                  {isTrialIntent ? "₱249/month after trial" : "₱249/month"}
                </p>
              </div>

              <p className="mt-4 text-xs font-bold leading-5 text-white/52">
                {isTrialIntent
                  ? "Google Play must show the free trial before you confirm. Cancel anytime before renewal."
                  : "10% of every monthly commitment goes into the CLARA Charity Fund."}
              </p>

              {purchaseMessage ? (
                <p className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-5 text-white/62">{purchaseMessage}</p>
              ) : null}

              <div className="mt-5 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={handleGooglePlayCommitment}
                  disabled={purchaseBusy}
                  className="rounded-full border border-white/18 bg-white/[0.12] px-4 py-3 text-sm font-black text-white/92 transition hover:bg-white/[0.16] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {purchaseBusy ? "Opening Google Play..." : isTrialIntent ? "Start 7-day trial" : "Continue for ₱249"}
                </button>
                <button
                  type="button"
                  onClick={() => setCommitmentOfferOpen(false)}
                  disabled={purchaseBusy}
                  className="rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-white/42 transition hover:text-white/64 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LockedPanelPreview({ children, onOpenCommitmentBooklet }) {
  const handleOpenCommitmentBooklet = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenCommitmentBooklet?.();
  };

  return (
    <div
      className="relative min-h-full overflow-hidden rounded-[30px]"
      onClickCapture={handleOpenCommitmentBooklet}
      onPointerDownCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="pointer-events-none opacity-45 grayscale-[0.85] saturate-[0.65]">{children}</div>
      <div className="absolute inset-0 z-[220] flex items-center justify-center rounded-[30px] bg-black/[0.18] backdrop-blur-[1px]">
        <div className="mx-7 max-w-[280px] rounded-[28px] border border-white/14 bg-[rgba(9,18,36,0.76)] px-5 py-4 text-center text-white shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] text-white/78">
            <Lock className="h-4.5 w-4.5" />
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/52">COMMITTED VERSION</p>
          <p className="mt-1 text-lg font-black tracking-[-0.03em] text-white/92">Ready to Commit?</p>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-white/58">Tap to see more.</p>
        </div>
      </div>
    </div>
  );
}

function SettingsLogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("CLARA settings logout failed:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="mt-5 space-y-2 pb-8">
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-rose-300/20 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_34%),rgba(244,63,94,0.08)] px-4 py-4 text-sm font-black text-rose-100 shadow-[0_14px_40px_rgba(244,63,94,0.08)] transition hover:bg-rose-500/15 active:scale-[0.99]"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
      <p className="px-3 text-center text-[10px] font-semibold leading-4 text-white/32">You can log back in anytime using your CLARA account.</p>
    </div>
  );
}

function renderSettingsWithLogout(renderSettings, fallback) {
  const settingsContent = renderSettings?.() ?? fallback;
  if (!settingsContent) return <SettingsLogoutButton />;

  return (
    <>
      {settingsContent}
      <SettingsLogoutButton />
    </>
  );
}

export default function DashboardPanelRenderer({
  activePanel = "home",
  renderHome,
  renderFeed,
  renderMessages,
  renderTask,
  renderSettings,
  renderMe,
  fallback = null,
}) {
  const location = useLocation();
  const previewPlan = readPlanPreview();
  const hasCommittedAccess = useCommittedFeatureAccess({ previewPlan });
  const [commitmentBookletOpen, setCommitmentBookletOpen] = useState(false);
  const [purchaseIntent, setPurchaseIntent] = useState("");

  const openCommitmentBooklet = (nextPurchaseIntent = "") => {
    setPurchaseIntent(nextPurchaseIntent);
    setCommitmentBookletOpen(true);
  };
  const closeCommitmentBooklet = () => setCommitmentBookletOpen(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOpenCommitmentBooklet = () => openCommitmentBooklet();

    window.addEventListener(OPEN_COMMITMENT_BOOKLET_EVENT, handleOpenCommitmentBooklet);
    return () => window.removeEventListener(OPEN_COMMITMENT_BOOKLET_EVENT, handleOpenCommitmentBooklet);
  }, []);

  useEffect(() => {
    const sessionIntent = readTrialIntentFromSession();
    const locationWantsBooklet = location.state?.openCommitmentBooklet === true;
    const locationIntent = location.state?.purchaseIntent === TRIAL_PURCHASE_INTENT ? TRIAL_PURCHASE_INTENT : "";

    if (sessionIntent?.intent === TRIAL_PURCHASE_INTENT) {
      openCommitmentBooklet(TRIAL_PURCHASE_INTENT);
      return;
    }

    if (locationWantsBooklet) {
      openCommitmentBooklet(locationIntent);
    }
  }, [location.key, location.state]);

  const booklet = (
    <ClaraCommitmentBookletModal
      open={commitmentBookletOpen}
      onClose={closeCommitmentBooklet}
      purchaseIntent={purchaseIntent}
    />
  );

  if (activePanel === "me") {
    const content = renderMe?.() ?? <DashboardMeLifePanel />;
    return (
      <>
        {!hasCommittedAccess ? <LockedPanelPreview onOpenCommitmentBooklet={() => openCommitmentBooklet()}>{content}</LockedPanelPreview> : content}
        {booklet}
      </>
    );
  }

  if (activePanel === "schedule") {
    const content = <DashboardSchedulePanel />;
    return (
      <>
        {!hasCommittedAccess ? <LockedPanelPreview onOpenCommitmentBooklet={() => openCommitmentBooklet()}>{content}</LockedPanelPreview> : content}
        {booklet}
      </>
    );
  }

  if (activePanel === "feed") return renderFeed?.() ?? fallback;
  if (activePanel === "messages") return renderMessages?.() ?? fallback;
  if (activePanel === "task") return renderTask?.() ?? fallback;
  if (activePanel === "settings") return renderSettingsWithLogout(renderSettings, fallback);

  return (
    <>
      {renderHome?.() ?? fallback}
      {booklet}
    </>
  );
}
