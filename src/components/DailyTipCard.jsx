import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, RefreshCw, Send, Flame, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  getDashboardTipState,
  getInitialDashboardTipState,
  submitStudentTipSuggestion,
  subscribeToDailyTips,
} from "@/lib/daily-tip-service";

let dailyTipCache = getInitialDashboardTipState();

const STREAK_STORAGE_PREFIX = "clara_daily_tip_streak_v2";

const formatLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getYesterdayDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getKey = (user) =>
  `${STREAK_STORAGE_PREFIX}:${user?.id || user?.email || "guest"}`;

const read = (user) => {
  if (typeof window === "undefined") return { streak: 0, last: null };

  try {
    const raw = window.localStorage.getItem(getKey(user));
    if (!raw) return { streak: 0, last: null };
    const parsed = JSON.parse(raw);

    return {
      streak: Number(parsed?.streak) || 0,
      last: parsed?.last || null,
    };
  } catch {
    return { streak: 0, last: null };
  }
};

const write = (user, data) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getKey(user), JSON.stringify(data));
  } catch {}
};

const nextStreak = (current) => {
  const today = formatLocalDate();
  const yesterday = getYesterdayDateString();

  if (current.last === today) {
    return {
      ...current,
      already: true,
      restarted: false,
      milestone: false,
    };
  }

  if (current.last === yesterday) {
    const streak = (current.streak || 0) + 1;
    return {
      streak,
      last: today,
      already: false,
      restarted: false,
      milestone: [3, 7, 14, 30].includes(streak),
    };
  }

  return {
    streak: 1,
    last: today,
    already: false,
    restarted: (current.streak || 0) > 0,
    milestone: false,
  };
};

const getFrontMysteryText = (loading) => {
  if (loading) return "Preparing today’s money tip...";
  return "Tap to flip and reveal today’s money tip.";
};

const getFrontSubtext = (loading) => {
  if (loading) return "Loading today’s insight";
  return "Your next money reminder is waiting.";
};

const getBackBadgeText = (streak) => {
  if (!streak) return "Tap to flip back";
  return `🔥 ${streak} Day Streak`;
};

