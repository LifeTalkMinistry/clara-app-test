import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  MoreHorizontal,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { getMoneyWordPictureClues } from './fourPicsOneMoneyWordPictureClues';
import { PUZZLES } from './fourPicsOneMoneyWordPuzzles';

function normalizeAnswer(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
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
  const answerLetters = normalizeAnswer(answer).toUpperCase().split('');
  const decoySource = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const targetLength = Math.max(10, Math.min(14, answerLetters.length + 4));
  const bank = [...answerLetters];

  while (bank.length < targetLength) {
    bank.push(decoySource[Math.floor(Math.random() * decoySource.length)]);
  }

  return shuffleItems(
    bank.map((letter, index) => ({ id: `${letter}-${index}`, letter })),
  );
}

const GAME_PROGRESS_STORAGE_KEY = 'clara_4_icons_1_money_word_progress_v1';
const GAME_PROGRESS_VERSION = 1;
const POINTS_PER_SOLVED_PUZZLE = 10;

function readSavedGameProgress() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(GAME_PROGRESS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== GAME_PROGRESS_VERSION) return null;
    if (!parsed.activePuzzleId) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeSavedGameProgress(progress) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      GAME_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        ...progress,
        version: GAME_PROGRESS_VERSION,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Storage can fail in private mode. The game must still work.
  }
}

function clearSavedGameProgress() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(GAME_PROGRESS_STORAGE_KEY);
  } catch {
    // Silent fail. Restart should still reset in-memory state.
  }
}

function isValidLetterTile(tile) {
  return Boolean(
    tile &&
      typeof tile.id === 'string' &&
      typeof tile.letter === 'string' &&
      tile.letter.length === 1,
  );
}

function sanitizeSavedTiles(tiles) {
  return Array.isArray(tiles) ? tiles.filter(isValidLetterTile) : [];
}

const STAGE_HEADER_FALLBACK_LINE = 'You can’t improve what you don’t notice.';

const CLUE_CARD_STYLES = [
  'border-cyan-100/24 bg-[radial-gradient(circle_at_88%_0%,rgba(34,211,238,0.24),transparent_38%),linear-gradient(135deg,rgba(8,145,178,0.28),rgba(15,23,42,0.60)_58%,rgba(30,41,59,0.42))]',
  'border-violet-100/24 bg-[radial-gradient(circle_at_88%_0%,rgba(168,85,247,0.26),transparent_38%),linear-gradient(135deg,rgba(59,130,246,0.20),rgba(30,41,59,0.56)_48%,rgba(46,16,101,0.52))]',
  'border-emerald-100/22 bg-[radial-gradient(circle_at_88%_0%,rgba(45,212,191,0.24),transparent_38%),linear-gradient(135deg,rgba(20,184,166,0.22),rgba(15,23,42,0.58)_56%,rgba(6,78,59,0.36))]',
  'border-fuchsia-100/22 bg-[radial-gradient(circle_at_88%_0%,rgba(217,70,239,0.24),transparent_38%),linear-gradient(135deg,rgba(99,102,241,0.22),rgba(15,23,42,0.58)_55%,rgba(74,20,140,0.42))]',
];

