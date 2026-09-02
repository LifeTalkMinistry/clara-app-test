import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  Globe2,
  House,
  MessageCircle,
  Newspaper,
  Settings,
  Trophy,
  UsersRound,
  Wrench,
} from "lucide-react";
import CommunityBackend from "./CommunityBackend";
import Challenges from "./Challenges";
import MyCircle from "./MyCircle";
import MessagesBackend from "./MessagesBackend";
import CommunityProfile from "./CommunityProfile";
import CommunityHomeFinancialCarousel from "@/components/community/CommunityHomeFinancialCarousel";
import ClaraOrbPage, { ClaraOrbMark } from "@/components/community/ClaraOrbPage";
import ClaraTrialAccessGate from "@/components/community/ClaraTrialAccessGate";
import ClaraFinancialContextSetupCoordinator from "@/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator";
import FreeDailyTipCard from "@/components/fresh/main-dashboard/daily-tip";
import LearningHub from "@/components/fresh/main-dashboard/learning-hub/LearningHub";
import DashboardSchedulePanel from "@/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel";
import DashboardSettingsPanel from "@/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel";
import useClaraProductAccess from "@/hooks/useClaraProductAccess";
import useUserRole from "@/hooks/useUserRole";
import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
} from "@/lib/clara-backend-client";
import {
  ensureFinancialContextSetupState,
  isFinancialContextSetupComplete,
} from "@/lib/financialContextSetupRepository";
import { consumeSupportConversationTarget } from "@/lib/support-conversation-navigation";

const VALID_VIEWS = new Set([
  "orb",
  "home",
  "schedule",
  "settings",
  "feed",
  "circles",
  "challenges",
  "messages",
  "notifications",
  "profile",
]);

const ADMIN_ONLY_VIEWS = new Set([
  "feed",
  "circles",
  "challenges",
  "messages",
  "notifications",
  "profile",
]);

