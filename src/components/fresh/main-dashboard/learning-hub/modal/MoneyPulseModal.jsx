import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Lightbulb,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';

const STRIKE_LIMIT = 3;
const MONEY_PULSE_SCORE_STORAGE_KEY = 'clara_money_pulse_score_bank_v1';
const MONEY_PULSE_SCORE_VERSION = 1;
const STRIKE_INDICATORS = [1, 2, 3];

const MONEY_PULSE_ROUNDS = [
  {
    id: 'young-earners-money-leaks',
    category: 'Young Earners',
    question:
      'Ages 20–25 income earners: What is the most common money leak they buy even when they know it is not really necessary?',
    claraInsight:
      'Most money leaks are not big purchases. They are small comforts repeated until they become part of your lifestyle.',
    answers: [
      {
        id: 'food-delivery',
        label: 'Food Delivery',
        points: 35,
        accepted: ['GrabFood', 'Foodpanda', 'delivery', 'fast food delivery', 'takeout', 'ordered food'],
        insight: 'Convenience becomes expensive when it becomes automatic.',
      },
      {
        id: 'coffee-milk-tea',
        label: 'Coffee / Milk Tea',
        points: 25,
        accepted: ['Starbucks', 'coffee', 'milk tea', 'milktea', 'iced coffee', 'cafe drinks', 'boba'],
        insight: 'Small drinks can become a daily salary leak.',
      },
      {
        id: 'online-shopping',
        label: 'Online Shopping',
        points: 18,
        accepted: ['Shopee', 'Lazada', 'TikTok Shop', 'checkout', 'random sale', 'online order'],
        insight: 'The danger is not one item. It is the habit of checking out without thinking.',
      },
      {
        id: 'subscriptions',
        label: 'Subscriptions',
        points: 12,
        accepted: ['Netflix', 'Spotify', 'apps', 'monthly plan', 'streaming', 'premium account'],
        insight: 'A subscription is small only when you still use it.',
      },
      {
        id: 'ride-hailing',
        label: 'Ride-Hailing',
        points: 10,
        accepted: ['Grab', 'Angkas', 'JoyRide', 'taxi', 'rides', 'booked ride'],
        insight: 'Convenience is useful, but repeated convenience can quietly drain cash flow.',
      },
    ],
  },
];

const HOW_TO_PLAY_RULES = [
  {
    title: 'Correct answer',
    body: 'Reveal a board answer and earn its points.',
  },
  {
    title: 'Close answer',
    body: 'Accepted under the nearest spending category.',
  },
  {
    title: 'Wrong answer',
    body: 'Adds one strike. Three strikes reveal the board.',
  },
  {
    title: 'Goal',
    body: 'Find as many common money leaks as possible.',
  },
];

const QUICK_GUESSES = ['GrabFood', 'Milk Tea', 'Shopee', 'Netflix', 'Angkas'];

