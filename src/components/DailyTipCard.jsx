import { useEffect, useState } from "react";
import { Lightbulb, Send } from "lucide-react";
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

function getDayOfYear() {
  const today = new Date();
  return Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function pickTip(tips) {
  if (!tips || tips.length === 0) return null;

  const today = getTodayStr();
  const scheduled = tips.find((tip) => tip.scheduled_date === today);
  if (scheduled) return scheduled;

  const index = getDayOfYear() % tips.length;
  return tips[index];
}

const FALLBACK_TIPS = [
  { text: "Stay consistent. Small steps build financial freedom." },
  { text: "Track first before you try to fix your spending." },
  { text: "A budget works better when every peso has a purpose." },
  { text: "Review your money weekly, not only when you feel broke." },
];

export default function DailyTipCard({ isPaid, tips = null }) {
  const { user } = useUserRole();
  const [revealed, setRevealed] = useState(false);
  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTip() {
      try {
        setLoading(true);

        if (tips?.length) {
          if (!cancelled) setTip(pickTip(tips));
          return;
        }

        const { data, error } = await supabase
          .from("daily_tips")
          .select("*")
          .eq("status", "active")
          .order("scheduled_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;

        const activeTips = (data || []).filter((item) => {
          const audience = String(item.audience || "all").toLowerCase();
          return audience === "all" || (audience === "paid" && isPaid);
        });

        if (!cancelled) {
          setTip(pickTip(activeTips.length ? activeTips : FALLBACK_TIPS));
        }
      } catch (error) {
        console.error("Failed to load daily tips:", error);
        if (!cancelled) setTip(FALLBACK_TIPS[0]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTip();

    return () => {
      cancelled = true;
    };
  }, [isPaid, tips]);

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

  const tipText = loading
    ? "Loading today's tip..."
    : tip?.text || "Stay consistent. Small steps build financial freedom.";

  return (
    <>
      <div
        onClick={() => setRevealed((open) => !open)}
        className="w-full cursor-pointer rounded-3xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(10,24,20,0.98)_0%,rgba(16,52,38,0.96)_100%)] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            Daily Money Tip
          </span>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-500/10">
            <Lightbulb className="h-5 w-5 text-emerald-400" />
          </div>
        </div>

        {!revealed ? (
          <div>
            <p className="text-xl font-semibold leading-relaxed text-white">
              Most people ignore this...
            </p>
            <p className="mt-3 text-sm text-white/65">
              Tap to reveal today's insight and improve your money behavior.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-semibold leading-relaxed text-white">
              Tip: {tipText}
            </p>

            <div className="mt-4 border-t border-white/10 pt-3">
              {isPaid ? (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setSuggestOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-white/70 hover:text-emerald-300"
                >
                  <Send className="h-3.5 w-3.5" />
                  Suggest a tip
                </button>
              ) : null}
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-white/40">
          {revealed ? "Tap to hide" : "Tap to reveal"}
        </p>
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
