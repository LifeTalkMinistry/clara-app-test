import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  XCircle,
} from "lucide-react";

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
    <div className="mt-[clamp(0.45rem,1.2dvh,0.85rem)] flex flex-wrap justify-center gap-x-[clamp(0.32rem,1.2vw,0.6rem)] gap-y-[clamp(0.38rem,1dvh,0.6rem)]">
      {String(answer || "")
        .toUpperCase()
        .split(" ")
        .map((word, wordIndex) => (
          <div key={`${word}-${wordIndex}`} className="flex gap-[clamp(0.22rem,0.9vw,0.38rem)]">
            {word.split("").map((letter, letterIndex) => {
              const shownLetter = letters[cursor] || "";
              cursor += 1;
              return (
                <span
                  key={`${letter}-${letterIndex}`}
                  className="flex h-[clamp(1.55rem,4.3dvh,2.15rem)] w-[clamp(1.45rem,7.1vw,2rem)] items-center justify-center rounded-[10px] border border-cyan-100/18 bg-white/[0.08] text-[clamp(11px,1.9dvh,14px)] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_18px_rgba(0,0,0,0.20)]"
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
  const [solvedIds, setSolvedIds] = useState([]);

  const activePuzzle = PUZZLES[activeIndex] || PUZZLES[0];
  const isSolved = feedback === "correct";
  const progressText = `${activeIndex + 1}/${PUZZLES.length}`;
  const solvedCount = solvedIds.length;
  const progressPercent = Math.round(((activeIndex + 1) / PUZZLES.length) * 100);

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

    const isCorrect = normalizeAnswer(guess) === normalizedCorrectAnswer;
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setSolvedIds((current) => (
        current.includes(activePuzzle.id) ? current : [...current, activePuzzle.id]
      ));
    }
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
    <div className="fixed inset-0 z-[9999] h-[100dvh] overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.20),transparent_38%),radial-gradient(circle_at_100%_10%,rgba(129,140,248,0.18),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(20,184,166,0.14),transparent_42%),linear-gradient(135deg,#031a2a,#071329_46%,#1c0f3f)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[18dvh] bg-gradient-to-b from-white/[0.08] to-transparent" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-[20dvh] bg-gradient-to-t from-black/45 to-transparent" />

      <main className="relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden px-[clamp(0.7rem,3.7vw,1rem)] pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-[max(0.55rem,env(safe-area-inset-top))]">
        <header className="flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to Money Games"
            className="inline-flex h-[clamp(2.35rem,6.2dvh,2.75rem)] w-[clamp(2.35rem,6.2dvh,2.75rem)] shrink-0 items-center justify-center rounded-2xl border border-cyan-100/14 bg-white/[0.08] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:bg-white/[0.12] active:scale-[0.98]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[clamp(7px,1.2dvh,9px)] font-black uppercase tracking-[0.24em] text-cyan-100/58">
              Money Game Mode
            </p>
            <h1 className="mt-0.5 truncate text-[clamp(17px,2.6dvh,20px)] font-black tracking-[-0.03em] text-white">
              4 Pics 1 Money Word
            </h1>
          </div>

          <div className="flex h-[clamp(2.35rem,6.2dvh,2.75rem)] w-[clamp(2.35rem,6.2dvh,2.75rem)] shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-100/14 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <span className="text-[clamp(11px,1.9dvh,13px)] font-black leading-none text-cyan-50">{solvedCount}</span>
            <span className="mt-0.5 text-[6.5px] font-black uppercase tracking-[0.10em] text-white/48">Score</span>
          </div>
        </header>

        <section className="mt-[clamp(0.45rem,1.4dvh,0.8rem)] shrink-0 rounded-[clamp(20px,4.2dvh,28px)] border border-cyan-100/12 bg-white/[0.075] p-[clamp(0.65rem,2dvh,1rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[clamp(8px,1.35dvh,10px)] font-black uppercase tracking-[0.20em] text-cyan-100/54">
                Puzzle {progressText}
              </p>
              <h2 className="mt-0.5 text-[clamp(20px,3.35dvh,26px)] font-black leading-[1.08] tracking-[-0.04em] text-white">
                Decode the money word
              </h2>
            </div>
            <div className="shrink-0 rounded-2xl border border-cyan-100/12 bg-black/20 px-[clamp(0.65rem,2vw,0.85rem)] py-[clamp(0.42rem,1.1dvh,0.55rem)] text-right">
              <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/42">Progress</p>
              <p className="mt-0.5 text-[clamp(11px,1.8dvh,13px)] font-black text-cyan-50">{progressPercent}%</p>
            </div>
          </div>

          <div className="mt-[clamp(0.45rem,1.3dvh,0.8rem)] h-[clamp(0.28rem,0.7dvh,0.5rem)] overflow-hidden rounded-full bg-black/28">
            <div
              className="h-full rounded-full bg-cyan-100/70 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="mt-[clamp(0.45rem,1.2dvh,0.75rem)] line-clamp-2 text-[clamp(10.5px,1.65dvh,13px)] leading-snug text-white/60">
            Four clues point to one financial term. Type the answer, then CLARA explains why it matters.
          </p>
        </section>

        <section className="mt-[clamp(0.45rem,1.3dvh,0.85rem)] grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[clamp(0.5rem,1.4dvh,0.75rem)]">
          {activePuzzle.clues.map((clue, index) => (
            <div
              key={`${activePuzzle.id}-${clue.label}`}
              className="relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-[clamp(20px,4dvh,26px)] border border-cyan-100/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-[clamp(0.55rem,1.65dvh,1rem)] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_34px_rgba(0,0,0,0.22)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-cyan-200/[0.08] blur-sm" />
              <div className="relative flex h-[clamp(2.8rem,8dvh,4rem)] w-[clamp(2.8rem,8dvh,4rem)] items-center justify-center rounded-[clamp(18px,3.4dvh,24px)] border border-white/10 bg-black/18 text-[clamp(28px,5.2dvh,38px)] leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {clue.icon}
              </div>
              <p className="mt-[clamp(0.28rem,0.8dvh,0.65rem)] text-[clamp(6.5px,1.05dvh,8px)] font-black uppercase tracking-[0.18em] text-cyan-100/42">
                Clue {index + 1}
              </p>
              <p className="mt-0.5 text-[clamp(8.5px,1.45dvh,11px)] font-black uppercase tracking-[0.12em] text-white/82">
                {clue.label}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-[clamp(0.45rem,1.3dvh,0.85rem)] shrink-0 rounded-[clamp(20px,4dvh,28px)] border border-cyan-100/12 bg-black/20 p-[clamp(0.65rem,1.75dvh,1rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-center text-[clamp(7px,1.1dvh,9px)] font-black uppercase tracking-[0.22em] text-cyan-100/48">
            Hidden money word
          </p>
          <AnswerSlots answer={activePuzzle.answer} guess={guess} />

          <form onSubmit={handleSubmit} className="mt-[clamp(0.55rem,1.4dvh,0.9rem)]">
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
              placeholder="TYPE THE MONEY WORD"
              className="w-full rounded-[clamp(16px,3.1dvh,22px)] border border-cyan-100/16 bg-white/[0.075] px-4 py-[clamp(0.65rem,1.7dvh,1rem)] text-center text-[clamp(13px,2dvh,16px)] font-black uppercase tracking-[0.10em] text-white outline-none transition placeholder:text-white/30 focus:border-cyan-100/30 focus:bg-white/[0.10]"
            />

            {showHint ? (
              <div className="mt-[clamp(0.45rem,1.1dvh,0.75rem)] rounded-[18px] border border-cyan-100/14 bg-cyan-100/[0.08] px-3 py-[clamp(0.5rem,1.2dvh,0.75rem)] text-[clamp(10.5px,1.55dvh,12px)] leading-snug text-cyan-50/78">
                <span className="font-black text-cyan-50">Hint:</span> {activePuzzle.hint}
              </div>
            ) : null}

            {feedback ? (
              <div
                className={`mt-[clamp(0.45rem,1.1dvh,0.75rem)] rounded-[18px] border px-3 py-[clamp(0.5rem,1.2dvh,0.75rem)] ${
                  feedback === "correct"
                    ? "border-emerald-200/22 bg-emerald-300/[0.10]"
                    : "border-rose-200/18 bg-rose-300/[0.09]"
                }`}
              >
                <div className="flex items-start gap-2">
                  {feedback === "correct" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-100" />
                  )}
                  <div>
                    <p className={`text-[clamp(10px,1.45dvh,12px)] font-black uppercase tracking-[0.14em] ${feedback === "correct" ? "text-emerald-50" : "text-rose-50"}`}>
                      {feedback === "correct" ? "Correct" : "Try again"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[clamp(10.5px,1.55dvh,12px)] leading-snug text-white/72">
                      {feedback === "correct"
                        ? activePuzzle.lesson
                        : feedback === "empty"
                          ? "Type your answer first."
                          : "Not yet. Use the four clues and try another money word."}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-[clamp(0.5rem,1.3dvh,0.85rem)] grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setShowHint((current) => !current)}
                className="inline-flex items-center justify-center gap-1.5 rounded-[16px] border border-cyan-100/12 bg-white/[0.075] px-2 py-[clamp(0.55rem,1.5dvh,0.85rem)] text-[clamp(10px,1.55dvh,12px)] font-black text-cyan-50 transition hover:bg-white/[0.11] active:scale-[0.98]"
              >
                <Lightbulb className="h-4 w-4" />
                Hint
              </button>

              <button
                type="button"
                onClick={resetRound}
                className="inline-flex items-center justify-center gap-1.5 rounded-[16px] border border-white/10 bg-black/18 px-2 py-[clamp(0.55rem,1.5dvh,0.85rem)] text-[clamp(10px,1.55dvh,12px)] font-black text-white/68 transition hover:bg-white/[0.08] active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-[16px] border border-cyan-100/20 bg-cyan-100/[0.16] px-2 py-[clamp(0.55rem,1.5dvh,0.85rem)] text-[clamp(10px,1.55dvh,12px)] font-black text-cyan-50 transition hover:bg-cyan-100/[0.22] active:scale-[0.98]"
              >
                {isSolved ? "Next" : "Check"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>,
    document.body,
  );
}
