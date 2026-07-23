import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, RefreshCcw, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useUserRole from "@/hooks/useUserRole";
import DashboardMeLifePanel from "@/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel";
import DashboardSchedulePanel from "@/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel";
import {
  OPEN_COMMITMENT_BOOKLET_EVENT,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import {
  CLARA_COMMITMENT_BOOKLET_PAGES,
  COMMITTED_MONTHLY_PURCHASE_INTENT,
  normalizeCommitmentBookletIntent,
  readCommitmentBookletIntentFromSession,
} from "@/lib/clara-commitment-framework";

const COMMITMENT_DECLINE_HOME_EVENT = "clara:commitment-decline-home";
const CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT =
  "clara:guide-schedule-phase-change";
const CLARA_GUIDE_EXIT_EVENT = "clara:guide-exit";

function normalizeOfferPurchaseIntent(nextPurchaseIntent) {
  return normalizeCommitmentBookletIntent(
    nextPurchaseIntent || COMMITTED_MONTHLY_PURCHASE_INTENT
  );
}

function ClaraCommitmentBookletModal({
  open,
  onClose,
  onDeclineCommitment,
  purchaseIntent = COMMITTED_MONTHLY_PURCHASE_INTENT,
}) {
  const [bookletPage, setBookletPage] = useState(0);
  const [membershipInfoOpen, setMembershipInfoOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const carouselRef = useRef(null);
  const { membership, refreshUser } = useUserRole();

  useEffect(() => {
    if (!open) return;

    setBookletPage(0);
    setMembershipInfoOpen(false);
    setRefreshing(false);
    setRefreshMessage("");

    window.requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ left: 0, behavior: "auto" });
    });
  }, [open, purchaseIntent]);

  if (!open) return null;

  const handleRefreshMembership = async () => {
    if (refreshing) return;

    setRefreshing(true);
    setRefreshMessage("Checking your CLARA account...");

    try {
      await refreshUser?.({ reason: "manual_membership_refresh" });
      setRefreshMessage(
        "Membership refreshed. Active Committed access will unlock automatically."
      );
    } catch (error) {
      console.error("[CLARA Membership] manual refresh failed", error);
      setRefreshMessage(
        "CLARA could not refresh your account. Check your connection and try again."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeclineCommitment = () => {
    if (refreshing) return;
    setRefreshMessage("");
    setMembershipInfoOpen(false);
    onDeclineCommitment?.();
  };

  const goToPage = (targetPage) => {
    const nextPage = Math.min(
      Math.max(targetPage, 0),
      CLARA_COMMITMENT_BOOKLET_PAGES.length - 1
    );
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

    const currentPage = Math.round(
      carousel.scrollLeft / carousel.clientWidth
    );
    const safePage = Math.min(
      Math.max(currentPage, 0),
      CLARA_COMMITMENT_BOOKLET_PAGES.length - 1
    );
    if (safePage !== bookletPage) setBookletPage(safePage);
  };

  const renderBookletPage = (bookletItem, index) => {
    const isFinalPage =
      index === CLARA_COMMITMENT_BOOKLET_PAGES.length - 1;
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
            {index + 1 < 10 ? `0${index + 1}` : index + 1} /{" "}
            {bookletItem.label.toUpperCase()}
          </p>

          <h2 className="mt-3 text-[clamp(1.58rem,6.4vw,2.1rem)] font-black leading-[1.05] tracking-[-0.055em] text-white">
            {bookletItem.title}
          </h2>

          <div className={pageTextClass}>
            {bookletItem.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

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

            {bookletItem.closingParagraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            {isFinalPage ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setRefreshMessage("");
                  setMembershipInfoOpen(true);
                }}
                className="mt-4 w-full rounded-full border border-white/18 bg-white/[0.1] px-4 py-3 text-sm font-black text-white/92 transition hover:bg-white/[0.14] active:scale-[0.99]"
              >
                View Membership Status
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
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-100/58">
            CLARA Commitment Booklet
          </p>
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
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === bookletPage
                  ? "w-6 bg-cyan-100/64"
                  : "w-1.5 bg-cyan-100/22"
              }`}
              aria-label={`Go to ${bookletItem.label}`}
            />
          ))}
        </div>

        {membershipInfoOpen ? (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-[#020817]/84 px-5 backdrop-blur-sm"
            onClick={() => {
              if (!refreshing) setMembershipInfoOpen(false);
            }}
          >
            <div
              className="relative w-full max-w-[350px] rounded-[32px] border border-cyan-100/16 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.16),transparent_42%),#081122] px-6 py-6 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.08)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  if (!refreshing) setMembershipInfoOpen(false);
                }}
                className="absolute right-4 top-4 rounded-full border border-white/14 bg-white/[0.06] p-2 text-white/58 transition hover:bg-white/[0.1] hover:text-white/88"
                aria-label="Close membership information"
                disabled={refreshing}
              >
                <X className="h-4 w-4" />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/48">
                CLARA Account
              </p>
              <h3 className="mt-4 text-[1.55rem] font-black leading-tight tracking-[-0.05em] text-white">
                {membership?.planLabel || "Membership"}
              </h3>
              <p className="mx-auto mt-3 max-w-[280px] text-sm font-bold leading-6 text-white/68">
                Committed access is controlled by your verified CLARA account. It
                cannot be activated with a password, code, role, or local device
                setting.
              </p>

              <div className="mt-5 rounded-[24px] border border-white/12 bg-white/[0.07] px-4 py-4 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                  Current status
                </p>
                <p className="mt-2 text-base font-black text-white/90">
                  {membership?.statusLabel || "SYNCING"}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/52">
                  {membership?.featureDescription ||
                    "Refresh after your membership is activated through your CLARA account."}
                </p>
              </div>

              {refreshMessage ? (
                <p className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-5 text-white/62">
                  {refreshMessage}
                </p>
              ) : null}

              <div className="mt-5 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={handleRefreshMembership}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-100/20 bg-cyan-100/[0.1] px-4 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-100/[0.14] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh Membership"}
                </button>
                <button
                  type="button"
                  onClick={handleDeclineCommitment}
                  disabled={refreshing}
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
    >
      <div className="pointer-events-none opacity-45 grayscale-[0.85] saturate-[0.65]">
        {children}
      </div>
      <div className="absolute inset-0 z-[220] flex items-center justify-center rounded-[30px] bg-black/[0.18] backdrop-blur-[1px]">
        <div className="mx-7 max-w-[280px] rounded-[28px] border border-white/14 bg-[rgba(9,18,36,0.76)] px-5 py-4 text-center text-white shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] text-white/78">
            <Lock className="h-4.5 w-4.5" />
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/52">
            COMMITTED VERSION
          </p>
          <p className="mt-1 text-lg font-black tracking-[-0.03em] text-white/92">
            Ready to Commit?
          </p>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-white/58">
            Tap to see membership information.
          </p>
        </div>
      </div>
    </div>
  );
}

export { COMMITMENT_DECLINE_HOME_EVENT };

export default function DashboardPanelRenderer({
  activePanel = "home",
  renderHome,
  renderFeed,
  renderMessages,
  renderTask,
  renderSettings,
  renderMe,
  fallback = null,
  onCommitmentDecline,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasCommittedAccess = useCommittedFeatureAccess();
  const [commitmentBookletOpen, setCommitmentBookletOpen] = useState(false);
  const [purchaseIntent, setPurchaseIntent] = useState(
    COMMITTED_MONTHLY_PURCHASE_INTENT
  );
  const [scheduleGuidePhase, setScheduleGuidePhase] = useState("inactive");
  const scheduleGuidePreviewActive =
    scheduleGuidePhase !== "inactive" &&
    scheduleGuidePhase !== "await-schedule-tab";

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleScheduleGuidePhase = (event) => {
      setScheduleGuidePhase(event?.detail?.phase || "inactive");
    };
    const handleGuideExit = () => setScheduleGuidePhase("inactive");

    window.addEventListener(
      CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT,
      handleScheduleGuidePhase
    );
    window.addEventListener(CLARA_GUIDE_EXIT_EVENT, handleGuideExit);

    return () => {
      window.removeEventListener(
        CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT,
        handleScheduleGuidePhase
      );
      window.removeEventListener(CLARA_GUIDE_EXIT_EVENT, handleGuideExit);
    };
  }, []);

  const openCommitmentBooklet = useCallback(
    (nextPurchaseIntent = COMMITTED_MONTHLY_PURCHASE_INTENT) => {
      setPurchaseIntent(normalizeOfferPurchaseIntent(nextPurchaseIntent));
      setCommitmentBookletOpen(true);
    },
    []
  );

  const closeCommitmentBooklet = useCallback(() => {
    setCommitmentBookletOpen(false);
  }, []);

  const handleCommitmentDecline = useCallback(() => {
    setCommitmentBookletOpen(false);
    setPurchaseIntent(COMMITTED_MONTHLY_PURCHASE_INTENT);

    if (typeof onCommitmentDecline === "function") {
      onCommitmentDecline();
      return;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(COMMITMENT_DECLINE_HOME_EVENT));
    }
  }, [onCommitmentDecline]);

  const clearConsumedBookletRouteState = useCallback(() => {
    const currentState = location.state || {};
    const hasBookletState =
      currentState.openCommitmentBooklet === true ||
      Boolean(currentState.purchaseIntent);
    if (!hasBookletState) return;

    const {
      openCommitmentBooklet: _openCommitmentBooklet,
      purchaseIntent: _purchaseIntent,
      ...cleanState
    } = currentState;

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      {
        replace: true,
        state: Object.keys(cleanState).length > 0 ? cleanState : null,
      }
    );
  }, [
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOpenCommitmentBooklet = (event) => {
      openCommitmentBooklet(
        event?.detail?.purchaseIntent || COMMITTED_MONTHLY_PURCHASE_INTENT
      );
    };

    window.addEventListener(
      OPEN_COMMITMENT_BOOKLET_EVENT,
      handleOpenCommitmentBooklet
    );
    return () =>
      window.removeEventListener(
        OPEN_COMMITMENT_BOOKLET_EVENT,
        handleOpenCommitmentBooklet
      );
  }, [openCommitmentBooklet]);

  useEffect(() => {
    const sessionIntent = readCommitmentBookletIntentFromSession();
    const locationWantsBooklet =
      location.state?.openCommitmentBooklet === true;
    const locationIntent =
      location.state?.purchaseIntent || COMMITTED_MONTHLY_PURCHASE_INTENT;

    if (sessionIntent?.intent) {
      clearConsumedBookletRouteState();
      openCommitmentBooklet(sessionIntent.intent);
      return;
    }

    if (locationWantsBooklet) {
      clearConsumedBookletRouteState();
      openCommitmentBooklet(locationIntent);
    }
  }, [
    location.key,
    location.state,
    clearConsumedBookletRouteState,
    openCommitmentBooklet,
  ]);

  const booklet = (
    <ClaraCommitmentBookletModal
      open={commitmentBookletOpen}
      onClose={closeCommitmentBooklet}
      onDeclineCommitment={handleCommitmentDecline}
      purchaseIntent={purchaseIntent}
    />
  );

  if (activePanel === "me") {
    const content = renderMe?.() ?? <DashboardMeLifePanel />;
    return (
      <>
        {!hasCommittedAccess ? (
          <LockedPanelPreview
            onOpenCommitmentBooklet={() =>
              openCommitmentBooklet(COMMITTED_MONTHLY_PURCHASE_INTENT)
            }
          >
            {content}
          </LockedPanelPreview>
        ) : (
          content
        )}
        {booklet}
      </>
    );
  }

  if (activePanel === "schedule") {
    const content = (
      <DashboardSchedulePanel
        guidePreviewMode={scheduleGuidePreviewActive}
        scheduleGuidePhase={scheduleGuidePhase}
      />
    );
    return (
      <>
        {!hasCommittedAccess && !scheduleGuidePreviewActive ? (
          <LockedPanelPreview
            onOpenCommitmentBooklet={() =>
              openCommitmentBooklet(COMMITTED_MONTHLY_PURCHASE_INTENT)
            }
          >
            {content}
          </LockedPanelPreview>
        ) : (
          content
        )}
        {booklet}
      </>
    );
  }

  if (activePanel === "feed") return renderFeed?.() ?? fallback;
  if (activePanel === "messages") return renderMessages?.() ?? fallback;
  if (activePanel === "task") return renderTask?.() ?? fallback;
  if (activePanel === "settings") {
    return (
      <>
        {renderSettings?.() ?? fallback}
        {booklet}
      </>
    );
  }

  return (
    <>
      {renderHome?.() ?? fallback}
      {booklet}
    </>
  );
}