function normalizeGuess(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactGuess(value) {
  return normalizeGuess(value).replace(/\s+/g, '');
}

function answerAliases(answer) {
  return [answer.label, ...(Array.isArray(answer.accepted) ? answer.accepted : [])];
}

function guessMatchesAnswer(guess, answer) {
  const normalizedGuess = normalizeGuess(guess);
  const compactedGuess = compactGuess(guess);

  if (!normalizedGuess) return false;

  return answerAliases(answer).some((alias) => {
    const normalizedAlias = normalizeGuess(alias);
    const compactedAlias = compactGuess(alias);

    if (!normalizedAlias) return false;
    if (normalizedGuess === normalizedAlias || compactedGuess === compactedAlias) return true;

    return (
      normalizedGuess.length >= 4 && normalizedAlias.includes(normalizedGuess)
    ) || (
      normalizedAlias.length >= 4 && normalizedGuess.includes(normalizedAlias)
    );
  });
}

function isExactAnswerLabel(guess, answer) {
  return normalizeGuess(guess) === normalizeGuess(answer.label) || compactGuess(guess) === compactGuess(answer.label);
}

function readMoneyPulseScoreBank() {
  if (typeof window === 'undefined') return { pointBank: 0, bestScore: 0 };

  try {
    const rawScoreBank = window.localStorage.getItem(MONEY_PULSE_SCORE_STORAGE_KEY);
    if (!rawScoreBank) return { pointBank: 0, bestScore: 0 };

    const parsedScoreBank = JSON.parse(rawScoreBank);
    if (!parsedScoreBank || parsedScoreBank.version !== MONEY_PULSE_SCORE_VERSION) {
      return { pointBank: 0, bestScore: 0 };
    }

    return {
      pointBank: Math.max(0, Number(parsedScoreBank.pointBank) || 0),
      bestScore: Math.max(0, Number(parsedScoreBank.bestScore) || 0),
    };
  } catch {
    return { pointBank: 0, bestScore: 0 };
  }
}

function writeMoneyPulseScoreBank(scoreBank) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      MONEY_PULSE_SCORE_STORAGE_KEY,
      JSON.stringify({
        version: MONEY_PULSE_SCORE_VERSION,
        pointBank: Math.max(0, Number(scoreBank?.pointBank) || 0),
        bestScore: Math.max(0, Number(scoreBank?.bestScore) || 0),
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Storage can fail in private mode. The game still works in memory.
  }
}

export default function MoneyPulseModal({ isOpen, material, onClose }) {
  const resultBankedRef = useRef(false);
  const initialScoreBankRef = useRef(null);

  if (!initialScoreBankRef.current) {
    initialScoreBankRef.current = readMoneyPulseScoreBank();
  }

  const currentRound = MONEY_PULSE_ROUNDS[0];
  const [gameStatus, setGameStatus] = useState('menu');
  const [revealedAnswerIds, setRevealedAnswerIds] = useState([]);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [scoreBank, setScoreBank] = useState(() => initialScoreBankRef.current);

  const isMenu = gameStatus === 'menu';
  const isHowToPlay = gameStatus === 'how-to-play';
  const isPlaying = gameStatus === 'playing';
  const isFinished = gameStatus === 'round-clear' || gameStatus === 'board-revealed';
  const isBoardRevealed = isFinished;

  const revealedAnswers = useMemo(
    () => currentRound.answers.filter((answer) => revealedAnswerIds.includes(answer.id)),
    [currentRound.answers, revealedAnswerIds],
  );

  const progressPercent = Math.round((revealedAnswerIds.length / currentRound.answers.length) * 100);
  const remainingStrikes = Math.max(0, STRIKE_LIMIT - strikes);

  const bankFinalScore = useCallback((scoreAmount) => {
    const safeScoreAmount = Math.max(0, Number(scoreAmount) || 0);
    if (safeScoreAmount <= 0 || resultBankedRef.current) return;

    resultBankedRef.current = true;

    setScoreBank((currentScoreBank) => {
      const previousPoints = Math.max(0, Number(currentScoreBank.pointBank) || 0);
      const nextScoreBank = {
        pointBank: previousPoints + safeScoreAmount,
        bestScore: Math.max(Number(currentScoreBank.bestScore) || 0, safeScoreAmount),
      };

      writeMoneyPulseScoreBank(nextScoreBank);
      return nextScoreBank;
    });
  }, []);

  useEffect(() => {
    if (!isFinished || score <= 0) return;
    bankFinalScore(score);
  }, [bankFinalScore, isFinished, score]);

  const resetRound = useCallback((nextStatus = 'playing') => {
    setGameStatus(nextStatus);
    setRevealedAnswerIds([]);
    setScore(0);
    setStrikes(0);
    setGuess('');
    setFeedback(null);
    resultBankedRef.current = false;
  }, []);

  const startRound = () => resetRound('playing');
  const openHowToPlay = () => setGameStatus('how-to-play');
  const backToMenu = () => setGameStatus('menu');

  const handleGuessSubmit = (event) => {
    event.preventDefault();
    if (!isPlaying) return;

    const cleanedGuess = guess.trim();
    if (!cleanedGuess) {
      setFeedback({ type: 'neutral', title: 'Type a guess first.', body: 'Try a spending habit people commonly repeat.' });
      return;
    }

    const alreadyRevealedAnswer = currentRound.answers.find(
      (answer) => revealedAnswerIds.includes(answer.id) && guessMatchesAnswer(cleanedGuess, answer),
    );

    if (alreadyRevealedAnswer) {
      setFeedback({
        type: 'neutral',
        title: 'Already on the board.',
        body: `${alreadyRevealedAnswer.label} was already revealed. No strike lost.`,
      });
      setGuess('');
      return;
    }

    const matchedAnswer = currentRound.answers.find(
      (answer) => !revealedAnswerIds.includes(answer.id) && guessMatchesAnswer(cleanedGuess, answer),
    );

    if (matchedAnswer) {
      const nextRevealedAnswerIds = [...revealedAnswerIds, matchedAnswer.id];
      const nextScore = score + matchedAnswer.points;
      const isExact = isExactAnswerLabel(cleanedGuess, matchedAnswer);

      setRevealedAnswerIds(nextRevealedAnswerIds);
      setScore(nextScore);
      setGuess('');
      setFeedback({
        type: isExact ? 'correct' : 'close',
        title: isExact ? `Correct! +${matchedAnswer.points} pts` : `Accepted: ${matchedAnswer.label} +${matchedAnswer.points} pts`,
        body: matchedAnswer.insight,
      });

      if (nextRevealedAnswerIds.length >= currentRound.answers.length) {
        setGameStatus('round-clear');
      }

      return;
    }

    const nextStrikes = strikes + 1;
    setStrikes(nextStrikes);
    setGuess('');
    setFeedback({
      type: 'wrong',
      title: nextStrikes >= STRIKE_LIMIT ? 'Third strike. Board revealed.' : 'Not on the board.',
      body: nextStrikes >= STRIKE_LIMIT
        ? 'CLARA will show the hidden money leaks now.'
        : `${Math.max(0, STRIKE_LIMIT - nextStrikes)} guesses left before the board opens.`,
    });

    if (nextStrikes >= STRIKE_LIMIT) {
      setGameStatus('board-revealed');
    }
  };

  const handleQuickGuess = (quickGuess) => {
    if (!isPlaying) return;
    setGuess(quickGuess);
  };

  const feedbackClassName = useMemo(() => {
    if (feedback?.type === 'correct' || feedback?.type === 'close') {
      return 'border-emerald-100/26 bg-emerald-300/[0.10] text-emerald-50';
    }

    if (feedback?.type === 'wrong') {
      return 'border-rose-100/26 bg-rose-400/[0.10] text-rose-50';
    }

    return 'border-cyan-100/18 bg-cyan-100/[0.08] text-cyan-50';
  }, [feedback?.type]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className='fixed inset-0 z-[9999] h-[100dvh] overflow-hidden bg-[#020617] text-white'>
      <div className='pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(103,232,249,0.32),transparent_31%),radial-gradient(circle_at_94%_4%,rgba(196,181,253,0.28),transparent_30%),radial-gradient(circle_at_68%_88%,rgba(14,165,233,0.20),transparent_34%),linear-gradient(135deg,#02111f_0%,#07172b_44%,#1b1140_100%)]' />
      <div className='pointer-events-none fixed inset-x-0 top-0 h-[26dvh] bg-gradient-to-b from-white/[0.15] via-cyan-100/[0.04] to-transparent' />
      <div className='pointer-events-none fixed inset-x-0 bottom-0 h-[24dvh] bg-gradient-to-t from-black/68 via-violet-950/24 to-transparent' />

      <main className='relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden px-[clamp(0.78rem,3.8vw,1rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.65rem,env(safe-area-inset-top))]'>
        <header className='flex shrink-0 items-center justify-between gap-3'>
          <div className='min-w-0'>
            <p className='text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/72'>CLARA Game Mode</p>
            <h1 className='mt-1 truncate bg-gradient-to-r from-white via-cyan-100 to-violet-100 bg-clip-text text-[clamp(25px,4dvh,35px)] font-black tracking-[-0.055em] text-transparent'>
              {material?.title || 'Money Pulse'}
            </h1>
          </div>

          <div className='ml-auto flex shrink-0 items-center gap-2'>
            {!isPlaying ? (
              <button
                type='button'
                onClick={openHowToPlay}
                aria-label='Open Money Pulse rules'
                className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/24 bg-white/[0.10] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:bg-cyan-100/[0.16] active:scale-[0.98]'
              >
                <Lightbulb className='h-5 w-5' />
              </button>
            ) : null}

            <button
              type='button'
              onClick={onClose}
              aria-label='Close Money Pulse'
              className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.10] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:bg-white/[0.16] active:scale-[0.98]'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </header>

        {isMenu ? (
          <section className='mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'>
            <div className='rounded-[30px] border border-cyan-100/22 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(255,255,255,0.075)_38%,rgba(124,58,237,0.17)),rgba(2,8,23,0.56)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_22px_54px_rgba(0,0,0,0.32)] backdrop-blur-2xl'>
              <div className='flex items-center gap-3'>
                <span className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/24 bg-cyan-100/[0.12] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_24px_rgba(34,211,238,0.16)]'>
                  <Sparkles className='h-5 w-5' />
                </span>
                <div>
                  <p className='text-[16px] font-black leading-tight tracking-[-0.03em] text-white'>Guess what people really spend on.</p>
                  <p className='mt-1 text-[12px] font-semibold leading-snug text-white/66'>Find the common money leaks before 3 wrong guesses expose the board.</p>
                </div>
              </div>

              <div className='mt-4 grid grid-cols-2 gap-2.5'>
                <div className='rounded-2xl border border-cyan-100/18 bg-black/18 px-3 py-2.5'>
                  <p className='text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/66'>Total Points</p>
                  <p className='mt-1 text-[24px] font-black leading-none tracking-[-0.06em] text-white'>{scoreBank.pointBank}</p>
                </div>
                <div className='rounded-2xl border border-violet-100/18 bg-black/18 px-3 py-2.5'>
                  <p className='text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/68'>Best Round</p>
                  <p className='mt-1 text-[24px] font-black leading-none tracking-[-0.06em] text-white'>{scoreBank.bestScore}</p>
                </div>
              </div>
            </div>

            <div className='flex min-h-0 flex-1 flex-col rounded-[30px] border border-white/18 bg-white/[0.075] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_24px_58px_rgba(0,0,0,0.28)] backdrop-blur-2xl'>
              <p className='text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/70'>How it works</p>
              <div className='mt-3 grid gap-2.5 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                {HOW_TO_PLAY_RULES.map((rule) => (
                  <div key={rule.title} className='rounded-[22px] border border-white/12 bg-black/18 px-3.5 py-3'>
                    <p className='text-[13px] font-black text-white'>{rule.title}</p>
                    <p className='mt-1 text-[12px] font-semibold leading-snug text-white/60'>{rule.body}</p>
                  </div>
                ))}
              </div>

              <button
                type='button'
                onClick={startRound}
                className='mt-3 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[22px] border border-cyan-100/30 bg-[linear-gradient(135deg,rgba(103,232,249,0.24),rgba(59,130,246,0.16),rgba(139,92,246,0.20))] px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_30px_rgba(34,211,238,0.14)] transition hover:bg-cyan-100/[0.18] active:scale-[0.985]'
              >
                <Play className='h-4 w-4' />
                Start Round
              </button>
            </div>
          </section>
        ) : null}

        {isHowToPlay ? (
          <section className='mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'>
            <div className='rounded-[30px] border border-cyan-100/20 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_24px_58px_rgba(0,0,0,0.28)] backdrop-blur-2xl'>
              <p className='text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70'>Rules</p>
              <h2 className='mt-2 text-[28px] font-black leading-none tracking-[-0.055em] text-white'>3 strikes. Many correct answers.</h2>
              <p className='mt-3 text-[13px] font-semibold leading-relaxed text-white/68'>Correct or close guesses never lose strikes. A strike only happens when the answer does not belong to the board.</p>
            </div>

            <div className='grid min-h-0 flex-1 gap-2.5 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {HOW_TO_PLAY_RULES.map((rule) => (
                <div key={rule.title} className='rounded-[24px] border border-white/12 bg-black/20 p-3.5'>
                  <p className='text-[14px] font-black text-white'>{rule.title}</p>
                  <p className='mt-1 text-[12px] font-semibold leading-snug text-white/62'>{rule.body}</p>
                </div>
              ))}
            </div>

            <div className='grid grid-cols-2 gap-2.5'>
              <button
                type='button'
                onClick={backToMenu}
                className='min-h-[44px] rounded-[20px] border border-white/14 bg-white/[0.08] px-4 py-2.5 text-[12px] font-black text-white/80 transition hover:bg-white/[0.13] active:scale-[0.985]'
              >
                Back
              </button>
              <button
                type='button'
                onClick={startRound}
                className='min-h-[44px] rounded-[20px] border border-cyan-100/28 bg-cyan-100/[0.14] px-4 py-2.5 text-[12px] font-black text-cyan-50 transition hover:bg-cyan-100/[0.18] active:scale-[0.985]'
              >
                Start Round
              </button>
            </div>
          </section>
        ) : null}

        {isPlaying ? (
          <section className='mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'>
            <div className='grid grid-cols-3 gap-2.5'>
              <div className='rounded-[22px] border border-cyan-100/18 bg-black/22 px-3 py-2.5'>
                <p className='text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/64'>Score</p>
                <p className='mt-1 text-[23px] font-black leading-none tracking-[-0.06em]'>{score}</p>
              </div>
              <div className='rounded-[22px] border border-violet-100/18 bg-black/22 px-3 py-2.5'>
                <p className='text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/64'>Found</p>
                <p className='mt-1 text-[23px] font-black leading-none tracking-[-0.06em]'>{revealedAnswerIds.length}/{currentRound.answers.length}</p>
              </div>
              <div className='rounded-[22px] border border-rose-100/18 bg-black/22 px-3 py-2.5'>
                <p className='text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/64'>Strikes</p>
                <div className='mt-1 flex gap-1.5'>
                  {STRIKE_INDICATORS.map((indicator) => (
                    <XCircle key={indicator} className={`h-5 w-5 ${indicator <= strikes ? 'text-rose-300' : 'text-white/18'}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className='rounded-[28px] border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(15,23,42,0.54)_52%,rgba(124,58,237,0.14))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_44px_rgba(0,0,0,0.24)]'>
              <div className='flex items-center justify-between gap-3'>
                <p className='text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/68'>{currentRound.category}</p>
                <p className='rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[10px] font-black text-white/62'>Round 1</p>
              </div>
              <h2 className='mt-3 text-[19px] font-black leading-tight tracking-[-0.035em] text-white'>{currentRound.question}</h2>
              <div className='mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]'>
                <div className='h-full rounded-full bg-cyan-100/70 transition-all duration-500' style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className='grid min-h-0 flex-1 gap-2 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {currentRound.answers.map((answer, index) => {
                const isRevealed = isBoardRevealed || revealedAnswerIds.includes(answer.id);

                return (
                  <div
                    key={answer.id}
                    className={`flex min-h-[54px] items-center justify-between gap-3 rounded-[22px] border px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition ${
                      isRevealed
                        ? 'border-emerald-100/24 bg-[linear-gradient(135deg,rgba(16,185,129,0.20),rgba(15,23,42,0.42),rgba(34,211,238,0.10))]'
                        : 'border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(15,23,42,0.38),rgba(99,102,241,0.08))]'
                    }`}
                  >
                    <div className='flex min-w-0 items-center gap-3'>
                      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-black/20 text-[12px] font-black text-white/68'>{index + 1}</span>
                      <div className='min-w-0'>
                        <p className={`truncate text-[14px] font-black ${isRevealed ? 'text-white' : 'text-white/36'}`}>
                          {isRevealed ? answer.label : 'Hidden answer'}
                        </p>
                        {isRevealed ? (
                          <p className='mt-0.5 line-clamp-1 text-[11px] font-semibold text-white/55'>{answer.insight}</p>
                        ) : null}
                      </div>
                    </div>
                    <p className={`shrink-0 text-[17px] font-black tracking-[-0.04em] ${isRevealed ? 'text-cyan-50' : 'text-white/28'}`}>
                      {isRevealed ? `${answer.points}` : '??'}
                    </p>
                  </div>
                );
              })}
            </div>

            {feedback ? (
              <div className={`rounded-[22px] border px-3.5 py-3 ${feedbackClassName}`}>
                <p className='text-[13px] font-black'>{feedback.title}</p>
                <p className='mt-1 text-[12px] font-semibold leading-snug opacity-75'>{feedback.body}</p>
              </div>
            ) : null}

            <form onSubmit={handleGuessSubmit} className='shrink-0 rounded-[26px] border border-white/14 bg-black/22 p-3 backdrop-blur-xl'>
              <label htmlFor='money-pulse-guess' className='sr-only'>Type your answer</label>
              <div className='flex gap-2'>
                <div className='flex min-h-[44px] flex-1 items-center gap-2 rounded-[20px] border border-white/12 bg-white/[0.08] px-3'>
                  <Search className='h-4 w-4 shrink-0 text-cyan-100/54' />
                  <input
                    id='money-pulse-guess'
                    value={guess}
                    onChange={(event) => setGuess(event.target.value)}
                    placeholder='Type your answer...'
                    className='min-w-0 flex-1 bg-transparent text-[14px] font-bold text-white outline-none placeholder:text-white/32'
                  />
                </div>
                <button
                  type='submit'
                  className='min-h-[44px] rounded-[20px] border border-cyan-100/26 bg-cyan-100/[0.14] px-4 text-[11px] font-black uppercase tracking-[0.13em] text-cyan-50 transition hover:bg-cyan-100/[0.18] active:scale-[0.985]'
                >
                  Guess
                </button>
              </div>

              <div className='mt-2.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                {QUICK_GUESSES.map((quickGuess) => (
                  <button
                    key={quickGuess}
                    type='button'
                    onClick={() => handleQuickGuess(quickGuess)}
                    className='shrink-0 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[11px] font-black text-white/58 transition hover:bg-white/[0.12] hover:text-white active:scale-[0.98]'
                  >
                    {quickGuess}
                  </button>
                ))}
              </div>
            </form>

            <p className='shrink-0 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/32'>
              {remainingStrikes} strike{remainingStrikes === 1 ? '' : 's'} left
            </p>
          </section>
        ) : null}

        {isFinished ? (
          <section className='mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'>
            <div className='rounded-[30px] border border-cyan-100/22 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(255,255,255,0.075)_38%,rgba(124,58,237,0.17)),rgba(2,8,23,0.56)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_22px_54px_rgba(0,0,0,0.32)] backdrop-blur-2xl'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70'>{gameStatus === 'round-clear' ? 'Round Complete' : 'Board Revealed'}</p>
                  <h2 className='mt-2 text-[31px] font-black leading-none tracking-[-0.06em] text-white'>{score} pts</h2>
                  <p className='mt-2 text-[12px] font-semibold leading-snug text-white/62'>Found {revealedAnswers.length} of {currentRound.answers.length} answers before the board opened.</p>
                </div>
                <span className='inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/24 bg-cyan-100/[0.12] text-cyan-50'>
                  <Trophy className='h-6 w-6' />
                </span>
              </div>
            </div>

            <div className='grid min-h-0 flex-1 gap-2 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {currentRound.answers.map((answer, index) => {
                const wasFound = revealedAnswerIds.includes(answer.id);

                return (
                  <div key={answer.id} className='rounded-[22px] border border-white/12 bg-black/20 p-3.5'>
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] text-[12px] font-black text-white/66'>{index + 1}</span>
                        <p className='truncate text-[14px] font-black text-white'>{answer.label}</p>
                      </div>
                      <div className='flex shrink-0 items-center gap-2'>
                        {wasFound ? <CheckCircle2 className='h-4 w-4 text-emerald-300' /> : null}
                        <p className='text-[15px] font-black text-cyan-50'>{answer.points}</p>
                      </div>
                    </div>
                    <p className='mt-2 text-[11px] font-semibold leading-snug text-white/55'>{answer.insight}</p>
                  </div>
                );
              })}
            </div>

            <div className='rounded-[24px] border border-cyan-100/18 bg-cyan-100/[0.08] p-3.5'>
              <p className='text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/68'>CLARA Insight</p>
              <p className='mt-2 text-[13px] font-bold leading-relaxed text-white/76'>{currentRound.claraInsight}</p>
            </div>

            <div className='grid grid-cols-2 gap-2.5'>
              <button
                type='button'
                onClick={() => resetRound('playing')}
                className='inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[20px] border border-cyan-100/26 bg-cyan-100/[0.13] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:bg-cyan-100/[0.18] active:scale-[0.985]'
              >
                <RotateCcw className='h-4 w-4' />
                Play Again
              </button>
              <button
                type='button'
                onClick={onClose}
                className='min-h-[44px] rounded-[20px] border border-white/14 bg-white/[0.08] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/74 transition hover:bg-white/[0.13] active:scale-[0.985]'
              >
                Back to Hub
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>,
    document.body,
  );
}
