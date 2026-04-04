import { useState, useEffect } from "react";
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

function getDayOfYear() {
  const today = new Date();
  return Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / 86400000
  );
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function pickTip(tips, isPaid, isPending) {
  if (!tips || tips.length === 0) return null;

  const today = getTodayStr();

  const scheduled = tips.find((t) => t.scheduled_date === today);
  if (scheduled) return scheduled;

  let pool = tips.filter((t) => {
    if (t.audience === "all") return true;
    if (t.audience === "pending" && isPending) return true;
    if (t.audience === "paid" && isPaid && !isPending) return true;
    if (t.audience === "free" && !isPaid && !isPending) return true;
    return false;
  });

  if (pool.length === 0) pool = tips;

  const idx = getDayOfYear() % pool.length;
  return pool[idx];
}

const FALLBACK_TIPS = [
  {
    text: "Stay consistent. Small steps build financial freedom.",
    audience: "all",
    status: "active",
  },
  {
    text: "Track first before you try to fix your spending.",
    audience: "all",
    status: "active",
  },
  {
    text: "A budget works better when every peso has a purpose.",
    audience: "all",
    status: "active",
  },
  {
    text: "Review your money weekly, not only when you feel broke.",
    audience: "all",
    status: "active",
  },
];

function loadLocalTips() {
  try {
    const saved = JSON.parse(localStorage.getItem("clara_daily_tips") || "[]");
    const activeTips = saved.filter((tip) => tip.status === "active");
    return activeTips.length ? activeTips : FALLBACK_TIPS;
  } catch {
    return FALLBACK_TIPS;
  }
}

function saveSuggestedTip(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem("clara_daily_tips") || "[]");
    const newTip = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      created_date: new Date().toISOString(),
      ...payload,
    };

    localStorage.setItem(
      "clara_daily_tips",
      JSON.stringify([newTip, ...existing])
    );

    return newTip;
  } catch (error) {
    console.error("Failed to save suggested tip locally:", error);
    return null;
  }
}

export default function DailyTipCard({
  isPaid,
  isPending,
  isFree,
  user,
  tips = null,
  onSuggestTip,
}) {
  const [flipped, setFlipped] = useState(false);
  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const sourceTips = Array.isArray(tips) && tips.length > 0 ? tips : loadLocalTips();
      setTip(pickTip(sourceTips, isPaid, isPending));
    } catch (error) {
      console.error("Failed to load tips:", error);
      setTip(pickTip(FALLBACK_TIPS, isPaid, isPending));
    } finally {
      setLoading(false);
    }
  }, [isPaid, isPending, tips]);

  const handleSuggest = async () => {
    if (!suggestion.trim()) return;

    setSubmitting(true);

    const payload = {
      text: suggestion.trim(),
      category: "habits",
      audience: "all",
      status: "pending",
      source: "student",
      submitter_email: user?.email || "",
      submitter_name: user?.full_name || user?.name || "",
    };

    try {
      if (typeof onSuggestTip === "function") {
        await onSuggestTip(payload);
      } else {
        saveSuggestedTip(payload);
      }

      toast.success("Tip submitted for review. Thank you!");
      setSuggestion("");
      setSuggestOpen(false);
    } catch (error) {
      console.error("Tip submission failed:", error);
      toast.error("Failed to submit suggestion.");
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
        className="cursor-pointer select-none"
        style={{ perspective: "800px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          style={{
            position: "relative",
            transformStyle: "preserve-3d",
            transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "176px",
          }}
        >
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
            className="absolute inset-0 rounded-2xl p-4 border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(10,24,20,0.98)_0%,rgba(16,52,38,0.96)_100%)] shadow-[0_8px_24px_rgba(0,0,0,0.28)] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                Daily Money Tip
              </span>

              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-400/10 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-white/90 leading-snug">
                Flip for today&apos;s tip
              </p>
            </div>
          </div>

          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            className="absolute inset-0 rounded-2xl p-4 border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(10,24,20,0.98)_0%,rgba(16,52,38,0.96)_100%)] shadow-[0_8px_24px_rgba(0,0,0,0.28)] flex flex-col"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/65 shrink-0">
              Today&apos;s Tip
            </span>

            <div className="mt-2 flex-1 min-h-0">
              <p className="text-[15px] font-semibold text-white leading-snug line-clamp-4">
                “{tipText}”
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-white/10 space-y-2 shrink-0">
              <div>
                {isFree && !isPending && (
                  <p className="text-[10px] text-emerald-300 font-semibold">
                    Unlock full system by enrolling →
                  </p>
                )}

                {isPending && (
                  <p className="text-[10px] text-white/55">
                    Stay ready. Approval coming soon.
                  </p>
                )}

                {isPaid && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSuggestOpen(true);
                    }}
                    type="button"
                    className="text-[10px] text-white/70 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Suggest a tip
                  </button>
                )}
              </div>

              <p className="text-[10px] text-white/45">Tap to flip back</p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Suggest a Money Tip</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Your suggestion will be reviewed by admin before being published.
          </p>

          <Textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="e.g. Set a weekly money review every Sunday evening."
            rows={3}
          />

          <Button
            className="w-full"
            onClick={handleSuggest}
            disabled={submitting || !suggestion.trim()}
          >
            {submitting ? "Submitting..." : "Submit Suggestion"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}