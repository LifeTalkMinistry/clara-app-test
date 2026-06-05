import { useEffect, useState } from "react";
import { Lock, LogOut, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import useUserRole from "@/hooks/useUserRole";
import DashboardMeLifePanel from "@/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel";
import DashboardSchedulePanel from "@/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel";

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
    hint: "Swipe to continue →",
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
      "But because meaningful change usually starts when someone decides:",
    ],
    quote: "I'm ready to take this seriously.",
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
      "A portion of every commitment plan helps support:",
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
  const [bookletPage, setBookletPage] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);

  useEffect(() => {
    if (open) setBookletPage(0);
  }, [open]);

  if (!open) return null;

  const page = CLARA_COMMITMENT_BOOKLET_PAGES[bookletPage];
  const isFinalPage = bookletPage === CLARA_COMMITMENT_BOOKLET_PAGES.length - 1;
  const isDensePage =
    (page.paragraphs?.length || 0) +
      (page.bullets?.length || 0) +
      (page.checks?.length || 0) +
      (page.closingParagraphs?.length || 0) >
    10;
  const pageTextClass = isDensePage
    ? "mt-3 space-y-1.5 text-[clamp(0.68rem,2.15vw,0.8rem)] font-semibold leading-[1.34] text-white/80"
    : "mt-4 space-y-2.5 text-[clamp(0.78rem,2.55vw,0.94rem)] font-semibold leading-[1.52] text-white/80";

  const goToPreviousPage = () => {
    setBookletPage((currentPage) => Math.max(currentPage - 1, 0));
  };

  const goToNextPage = () => {
    setBookletPage((currentPage) =>
      Math.min(currentPage + 1, CLARA_COMMITMENT_BOOKLET_PAGES.length - 1)
    );
  };

  const handleTouchStart = (event) => {
    setTouchStartX(event.changedTouches?.[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX === null) return;

    const touchEndX = event.changedTouches?.[0]?.clientX ?? touchStartX;
    const distance = touchStartX - touchEndX;
    const swipeThreshold = 42;

    if (distance > swipeThreshold) {
      goToNextPage();
    } else if (distance < -swipeThreshold) {
      goToPreviousPage();
    }

    setTouchStartX(null);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#020817]/88 px-5 pt-[max(18px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))] backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="relative flex h-[calc(100dvh-36px)] max-h-[800px] w-full max-w-[440px] flex-col overflow-hidden rounded-[36px] border border-white/16 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.07),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.1),transparent_36%),rgba(5,10,23,0.98)] text-white shadow-[0_28px_96px_rgba(0,0,0,0.64)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-white/28" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-cyan-400/8 blur-3xl" />

        <header className="relative z-10 shrink-0 rounded-t-[36px] border-b border-white/10 bg-[rgba(2,8,23,0.86)] px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/56">
                CLARA Commitment Booklet
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/34">
                {page.label} of {CLARA_COMMITMENT_BOOKLET_PAGES.length}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/16 bg-white/[0.09] p-2 text-white/70 transition hover:bg-white/[0.12] hover:text-white"
              aria-label="Close commitment booklet"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div
          className="relative z-10 flex-1 overflow-hidden px-4 py-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <article className="flex h-full flex-col justify-center rounded-[30px] border border-white/14 bg-[rgba(8,18,40,0.92)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <h2 className="text-[clamp(1.08rem,4.7vw,1.48rem)] font-black leading-tight tracking-[-0.045em] text-white/96">
              {page.title}
            </h2>

            <div className={pageTextClass}>
              {page.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {page.quote ? (
                <div className="rounded-[18px] border border-white/14 bg-white/[0.08] px-3 py-2 text-center text-[clamp(0.72rem,2.2vw,0.82rem)] font-black italic leading-[1.35] text-white/90">
                  “{page.quote}”
                </div>
              ) : null}

              {page.bullets ? (
                <ul className="space-y-1.5">
                  {page.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/48" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {page.checks ? (
                <ul className="space-y-1.5">
                  {page.checks.map((check) => (
                    <li key={check} className="flex gap-2 text-white/86">
                      <span className="shrink-0 text-white/62">✓</span>
                      <span>{check}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {page.closingParagraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {page.hint ? (
                <p className="pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                  {page.hint}
                </p>
              ) : null}

              {isFinalPage ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 w-full rounded-[20px] border border-white/16 bg-white/[0.1] px-4 py-2.5 text-sm font-black text-white/90 transition hover:bg-white/[0.14] active:scale-[0.99]"
                >
                  Start My Commitment
                </button>
              ) : null}
            </div>
          </article>
        </div>

        <footer className="relative z-10 shrink-0 rounded-b-[36px] border-t border-white/10 bg-[rgba(2,8,23,0.9)] px-5 pb-5 pt-3.5">
          <div className="flex items-center justify-center gap-1.5">
            {CLARA_COMMITMENT_BOOKLET_PAGES.map((bookletItem, index) => (
              <button
                key={bookletItem.label}
                type="button"
                onClick={() => setBookletPage(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === bookletPage ? "w-6 bg-white/70" : "w-1.5 bg-white/24"
                }`}
                aria-label={`Go to ${bookletItem.label}`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-white/34">
            Swipe to turn page
          </p>
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
