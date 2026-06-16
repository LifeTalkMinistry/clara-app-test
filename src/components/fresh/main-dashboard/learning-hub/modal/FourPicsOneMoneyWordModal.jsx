import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CheckCircle2, Lightbulb, RotateCcw, X, XCircle } from "lucide-react";

const PUZZLES = [
  {
    id: "emergency-fund",
    answer: "Emergency Fund",
    hint: "Protection money for urgent needs, not random wants.",
    lesson: "An emergency fund protects you when life suddenly becomes expensive.",
    clues: [
      { icon: "🛡️", label: "Protection" },
      { icon: "🏥", label: "Medical need" },
      { icon: "🔧", label: "Repair" },
      { icon: "💰", label: "Saved money" },
    ],
  },
  {
    id: "cash-flow",
    answer: "Cash Flow",
    hint: "Money moving in, out, and through your month.",
    lesson: "Cash flow shows how income moves through bills, spending, saving, and pressure points.",
    clues: [
      { icon: "💼", label: "Income" },
      { icon: "➡️", label: "Movement" },
      { icon: "🧾", label: "Bills" },
      { icon: "🏦", label: "Balance" },
    ],
  },
  {
    id: "budget",
    answer: "Budget",
    hint: "A plan that gives money a job before you spend it.",
    lesson: "A budget is not punishment. It is direction before emotion decides for your wallet.",
    clues: [
      { icon: "📋", label: "Plan" },
      { icon: "🧮", label: "Numbers" },
      { icon: "🛒", label: "Spending" },
      { icon: "✅", label: "Control" },
    ],
  },
  {
    id: "liability",
    answer: "Liability",
    hint: "Something that takes money out or creates financial obligation.",
    lesson: "A liability usually pulls money away through payments, costs, or obligations.",
    clues: [
      { icon: "🧾", label: "Obligation" },
      { icon: "⛓️", label: "Attached cost" },
      { icon: "💸", label: "Money out" },
      { icon: "📉", label: "Drains value" },
    ],
  },
  {
    id: "inflation",
    answer: "Inflation",
    hint: "When prices rise and the same money buys less.",
    lesson: "Inflation means your money can lose buying power when prices keep increasing.",
    clues: [
      { icon: "🎈", label: "Rising" },
      { icon: "🛒", label: "Groceries" },
      { icon: "📈", label: "Prices up" },
      { icon: "💵", label: "Less buying power" },
    ],
  },
];

function normalizeAnswer(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function AnswerSlots({ answer, guess }) {
  const letters = normalizeAnswer(guess).toUpperCase().split("");
  let cursor = 0;

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {String(answer || "")
        .toUpperCase()
        .split(" ")
        .map((word, wordIndex) => (
          <div key={`${word}-${wordIndex}`} className="flex gap-1.5">
            {word.split("").map((letter, letterIndex) => {
              const shownLetter = letters[cursor] || "";
              cursor += 1;
              return (
                <span
                  key={`${letter}-${letterIndex}`}
                  className="flex h-8 w-7 items-center justify-center rounded-[10px] border border-cyan-100/14 bg-white/[0.07] text-[13px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  {shownLetter}
                </span>
              );
            })}
          </div>
        ))}
    </div>
  );
}

