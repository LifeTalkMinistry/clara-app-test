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

  let pool = tips;

  const idx = getDayOfYear() % pool.length;
  return pool[idx];
}

const FALLBACK_TIPS = [
  { text: "Stay consistent. Small steps build financial freedom." },
  { text: "Track first before you try to fix your spending." },
  { text: "A budget works better when every peso has a purpose." },
  { text: "Review your money weekly, not only when you feel broke." },
];

export default function DailyTipCard({
  isPaid,
  isPending,
  isFree,
  user,
  tips = null,
  onSuggestTip,
}) {
  const [revealed, setRevealed] = useState(false);
  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const source = tips?.length ? tips : FALLBACK_TIPS;
      setTip(pickTip(source, isPaid, isPending));
    } catch {
      setTip(FALLBACK_TIPS[0]);
    } finally {
      setLoading(false);
    }
  }, [isPaid, isPending, tips]);

  const handleSuggest = async () => {
    if (!suggestion.trim()) return;

    setSubmitting(true);

    try {
      toast.success("Tip submitted for review!");
      setSuggestion("");
      setSuggestOpen(false);
    } catch {
      toast.error("Failed to submit");
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
        onClick={() => setRevealed((r) => !r)}
        className="w-full cursor-pointer rounded-3xl p-5 border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(10,24,20,0.98)_0%,rgba(16,52,38,0.96)_100%)] shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            Daily Money Tip
          </span>

          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-400/10 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* CONTENT */}
        {!revealed ? (
          <div>
            <p className="text-xl font-semibold text-white leading-relaxed">
              ⚠️ Most people ignore this...
            </p>
            <p className="text-sm text-white/65 mt-3">
              Tap to reveal today’s insight and improve your money behavior.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-semibold text-white leading-relaxed">
              💡 {tipText}
            </p>

            <div className="mt-4 pt-3 border-t border-white/10">
              {isPaid && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSuggestOpen(true);
                  }}
                  className="text-xs text-white/70 hover:text-emerald-300 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Suggest a tip
                </button>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-white/40 mt-4">
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
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="Type your tip..."
          />

          <Button
            onClick={handleSuggest}
            disabled={submitting || !suggestion.trim()}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}