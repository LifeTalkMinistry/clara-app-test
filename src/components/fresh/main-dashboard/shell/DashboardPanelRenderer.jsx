import { useState } from "react";
import { Lock, LogOut, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import useUserRole from "@/hooks/useUserRole";
import DashboardMeLifePanel from "@/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel";
import DashboardSchedulePanel from "@/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel";

function readPlanPreview() {
  if (typeof window === "undefined") return "";

  try {
    const raw = window.localStorage.getItem("clara_dev_plan_preview") || "";
    const clean = raw.trim();
    if (!clean) return "";

    if (clean.startsWith("{")) {
      const parsed = JSON.parse(clean);
      return String(parsed?.plan || parsed?.plan_key || "").trim();
    }

    return clean;
  } catch {
    return "";
  }
}

function ClaraCommitmentBookletModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#020817]/76 px-4 py-[max(14px,env(safe-area-inset-top))] backdrop-blur-lg"
      onClick={onClose}
    >
      <div
        className="relative flex h-[86dvh] max-h-[720px] w-full max-w-[440px] flex-col overflow-hidden rounded-[34px] border border-white/14 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.12),transparent_38%),rgba(9,18,36,0.9)] text-white shadow-[0_26px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/30" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

        <header className="relative z-10 shrink-0 border-b border-white/10 bg-black/10 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/48">
                CLARA Commitment Booklet
              </p>
              <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-white/94">
                Before you continue
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/14 bg-white/[0.075] p-2.5 text-white/62 transition hover:bg-white/[0.1] hover:text-white"
              aria-label="Close commitment booklet"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-3.5">
            <section className="rounded-[26px] border border-white/12 bg-white/[0.065] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/48">
                This is not just tracking
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/72">
                CLARA is designed to help you pause, reflect, and make calmer money decisions before your habits control the outcome.
              </p>
            </section>

            <section className="rounded-[26px] border border-white/12 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/48">
                What commitment means
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/72">
                Commitment means being honest with your records, checking your money before spending, and allowing small daily decisions to build long-term discipline.
              </p>
            </section>

            <section className="rounded-[26px] border border-white/12 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/48">
                What CLARA will ask from you
              </p>
              <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-white/72">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                  <span>Record honestly</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                  <span>Pause before impulse spending</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                  <span>Review your money with clarity</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                  <span>Build consistency one decision at a time</span>
                </li>
              </ul>
            </section>

            <section className="rounded-[26px] border border-white/12 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/48">
                The purpose
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/72">
                This experience is not about pressure. It is about helping you become more aware, more prepared, and more intentional with your money.
              </p>
            </section>
          </div>
        </div>

        <footer className="relative z-10 shrink-0 border-t border-white/10 bg-black/15 px-5 pb-5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[22px] border border-white/14 bg-white/[0.09] px-4 py-3 text-sm font-black text-white/86 transition hover:bg-white/[0.12] active:scale-[0.99]"
          >
            I Understand
          </button>
        </footer>
      </div>
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
          <p className="mt-1 text-lg font-black tracking-[-0.03em] text-white/92">Ready to Commit?</p>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-white/58">
            Tap to see more.
          </p>
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
  const { plan = "free", user } = useUserRole();
  const previewPlan = readPlanPreview();
  const userPlan = user?.plan || user?.subscription?.plan || plan;
  const isFreePreview = (previewPlan || userPlan) === "free";
  const [commitmentBookletOpen, setCommitmentBookletOpen] = useState(false);
  const openCommitmentBooklet = () => setCommitmentBookletOpen(true);
  const closeCommitmentBooklet = () => setCommitmentBookletOpen(false);

  if (activePanel === "me") {
    const content = renderMe?.() ?? <DashboardMeLifePanel />;
    return (
      <>
        {isFreePreview ? (
          <LockedPanelPreview onOpenCommitmentBooklet={openCommitmentBooklet}>
            {content}
          </LockedPanelPreview>
        ) : (
          content
        )}
        <ClaraCommitmentBookletModal open={commitmentBookletOpen} onClose={closeCommitmentBooklet} />
      </>
    );
  }

  if (activePanel === "schedule") {
    const content = <DashboardSchedulePanel />;
    return (
      <>
        {isFreePreview ? (
          <LockedPanelPreview onOpenCommitmentBooklet={openCommitmentBooklet}>
            {content}
          </LockedPanelPreview>
        ) : (
          content
        )}
        <ClaraCommitmentBookletModal open={commitmentBookletOpen} onClose={closeCommitmentBooklet} />
      </>
    );
  }

  if (activePanel === "feed") return renderFeed?.() ?? fallback;
  if (activePanel === "messages") return renderMessages?.() ?? fallback;
  if (activePanel === "task") return renderTask?.() ?? fallback;
  if (activePanel === "settings") return renderSettingsWithLogout(renderSettings, fallback);

  return renderHome?.() ?? fallback;
}