function formatNotificationTime(value) {
  if (!value) return "Just now";
  const delta = Date.now() - new Date(value).getTime();
  if (Number.isFinite(delta) && delta >= 0) {
    if (delta < 60_000) return "Just now";
    if (delta < 3_600_000) return `${Math.max(1, Math.floor(delta / 60_000))}m`;
    if (delta < 86_400_000) return `${Math.max(1, Math.floor(delta / 3_600_000))}h`;
  }
  try {
    return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function ActiveMarker({ active }) {
  if (!active) return null;
  return (
    <span className="pointer-events-none absolute -bottom-[13px] left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-[#2be1d8] shadow-[0_0_12px_rgba(43,225,216,0.75)] sm:w-9" />
  );
}

function CommunityShellHeader({ activeView, unreadCount }) {
  const itemClass = (active = false) =>
    `clara-community-nav-item relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-200 max-[420px]:h-9 max-[420px]:w-9 sm:h-12 sm:w-12 ${
      active
        ? "border-[#55f2e9]/45 bg-[radial-gradient(circle_at_35%_30%,rgba(49,225,216,0.22),rgba(16,31,57,0.96))] text-[#8ffff8] shadow-[0_0_0_1px_rgba(85,242,233,0.08),0_0_24px_rgba(43,225,216,0.16)]"
        : "border-[#6f83b4]/22 bg-[#0b1730]/88 text-white/60 hover:border-white/20 hover:text-white/85"
    }`;

  return (
    <header className="clara-community-shell-header shrink-0 border-b border-white/[0.06] bg-[linear-gradient(180deg,rgba(5,15,34,0.99),rgba(5,17,34,0.97))] px-3 pb-4 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5">
      <div className="clara-community-shell-nav mx-auto flex w-full max-w-3xl items-center justify-between gap-0.5 sm:gap-2">
        <Link
          to="/community?view=orb"
          className={itemClass(activeView === "orb")}
          aria-label="Open CLARA Orb"
          title="CLARA Orb"
          aria-current={activeView === "orb" ? "page" : undefined}
        >
          <ClaraOrbMark className="h-[19px] w-[19px] max-[420px]:h-[17px] max-[420px]:w-[17px] sm:h-[20px] sm:w-[20px]" title="CLARA Orb" />
          <ActiveMarker active={activeView === "orb"} />
        </Link>

        <Link
          to="/community?view=home"
          className={itemClass(activeView === "home")}
          aria-label="Open Home"
          title="Home"
          aria-current={activeView === "home" ? "page" : undefined}
        >
          <House className="h-[18px] w-[18px] max-[420px]:h-[17px] max-[420px]:w-[17px] sm:h-[19px] sm:w-[19px]" />
          <ActiveMarker active={activeView === "home"} />
        </Link>

        <Link
          to="/community?view=schedule"
          className={itemClass(activeView === "schedule")}
          aria-label="Open Calendar"
          title="Calendar"
          aria-current={activeView === "schedule" ? "page" : undefined}
        >
          <CalendarDays className="h-[18px] w-[18px] max-[420px]:h-[17px] max-[420px]:w-[17px] sm:h-[19px] sm:w-[19px]" />
          <ActiveMarker active={activeView === "schedule"} />
        </Link>

        <Link
          to="/community?view=settings"
          className={itemClass(activeView === "settings")}
          aria-label="Open Settings"
          title="Settings"
          aria-current={activeView === "settings" ? "page" : undefined}
        >
          <Settings className="h-[18px] w-[18px] max-[420px]:h-[17px] max-[420px]:w-[17px] sm:h-[19px] sm:w-[19px]" />
          <ActiveMarker active={activeView === "settings"} />
        </Link>

        <Link
          to="/community?view=feed"
          className={itemClass(activeView === "feed")}
          aria-label="Open Community feed"
          title="Feed"
          aria-current={activeView === "feed" ? "page" : undefined}
        >
          <Newspaper className="h-[18px] w-[18px] max-[420px]:h-[17px] max-[420px]:w-[17px] sm:h-[19px] sm:w-[19px]" />
          <ActiveMarker active={activeView === "feed"} />
        </Link>

        <Link
          to="/community?view=circles"
          className={itemClass(activeView === "circles")}
          aria-label="Open My Circle"
          title="My Circle"
          aria-current={activeView === "circles" ? "page" : undefined}
        >
          <UsersRound className="h-[18px] w-[18px] max-[420px]:h-[17px] max-[420px]:w-[17px] sm:h-[19px] sm:w-[19px]" />
          <ActiveMarker active={activeView === "circles"} />
        </Link>

        <Link
          to="/community?view=challenges"
          className={itemClass(activeView === "challenges")}
          aria-label="Open CLARA Challenges"
          title="CLARA Challenges"
          aria-current={activeView === "challenges" ? "page" : undefined}
        >
          <Trophy className="h-[18px] w-[18px] max-[420px]:h-[17px] max-[420px]:w-[17px] sm:h-[19px] sm:w-[19px]" />
          <ActiveMarker active={activeView === "challenges"} />
        </Link>

        <Link
          to="/community?view=messages"
          className={itemClass(activeView === "messages")}
          aria-label="Open private messages"
          title="Messages"
          aria-current={activeView === "messages" ? "page" : undefined}
        >
          <MessageCircle className="h-[18px] w-[18px] max-[420px]:h-[17px] max-[420px]:w-[17px] sm:h-[19px] sm:w-[19px]" />
          <ActiveMarker active={activeView === "messages"} />
        </Link>

        <Link
          to="/community?view=notifications"
          className={itemClass(activeView === "notifications")}
          aria-label="Community notifications"
          title="Notifications"
          aria-current={activeView === "notifications" ? "page" : undefined}
        >
          <Bell className="h-[18px] w-[18px] max-[420px]:h-[17px] max-[420px]:w-[17px] sm:h-[19px] sm:w-[19px]" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#071329] bg-[#28ddd5] px-1 text-[8px] font-black text-[#023d3a] shadow-[0_0_12px_rgba(40,221,213,0.45)] sm:h-[18px] sm:min-w-[18px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <ActiveMarker active={activeView === "notifications"} />
        </Link>

        <Link
          to="/community?view=profile"
          className={`clara-community-nav-item relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[10px] font-black tracking-[-0.01em] transition-all duration-200 max-[420px]:h-9 max-[420px]:w-9 max-[420px]:text-[9px] sm:h-12 sm:w-12 sm:text-[11px] ${
            activeView === "profile"
              ? "border-[#8ffff8]/45 bg-[linear-gradient(135deg,#25bfd4,#6356e8)] text-white shadow-[0_0_24px_rgba(74,110,255,0.28)]"
              : "border-[#6f83b4]/22 bg-[linear-gradient(135deg,rgba(35,170,190,0.78),rgba(88,70,214,0.82))] text-white/95 shadow-[0_8px_22px_rgba(65,76,180,0.16)]"
          }`}
          aria-label="Open Community profile"
          title="ME"
          aria-current={activeView === "profile" ? "page" : undefined}
        >
          ME
          <ActiveMarker active={activeView === "profile"} />
        </Link>
      </div>
    </header>
  );
}

function UnderConstructionView() {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_18%,rgba(56,108,255,0.12),transparent_35%),#06111f] px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-[28px] border border-white/[0.08] bg-white/[0.025] px-6 py-10 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-[#0b1730]">
          <Wrench className="h-6 w-6 text-cyan-100/75" aria-hidden="true" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.22em] text-cyan-100/45">
          CLARA
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.035em]">
          Under Construction
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-[13px] font-semibold leading-6 text-white/48">
          This area is still being prepared for CLARA users. It is currently available only to the admin team.
        </p>
      </section>
    </main>
  );
}

