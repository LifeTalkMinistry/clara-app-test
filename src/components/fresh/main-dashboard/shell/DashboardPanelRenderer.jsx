import { useEffect, useRef, useState } from "react";
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
  const carouselRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setBookletPage(0);

    window.requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ left: 0, behavior: "auto" });
    });
  }, [open]);

  if (!open) return null;

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

    const currentPage = Math.round(carousel.scrollLeft / carousel.clientWidth);
    const safePage = Math.min(
      Math.max(currentPage, 0),
      CLARA_COMMITMENT_BOOKLET_PAGES.length - 1
    );

    if (safePage !== bookletPage) {
      setBookletPage(safePage);
    }
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
    const contentOffsetClass = isDensePage ? "" : "-translate-y-[3%]";

    return (
      <article
        key={bookletItem.label}
        className="flex h-full min-h-0 w-full min-w-full snap-center snap-always flex-col justify-center overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(135deg,#108b90_0%,#1d2f6d_44%,#2c1664_100%)] px-[clamp(24px,6vw,32px)] py-[clamp(24px,5.2vw,32px)] text-left shadow-[0_22px_58px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-24px_42px_rgba(0,0,0,0.16)]"
      >
        <div className={contentOffsetClass}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/48">
            {index + 1 < 10 ? `0${index + 1}` : index + 1} / {bookletItem.label.toUpperCase()}
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
                onClick={onClose}
                className="mt-4 w-full rounded-full border border-white/18 bg-white/[0.1] px-4 py-3 text-sm font-black text-white/92 transition hover:bg-white/[0.14] active:scale-[0.99]"
              >
                Start My Commitment
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
          <p className="mx-auto mt-2 max-w-[180px] text-[12px] font-bold leading-5 text-slate-300/62">
            Swipe to next
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
                index === bookletPage ? "w-6 bg-cyan-100/64" : "w-1.5 bg-cyan-100/22"
              }`}
              aria-label={`Go to ${bookletItem.label}`}
            />
          ))}
        </div>
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
