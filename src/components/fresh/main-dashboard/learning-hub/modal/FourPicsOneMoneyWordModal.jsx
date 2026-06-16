import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  MoreHorizontal,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { getMoneyWordPictureClues } from "./fourPicsOneMoneyWordPictureClues";
import { PUZZLES, STAGES } from "./fourPicsOneMoneyWordPuzzles";

function normalizeAnswer(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function shuffleItems(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function buildLetterBank(answer) {
  const answerLetters = normalizeAnswer(answer).toUpperCase().split("");
  const decoySource = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const targetLength = Math.max(10, Math.min(14, answerLetters.length + 4));
  const bank = [...answerLetters];

  while (bank.length < targetLength) {
    const randomLetter = decoySource[Math.floor(Math.random() * decoySource.length)];
    bank.push(randomLetter);
  }

  return shuffleItems(
    bank.map((letter, index) => ({
      id: `${letter}-${index}`,
      letter,
    })),
  );
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
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [solvedIds, setSolvedIds] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hiddenWordShortcutTapRef = useRef({ lastTapAt: 0 });

  const activePuzzle = PUZZLES[activeIndex] || PUZZLES[0];
  const activePictureClues = getMoneyWordPictureClues(activePuzzle);
  const isSolved = feedback === "correct";
  const stagePuzzleNumber = (activePuzzle.stagePuzzleIndex ?? 0) + 1;
  const stageWordCount = activePuzzle.stageWordCount || 10;
  const stageProgressText = `${stagePuzzleNumber}/${stageWordCount}`;
  const overallProgressText = `${activeIndex + 1}/${PUZZLES.length}`;
  const progressPercent = Math.round((stagePuzzleNumber / stageWordCount) * 100);
  const overallProgressPercent = Math.round(((activeIndex + 1) / PUZZLES.length) * 100);
  const solvedCount = solvedIds.length;

  const normalizedCorrectAnswer = useMemo(
    () => normalizeAnswer(activePuzzle.answer),
    [activePuzzle.answer],
  );

  const letterBank = useMemo(
    () => buildLetterBank(activePuzzle.answer),
    [activePuzzle.id, activePuzzle.answer],
  );

  const guess = useMemo(
    () => selectedLetters.map((item) => item.letter).join(""),
    [selectedLetters],
  );

  if (!isOpen || typeof document === "undefined") return null;

  const resetRound = () => {
    setSelectedLetters([]);
    setShowHint(false);
    setFeedback(null);
  };

  const restartGame = () => {
    setActiveIndex(0);
    setSelectedLetters([]);
    setShowHint(false);
    setFeedback(null);
    setSolvedIds([]);
    setIsMenuOpen(false);
  };

  const chooseLetter = (tile) => {
    if (!tile) return;
    if (selectedLetters.some((item) => item.id === tile.id)) return;
    if (selectedLetters.length >= normalizedCorrectAnswer.length) return;

    setSelectedLetters((current) => [...current, tile]);
    if (feedback !== "correct") setFeedback(null);
  };

  const autoSolveCurrentPuzzle = () => {
    const answerLetters = normalizedCorrectAnswer.toUpperCase().split("");
    const usedTileIds = new Set();

    const answerTiles = answerLetters
      .map((letter) => {
        const tile = letterBank.find(
          (item) => item.letter === letter && !usedTileIds.has(item.id),
        );

        if (tile) usedTileIds.add(tile.id);
        return tile;
      })
      .filter(Boolean);

    if (answerTiles.length !== answerLetters.length) return;

    setSelectedLetters(answerTiles);
    setFeedback("correct");
    setSolvedIds((current) => (
      current.includes(activePuzzle.id) ? current : [...current, activePuzzle.id]
    ));
  };

  const handleHiddenWordTesterTap = (event) => {
    if (event?.pointerType === "mouse") return;

    const currentTapAt = Date.now();
    const previousTapAt = hiddenWordShortcutTapRef.current.lastTapAt;

    hiddenWordShortcutTapRef.current.lastTapAt = currentTapAt;

    if (currentTapAt - previousTapAt <= 500) {
      hiddenWordShortcutTapRef.current.lastTapAt = 0;
      autoSolveCurrentPuzzle();
    }
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
              4 Icons 1 Money Word
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open game menu"
            className="inline-flex h-[clamp(2.35rem,6.2dvh,2.75rem)] w-[clamp(2.35rem,6.2dvh,2.75rem)] shrink-0 items-center justify-center rounded-2xl border border-cyan-100/14 bg-white/[0.08] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:bg-white/[0.12] active:scale-[0.98]"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </header>

        <section className="mt-[clamp(0.35rem,1dvh,0.55rem)] shrink-0 rounded-[clamp(15px,3dvh,20px)] border border-cyan-100/12 bg-white/[0.06] px-[clamp(0.65rem,2.4vw,0.9rem)] py-[clamp(0.38rem,0.95dvh,0.55rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 text-[clamp(8px,1.25dvh,10px)] font-black uppercase tracking-[0.14em]">
            <span className="text-cyan-50/82">Stage {activePuzzle.stageNumber}/{STAGES.length}</span>
            <span className="text-white/58">{progressPercent}%</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3 text-[clamp(9px,1.35dvh,11px)] font-black tracking-[-0.01em]">
            <span className="min-w-0 truncate text-white/72">{activePuzzle.stageIcon} {activePuzzle.stageName}</span>
            <span className="shrink-0 text-cyan-50/70">Puzzle {stageProgressText}</span>
          </div>
          <div className="mt-[clamp(0.28rem,0.65dvh,0.42rem)] h-[clamp(0.16rem,0.38dvh,0.24rem)] overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-cyan-100/70 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        <section className="mt-[clamp(0.4rem,1.1dvh,0.7rem)] grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[clamp(0.5rem,1.4dvh,0.75rem)]">
          {activePictureClues.map((clue, index) => (
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
              <p className="mt-0.5 line-clamp-2 text-[clamp(8.5px,1.45dvh,11px)] font-black uppercase leading-tight tracking-[0.10em] text-white/82">
                {clue.label}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-[clamp(0.45rem,1.3dvh,0.85rem)] shrink-0 rounded-[clamp(20px,4dvh,28px)] border border-cyan-100/12 bg-black/20 p-[clamp(0.65rem,1.75dvh,1rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p
            onDoubleClick={autoSolveCurrentPuzzle}
            onPointerUp={handleHiddenWordTesterTap}
            title="Developer shortcut: double-click to solve"
            className="text-center text-[clamp(7px,1.1dvh,9px)] font-black uppercase tracking-[0.22em] text-cyan-100/48"
          >
            Hidden money word
          </p>
          <AnswerSlots answer={activePuzzle.answer} guess={guess} />

          <form onSubmit={handleSubmit} className="mt-[clamp(0.5rem,1.25dvh,0.78rem)]">
            <p className="text-center text-[clamp(7px,1.05dvh,9px)] font-black uppercase tracking-[0.20em] text-white/38">
              Choose the letters
            </p>

            <div className="mt-[clamp(0.35rem,0.9dvh,0.58rem)] flex flex-wrap justify-center gap-[clamp(0.28rem,0.8dvh,0.45rem)]">
              {letterBank.map((tile) => {
                const isUsed = selectedLetters.some((item) => item.id === tile.id);

                return (
                  <button
                    type="button"
                    key={tile.id}
                    disabled={isUsed || isSolved}
                    onClick={() => chooseLetter(tile)}
                    aria-label={`Choose letter ${tile.letter}`}
                    className={`flex h-[clamp(1.75rem,4.7dvh,2.25rem)] w-[clamp(1.75rem,8.5vw,2.35rem)] items-center justify-center rounded-[11px] border text-[clamp(12px,1.95dvh,15px)] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_18px_rgba(0,0,0,0.20)] transition active:scale-[0.96] ${
                      isUsed || isSolved
                        ? "border-white/8 bg-white/[0.045] text-white/24 opacity-45"
                        : "border-white/50 bg-white/90 text-slate-900 hover:bg-white"
                    }`}
                  >
                    {tile.letter}
                  </button>
                );
              })}
            </div>

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
                          ? "Choose the letters first."
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
                Clear
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

      {isMenuOpen ? (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/38 px-[clamp(0.7rem,3.7vw,1rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[clamp(24px,4.8dvh,32px)] border border-cyan-100/14 bg-[#061427]/92 p-[clamp(0.85rem,2.2dvh,1.1rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_70px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-[clamp(0.65rem,1.6dvh,0.9rem)]">
              <div className="min-w-0">
                <p className="text-[clamp(7px,1.1dvh,9px)] font-black uppercase tracking-[0.22em] text-cyan-100/48">
                  Menu
                </p>
                <h2 className="mt-1 text-[clamp(17px,2.4dvh,21px)] font-black tracking-[-0.03em] text-white">
                  Game Options
                </h2>
                <p className="mt-0.5 truncate text-[clamp(10px,1.45dvh,12px)] font-bold text-white/45">
                  Stage {activePuzzle.stageNumber}/{STAGES.length} · {activePuzzle.stageName}
                </p>
              </div>
              <div className="shrink-0 rounded-2xl border border-cyan-100/12 bg-white/[0.07] px-3 py-2 text-right">
                <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/42">Score</p>
                <p className="mt-0.5 text-[clamp(11px,1.75dvh,13px)] font-black text-cyan-50">
                  {solvedCount}/{PUZZLES.length}
                </p>
              </div>
            </div>

            <div className="mt-[clamp(0.65rem,1.7dvh,0.95rem)] grid gap-2">
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex w-full items-center justify-between rounded-[18px] border border-cyan-100/12 bg-white/[0.075] px-4 py-[clamp(0.75rem,1.8dvh,0.95rem)] text-left text-[clamp(12px,1.75dvh,14px)] font-black text-cyan-50 transition hover:bg-white/[0.11] active:scale-[0.99]"
              >
                Resume
                <span className="text-white/35">Puzzle {overallProgressText}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetRound();
                  setIsMenuOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-[clamp(0.75rem,1.8dvh,0.95rem)] text-left text-[clamp(12px,1.75dvh,14px)] font-black text-white/78 transition hover:bg-white/[0.08] active:scale-[0.99]"
              >
                Restart puzzle
                <span className="text-white/35">Clear answer</span>
              </button>

              <button
                type="button"
                onClick={restartGame}
                className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-[clamp(0.75rem,1.8dvh,0.95rem)] text-left text-[clamp(12px,1.75dvh,14px)] font-black text-white/78 transition hover:bg-white/[0.08] active:scale-[0.99]"
              >
                Restart game
                <span className="text-white/35">{overallProgressPercent}% total</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-[18px] border border-rose-100/12 bg-rose-300/[0.07] px-4 py-[clamp(0.75rem,1.8dvh,0.95rem)] text-left text-[clamp(12px,1.75dvh,14px)] font-black text-rose-50 transition hover:bg-rose-300/[0.10] active:scale-[0.99]"
              >
                Exit to Money Games
                <span className="text-white/35">Close</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