function makeLessonDirectToUser(value) {
  return String(value || '')
    .replace(/\bthe user's\b/gi, 'your')
    .replace(/\buser's\b/gi, 'your')
    .replace(/\bthe user\b/gi, 'you')
    .replace(/\buser\b/gi, 'you')
    .trim();
}

function getClaraCorrectMessage(puzzle) {
  const directLesson = makeLessonDirectToUser(puzzle?.lesson);
  const answer = puzzle?.answer || 'that word';
  const hint = String(puzzle?.hint || '').trim();
  if (directLesson) return directLesson;
  if (hint) return `${answer}: ${hint}`;
  return `That’s ${answer}. Keep this word in mind before your next money move.`;
}

function getClaraFeedbackMessage(feedback, puzzle) {
  if (feedback === 'correct') return getClaraCorrectMessage(puzzle);
  if (feedback === 'empty') return 'Choose a few letters first, then I’ll check it for you.';
  return 'Not yet. Look at the icons again — I’m pointing you to one money word.';
}

function AnswerSlots({ answer, selectedLetters, onRemoveLetter, isSolved }) {
  let cursor = 0;

  return (
    <div className='mt-[clamp(0.45rem,1.2dvh,0.85rem)] flex flex-wrap justify-center gap-x-[clamp(0.32rem,1.2vw,0.6rem)] gap-y-[clamp(0.38rem,1dvh,0.6rem)]'>
      {String(answer || '').toUpperCase().split(' ').map((word, wordIndex) => (
        <div key={`${word}-${wordIndex}`} className='flex gap-[clamp(0.22rem,0.9vw,0.38rem)]'>
          {word.split('').map((letter, letterIndex) => {
            const slotIndex = cursor;
            const selectedTile = selectedLetters[slotIndex];
            const shownLetter = selectedTile?.letter || '';
            cursor += 1;

            return (
              <button
                type='button'
                key={`${letter}-${letterIndex}`}
                disabled={!selectedTile || isSolved}
                onClick={() => onRemoveLetter(slotIndex)}
                aria-label={selectedTile ? `Remove letter ${shownLetter}` : `Empty answer slot ${slotIndex + 1}`}
                className='flex h-[clamp(1.55rem,4.3dvh,2.15rem)] w-[clamp(1.45rem,7.1vw,2rem)] items-center justify-center rounded-[10px] border border-cyan-100/28 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(125,211,252,0.08),rgba(167,139,250,0.10))] text-[clamp(11px,1.9dvh,14px)] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_18px_rgba(0,0,0,0.22),0_0_18px_rgba(34,211,238,0.10)] backdrop-blur-md transition enabled:active:scale-[0.96] disabled:opacity-100'
              >
                {shownLetter}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function FourPicsOneMoneyWordModal({ isOpen, material, onClose }) {
  const savedGameProgressRef = useRef(readSavedGameProgress());

  const initialActiveIndex = useMemo(() => {
    const saved = savedGameProgressRef.current;
    if (!saved?.activePuzzleId) return 0;

    const savedIndex = PUZZLES.findIndex((puzzle) => puzzle.id === saved.activePuzzleId);
    return savedIndex >= 0 ? savedIndex : 0;
  }, []);

  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const [selectedLetters, setSelectedLetters] = useState(() => {
    const saved = savedGameProgressRef.current;
    const savedPuzzle = PUZZLES[initialActiveIndex] || PUZZLES[0];
    if (!saved) return [];
    return sanitizeSavedTiles(saved.selectedLetters).slice(0, normalizeAnswer(savedPuzzle?.answer).length);
  });
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState(() => {
    const savedFeedback = savedGameProgressRef.current?.feedback;
    return ['empty', 'wrong', 'correct'].includes(savedFeedback) ? savedFeedback : null;
  });
  const [solvedIds, setSolvedIds] = useState(() => {
    const savedSolvedIds = savedGameProgressRef.current?.solvedIds;
    return Array.isArray(savedSolvedIds) ? savedSolvedIds.filter(Boolean) : [];
  });
  const [letterBank, setLetterBank] = useState(() => {
    const saved = savedGameProgressRef.current;
    const savedPuzzle = PUZZLES[initialActiveIndex] || PUZZLES[0];
    const savedBank = sanitizeSavedTiles(saved?.letterBank);

    if (
      saved?.activePuzzleId === savedPuzzle?.id &&
      savedBank.length >= normalizeAnswer(savedPuzzle?.answer).length
    ) {
      return savedBank;
    }

    return buildLetterBank(savedPuzzle?.answer);
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hiddenWordShortcutTapRef = useRef({ lastTapAt: 0 });

  const activePuzzle = PUZZLES[activeIndex] || PUZZLES[0];
  const letterBankPuzzleIdRef = useRef(activePuzzle.id);
  const activePictureClues = getMoneyWordPictureClues(activePuzzle);
  const activeStageName = activePuzzle.stageName || 'Money Awareness';
  const stageHeaderLine = activePuzzle.stageHeaderLine || STAGE_HEADER_FALLBACK_LINE;
  const isSolved = feedback === 'correct';
  const stagePuzzleNumber = (activePuzzle.stagePuzzleIndex ?? 0) + 1;
  const stageWordCount = activePuzzle.stageWordCount || 10;
  const progressPercent = Math.round((stagePuzzleNumber / stageWordCount) * 100);
  const solvedCount = solvedIds.length;
  const totalPoints = solvedCount * POINTS_PER_SOLVED_PUZZLE;

  const normalizedCorrectAnswer = useMemo(
    () => normalizeAnswer(activePuzzle.answer),
    [activePuzzle.answer],
  );

  useEffect(() => {
    if (letterBankPuzzleIdRef.current === activePuzzle.id) return;

    const saved = savedGameProgressRef.current;
    const savedBank = sanitizeSavedTiles(saved?.letterBank);
    letterBankPuzzleIdRef.current = activePuzzle.id;

    if (
      saved?.activePuzzleId === activePuzzle.id &&
      savedBank.length >= normalizedCorrectAnswer.length
    ) {
      setLetterBank(savedBank);
      return;
    }

    setLetterBank(buildLetterBank(activePuzzle.answer));
  }, [activePuzzle.id, activePuzzle.answer, normalizedCorrectAnswer.length]);

  useEffect(() => {
    const availableTileIds = new Set(letterBank.map((tile) => tile.id));

    setSelectedLetters((current) => {
      const next = current
        .filter((tile) => availableTileIds.has(tile.id))
        .slice(0, normalizedCorrectAnswer.length);

      if (
        next.length === current.length &&
        next.every((tile, index) => tile.id === current[index]?.id)
      ) {
        return current;
      }

      return next;
    });
  }, [letterBank, normalizedCorrectAnswer.length]);

  useEffect(() => {
    if (!isOpen) return;
    if (!activePuzzle?.id) return;

    writeSavedGameProgress({
      activePuzzleId: activePuzzle.id,
      activeIndex,
      letterBank,
      selectedLetters,
      solvedIds,
      feedback,
    });
  }, [
    isOpen,
    activePuzzle?.id,
    activeIndex,
    letterBank,
    selectedLetters,
    solvedIds,
    feedback,
  ]);

  const guess = useMemo(
    () => selectedLetters.map((item) => item.letter).join(''),
    [selectedLetters],
  );

  if (!isOpen || typeof document === 'undefined') return null;

  const resetRound = () => {
    setSelectedLetters([]);
    setShowHint(false);
    setFeedback(null);
  };

  const restartGame = () => {
    clearSavedGameProgress();
    savedGameProgressRef.current = null;
    letterBankPuzzleIdRef.current = PUZZLES[0]?.id;
    setActiveIndex(0);
    setSelectedLetters([]);
    setShowHint(false);
    setFeedback(null);
    setSolvedIds([]);
    setIsMenuOpen(false);
    setLetterBank(buildLetterBank(PUZZLES[0]?.answer));
  };

  const chooseLetter = (tile) => {
    if (!tile) return;
    if (selectedLetters.some((item) => item.id === tile.id)) return;
    if (selectedLetters.length >= normalizedCorrectAnswer.length) return;
    setSelectedLetters((current) => [...current, tile]);
    if (feedback !== 'correct') setFeedback(null);
  };

  const removeSelectedLetter = (slotIndex) => {
    if (isSolved) return;
    setSelectedLetters((current) => current.filter((_, index) => index !== slotIndex));
    if (feedback !== 'correct') setFeedback(null);
  };

  const autoSolveCurrentPuzzle = () => {
    const answerLetters = normalizedCorrectAnswer.toUpperCase().split('');
    const usedTileIds = new Set();
    const answerTiles = answerLetters.map((letter) => {
      const tile = letterBank.find((item) => item.letter === letter && !usedTileIds.has(item.id));
      if (tile) usedTileIds.add(tile.id);
      return tile;
    }).filter(Boolean);

    if (answerTiles.length !== answerLetters.length) return;
    setSelectedLetters(answerTiles);
    setFeedback('correct');
    setSolvedIds((current) => current.includes(activePuzzle.id) ? current : [...current, activePuzzle.id]);
  };

  const handleHiddenWordTesterTap = (event) => {
    if (event?.pointerType === 'mouse') return;
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
      setFeedback('empty');
      return;
    }
    const isCorrect = normalizeAnswer(guess) === normalizedCorrectAnswer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setSolvedIds((current) => current.includes(activePuzzle.id) ? current : [...current, activePuzzle.id]);
  };

  const goNext = () => {
    setActiveIndex((current) => {
      const nextIndex = (current + 1) % PUZZLES.length;
      const nextPuzzle = PUZZLES[nextIndex] || PUZZLES[0];
      savedGameProgressRef.current = null;
      letterBankPuzzleIdRef.current = nextPuzzle.id;
      setLetterBank(buildLetterBank(nextPuzzle.answer));
      return nextIndex;
    });

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
    <div className='fixed inset-0 z-[9999] h-[100dvh] overflow-hidden bg-[#020617] text-white'>
      <div className='pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.30),transparent_36%),radial-gradient(circle_at_100%_6%,rgba(168,85,247,0.28),transparent_34%),radial-gradient(circle_at_12%_92%,rgba(20,184,166,0.20),transparent_38%),radial-gradient(circle_at_92%_96%,rgba(217,70,239,0.20),transparent_38%),linear-gradient(135deg,#031a2a,#071329_44%,#1c0f3f)]' />
      <div className='pointer-events-none fixed inset-x-0 top-0 h-[22dvh] bg-gradient-to-b from-white/[0.12] via-cyan-100/[0.035] to-transparent' />
      <div className='pointer-events-none fixed inset-x-0 bottom-0 h-[22dvh] bg-gradient-to-t from-black/55 via-violet-950/20 to-transparent' />

      <main className='relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden px-[clamp(0.7rem,3.7vw,1rem)] pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-[max(0.55rem,env(safe-area-inset-top))]'>
        <header className='relative flex shrink-0 items-center justify-between gap-2'>
          <div aria-label={`CLARA points: ${totalPoints}`} title={`${totalPoints} CLARA points`} className='relative z-10 inline-flex h-[clamp(2.35rem,6.2dvh,2.75rem)] min-w-[clamp(3rem,12.5vw,3.45rem)] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-100/24 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.30),transparent_25%),linear-gradient(135deg,rgba(34,211,238,0.24),rgba(168,85,247,0.20)_52%,rgba(251,191,36,0.16))] px-1.5 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_12px_28px_rgba(0,0,0,0.25),0_0_20px_rgba(34,211,238,0.14)] backdrop-blur-xl'>
            <span className='pointer-events-none absolute inset-x-1 top-1 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent' />
            <span className='mr-1 flex h-[clamp(0.88rem,2.55dvh,1.05rem)] w-[clamp(0.88rem,2.55dvh,1.05rem)] items-center justify-center rounded-full border border-amber-100/34 bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.88),rgba(251,191,36,0.42)_34%,rgba(168,85,247,0.18))] text-[clamp(6px,1.12dvh,8px)] font-black leading-none text-slate-900 shadow-[0_0_14px_rgba(251,191,36,0.22)]'>✦</span>
            <span className='flex flex-col items-start leading-none'>
              <span className='text-[clamp(11px,1.8dvh,14px)] font-black leading-none tracking-[-0.02em] text-white'>{totalPoints}</span>
              <span className='mt-0.5 text-[clamp(4.8px,0.78dvh,5.8px)] font-black uppercase leading-none tracking-[0.12em] text-cyan-100/70'>Points</span>
            </span>
          </div>

          <div className='pointer-events-none absolute left-1/2 top-1/2 w-[min(12.5rem,48vw)] -translate-x-1/2 -translate-y-1/2 text-center'>
            <p className='text-[clamp(7px,1.2dvh,9px)] font-black uppercase tracking-[0.24em] text-cyan-100/70'>Money Game Mode</p>
            <h1 className='mt-0.5 truncate bg-gradient-to-r from-white via-cyan-100 to-violet-100 bg-clip-text text-[clamp(17px,2.6dvh,20px)] font-black tracking-[-0.03em] text-transparent'>{activeStageName}</h1>
          </div>

          <button type='button' onClick={() => setIsMenuOpen(true)} aria-label='Open game menu' className='z-10 ml-auto inline-flex h-[clamp(2.35rem,6.2dvh,2.75rem)] w-[clamp(2.35rem,6.2dvh,2.75rem)] shrink-0 items-center justify-center rounded-2xl border border-violet-100/22 bg-white/[0.10] text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:bg-white/[0.14] active:scale-[0.98]'>
            <MoreHorizontal className='h-5 w-5' />
          </button>
        </header>

        <section className='mt-[clamp(0.35rem,1dvh,0.55rem)] shrink-0 rounded-[clamp(15px,3dvh,20px)] border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(8,47,73,0.56),rgba(30,41,59,0.45)_45%,rgba(49,46,129,0.38))] px-[clamp(0.65rem,2.4vw,0.9rem)] py-[clamp(0.45rem,1.05dvh,0.65rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_30px_rgba(0,0,0,0.20)] backdrop-blur-2xl'>
          <p className='mx-auto max-w-[28rem] text-center text-[clamp(10px,1.45dvh,12px)] font-extrabold leading-snug tracking-[-0.01em] text-white/86'>{stageHeaderLine}</p>
          <div className='mt-[clamp(0.32rem,0.8dvh,0.5rem)] h-[clamp(0.16rem,0.38dvh,0.24rem)] overflow-hidden rounded-full bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'>
            <div className='h-full rounded-full bg-[linear-gradient(90deg,#67e8f9,#a78bfa,#f0abfc)] shadow-[0_0_14px_rgba(125,211,252,0.40)] transition-all duration-500' style={{ width: `${progressPercent}%` }} />
          </div>
        </section>

        <section className='mt-[clamp(0.4rem,1.1dvh,0.7rem)] grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[clamp(0.5rem,1.4dvh,0.75rem)]'>
          {activePictureClues.map((clue, index) => (
            <div key={`${activePuzzle.id}-${clue.label}`} className={`relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-[clamp(20px,4dvh,26px)] border p-[clamp(0.55rem,1.65dvh,1rem)] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_18px_36px_rgba(0,0,0,0.18)] backdrop-blur-2xl ${CLUE_CARD_STYLES[index % CLUE_CARD_STYLES.length]}`}>
              <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(255,255,255,0.04))]' />
              <div className='relative flex h-[clamp(2.8rem,8dvh,4rem)] w-[clamp(2.8rem,8dvh,4rem)] items-center justify-center rounded-[clamp(18px,3.4dvh,24px)] border border-white/18 bg-white/[0.08] text-[clamp(28px,5.2dvh,38px)] leading-none'>{clue.icon}</div>
              <p className='relative mt-[clamp(0.38rem,0.95dvh,0.75rem)] line-clamp-2 text-[clamp(8.5px,1.45dvh,11px)] font-black uppercase leading-tight tracking-[0.10em] text-white/90'>{clue.label}</p>
            </div>
          ))}
        </section>

        <section className='mt-[clamp(0.45rem,1.3dvh,0.85rem)] shrink-0 overflow-hidden rounded-[clamp(20px,4dvh,28px)] border border-cyan-100/22 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_92%_10%,rgba(168,85,247,0.18),transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(22,12,61,0.74))] p-[clamp(0.65rem,1.75dvh,1rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_42px_rgba(0,0,0,0.26)] backdrop-blur-2xl'>
          <p onDoubleClick={autoSolveCurrentPuzzle} onPointerUp={handleHiddenWordTesterTap} title='Developer shortcut: double-click to solve' className='text-center text-[clamp(7px,1.1dvh,9px)] font-black uppercase tracking-[0.22em] text-cyan-100/68'>Hidden money word</p>
          <AnswerSlots answer={activePuzzle.answer} selectedLetters={selectedLetters} onRemoveLetter={removeSelectedLetter} isSolved={isSolved} />

          <form onSubmit={handleSubmit} className='mt-[clamp(0.5rem,1.25dvh,0.78rem)]'>
            {isSolved ? (
              <div className='mt-[clamp(0.5rem,1.2dvh,0.85rem)] flex min-h-[clamp(6.4rem,15dvh,8.4rem)] items-center rounded-[22px] border border-emerald-200/28 bg-[radial-gradient(circle_at_12%_0%,rgba(52,211,153,0.18),transparent_42%),linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,23,42,0.30),rgba(20,184,166,0.12))] px-[clamp(0.85rem,2.7vw,1.1rem)] py-[clamp(0.75rem,1.8dvh,1rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_26px_rgba(16,185,129,0.10)] backdrop-blur-xl'>
                <div className='flex items-start gap-3'>
                  <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-emerald-100' />
                  <div>
                    <p className='text-[clamp(11px,1.65dvh,13px)] font-black uppercase tracking-[0.14em] text-emerald-50'>Nice, you got it</p>
                    <p className='mt-1.5 text-[clamp(11px,1.65dvh,13px)] font-semibold leading-snug text-white/84'>{getClaraFeedbackMessage(feedback, activePuzzle)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className='text-center text-[clamp(7px,1.05dvh,9px)] font-black uppercase tracking-[0.20em] text-white/48'>Choose the letters</p>
                <div className='mt-[clamp(0.35rem,0.9dvh,0.58rem)] flex flex-wrap justify-center gap-[clamp(0.28rem,0.8dvh,0.45rem)]'>
                  {letterBank.map((tile) => {
                    const isUsed = selectedLetters.some((item) => item.id === tile.id);
                    return (
                      <button key={tile.id} type='button' disabled={isUsed || isSolved} onClick={() => chooseLetter(tile)} aria-label={`Choose letter ${tile.letter}`} className={`flex h-[clamp(1.75rem,4.7dvh,2.25rem)] w-[clamp(1.75rem,8.5vw,2.35rem)] items-center justify-center rounded-[11px] border text-[clamp(12px,1.95dvh,15px)] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_18px_rgba(0,0,0,0.22)] transition active:scale-[0.96] ${isUsed || isSolved ? 'border-white/8 bg-white/[0.045] text-white/24 opacity-45' : 'border-cyan-100/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(224,242,254,0.94),rgba(237,233,254,0.94))] text-slate-900 hover:border-cyan-100 hover:bg-white'}`}>
                        {tile.letter}
                      </button>
                    );
                  })}
                </div>

                {showHint ? <div className='mt-[clamp(0.45rem,1.1dvh,0.75rem)] rounded-[18px] border border-cyan-100/22 bg-cyan-100/[0.10] px-3 py-[clamp(0.5rem,1.2dvh,0.75rem)] text-[clamp(10.5px,1.55dvh,12px)] leading-snug text-cyan-50/82'><span className='font-black text-cyan-50'>Hint:</span> {activePuzzle.hint}</div> : null}

                {feedback ? (
                  <div className={`mt-[clamp(0.45rem,1.1dvh,0.75rem)] rounded-[18px] border px-3 py-[clamp(0.5rem,1.2dvh,0.75rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl ${feedback === 'correct' ? 'border-emerald-200/28 bg-emerald-300/[0.13]' : 'border-rose-200/24 bg-rose-300/[0.12]'}`}>
                    <div className='flex items-start gap-2'>
                      {feedback === 'correct' ? <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-100' /> : <XCircle className='mt-0.5 h-4 w-4 shrink-0 text-rose-100' />}
                      <div>
                        <p className={`text-[clamp(10px,1.45dvh,12px)] font-black uppercase tracking-[0.14em] ${feedback === 'correct' ? 'text-emerald-50' : 'text-rose-50'}`}>{feedback === 'correct' ? 'Nice, you got it' : 'Try one more time'}</p>
                        <p className='mt-0.5 text-[clamp(10px,1.45dvh,11.5px)] leading-snug text-white/78'>{getClaraFeedbackMessage(feedback, activePuzzle)}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <div className='mt-[clamp(0.5rem,1.3dvh,0.85rem)] grid grid-cols-3 gap-2'>
              <button type='button' onClick={() => setShowHint((current) => !current)} className='inline-flex items-center justify-center gap-1.5 rounded-[16px] border border-cyan-100/22 bg-cyan-100/[0.10] px-2 py-[clamp(0.55rem,1.5dvh,0.85rem)] text-[clamp(10px,1.55dvh,12px)] font-black text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:bg-cyan-100/[0.15] active:scale-[0.98]'><Lightbulb className='h-4 w-4' />Hint</button>
              <button type='button' onClick={resetRound} className='inline-flex items-center justify-center gap-1.5 rounded-[16px] border border-white/12 bg-white/[0.075] px-2 py-[clamp(0.55rem,1.5dvh,0.85rem)] text-[clamp(10px,1.55dvh,12px)] font-black text-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:bg-white/[0.10] active:scale-[0.98]'><RotateCcw className='h-4 w-4' />Clear</button>
              <button type='submit' className='inline-flex items-center justify-center gap-1.5 rounded-[16px] border border-violet-100/24 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(168,85,247,0.22))] px-2 py-[clamp(0.55rem,1.5dvh,0.85rem)] text-[clamp(10px,1.55dvh,12px)] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_22px_rgba(0,0,0,0.20)] backdrop-blur-xl transition hover:border-violet-100/36 hover:bg-cyan-100/[0.18] active:scale-[0.98]'>{isSolved ? 'Next' : 'Check'}<ArrowRight className='h-4 w-4' /></button>
            </div>
          </form>
        </section>
      </main>

      {isMenuOpen ? (
        <div className='fixed inset-0 z-[10000] flex items-end justify-center bg-black/45 px-[clamp(0.7rem,3.7vw,1rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md'>
          <div className='w-full max-w-xl rounded-[clamp(24px,4.8dvh,32px)] border border-cyan-100/18 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.16),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.16),transparent_44%),linear-gradient(135deg,rgba(6,20,39,0.94),rgba(12,22,50,0.92)_52%,rgba(38,22,79,0.90))] p-[clamp(0.85rem,2.2dvh,1.1rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_30px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl'>
            <div className='flex items-center justify-between gap-3 border-b border-white/10 pb-[clamp(0.65rem,1.6dvh,0.9rem)]'>
              <div className='min-w-0'><p className='text-[clamp(7px,1.1dvh,9px)] font-black uppercase tracking-[0.22em] text-cyan-100/58'>Menu</p><h2 className='mt-1 bg-gradient-to-r from-white via-cyan-100 to-violet-100 bg-clip-text text-[clamp(17px,2.4dvh,21px)] font-black tracking-[-0.03em] text-transparent'>Game Options</h2><p className='mt-0.5 truncate text-[clamp(10px,1.45dvh,12px)] font-bold text-white/50'>{activePuzzle.stageIcon} {activeStageName}</p></div>
              <div className='shrink-0 rounded-2xl border border-cyan-100/16 bg-white/[0.08] px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-xl'><p className='text-[7px] font-black uppercase tracking-[0.14em] text-white/44'>Score</p><p className='mt-0.5 text-[clamp(11px,1.75dvh,13px)] font-black text-cyan-50'>{solvedCount}/{PUZZLES.length}</p></div>
            </div>
            <div className='mt-[clamp(0.65rem,1.7dvh,0.95rem)] grid gap-2'>
              <button type='button' onClick={() => setIsMenuOpen(false)} className='flex w-full items-center justify-between rounded-[18px] border border-cyan-100/18 bg-cyan-100/[0.08] px-4 py-[clamp(0.75rem,1.8dvh,0.95rem)] text-left text-[clamp(12px,1.75dvh,14px)] font-black text-cyan-50'>Resume<span className='text-white/38'>Continue</span></button>
              <button type='button' onClick={() => { resetRound(); setIsMenuOpen(false); }} className='flex w-full items-center justify-between rounded-[18px] border border-white/12 bg-white/[0.06] px-4 py-[clamp(0.75rem,1.8dvh,0.95rem)] text-left text-[clamp(12px,1.75dvh,14px)] font-black text-white/80'>Restart puzzle<span className='text-white/38'>Clear answer</span></button>
              <button type='button' onClick={restartGame} className='flex w-full items-center justify-between rounded-[18px] border border-violet-100/16 bg-violet-100/[0.07] px-4 py-[clamp(0.75rem,1.8dvh,0.95rem)] text-left text-[clamp(12px,1.75dvh,14px)] font-black text-violet-50'>Restart game<span className='text-white/38'>Start over</span></button>
              <button type='button' onClick={() => { setIsMenuOpen(false); onClose(); }} className='flex w-full items-center justify-between rounded-[18px] border border-rose-100/16 bg-rose-300/[0.08] px-4 py-[clamp(0.75rem,1.8dvh,0.95rem)] text-left text-[clamp(12px,1.75dvh,14px)] font-black text-rose-50'>Exit to Money Games<span className='text-white/38'>Close</span></button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
