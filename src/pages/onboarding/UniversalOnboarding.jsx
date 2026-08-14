import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ClaraLogo from "@/components/ClaraLogo";
import { useAuth } from "@/context/AuthContext";

const CLARA_ORB_PATH = "/community?view=orb";
const SUPPORT_BUBBLE_EPOCH_KEY = "clara_support_bubble_cycle_epoch_v2";
const OPEN_SUPPORT_AFTER_ONBOARDING_KEY = "clara_open_support_after_onboarding_v1";
const MISSION_ONBOARDING_COMPLETE_PREFIX = "clara_mission_onboarding_complete_v1";

const SCREEN_IDS = [
  "country",
  "quiet-spending",
  "before",
  "personal",
  "clara",
  "mission",
  "support",
  "rule",
];

function firstNameFrom(profile, user) {
  const rawName =
    profile?.full_name ||
    profile?.display_name ||
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "";

  const firstName = String(rawName).trim().split(/\s+/)[0];
  if (firstName) return firstName;

  const emailPrefix = String(user?.email || "").split("@")[0].trim();
  return emailPrefix || "there";
}

function completionKey(user) {
  const identity = user?.id || user?.email || "local";
  return `${MISSION_ONBOARDING_COMPLETE_PREFIX}:${identity}`;
}

function rememberCompletion(user) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(completionKey(user), new Date().toISOString());
  } catch {
    // Onboarding should never fail because storage is unavailable.
  }
}

function ClaraWordmark({ className = "" }) {
  return (
    <div className={`font-black tracking-[0.18em] ${className}`} aria-label="CLARA">
      <span className="text-[#3b82f6]">CL</span>
      <span className="text-[#facc15]">A</span>
      <span className="text-[#ef4444]">RA</span>
    </div>
  );
}

function PhilippineAmbientMark() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-28 top-[12%] h-[360px] w-[360px] rounded-full bg-[#2563eb]/[0.13] blur-[90px]" />
      <div className="absolute -right-28 bottom-[8%] h-[330px] w-[330px] rounded-full bg-[#ef4444]/[0.10] blur-[95px]" />
      <div className="absolute left-[8%] top-[18%] h-44 w-44 opacity-[0.09]">
        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#facc15]/80" />
        {[0, 45, 90, 135].map((rotation) => (
          <span
            key={rotation}
            className="absolute left-1/2 top-1/2 h-px w-40 origin-left bg-gradient-to-r from-[#facc15]/70 to-transparent"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        ))}
        <span className="absolute left-2 top-3 h-1.5 w-1.5 rotate-45 bg-[#facc15]" />
        <span className="absolute right-5 top-9 h-1.5 w-1.5 rotate-45 bg-[#facc15]" />
        <span className="absolute bottom-4 left-9 h-1.5 w-1.5 rotate-45 bg-[#facc15]" />
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:64px_64px]" />
    </div>
  );
}

