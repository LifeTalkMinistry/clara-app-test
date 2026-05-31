import { MessageCircle, Newspaper } from "lucide-react";
import DashboardMeLifePanel from "@/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel";
import DashboardSchedulePanel from "@/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel";

function SettingsSocialCommunityShortcuts() {
  const shortcutClass =
    "group flex w-full cursor-not-allowed items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.025] px-4 py-4 text-left opacity-60 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]";

  return (
    <section className="settings-social-community-shortcuts mt-4 space-y-3 rounded-[28px] border border-cyan-200/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.07),transparent_34%),rgba(255,255,255,0.026)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/30">
            Social & Community
          </p>
          <p className="mt-1 text-xs leading-5 text-white/38">
            Messages and community features are being polished for a cleaner CLARA experience.
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-amber-200/14 bg-amber-300/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100/72">
          Soon
        </span>
      </div>

      <div className="space-y-2.5" aria-disabled="true">
        <button type="button" disabled className={shortcutClass}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/48">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white/72">Messages</p>
            <p className="mt-1 truncate text-xs text-white/35">
              Direct messages and support conversations
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[10px] font-bold text-white/42">
            Building
          </span>
        </button>

        <button type="button" disabled className={shortcutClass}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/48">
            <Newspaper className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white/72">Community Feed</p>
            <p className="mt-1 truncate text-xs text-white/35">
              Posts, updates, and CLARA community activity
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[10px] font-bold text-white/42">
            Soon
          </span>
        </button>
      </div>
    </section>
  );
}

function renderSettingsWithSocialShortcuts(renderSettings, fallback) {
  const settingsContent = renderSettings?.() ?? fallback;

  if (!settingsContent) return null;

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
  fallback = null,
}) {
  if (activePanel === "me") {
    return renderMe?.() ?? <DashboardMeLifePanel />;
  }

  if (activePanel === "schedule") {
    return <DashboardSchedulePanel />;
  }

  if (activePanel === "feed") return renderFeed?.() ?? fallback;
  if (activePanel === "messages") return renderMessages?.() ?? fallback;
  if (activePanel === "task") return renderTask?.() ?? fallback;
  if (activePanel === "settings") return renderSettingsWithSocialShortcuts(renderSettings, fallback);

  return renderHome?.() ?? fallback;
}