export default function FourPicsOneMoneyWordModal({ isOpen, material, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const activePuzzle = PUZZLES[activeIndex] || PUZZLES[0];
  const isSolved = feedback === "correct";
  const progressText = `${activeIndex + 1}/${PUZZLES.length}`;

  const normalizedCorrectAnswer = useMemo(
    () => normalizeAnswer(activePuzzle.answer),
    [activePuzzle.answer],
  );

  if (!isOpen || typeof document === "undefined") return null;

  const resetRound = () => {
    setGuess("");
    setShowHint(false);
    setFeedback(null);
  };

  const checkAnswer = () => {
    if (!guess.trim()) {
      setFeedback("empty");
      return;
    }

    setFeedback(normalizeAnswer(guess) === normalizedCorrectAnswer ? "correct" : "wrong");
  };

  const goNext = () => {
    setActiveIndex((current) => (current + 1) % PUZZLES.length);
    resetRound();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSolved) {
      goNext();
      return;
    }
    checkAnswer();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-end justify-center overflow-y-auto bg-black/76 px-3 pb-3 pt-8 text-white backdrop-blur-md sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${material?.title || "4 Pics 1 Money Word"} game`}
        className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-cyan-100/12 bg-[radial-gradient(circle_at_8%_-10%,rgba(34,211,238,0.20),transparent_42%),radial-gradient(circle_at_100%_112%,rgba(129,140,248,0.18),transparent_48%),linear-gradient(135deg,rgba(5,38,55,0.98),rgba(7,20,48,0.98)_52%,rgba(30,19,68,0.94))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.48)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close game"
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/24 text-white/70 backdrop-blur-md transition hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-11">
          <p className="text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/58">
            Money Game • Puzzle {progressText}
          </p>
          <h2 className="mt-1.5 text-[25px] font-black leading-tight tracking-[-0.03em] text-white">
            4 Pics 1 Money Word
          </h2>
          <p className="mt-2 text-[13px] leading-snug text-white/62">
            Look at the four clues, then guess the hidden financial term.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {activePuzzle.clues.map((clue) => (
            <div
              key={`${activePuzzle.id}-${clue.label}`}
              className="min-h-[104px] rounded-[22px] border border-cyan-100/12 bg-white/[0.075] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              <div className="text-[38px] leading-none">{clue.icon}</div>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50/58">
                {clue.label}
              </p>
            </div>
          ))}
        </div>

        <AnswerSlots answer={activePuzzle.answer} guess={guess} />

        <form onSubmit={handleSubmit} className="mt-4">
          <label className="sr-only" htmlFor="money-word-answer">
            Money word answer
          </label>
          <input
            id="money-word-answer"
            value={guess}
            onChange={(event) => {
              setGuess(event.target.value);
              if (feedback !== "correct") setFeedback(null);
            }}
            placeholder="Type the money word"
            className="w-full rounded-2xl border border-cyan-100/12 bg-black/22 px-4 py-3 text-center text-[16px] font-black uppercase tracking-[0.08em] text-white outline-none transition placeholder:text-white/28 focus:border-cyan-100/28 focus:bg-black/30"
          />

          {feedback ? (
            <div
              className={`mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-[12px] leading-snug ${
                feedback === "correct"
                  ? "border-emerald-200/20 bg-emerald-300/[0.10] text-emerald-50"
                  : "border-rose-200/18 bg-rose-300/[0.09] text-rose-50"
              }`}
            >
              {feedback === "correct" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {feedback === "correct"
                  ? activePuzzle.lesson
                  : feedback === "empty"
                    ? "Type your answer first."
                    : "Not yet. Use the four clues and try another money word."}
              </span>
            </div>
          ) : null}

          {showHint ? (
            <div className="mt-3 rounded-2xl border border-cyan-100/12 bg-cyan-100/[0.08] px-3 py-2.5 text-[12px] leading-snug text-cyan-50/76">
              <span className="font-black text-cyan-50">Hint:</span> {activePuzzle.hint}
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowHint((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-100/12 bg-white/[0.075] px-4 py-2.5 text-[12px] font-black text-cyan-50 transition hover:bg-white/[0.11] active:scale-[0.98]"
            >
              <Lightbulb className="h-4 w-4" />
              Hint
            </button>

            <button
              type="button"
              onClick={resetRound}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-4 py-2.5 text-[12px] font-black text-white/68 transition hover:bg-white/[0.08] active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-100/18 bg-cyan-100/[0.14] px-4 py-2.5 text-[12px] font-black text-cyan-50 transition hover:bg-cyan-100/[0.20] active:scale-[0.98]"
            >
              {isSolved ? "Next" : "Check"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
