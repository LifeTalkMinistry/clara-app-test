import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  MessageCircle,
  Newspaper,
  Trophy,
  UsersRound,
} from "lucide-react";
import CommunityBackend from "./CommunityBackend";
import Challenges from "./Challenges";
import MyCircle from "./MyCircle";
import MessagesBackend from "./MessagesBackend";
import CommunityProfile from "./CommunityProfile";
import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

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

function CommunityShellHeader({ activeView, unreadCount, onExit }) {
  const itemClass = (active = false) =>
    `relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition ${
      active
        ? "border-[#5eead4]/35 bg-[#22c7b8]/16 text-[#ccfbf1] shadow-[0_0_18px_rgba(34,199,184,0.12)]"
        : "border-white/10 bg-white/[0.05] text-white/78"
    }`;

  return (
    <header className="shrink-0 border-b border-white/10 bg-[#06111f]/96 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={onExit}
          className={itemClass(false)}
          aria-label="Back to Dashboard"
          title="Dashboard"
        >
          <ArrowLeft className="h-[17px] w-[17px]" />
        </button>

        <Link
          to="/community"
          className={itemClass(activeView === "feed")}
          aria-label="Open Community feed"
          title="Feed"
          aria-current={activeView === "feed" ? "page" : undefined}
        >
          <Newspaper className="h-[17px] w-[17px]" />
        </Link>

        <Link
          to="/community?view=circles"
          className={itemClass(activeView === "circles")}
          aria-label="Open My Circle"
          title="My Circle"
          aria-current={activeView === "circles" ? "page" : undefined}
        >
          <UsersRound className="h-[17px] w-[17px]" />
        </Link>

        <Link
          to="/community?view=challenges"
          className={itemClass(activeView === "challenges")}
          aria-label="Open CLARA Challenges"
          title="CLARA Challenges"
          aria-current={activeView === "challenges" ? "page" : undefined}
        >
          <Trophy className="h-[17px] w-[17px]" />
        </Link>

        <Link
          to="/community?view=messages"
          className={itemClass(activeView === "messages")}
          aria-label="Open private messages"
          title="Messages"
          aria-current={activeView === "messages" ? "page" : undefined}
        >
          <MessageCircle className="h-[17px] w-[17px]" />
        </Link>

        <Link
          to="/community?view=notifications"
          className={itemClass(activeView === "notifications")}
          aria-label="Community notifications"
          title="Notifications"
          aria-current={activeView === "notifications" ? "page" : undefined}
        >
          <Bell className="h-[17px] w-[17px]" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c7b8] px-1 text-[9px] font-black text-[#042f2e]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Link>

        <Link
          to="/community?view=profile"
          className={`relative inline-flex h-10 min-w-[44px] shrink-0 items-center justify-center rounded-2xl border px-2 text-[10px] font-black transition ${
            activeView === "profile"
              ? "border-[#5eead4]/35 bg-[#22c7b8]/16 text-[#ccfbf1] shadow-[0_0_18px_rgba(34,199,184,0.12)]"
              : "border-white/10 bg-white/[0.05] text-white/78"
          }`}
          aria-label="Open Community profile"
          title="ME"
          aria-current={activeView === "profile" ? "page" : undefined}
        >
          ME
        </Link>
      </div>
    </header>
  );
}

export default function Community() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [headerActions, setHeaderActions] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const token = getStoredBackendToken();
  const requestedView = searchParams.get("view") || "feed";
  const activeView = ["circles", "challenges", "messages", "notifications", "profile"].includes(requestedView)
    ? requestedView
    : "feed";
  const showingFeed = activeView === "feed";

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const data = await backendRequest("/api/community/notifications?limit=50", { token });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[Community shell] notifications failed:", error);
    }
  }, [token]);

  useEffect(() => {
    if (!showingFeed && token) loadNotifications();
  }, [loadNotifications, showingFeed, token]);

  useEffect(() => {
    if (showingFeed || !token) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "hidden") loadNotifications();
    }, 8000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications, showingFeed, token]);

  useEffect(() => {
    setHeaderActions(null);
    if (!showingFeed) return undefined;

    let frameId = null;
    let cancelled = false;

    const attachToHeader = () => {
      if (cancelled) return;

      const target = document.querySelector(
        ".clara-community-challenge-entry header > div > div:last-child"
      );

      if (target) {
        setHeaderActions(target);
        return;
      }

      frameId = window.requestAnimationFrame(attachToHeader);
    };

    attachToHeader();

    return () => {
      cancelled = true;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [showingFeed]);

  const markNotificationRead = async (notification) => {
    if (!notification?.id || notification.is_read || !token) return;
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

  if (showingFeed) {
    return (
      <div className="clara-community-challenge-entry">
        <CommunityBackend />

        {headerActions
          ? createPortal(
              <>
                <Link
                  to="/community"
                  className="order-first inline-flex h-11 w-11 scale-[0.92] items-center justify-center rounded-2xl border border-[#5eead4]/35 bg-[#22c7b8]/16 text-[#ccfbf1] shadow-[0_0_18px_rgba(34,199,184,0.12)]"
                  aria-label="Community feed"
                  title="Feed"
                  aria-current="page"
                >
                  <Newspaper className="h-[18px] w-[18px]" />
                </Link>
                <Link
                  to="/community?view=circles"
                  className="order-first inline-flex h-11 w-11 scale-[0.92] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/82"
                  aria-label="Open My Circle"
                  title="My Circle"
                >
                  <UsersRound className="h-[18px] w-[18px]" />
                </Link>
                <Link
                  to="/community?view=challenges"
                  className="order-first inline-flex h-11 w-11 scale-[0.92] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/82"
                  aria-label="Open CLARA Challenges"
                  title="CLARA Challenges"
                >
                  <Trophy className="h-[18px] w-[18px]" />
                </Link>
              </>,
              headerActions
            )
          : null}
      </div>
    );
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white">
      <CommunityShellHeader
        activeView={activeView}
        unreadCount={unreadCount}
        onExit={() => navigate("/dashboard")}
      />

      <style>{`
        .clara-community-challenges-view > div,
        .clara-community-messages-view > div {
          position: static !important;
          inset: auto !important;
          z-index: auto !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
        }
        .clara-community-challenges-view > div > header {
          display: none !important;
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
      `}</style>

      {activeView === "circles" ? (
        <div className="clara-community-circles-view min-h-0 flex-1 overflow-y-auto">
          <MyCircle />
        </div>
      ) : activeView === "challenges" ? (
        <div className="clara-community-challenges-view min-h-0 flex-1 overflow-hidden">
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
        <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+30px)] pt-4 sm:px-5">
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/55">Community activity</p>
              <h2 className="mt-1 text-xl font-black">Notifications</h2>
            </div>

            {notifications.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="mx-auto h-8 w-8 text-[#5eead4]/40" />
                <p className="mt-3 font-black">Nothing new yet.</p>
                <p className="mt-1 text-sm text-white/42">Comments, reactions, and messages will appear here.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0a1a29]">
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