function Eyebrow({ children, tone = "blue" }) {
  const toneClass =
    tone === "gold"
      ? "border-[#facc15]/20 bg-[#facc15]/[0.07] text-[#fde68a]"
      : tone === "red"
        ? "border-[#ef4444]/20 bg-[#ef4444]/[0.07] text-[#fecaca]"
        : "border-[#3b82f6]/20 bg-[#3b82f6]/[0.08] text-[#bfdbfe]";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function ScreenFrame({ children, align = "center" }) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center px-6 pb-32 pt-24 sm:px-8 ${
        align === "left" ? "items-start text-left" : "items-center text-center"
      }`}
    >
      {children}
    </div>
  );
}

function CountryScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>Why CLARA exists</Eyebrow>
      <h1 className="mt-6 max-w-sm text-[2.05rem] font-semibold leading-[1.1] tracking-[-0.04em] text-white sm:text-[2.35rem]">
        Filipinos work hard for every peso.
      </h1>
      <p className="mt-5 max-w-[340px] text-[15px] leading-7 text-white/56">
        But earning money and knowing how to protect it are two different skills.
      </p>
      <div className="mt-9 h-px w-20 bg-gradient-to-r from-transparent via-[#facc15]/70 to-transparent" />
      <p className="mt-6 max-w-[320px] text-sm leading-6 text-white/42">
        A country that works this hard deserves a better relationship with money.
      </p>
    </ScreenFrame>
  );
}

function QuietSpendingScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="red">The quiet problem</Eyebrow>
      <h1 className="mt-6 max-w-sm text-[2rem] font-semibold leading-[1.12] tracking-[-0.04em] text-white">
        Money rarely disappears in one dramatic moment.
      </h1>
      <p className="mt-5 max-w-[350px] text-[15px] leading-7 text-white/56">
        It happens through small decisions that feel harmless on their own — until they become a pattern.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {["One quick ride", "One small checkout", "One more delivery"].map((label) => (
          <span
            key={label}
            className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-2 text-xs text-white/55 backdrop-blur-xl"
          >
            {label}
          </span>
        ))}
      </div>
      <p className="mt-8 text-sm font-medium text-white/72">Then payday comes again.</p>
    </ScreenFrame>
  );
}

function BeforeScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>CLARA&apos;s difference</Eyebrow>
      <div className="mt-7 max-w-sm space-y-7">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/34">
            Traditional tracking
          </p>
          <p className="mt-2 text-xl font-medium leading-8 text-white/62">
            Tells you what happened to your money.
          </p>
        </div>
        <div className="mx-auto h-px w-16 bg-white/10" />
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#93c5fd]">
            CLARA
          </p>
          <p className="mt-2 text-[1.75rem] font-semibold leading-9 tracking-[-0.03em] text-white">
            Helps you before the decision is made.
          </p>
        </div>
      </div>
      <p className="mt-8 max-w-[330px] text-sm leading-6 text-white/44">
        Because the most important moment in your budget is often the few seconds before you spend.
      </p>
    </ScreenFrame>
  );
}

function PersonalScreen({ firstName }) {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">Now it becomes personal</Eyebrow>
      <h1 className="mt-6 max-w-sm text-[2.05rem] font-semibold leading-[1.12] tracking-[-0.04em] text-white">
        {firstName}, your financial future is built one decision at a time.
      </h1>
      <div className="mt-9 space-y-3 text-[1.35rem] font-medium tracking-[-0.02em]">
        <p className="text-white/46">Every “yes” matters.</p>
        <p className="text-white/64">Every “not now” matters.</p>
        <p className="text-[#fde68a]">Every pause matters.</p>
      </div>
    </ScreenFrame>
  );
}

function ClaraRevealScreen() {
  return (
    <ScreenFrame>
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="absolute inset-0 scale-150 rounded-full bg-[#2563eb]/12 blur-3xl" />
        <div className="relative scale-[1.35]">
          <ClaraLogo variant="icon" theme="dark" />
        </div>
      </motion.div>
      <ClaraWordmark className="mt-9 text-[2rem]" />
      <p className="mt-3 text-lg font-medium tracking-[-0.02em] text-white">Ask before you spend.</p>
      <p className="mt-5 max-w-[340px] text-sm leading-6 text-white/48">
        Your financial accountability companion for the moment between wanting something and deciding what is wise.
      </p>
    </ScreenFrame>
  );
}

function MissionScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">The bigger mission</Eyebrow>
      <h1 className="mt-6 max-w-sm text-[2rem] font-semibold leading-[1.12] tracking-[-0.04em] text-white">
        Better money decisions should become normal in the Philippines.
      </h1>
      <p className="mt-5 max-w-[350px] text-[15px] leading-7 text-white/56">
        CLARA exists to help build a generation of Filipinos who are wiser, more intentional, more disciplined, and better prepared financially.
      </p>
      <div className="mt-8 grid w-full max-w-[350px] grid-cols-3 gap-2.5">
        {["One person", "One decision", "One habit"].map((label, index) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-2 py-4 text-center"
          >
            <p className="text-[10px] font-bold tracking-[0.13em] text-[#93c5fd]">0{index + 1}</p>
            <p className="mt-1.5 text-xs font-medium text-white/68">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm font-semibold text-white/82">Now you&apos;re part of that movement.</p>
    </ScreenFrame>
  );
}

function SupportScreen({ onExploreSupport }) {
  return (
    <ScreenFrame align="left">
      <Eyebrow tone="gold">Support is a choice</Eyebrow>
      <h1 className="mt-6 max-w-sm text-[2rem] font-semibold leading-[1.12] tracking-[-0.04em] text-white">
        CLARA is free to start. You are never forced to pay to begin.
      </h1>
      <p className="mt-4 max-w-[365px] text-sm leading-6 text-white/52">
        If CLARA becomes valuable to you, you can choose to support what we&apos;re building and receive additional supporter tools and experiences.
      </p>

      <div className="mt-7 w-full max-w-[380px] space-y-3">
        <div className="flex gap-3 rounded-2xl border border-[#3b82f6]/14 bg-[#3b82f6]/[0.055] p-4">
          <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-[#93c5fd]" />
          <div>
            <p className="text-sm font-semibold text-white">Support the mission</p>
            <p className="mt-1 text-xs leading-5 text-white/48">
              Help CLARA keep improving and reach more Filipinos.
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-2xl border border-[#facc15]/14 bg-[#facc15]/[0.045] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#fde68a]" />
          <div>
            <p className="text-sm font-semibold text-white">Make a commitment</p>
            <p className="mt-1 text-xs leading-5 text-white/48">
              Supporting CLARA doesn&apos;t buy discipline. It can be your deliberate commitment to practice it.
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-white/65" />
          <div>
            <p className="text-sm font-semibold text-white">Go deeper</p>
            <p className="mt-1 text-xs leading-5 text-white/48">
              Supporters receive extra benefits designed to deepen the CLARA experience.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onExploreSupport}
        className="mt-6 inline-flex items-center gap-2 rounded-full px-1 py-2 text-xs font-semibold text-[#bfdbfe] transition hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40"
      >
        Explore supporter benefits
        <ArrowRight className="h-3.5 w-3.5" />
      </button>

      <p className="mt-2 text-[11px] leading-5 text-white/32">
        No pressure. Your habits — not a payment — are what build financial stability.
      </p>
    </ScreenFrame>
  );
}

function RuleScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>One rule to remember</Eyebrow>
      <div className="mt-7 relative">
        <div className="absolute inset-0 scale-150 rounded-full bg-[#2563eb]/10 blur-3xl" />
        <div className="relative scale-110">
          <ClaraLogo variant="icon" theme="dark" />
        </div>
      </div>
      <h1 className="mt-9 max-w-sm text-[2.3rem] font-semibold leading-[1.08] tracking-[-0.05em] text-white">
        Before you spend,
        <span className="block text-[#93c5fd]">ask CLARA.</span>
      </h1>
      <p className="mt-5 max-w-[320px] text-sm leading-6 text-white/48">
        You don&apos;t need to be perfect with money. Start by creating a pause before the next decision.
      </p>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-white/34">
        Pause · Think · Decide
      </p>
    </ScreenFrame>
  );
}

export default function UniversalOnboarding() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user, profile } = useAuth();
  const [screenIndex, setScreenIndex] = useState(0);
  const firstName = useMemo(() => firstNameFrom(profile, user), [profile, user]);
  const activeScreen = SCREEN_IDS[screenIndex];
  const isFirst = screenIndex === 0;
  const isLast = screenIndex === SCREEN_IDS.length - 1;

  const goNext = () => {
    if (isLast) return;
    setScreenIndex((current) => Math.min(current + 1, SCREEN_IDS.length - 1));
  };

  const goBack = () => {
    if (isFirst) return;
    setScreenIndex((current) => Math.max(current - 1, 0));
  };

  const enterClara = () => {
    rememberCompletion(user);
    navigate(CLARA_ORB_PATH, { replace: true });
  };

  const exploreSupport = () => {
    rememberCompletion(user);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(OPEN_SUPPORT_AFTER_ONBOARDING_KEY, "1");
        window.localStorage.setItem(SUPPORT_BUBBLE_EPOCH_KEY, String(Date.now()));
      } catch {
        // The user can still continue into CLARA if storage is restricted.
      }
    }
    navigate(CLARA_ORB_PATH, { replace: true });
  };

  const content = (() => {
    if (activeScreen === "country") return <CountryScreen />;
    if (activeScreen === "quiet-spending") return <QuietSpendingScreen />;
    if (activeScreen === "before") return <BeforeScreen />;
    if (activeScreen === "personal") return <PersonalScreen firstName={firstName} />;
    if (activeScreen === "clara") return <ClaraRevealScreen />;
    if (activeScreen === "mission") return <MissionScreen />;
    if (activeScreen === "support") return <SupportScreen onExploreSupport={exploreSupport} />;
    return <RuleScreen />;
  })();

  return (
    <div className="fixed inset-0 z-[500] flex min-h-[100dvh] flex-col overflow-hidden bg-[#040817] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(37,99,235,.13),transparent_42%),linear-gradient(180deg,#050a1b_0%,#030611_58%,#02030a_100%)]" />
      <PhilippineAmbientMark />

      <header className="absolute inset-x-0 top-0 z-20 px-5 pt-[max(env(safe-area-inset-top),18px)] sm:px-7">
        <div className="mx-auto flex max-w-[460px] items-center justify-between">
          <ClaraWordmark className="text-[13px]" />
          <span className="text-[10px] font-semibold tracking-[0.14em] text-white/28">
            {String(screenIndex + 1).padStart(2, "0")} / {String(SCREEN_IDS.length).padStart(2, "0")}
          </span>
        </div>
        <div className="mx-auto mt-4 flex max-w-[460px] gap-1.5">
          {SCREEN_IDS.map((screenId, index) => (
            <span
              key={screenId}
              className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${
                index <= screenIndex ? "bg-[#3b82f6]/75" : "bg-white/[0.07]"
              }`}
            />
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeScreen}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.992 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.995 }}
          transition={{ duration: reduceMotion ? 0.18 : 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex min-h-0 flex-1"
        >
          {content}
        </motion.div>
      </AnimatePresence>

      <footer className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#02030a] via-[#02030a]/94 to-transparent px-5 pb-[max(env(safe-area-inset-bottom),18px)] pt-10 sm:px-7">
        <div className="mx-auto flex max-w-[460px] items-center gap-3">
          {!isFirst ? (
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-white/55 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={isLast ? enterClara : goNext}
            className="group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#3b82f6]/30 bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(37,99,235,.22)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/50 active:scale-[0.99]"
          >
            <span>{isLast ? "Start with CLARA" : activeScreen === "support" ? "Continue with free CLARA" : "Continue"}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
