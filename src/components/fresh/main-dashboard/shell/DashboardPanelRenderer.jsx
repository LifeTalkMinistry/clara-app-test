import { Link } from "react-router-dom";
import { MessageCircle, Newspaper } from "lucide-react";
import DashboardMePanel from "@/components/fresh/main-dashboard/dashboard-panels/me/DashboardMePanel";

function SettingsSocialCommunityShortcuts() {
  const shortcutClass =
    "group flex w-full items-center gap-3 rounded-[24px] border border-white/15 bg-white/[0.045] px-4 py-4 text-left transition hover:bg-white/[0.07]";

  return (
    <section className="mt-4 space-y-3 rounded-[28px] border border-white/15 bg-white/[0.04] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
          Social & Community
        </p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          Messages and community activity are safely stored here so Home, Me, and LifeOS stay focused.
        </p>
      </div>

      <div className="space-y-2.5">
        <Link to="/messages" className={shortcutClass}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white/65 transition group-hover:text-white">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">Messages</p>
            <p className="mt-1 truncate text-xs text-white/45">
              Direct messages and support conversations
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-bold text-white/55">
            Inbox
          </span>
        </Link>

        <Link to="/feed" className={shortcutClass}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white/65 transition group-hover:text-white">
            <Newspaper className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">Community Feed</p>
            <p className="mt-1 truncate text-xs text-white/45">
              Posts, updates, and CLARA community activity
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-bold text-white/55">
            Feed
          </span>
        </Link>
      </div>
    </section>
  );
}

function renderSettingsWithSocialShortcuts(renderSettings, fallback) {
  const settingsContent = renderSettings?.() ?? fallback;

  if (!settingsContent) return <SettingsSocialCommunityShortcuts />;

  return (
    <>
      {settingsContent}
      <SettingsSocialCommunityShortcuts />
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
  renderLifeOS,
  fallback = null,
}) {
  if (activePanel === "me") {
    return renderMe?.() ?? <DashboardMePanel />;
  }

  if (activePanel === "lifeos") {
    return renderLifeOS?.() ?? renderFeed?.() ?? fallback;
  }

  if (activePanel === "feed") return renderFeed?.() ?? fallback;
  if (activePanel === "messages") return renderMessages?.() ?? fallback;
  if (activePanel === "task") return renderTask?.() ?? fallback;
  if (activePanel === "settings") return renderSettingsWithSocialShortcuts(renderSettings, fallback);

  return renderHome?.() ?? fallback;
}