function FinancialContextSetupLoading() {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-[#020714] px-5 text-white" data-clara-financial-context-loading="true">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto h-1.5 w-36 overflow-hidden rounded-full bg-white/8">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-200/55" />
        </div>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/45">Preparing your financial context</p>
      </div>
    </main>
  );
}

export default function Community() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: appUser, isAdmin = false } = useUserRole();
  const {
    trial,
    checking: checkingProductAccess,
    error: productAccessError,
    hasProductAccess,
    refreshAccess,
    redeemTrialCode,
  } = useClaraProductAccess();
  const [notifications, setNotifications] = useState([]);
  const [financialSetupState, setFinancialSetupState] = useState(null);
  const [checkingFinancialSetup, setCheckingFinancialSetup] = useState(true);
  const [financialSetupError, setFinancialSetupError] = useState("");
  const token = getStoredBackendToken();
  const backendUser = getStoredBackendUser();
  const settingsUser = appUser || backendUser;
  const requestedView = searchParams.get("view") || "orb";
  const activeView = VALID_VIEWS.has(requestedView) ? requestedView : "orb";
  const hubOpen = activeView === "home" && searchParams.get("learning") === "hub";
  const adminOnlyForCurrentUser =
    !isAdmin && (ADMIN_ONLY_VIEWS.has(activeView) || hubOpen);
  const gateCurrentView =
    !isAdmin &&
    !hasProductAccess &&
    activeView !== "settings";
  const financialSetupComplete = isFinancialContextSetupComplete(financialSetupState);
  const gateFinancialContextSetup =
    !isAdmin &&
    hasProductAccess &&
    !checkingProductAccess &&
    (checkingFinancialSetup || !financialSetupComplete);

  useEffect(() => {
    if (isAdmin) {
      setFinancialSetupState(null);
      setFinancialSetupError("");
      setCheckingFinancialSetup(false);
      return undefined;
    }

    if (checkingProductAccess || !hasProductAccess || !settingsUser?.id && !settingsUser?.email) {
      setCheckingFinancialSetup(true);
      return undefined;
    }

    let cancelled = false;
    setCheckingFinancialSetup(true);
    setFinancialSetupError("");

    void ensureFinancialContextSetupState(settingsUser)
      .then((nextState) => {
        if (cancelled) return;
        setFinancialSetupState(nextState);
        setCheckingFinancialSetup(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setFinancialSetupError(String(error?.message || "CLARA couldn’t load Financial Context Setup."));
        setCheckingFinancialSetup(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    checkingProductAccess,
    hasProductAccess,
    isAdmin,
    settingsUser?.id,
    settingsUser?.email,
    settingsUser?.created_at,
    settingsUser?.createdAt,
  ]);

  const handleOpenLearningHub = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("view", "home");
    nextParams.set("learning", "hub");
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  const handleCloseLearningHub = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("view", "home");
    nextParams.delete("learning");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadNotifications = useCallback(async () => {
    if (!token || !isAdmin) return;
    try {
      const data = await backendRequest("/api/community/notifications?limit=50", { token });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[Community shell] notifications failed:", error);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    if (token && isAdmin) loadNotifications();
  }, [isAdmin, loadNotifications, token]);

  useEffect(() => {
    if (!token || !isAdmin) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "hidden") loadNotifications();
    }, 8000);
    return () => window.clearInterval(intervalId);
  }, [isAdmin, loadNotifications, token]);

  useEffect(() => {
    if (
      checkingProductAccess ||
      isAdmin ||
      hasProductAccess ||
      activeView === "orb" ||
      activeView === "settings"
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("view", "orb");
    nextParams.delete("learning");
    setSearchParams(nextParams, { replace: true });
  }, [
    activeView,
    checkingProductAccess,
    hasProductAccess,
    isAdmin,
    searchParams,
    setSearchParams,
  ]);

  const markNotificationRead = async (notification) => {
    if (!notification?.id || notification.is_read || !token || !isAdmin) return;
    try {
      await backendRequest(`/api/community/notifications/${notification.id}/read`, {
        method: "PATCH",
        token,
        body: {},
      });
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
    } catch (error) {
      console.error("[Community shell] notification read failed:", error);
    }
  };

  const unreadCount = isAdmin
    ? notifications.filter((item) => !item.is_read).length
    : 0;

  return (
    <div
      className="clara-community-root fixed inset-0 z-[80] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white"
      data-community-view={activeView}
    >
      {!gateFinancialContextSetup ? (
        <CommunityShellHeader activeView={activeView} unreadCount={unreadCount} />
      ) : null}

      <style>{`
        .clara-community-feed-view > div,
        .clara-community-challenges-view > div,
        .clara-community-messages-view > div {
          position: static !important;
          inset: auto !important;
          z-index: auto !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
        }
        .clara-community-feed-view > div > header,
        .clara-community-challenges-view > div > header {
          display: none !important;
        }
        .clara-community-challenges-view {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior-y: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }
        .clara-community-challenges-view > div {
          height: auto !important;
          min-height: 100% !important;
          overflow: visible !important;
        }
        .clara-community-challenges-view > div > main {
          min-height: auto !important;
          flex: none !important;
          overflow: visible !important;
        }
        .clara-community-circles-view > div > header:has(> div > button:last-child) {
          display: none !important;
        }
        .clara-community-circles-view > div > header:not(:has(> div > button:last-child)) {
          padding-top: 0.6rem !important;
        }
        .clara-community-messages-view > div > header:has(h1) {
          display: none !important;
        }
        .clara-community-messages-view > div > header:not(:has(h1)) {
          padding-top: 0.75rem !important;
        }
        .clara-community-profile-view header.mb-4 {
          display: none !important;
        }
        .clara-community-profile-view > div {
          min-height: 100% !important;
        }

        .clara-community-home-legacy-selector-shield {
          min-height: 1rem !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          pointer-events: none !important;
        }
        .clara-community-home-view > div:first-child > .clara-community-home-learning-hub {
          position: relative !important;
          z-index: 60 !important;
          overflow: visible !important;
          contain: none !important;
          isolation: isolate !important;
          border-radius: 0 !important;
        }
        .clara-community-home-learning-hub [data-clara-learning-hub-section="true"],
        .clara-community-home-learning-hub [data-clara-learning-hub-section="true"] > div,
        .clara-community-home-learning-hub [data-clara-learning-hub-bridge="true"] {
          position: relative !important;
          z-index: 70 !important;
          overflow: visible !important;
          contain: none !important;
          clip-path: none !important;
        }
        .clara-community-schedule-view > div {
          min-height: 100% !important;
        }
      `}</style>

      {activeView === "settings" && gateCurrentView ? (
        <main className="clara-community-settings-view relative z-[1] min-h-0 flex-1 overflow-y-auto bg-[#040b18] px-4 pb-[calc(env(safe-area-inset-bottom)+30px)] pt-5 sm:px-6">
          <div className="mx-auto w-full max-w-md">
            <DashboardSettingsPanel
              user={settingsUser}
              isAdmin={isAdmin}
              onOpenMessages={() => {
                const targetUserId = consumeSupportConversationTarget();
                navigate(
                  targetUserId
                    ? `/community?view=messages&userId=${encodeURIComponent(targetUserId)}`
                    : "/community?view=messages"
                );
              }}
            />
          </div>
        </main>
      ) : gateCurrentView ? (
        <ClaraTrialAccessGate
          trial={trial}
          checking={checkingProductAccess}
          error={productAccessError}
          onRedeem={redeemTrialCode}
          onRetry={refreshAccess}
        />
      ) : gateFinancialContextSetup ? (
        checkingFinancialSetup || !financialSetupState ? (
          financialSetupError ? (
            <main className="flex min-h-0 flex-1 items-center justify-center bg-[#020714] px-5 text-white">
              <div className="w-full max-w-sm text-center">
                <p className="text-[13px] font-black">Financial Context Setup could not load.</p>
                <p className="mt-2 text-[11px] font-semibold leading-5 text-white/45">{financialSetupError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 min-h-11 rounded-[16px] border border-cyan-200/20 bg-cyan-200/[0.08] px-5 text-[12px] font-black text-cyan-50"
                >
                  Retry
                </button>
              </div>
            </main>
          ) : (
            <FinancialContextSetupLoading />
          )
        ) : (
          <ClaraFinancialContextSetupCoordinator
            user={settingsUser}
            setupState={financialSetupState}
            onStateChange={setFinancialSetupState}
            onComplete={setFinancialSetupState}
          />
        )
      ) : adminOnlyForCurrentUser ? (
        <UnderConstructionView />
      ) : activeView === "orb" ? (
        <>
          <ClaraOrbPage />
          {isAdmin ? (
            <button
              type="button"
              onClick={() => navigate("/login?mode=landing")}
              className="fixed right-4 top-[calc(env(safe-area-inset-top)+78px)] z-[96] inline-flex h-9 items-center gap-2 rounded-full border border-cyan-200/15 bg-[#071329]/80 px-3 text-[11px] font-bold text-cyan-50/75 shadow-[0_10px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-cyan-200/30 hover:bg-[#0a1b38]/90 hover:text-white active:scale-[0.98]"
              aria-label="Open CLARA public landing page"
              title="View the public CLARA page"
              data-clara-admin-public-page-shortcut
            >
              <Globe2 className="h-3.5 w-3.5 text-cyan-200/70" aria-hidden="true" />
              <span>Public Page</span>
            </button>
          ) : null}
        </>
      ) : activeView === "home" ? (
        <main
          className="clara-community-home-view min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_88%_8%,rgba(79,70,229,0.12),transparent_30%),radial-gradient(circle_at_12%_22%,rgba(20,184,166,0.07),transparent_30%),#06111f] pb-[calc(env(safe-area-inset-bottom)+30px)] pt-4 sm:pt-6"
          aria-label="CLARA Home"
        >
          <div className="mx-auto w-full max-w-3xl">
            {!hubOpen ? (
              <div className="relative z-10">
                <FreeDailyTipCard flushSpacing />
              </div>
            ) : null}
            <div
              aria-hidden="true"
              className="clara-community-home-legacy-selector-shield h-4 w-full sm:h-5"
            />
            <div className="clara-community-home-learning-hub relative z-[60] pb-2 pt-1 sm:pt-1.5">
              <LearningHub
                hubOpen={hubOpen}
                onOpenHub={handleOpenLearningHub}
                onCloseHub={handleCloseLearningHub}
              />
            </div>
            <CommunityHomeFinancialCarousel />
          </div>
        </main>
      ) : activeView === "schedule" ? (
        <main
          className="clara-community-schedule-view min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_88%_8%,rgba(79,70,229,0.12),transparent_30%),radial-gradient(circle_at_12%_22%,rgba(20,184,166,0.07),transparent_30%),#06111f] pb-[calc(env(safe-area-inset-bottom)+30px)]"
          aria-label="CLARA Calendar"
        >
          <div className="mx-auto min-h-full w-full max-w-3xl">
            <DashboardSchedulePanel />
          </div>
        </main>
      ) : activeView === "settings" ? (
        <main className="clara-community-settings-view relative z-[1] min-h-0 flex-1 overflow-y-auto bg-[#040b18] px-4 pb-[calc(env(safe-area-inset-bottom)+30px)] pt-5 sm:px-6">
          <div className="mx-auto w-full max-w-md">
            <DashboardSettingsPanel
              user={settingsUser}
              isAdmin={isAdmin}
              onOpenMessages={() => {
                const targetUserId = consumeSupportConversationTarget();
                navigate(
                  targetUserId
                    ? `/community?view=messages&userId=${encodeURIComponent(targetUserId)}`
                    : "/community?view=messages"
                );
              }}
            />
          </div>
        </main>
      ) : activeView === "feed" ? (
        <div className="clara-community-feed-view min-h-0 flex-1 overflow-hidden">
          <CommunityBackend />
        </div>
      ) : activeView === "circles" ? (
        <div className="clara-community-circles-view min-h-0 flex-1 overflow-y-auto">
          <MyCircle />
        </div>
      ) : activeView === "challenges" ? (
        <div className="clara-community-challenges-view min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          <Challenges />
        </div>
      ) : activeView === "messages" ? (
        <div className="clara-community-messages-view min-h-0 flex-1 overflow-hidden">
          <MessagesBackend />
        </div>
      ) : activeView === "profile" ? (
        <div className="clara-community-profile-view min-h-0 flex-1 overflow-y-auto">
          <CommunityProfile />
        </div>
      ) : (
        <main className="clara-community-notifications-view min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_85%_4%,rgba(79,70,229,0.12),transparent_30%),#06111f] px-4 pb-[calc(env(safe-area-inset-bottom)+30px)] pt-5 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/55">Community activity</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Notifications</h2>
            </div>

            {notifications.length === 0 ? (
              <div className="rounded-[26px] border border-white/[0.06] bg-white/[0.02] py-16 text-center">
                <Bell className="mx-auto h-8 w-8 text-[#5eead4]/40" />
                <p className="mt-3 font-black">Nothing new yet.</p>
                <p className="mt-1 text-sm text-white/42">Comments, reactions, and messages will appear here.</p>
              </div>
            ) : (
              <div className="clara-community-notifications-card overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#0a1a29] shadow-2xl shadow-black/20">
                {notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => markNotificationRead(notification)}
                    className={`flex w-full items-start gap-3 border-b border-white/[0.07] px-4 py-4 text-left last:border-b-0 ${
                      notification.is_read ? "bg-transparent" : "bg-[#22c7b8]/[0.06]"
                    }`}
                  >
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? "bg-white/15" : "bg-[#22c7b8]"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">
                        <span className="font-black">{notification.actor_name || "CLARA"}</span>{" "}
                        {notification.body || notification.type}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-white/35">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
