import { useCallback, useEffect, useMemo, useState } from "react";
import { Lightbulb, RefreshCw, Send } from "lucide-react";
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
import {
  getDashboardTipState,
  getInitialDashboardTipState,
  submitStudentTipSuggestion,
  subscribeToDailyTips,
} from "@/lib/daily-tip-service";
import { buildTipTeaser } from "@/lib/daily-tip-utils";

let dailyTipCache = getInitialDashboardTipState();

export default function DailyTipCard({ user, isAdmin }) {
  const [revealed, setRevealed] = useState(false);
  const [tipState, setTipState] = useState(dailyTipCache);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTip = useCallback(async () => {
    try {
      const nextState = await getDashboardTipState();
      dailyTipCache = nextState;
      setTipState(nextState);
    } catch (error) {
      console.error("Failed to load daily tips:", error);
      setTipState((current) => ({
        ...current,
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    setTipState(dailyTipCache);
    loadTip();

    const unsubscribe = subscribeToDailyTips(() => {
      loadTip();
    });

    return unsubscribe;
  }, [loadTip]);

  useEffect(() => {
    setRevealed(false);
  }, [tipState.tip?.id]);

  const handleSuggest = async () => {
    const trimmedText = suggestion.trim();
    const trimmedTitle = suggestTitle.trim();

    if (!trimmedText) return;

    setSubmitting(true);

    try {
      await submitStudentTipSuggestion({
        title: trimmedTitle,
        text: trimmedText,
        created_by: user?.email || user?.id || null,
      });

      toast.success("Suggestion sent to admin review.");
      setSuggestion("");
      setSuggestTitle("");
      setSuggestOpen(false);
    } catch (error) {
      console.error("Failed to submit daily tip suggestion:", error);
      toast.error(error.message || "Failed to submit tip.");
    } finally {
      setSubmitting(false);
    }
  };

  const teaserText = useMemo(() => buildTipTeaser(tipState.tip), [tipState.tip]);
  const helperText = tipState.usingFallback
    ? "Today's CLARA fallback tip is live while admin tips are inactive."
    : "Today's tip is coming from the admin panel.";
  const badgeText = tipState.loading ? "Checking live tip" : tipState.usingFallback ? "Daily rotation" : "Admin live";
  const suggestionEnabled = Boolean(user && !(isAdmin || user?.role === "admin"));

  return (
    <>
      <div className="w-full [perspective:1800px]">
        <div
          onClick={() => setRevealed((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setRevealed((open) => !open);
            }
          }}
          role="button"
          tabIndex={0}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111F]"
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
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                      Daily Money Tip
                    </p>
                    <p className="mt-2 max-w-[16rem] text-2xl font-semibold leading-tight text-white">
                      {teaserText}
                    </p>
                    <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-white/70">
                      {helperText}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-500/10">
                    {tipState.loading ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-emerald-300" />
                    ) : (
                      <Lightbulb className="h-5 w-5 text-emerald-300" />
                    )}
                  </div>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  <p className="max-w-[16rem] text-sm leading-relaxed text-white/75">
                    Tap to flip and read today's full insight.
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/65">
                    {badgeText}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 overflow-hidden rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(6,15,24,0.98)_0%,rgba(11,32,31,0.98)_55%,rgba(9,25,18,0.98)_100%)] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                      {tipState.usingFallback ? "Today's rotation" : "Today's admin tip"}
                    </p>
                    <p className="mt-2 text-lg font-semibold leading-relaxed text-white">
                      {tipState.tip?.text}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Lightbulb className="h-5 w-5 text-emerald-300" />
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
                      Suggest a money tip
                    </button>
                  ) : (
                    <p className="text-xs text-white/45">
                      {tipState.usingFallback ? "Fallback rotation stays active until admin selects a live tip." : "Updated from the admin panel"}
                    </p>
                  )}

                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/65">
                    Tap to flip back
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
              Share a quote or money lesson for admin review. Suggestions stay private until approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={suggestTitle}
              onChange={(event) => setSuggestTitle(event.target.value)}
              placeholder="Optional teaser or title"
            />

            <Textarea
              value={suggestion}
              onChange={(event) => setSuggestion(event.target.value)}
              placeholder="Write the full tip or quote..."
              className="min-h-[140px]"
            />

            <Button onClick={handleSuggest} disabled={submitting || !suggestion.trim()}>
              {submitting ? "Submitting..." : "Submit for review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