export default function DailyTipCard({ user, isAdmin }) {
  const [revealed, setRevealed] = useState(false);
  const [tipState, setTipState] = useState(dailyTipCache);
  const [streak, setStreak] = useState(() => read(user));
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pulse, setPulse] = useState(true);
  const cardRef = useRef(null);

  const loadTip = useCallback(async () => {
    try {
      const next = await getDashboardTipState();
      dailyTipCache = next;
      setTipState(next);
    } catch (error) {
      console.error("Failed to load daily tip:", error);
      setTipState((current) => ({
        ...current,
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    setTipState(dailyTipCache);
    loadTip();
    const unsubscribe = subscribeToDailyTips(loadTip);
    return unsubscribe;
  }, [loadTip]);

  useEffect(() => {
    setRevealed(false);
  }, [tipState.tip?.id]);

  useEffect(() => {
    setStreak(read(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (revealed) {
      setPulse(false);
      return;
    }

    setPulse(true);
    const interval = setInterval(() => {
      setPulse((prev) => !prev);
    }, 1800);

    return () => clearInterval(interval);
  }, [revealed]);

  const launchMilestoneConfetti = useCallback(() => {
    try {
      const rect = cardRef.current?.getBoundingClientRect();
      const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
      const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.55;

      confetti({
        particleCount: 90,
        spread: 80,
        startVelocity: 35,
        origin: { x, y },
      });

      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 110,
          startVelocity: 28,
          origin: { x, y: y - 0.05 },
        });
      }, 180);
    } catch {}
  }, []);

  const handleFlip = () => {
    setRevealed((prev) => {
      const next = !prev;

      if (!prev && next) {
        const current = read(user);
        const updated = nextStreak(current);

        if (!updated.already) {
          const payload = {
            streak: updated.streak,
            last: updated.last,
          };

          write(user, payload);
          setStreak(payload);

          if (updated.restarted) {
            toast("Fresh start today", {
              description: `🔥 ${updated.streak} Day Streak`,
            });
          } else {
            toast("Daily check-in complete", {
              description: `🔥 ${updated.streak} Day Streak`,
            });
          }

          if (updated.milestone) {
            launchMilestoneConfetti();
            toast("Streak milestone reached", {
              description: `✨ ${updated.streak} Day Streak`,
            });
          }
        } else {
          setStreak(current);
          toast("Already checked in today", {
            description: `🔥 ${current.streak || 1} Day Streak`,
          });
        }
      }

      return next;
    });
  };

  const handleSuggest = async () => {
    if (!suggestion.trim() || submitting) return;

    setSubmitting(true);

    try {
      await submitStudentTipSuggestion({
        title: suggestTitle.trim(),
        text: suggestion.trim(),
        created_by: user?.email || user?.id || null,
      });

      toast.success("Submitted");
      setSuggestOpen(false);
      setSuggestion("");
      setSuggestTitle("");
    } catch (error) {
      console.error("Failed to submit suggestion:", error);
      toast.error(error?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const suggestionEnabled = Boolean(user && !(isAdmin || user?.role === "admin"));
  const frontMysteryText = useMemo(() => getFrontMysteryText(tipState.loading), [tipState.loading]);
  const frontSubtext = useMemo(() => getFrontSubtext(tipState.loading), [tipState.loading]);
  const backBadgeText = useMemo(() => getBackBadgeText(streak.streak), [streak.streak]);

  return (
    <>
      <div className="w-full [perspective:1800px]">
        <div
          ref={cardRef}
          onClick={handleFlip}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleFlip();
            }
          }}
          role="button"
          tabIndex={0}
          className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111F]"
          aria-pressed={revealed}
        >
          <div
            className="relative min-h-[220px] transform-gpu transition-transform duration-700"
            style={{
              transformStyle: "preserve-3d",
              transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
            }}
          >
            <div
              className="absolute inset-0 overflow-hidden rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(8,19,20,0.98)_0%,rgba(16,52,38,0.96)_55%,rgba(8,31,28,0.98)_100%)] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              <div
                className={`pointer-events-none absolute inset-0 rounded-[28px] transition-opacity duration-1000 ${
                  pulse && !revealed ? "opacity-100" : "opacity-40"
                }`}
                style={{
                  background:
                    "radial-gradient(circle at 80% 20%, rgba(52,211,153,0.16), transparent 28%), radial-gradient(circle at 18% 78%, rgba(16,185,129,0.10), transparent 24%)",
                }}
              />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                      Daily Money Tip
                    </p>

                    <p className="mt-6 max-w-[16rem] text-xl font-semibold leading-snug text-white">
                      {frontMysteryText}
                    </p>
                  </div>

                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-500/10 transition-all duration-700 ${
                      pulse && !revealed ? "shadow-[0_0_24px_rgba(52,211,153,0.18)]" : ""
                    }`}
                  >
                    {tipState.loading ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-emerald-300" />
                    ) : (
                      <Lightbulb
                        className={`h-5 w-5 text-emerald-300 transition-transform duration-700 ${
                          pulse && !revealed ? "scale-110" : "scale-100"
                        }`}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  <div className="space-y-1">
                    <p className="max-w-[16rem] text-sm leading-normal text-white/75">
                      {frontSubtext}
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-200/85">
                      <Sparkles className="h-3.5 w-3.5" />
                      Tap to flip
                    </div>
                  </div>

                  {(streak.streak || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                      <Flame className="h-3.5 w-3.5" />
                      {streak.streak} Day Streak
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 overflow-hidden rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(6,15,24,0.98)_0%,rgba(11,32,31,0.98)_55%,rgba(9,25,18,0.98)_100%)] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
              style={{
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                      Daily Money Tip
                    </p>

                    <p className="mt-6 text-lg font-semibold leading-snug text-white">
                      {tipState.loading ? "Loading today’s money tip..." : tipState.tip?.text || "No tip available today."}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    {tipState.loading ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-emerald-300" />
                    ) : (
                      <Lightbulb className="h-5 w-5 text-emerald-300" />
                    )}
                  </div>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  {suggestionEnabled ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSuggestOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 transition hover:text-emerald-300"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Suggest a tip
                    </button>
                  ) : (
                    <div />
                  )}

                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/65">
                    {backBadgeText}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Suggest a Money Tip</DialogTitle>
            <DialogDescription>
              Share your idea for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={suggestTitle}
              onChange={(e) => setSuggestTitle(e.target.value)}
              placeholder="Title"
            />

            <Textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Write tip..."
              className="min-h-[140px]"
            />

            <Button onClick={handleSuggest} disabled={submitting || !suggestion.trim()}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}