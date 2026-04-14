import { useCallback, useEffect, useMemo, useState } from "react";
import { Lightbulb, Send, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import useUserRole from "@/hooks/useUserRole";
import { formatSupabaseError } from "@/lib/admin-panel-utils";
import { buildTipTeaser, selectCurrentAdminTip } from "@/lib/daily-tip-utils";

let dailyTipCache = {
  loaded: false,
  tip: null,
};

export default function DailyTipCard({ isPaid }) {
  const { user } = useUserRole();
  const [revealed, setRevealed] = useState(false);
  const [tip, setTip] = useState(dailyTipCache.tip);
  const [loading, setLoading] = useState(!dailyTipCache.loaded);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTip = useCallback(async ({ background = false } = {}) => {
    try {
      if (!background && !dailyTipCache.loaded) {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from("daily_tips")
        .select("*")
        .eq("source", "admin")
        .eq("status", "active")
        .order("scheduled_date", { ascending: false })
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const nextTip = selectCurrentAdminTip(data || []);

      dailyTipCache = {
        loaded: true,
        tip: nextTip,
      };

      setTip(nextTip);
    } catch (error) {
      console.error("Failed to load daily tips:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dailyTipCache.loaded) {
      setTip(dailyTipCache.tip);
      setLoading(false);
    }

    loadTip({ background: dailyTipCache.loaded });

    const channel = supabase
      .channel("dashboard-daily-tip-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_tips" },
        () => {
          loadTip({ background: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTip]);

  const handleSuggest = async () => {
    if (!suggestion.trim()) return;

    setSubmitting(true);

    try {
      const payload = {
        text: suggestion.trim(),
        category: "mindset",
        audience: "all",
        status: "pending",
        source: "student",
        created_by: user?.email || null,
      };

      const { error } = await supabase.from("daily_tips").insert([payload]);
      if (error) throw error;

      toast.success("Tip submitted for review!");
      setSuggestion("");
      setSuggestOpen(false);
    } catch (error) {
      console.error("Failed to submit daily tip:", error);
      toast.error(formatSupabaseError(error, "Failed to submit tip."));
    } finally {
      setSubmitting(false);
    }
  };

  const teaserText = useMemo(() => buildTipTeaser(tip), [tip]);
  const hasActiveTip = Boolean(tip?.text);

  return (
    <>
      <div className="w-full [perspective:1600px]">
        <div
          role={hasActiveTip ? "button" : undefined}
          tabIndex={hasActiveTip ? 0 : undefined}
          onClick={() => {
            if (hasActiveTip) {
              setRevealed((open) => !open);
            }
          }}
          onKeyDown={(event) => {
            if (!hasActiveTip) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setRevealed((open) => !open);
            }
          }}
          className="block w-full text-left"
          aria-pressed={hasActiveTip ? revealed : undefined}
        >
          <div
            className={`relative min-h-[212px] transform-gpu transition-transform duration-500 [transform-style:preserve-3d] ${
              revealed ? "[transform:rotateY(180deg)]" : ""
            }`}
            style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            <div
              className="absolute inset-0 overflow-hidden rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(8,19,20,0.98)_0%,rgba(16,52,38,0.96)_55%,rgba(8,31,28,0.98)_100%)] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.28)] [backface-visibility:hidden]"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                      Daily Money Tip
                    </p>
                    <p className="mt-2 max-w-[14rem] text-2xl font-semibold leading-tight text-white">
                      {loading ? "Loading today’s tip..." : teaserText}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-500/10">
                    {loading ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-emerald-300" />
                    ) : (
                      <Lightbulb className="h-5 w-5 text-emerald-300" />
                    )}
                  </div>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  <p className="max-w-[16rem] text-sm leading-relaxed text-white/70">
                    {hasActiveTip
                      ? "Tap to flip and read the full admin-selected tip."
                      : "No active tip is published right now."}
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/65">
                    {hasActiveTip ? "Flip card" : "Waiting"}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 overflow-hidden rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(6,15,24,0.98)_0%,rgba(11,32,31,0.98)_55%,rgba(9,25,18,0.98)_100%)] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.28)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                      Live Tip
                    </p>
                    <p className="mt-2 text-lg font-semibold leading-relaxed text-white">
                      {tip?.text || "No active tip is published right now."}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Lightbulb className="h-5 w-5 text-emerald-300" />
                  </div>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  {isPaid ? (
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
                    <p className="text-xs text-white/45">Updated from the admin panel</p>
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
          </DialogHeader>

          <Textarea
            value={suggestion}
            onChange={(event) => setSuggestion(event.target.value)}
            placeholder="Type your tip..."
          />

          <Button onClick={handleSuggest} disabled={submitting || !suggestion.trim()}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
