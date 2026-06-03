import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import DashboardMeLifePanel from "@/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel";
import DashboardSchedulePanel from "@/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel";

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

      <p className="px-3 text-center text-[10px] font-semibold leading-4 text-white/32">
        You can log back in anytime using your CLARA account.
      </p>
    </div>
  );
}

function renderSettingsWithLogout(renderSettings, fallback) {
  const settingsContent = renderSettings?.() ?? fallback;

  if (!settingsContent) {
    return <SettingsLogoutButton />;
  }

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
  if (activePanel === "me") {
    return renderMe?.() ?? <DashboardMeLifePanel />;
  }

  if (activePanel === "schedule") {
    return <DashboardSchedulePanel />;
  }

  if (activePanel === "feed") return renderFeed?.() ?? fallback;
  if (activePanel === "messages") return renderMessages?.() ?? fallback;
  if (activePanel === "task") return renderTask?.() ?? fallback;
  if (activePanel === "settings") return renderSettingsWithLogout(renderSettings, fallback);

  return renderHome?.() ?? fallback;
}
