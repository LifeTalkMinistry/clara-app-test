import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Heart,
  Lightbulb,
  Play,
  RotateCcw,
  Timer,
  Trophy,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { selectMoneyRushQuestions } from '../games/money-rush/moneyRushQuestionPicker';

const STARTING_TIME_BANK = 60;
const CORRECT_TIME_BONUS = 10;
const STARTING_HEARTS = 3;
const TIME_RUSH_QUESTION_COUNT = 10;
const HEART_INDICATORS = [1, 2, 3];

const createTimeRushQuestions = () => selectMoneyRushQuestions({ count: TIME_RUSH_QUESTION_COUNT });

const MONEY_RUSH_FALLBACK_QUESTION = {
  id: 'money-rush-fallback-question',
  type: 'fact',
  topic: 'budgeting',
  difficulty: 'easy',
  question: 'What is the real purpose of a budget?',
  options: ['To give money direction', 'To punish yourself', 'To remove all fun', 'To make spending random'],
  answer: 'To give money direction',
  claraLine: 'A budget gives money direction before pressure decides.',
};

const HOW_TO_PLAY_RULES = [
  'Start with a 60-second Time Bank.',
  'Correct answers add +10 seconds.',
  'Three wrong answers end the run.',
  'Final score equals your remaining Time Bank.',
];

const COMING_SOON_MODES = [
  {
    title: 'Money Ladder',
    description: 'Climb the score ladder one smart answer at a time.',
  },
  {
    title: 'Chill Quiz',
    description: 'No timer. Just test what you know.',
  },
  {
    title: 'Streak Run',
    description: 'Keep the streak alive. One mistake breaks it.',
  },
];

function clearTimers(timerIds) {
  timerIds.current.forEach((timerId) => window.clearTimeout(timerId));
  timerIds.current = [];
}

export default function MoneyRushModal({ isOpen, material, onClose }) {
  const transitionTimersRef = useRef([]);
  const [gameStatus, setGameStatus] = useState('menu');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeBank, setTimeBank] = useState(STARTING_TIME_BANK);
  const [hearts, setHearts] = useState(STARTING_HEARTS);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [runQuestions, setRunQuestions] = useState(() => createTimeRushQuestions());

  const currentQuestion = runQuestions[currentQuestionIndex] || runQuestions[0] || MONEY_RUSH_FALLBACK_QUESTION;
  const totalQuestions = runQuestions.length || 1;
  const isMenu = gameStatus === 'menu';
  const isHowToPlay = gameStatus === 'how-to-play';
  const isPlaying = gameStatus === 'playing';
  const isFinished = gameStatus === 'stage-clear' || gameStatus === 'game-over';
  const progressPercent = Math.round(((currentQuestionIndex + 1) / Math.max(totalQuestions, 1)) * 100);

  const resultTitle = gameStatus === 'stage-clear' ? 'Stage Clear!' : 'Game Over';
  const resultLine = gameStatus === 'stage-clear'
    ? 'Fast decisions protected your progress.'
    : 'Your Time Bank ran out or you lost all hearts.';

  const clearPendingTransitions = useCallback(() => {
    if (typeof window === 'undefined') return;
    clearTimers(transitionTimersRef);
  }, []);

  const resetGame = useCallback(() => {
    clearPendingTransitions();
    setGameStatus('menu');
    setCurrentQuestionIndex(0);
    setTimeBank(STARTING_TIME_BANK);
    setHearts(STARTING_HEARTS);
    setSelectedAnswer(null);
    setFeedback(null);
    setIsAnswerLocked(false);
    setFinalScore(0);
    setRunQuestions(createTimeRushQuestions());
  }, [clearPendingTransitions]);

  const startGame = () => {
    clearPendingTransitions();
    setRunQuestions(createTimeRushQuestions());
    setGameStatus('playing');
    setCurrentQuestionIndex(0);
    setTimeBank(STARTING_TIME_BANK);
    setHearts(STARTING_HEARTS);
    setSelectedAnswer(null);
    setFeedback(null);
    setIsAnswerLocked(false);
    setFinalScore(0);
  };

  const openHowToPlay = () => {
    clearPendingTransitions();
    setGameStatus('how-to-play');
  };

  useEffect(() => () => clearPendingTransitions(), [clearPendingTransitions]);

  useEffect(() => {
    if (!isOpen) resetGame();
  }, [isOpen, resetGame]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const intervalId = window.setInterval(() => {
      setTimeBank((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || timeBank > 0) return;

    clearPendingTransitions();
    setFinalScore(0);
    setGameStatus('game-over');
  }, [clearPendingTransitions, isPlaying, timeBank]);

  useEffect(() => {
    if (gameStatus === 'game-over' || gameStatus === 'stage-clear') {
      clearPendingTransitions();
      setIsAnswerLocked(true);
    }
  }, [clearPendingTransitions, gameStatus]);

  const handleAnswer = (option) => {
    if (!isPlaying || isAnswerLocked || !option) return;

    const isCorrect = option === currentQuestion.answer;
    const nextTimeBank = isCorrect ? timeBank + CORRECT_TIME_BONUS : timeBank;
    const nextHearts = isCorrect ? hearts : hearts - 1;
    const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;

    setSelectedAnswer(option);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setIsAnswerLocked(true);
    setTimeBank(nextTimeBank);
    setHearts(Math.max(0, nextHearts));

    const transitionId = window.setTimeout(() => {
      if (nextHearts <= 0) {
        setFinalScore(nextTimeBank);
        setGameStatus('game-over');
        return;
      }

      if (isLastQuestion) {
        setFinalScore(nextTimeBank);
        setGameStatus('stage-clear');
        return;
      }

      setCurrentQuestionIndex((current) => current + 1);
      setSelectedAnswer(null);
      setFeedback(null);
      setIsAnswerLocked(false);
    }, 850);

    transitionTimersRef.current.push(transitionId);
  };

  const optionClassName = (option) => {
    const isSelected = selectedAnswer === option;
    const isCorrectAnswer = currentQuestion.answer === option;

    if (!isAnswerLocked || !isSelected) {
      return 'border-white/13 bg-[linear-gradient(135deg,rgba(255,255,255,0.125),rgba(148,163,184,0.075)_45%,rgba(99,102,241,0.105))] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_22px_rgba(0,0,0,0.18)] hover:border-cyan-100/32 hover:bg-cyan-100/[0.13] active:scale-[0.985]';
    }

    if (isCorrectAnswer) {
      return 'border-emerald-100/48 bg-[linear-gradient(135deg,rgba(16,185,129,0.30),rgba(6,95,70,0.22),rgba(34,211,238,0.14))] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_28px_rgba(16,185,129,0.24)]';
    }

    return 'border-rose-100/44 bg-[linear-gradient(135deg,rgba(244,63,94,0.28),rgba(127,29,29,0.20),rgba(168,85,247,0.12))] text-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_0_26px_rgba(244,63,94,0.22)]';
  };

  const feedbackMessage = useMemo(() => {
    if (feedback === 'correct') return `Correct! +${CORRECT_TIME_BONUS}s added.`;
    if (feedback === 'wrong') return 'Wrong. 1 heart lost.';
    return 'Answer fast, but choose smart.';
  }, [feedback]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className='fixed inset-0 z-[9999] h-[100dvh] overflow-hidden bg-[#020617] text-white'>
      <div className='pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(103,232,249,0.34),transparent_32%),radial-gradient(circle_at_96%_2%,rgba(196,181,253,0.30),transparent_30%),radial-gradient(circle_at_70%_88%,rgba(124,58,237,0.30),transparent_34%),radial-gradient(circle_at_8%_96%,rgba(20,184,166,0.24),transparent_34%),linear-gradient(135deg,#02111f_0%,#07172b_42%,#1b1140_100%)]' />
      <div className='pointer-events-none fixed inset-x-0 top-0 h-[28dvh] bg-gradient-to-b from-white/[0.16] via-cyan-100/[0.045] to-transparent' />
      <div className='pointer-events-none fixed inset-x-0 bottom-0 h-[24dvh] bg-gradient-to-t from-black/64 via-violet-950/24 to-transparent' />
      <div className='pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.055),transparent_30%,rgba(34,211,238,0.035)_48%,transparent_70%)]' />

      <main className='relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden px-[clamp(0.78rem,3.8vw,1rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.65rem,env(safe-area-inset-top))]'>
        <header className='flex shrink-0 items-center justify-between gap-3'>
          <div>
            <p className='text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/72 drop-shadow-[0_0_12px_rgba(103,232,249,0.18)]'>CLARA Game Mode</p>
            <h1 className='mt-1 bg-gradient-to-r from-white via-cyan-100 to-violet-100 bg-clip-text text-[clamp(25px,4dvh,35px)] font-black tracking-[-0.055em] text-transparent drop-shadow-[0_10px_30px_rgba(34,211,238,0.14)]'>
              {material?.title || 'Money Rush'}
            </h1>
          </div>

          <div className='flex items-center gap-2'>
            {!isPlaying ? (
              <button
                type='button'
                onClick={openHowToPlay}
                aria-label='Open Money Rush rules'
                className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(34,211,238,0.09),rgba(124,58,237,0.10))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_14px_30px_rgba(0,0,0,0.26),0_0_24px_rgba(34,211,238,0.12)] backdrop-blur-xl transition hover:bg-cyan-100/[0.18] hover:text-white active:scale-[0.98]'
              >
                <Lightbulb className='h-5 w-5' />
              </button>
            ) : null}

            <button
              type='button'
              onClick={onClose}
              aria-label='Close Money Rush'
              className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.15),rgba(255,255,255,0.07),rgba(139,92,246,0.10))] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_14px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:bg-white/[0.16] hover:text-white active:scale-[0.98]'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </header>

        {isMenu ? (
          <section className='mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'>
            <div className='rounded-[28px] border border-cyan-100/22 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(255,255,255,0.075)_38%,rgba(124,58,237,0.17)),rgba(2,8,23,0.56)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_22px_54px_rgba(0,0,0,0.32),0_0_42px_rgba(34,211,238,0.08)] backdrop-blur-2xl'>
              <div className='flex items-center gap-3'>
                <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(255,255,255,0.10),rgba(139,92,246,0.13))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_24px_rgba(34,211,238,0.18)]'>
                  <Zap className='h-5 w-5' />
                </span>
                <p className='text-[13px] font-bold leading-snug text-white/84'>
                  Pick a quiz mode. Test your money brain in seconds.
                </p>
              </div>

              <div className='mt-3 grid grid-cols-2 gap-2.5'>
                <div className='flex items-center justify-between rounded-2xl border border-cyan-100/18 bg-[linear-gradient(135deg,rgba(6,182,212,0.13),rgba(15,23,42,0.42))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl'>
                  <p className='text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/66'>Total Points</p>
                  <p className='text-[23px] font-black leading-none tracking-[-0.06em] text-white drop-shadow-[0_0_14px_rgba(103,232,249,0.22)]'>0</p>
                </div>
                <div className='flex items-center justify-between rounded-2xl border border-violet-100/18 bg-[linear-gradient(135deg,rgba(139,92,246,0.14),rgba(15,23,42,0.42))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl'>
                  <p className='text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/68'>Best Score</p>
                  <p className='text-[23px] font-black leading-none tracking-[-0.06em] text-white drop-shadow-[0_0_14px_rgba(196,181,253,0.22)]'>0</p>
                </div>
              </div>
            </div>

            <div className='flex min-h-0 flex-1 flex-col rounded-[30px] border border-white/18 bg-[linear-gradient(135deg,rgba(255,255,255,0.105),rgba(14,165,233,0.065)_35%,rgba(88,28,135,0.12)),rgba(2,6,23,0.50)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.17),0_24px_58px_rgba(0,0,0,0.30)] backdrop-blur-2xl'>
              <div className='mb-2.5 flex shrink-0 items-center justify-between gap-3'>
                <p className='text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/70'>Choose Mode</p>
              </div>

              <div className='grid min-h-0 flex-1 gap-2.5 overflow-y-auto pr-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                <article className='flex h-[112px] shrink-0 flex-col justify-between rounded-[24px] border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(34,211,238,0.17),rgba(15,23,42,0.54)_46%,rgba(124,58,237,0.22))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_42px_rgba(34,211,238,0.10),0_16px_40px_rgba(0,0,0,0.20)]'>
                  <div>
                    <h4 className='text-[21px] font-black leading-none tracking-[-0.05em] text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.16)]'>Time Rush</h4>
                    <p className='mt-2 text-[12px] font-semibold leading-snug text-white/70'>
                      Answer fast. Preserve your Time Bank.
                    </p>
                  </div>

                  <button
                    type='button'
                    onClick={startGame}
                    className='mt-2 inline-flex min-h-[34px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-100/26 bg-[linear-gradient(135deg,rgba(103,232,249,0.23),rgba(59,130,246,0.14),rgba(139,92,246,0.17))] px-5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_26px_rgba(34,211,238,0.16)] transition hover:border-cyan-100/38 hover:bg-cyan-100/[0.20] active:scale-[0.98]'
                  >
                    <Play className='h-3.5 w-3.5 fill-current' />
                    Play Time Rush
                  </button>
                </article>

                {COMING_SOON_MODES.map((mode) => (
                  <article
                    key={mode.title}
                    className='flex h-[112px] shrink-0 flex-col justify-between rounded-[24px] border border-white/13 bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(15,23,42,0.46)_48%,rgba(124,58,237,0.16))] p-3.5 opacity-92 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_34px_rgba(0,0,0,0.16)]'
                  >
                    <div>
                      <h4 className='text-[21px] font-black leading-none tracking-[-0.05em] text-white/84'>{mode.title}</h4>
                      <p className='mt-2 text-[12px] font-semibold leading-snug text-white/58'>
                        {mode.description}
                      </p>
                    </div>

                    <div className='inline-flex min-h-[34px] w-full items-center justify-center rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(139,92,246,0.10))] px-5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/44 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'>
                      Coming Soon
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {isHowToPlay ? (
          <section className='mt-5 flex min-h-0 flex-1 flex-col justify-center'>
            <div className='rounded-[32px] border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.58)_46%,rgba(124,58,237,0.22))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_24px_60px_rgba(0,0,0,0.34),0_0_44px_rgba(34,211,238,0.10)] backdrop-blur-2xl'>
              <span className='inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(34,211,238,0.20),rgba(255,255,255,0.10),rgba(139,92,246,0.13))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_26px_rgba(34,211,238,0.20)]'>
                <Lightbulb className='h-7 w-7' />
              </span>
              <p className='mt-5 text-[13px] font-extrabold uppercase tracking-[0.20em] text-cyan-100/72'>Money Rush Rules</p>
              <h2 className='mt-2 text-[clamp(27px,4dvh,36px)] font-black leading-[0.96] tracking-[-0.05em] text-white'>
                Answer fast. Think smart. Every second counts.
              </h2>

              <div className='mt-5 grid gap-2.5'>
                {HOW_TO_PLAY_RULES.map((rule) => (
                  <div key={rule} className='flex items-center gap-3 rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(15,23,42,0.38),rgba(34,211,238,0.055))] px-3.5 py-3 text-[13px] font-bold text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'>
                    <CheckCircle2 className='h-4 w-4 shrink-0 text-cyan-100/84' />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>

              <p className='mt-5 rounded-2xl border border-cyan-100/16 bg-cyan-100/[0.09] px-4 py-3 text-[13px] font-black text-cyan-50/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'>
                Clara: Fast is good. Smart is better.
              </p>

              <button
                type='button'
                onClick={resetGame}
                className='mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(103,232,249,0.22),rgba(59,130,246,0.14),rgba(139,92,246,0.17))] px-5 py-4 text-[14px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_42px_rgba(34,211,238,0.16)] transition hover:bg-cyan-100/[0.20] active:scale-[0.98]'
              >
                Got it
              </button>
            </div>
          </section>
        ) : null}

        {isPlaying ? (
          <section className='mt-4 flex min-h-0 flex-1 flex-col'>
            <div className='grid shrink-0 grid-cols-3 gap-2'>
              <div className='rounded-2xl border border-cyan-100/22 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.52),rgba(34,211,238,0.07))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl'>
                <div className='flex items-center gap-1.5 text-cyan-100/78'>
                  <Timer className='h-3.5 w-3.5' />
                  <span className='text-[9px] font-black uppercase tracking-[0.16em]'>Time Bank</span>
                </div>
                <p className='mt-1 text-[24px] font-black tracking-[-0.055em] text-white drop-shadow-[0_0_16px_rgba(103,232,249,0.22)]'>{timeBank}s</p>
              </div>

              <div className='rounded-2xl border border-rose-100/20 bg-[linear-gradient(135deg,rgba(244,114,182,0.12),rgba(15,23,42,0.52),rgba(139,92,246,0.12))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl'>
                <div className='flex items-center gap-1.5 text-rose-100/76'>
                  <Heart className='h-3.5 w-3.5 fill-current' />
                  <span className='text-[9px] font-black uppercase tracking-[0.16em]'>Hearts</span>
                </div>
                <div className='mt-2 flex gap-1'>
                  {HEART_INDICATORS.map((heartNumber) => (
                    <Heart
                      key={heartNumber}
                      className={`h-4 w-4 ${heartNumber <= hearts ? 'fill-current text-rose-200 drop-shadow-[0_0_10px_rgba(251,113,133,0.30)]' : 'text-white/20'}`}
                    />
                  ))}
                </div>
              </div>

              <div className='rounded-2xl border border-violet-100/22 bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(15,23,42,0.52),rgba(34,211,238,0.08))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl'>
                <div className='flex items-center gap-1.5 text-violet-100/78'>
                  <Trophy className='h-3.5 w-3.5' />
                  <span className='text-[9px] font-black uppercase tracking-[0.16em]'>Progress</span>
                </div>
                <p className='mt-1 text-[24px] font-black tracking-[-0.055em] text-white drop-shadow-[0_0_16px_rgba(196,181,253,0.22)]'>{currentQuestionIndex + 1}/{totalQuestions}</p>
              </div>
            </div>

            <div className='mt-3 h-2 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/28 shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)]'>
              <div
                className='h-full rounded-full bg-gradient-to-r from-cyan-200 via-sky-300 to-violet-300 shadow-[0_0_18px_rgba(103,232,249,0.45)] transition-all duration-300'
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className='mt-4 flex min-h-0 flex-1 flex-col rounded-[30px] border border-white/18 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(14,165,233,0.055)_34%,rgba(88,28,135,0.13)),rgba(2,6,23,0.48)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_22px_54px_rgba(0,0,0,0.30)] backdrop-blur-2xl'>
              <div className='rounded-[24px] border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(15,23,42,0.58)_46%,rgba(124,58,237,0.20))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_16px_38px_rgba(34,211,238,0.08)]'>
                <p className='text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/70'>Money Awareness</p>
                <h2 className='mt-2 text-[clamp(21px,3.2dvh,28px)] font-black leading-tight tracking-[-0.045em] text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.11)]'>
                  {currentQuestion.question}
                </h2>
              </div>

              <div className='mt-4 grid gap-2.5'>
                {currentQuestion.options.map((option) => (
                  <button
                    type='button'
                    key={option}
                    disabled={isAnswerLocked}
                    onClick={() => handleAnswer(option)}
                    className={`flex min-h-[54px] items-center justify-between rounded-2xl border px-4 py-3 text-left text-[14px] font-black leading-snug backdrop-blur-xl transition ${optionClassName(option)}`}
                  >
                    <span>{option}</span>
                    {isAnswerLocked && selectedAnswer === option ? (
                      feedback === 'correct' ? <CheckCircle2 className='h-5 w-5 shrink-0' /> : <XCircle className='h-5 w-5 shrink-0' />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className='mt-auto pt-4'>
                <div className='rounded-2xl border border-white/13 bg-[linear-gradient(135deg,rgba(255,255,255,0.105),rgba(15,23,42,0.38),rgba(34,211,238,0.06))] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl'>
                  <p className='text-[12px] font-black text-white/88'>{feedbackMessage}</p>
                  <p className='mt-1 text-[11px] font-semibold leading-snug text-cyan-100/68'>
                    {feedback === 'correct' ? currentQuestion.claraLine : 'Clara: Fast answers still need smart choices.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {isFinished ? (
          <section className='mt-5 flex min-h-0 flex-1 flex-col justify-center'>
            <div className='rounded-[32px] border border-white/18 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.58)_48%,rgba(124,58,237,0.22))] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl'>
              <span className='mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[26px] border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(34,211,238,0.10),rgba(139,92,246,0.12))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_30px_rgba(34,211,238,0.20)]'>
                {gameStatus === 'stage-clear' ? <Trophy className='h-8 w-8' /> : <XCircle className='h-8 w-8' />}
              </span>
              <p className='mt-5 text-[11px] font-black uppercase tracking-[0.20em] text-cyan-100/66'>Money Rush Result</p>
              <h2 className='mt-2 text-[clamp(30px,4.2dvh,40px)] font-black tracking-[-0.06em] text-white'>
                {resultTitle}
              </h2>
              <p className='mt-2 text-[14px] font-semibold text-white/70'>{resultLine}</p>

              <div className='mt-5 rounded-[26px] border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(15,23,42,0.46),rgba(124,58,237,0.16))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.13)]'>
                <p className='text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/64'>Final Score</p>
                <p className='mt-2 text-[48px] font-black leading-none tracking-[-0.08em] text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.24)]'>
                  {finalScore}
                </p>
                <p className='mt-1 text-[13px] font-black uppercase tracking-[0.16em] text-cyan-100/78'>Points</p>
                <p className='mt-3 text-[12px] font-semibold text-white/60'>
                  Time Bank Preserved: {finalScore}s
                </p>
              </div>

              <p className='mt-4 text-[13px] font-semibold leading-relaxed text-white/68'>
                Clara: Every second you preserve shows faster awareness under pressure.
              </p>

              <div className='mt-6 grid grid-cols-2 gap-3'>
                <button
                  type='button'
                  onClick={resetGame}
                  className='inline-flex items-center justify-center gap-2 rounded-2xl border border-white/16 bg-[linear-gradient(135deg,rgba(255,255,255,0.11),rgba(255,255,255,0.055))] px-4 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-white/[0.13] active:scale-[0.98]'
                >
                  <RotateCcw className='h-4 w-4' />
                  Menu
                </button>
                <button
                  type='button'
                  onClick={startGame}
                  className='inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(103,232,249,0.21),rgba(59,130,246,0.13),rgba(139,92,246,0.16))] px-4 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_30px_rgba(34,211,238,0.12)] transition hover:bg-cyan-100/[0.20] active:scale-[0.98]'
                >
                  <Play className='h-4 w-4 fill-current' />
                  Play Again
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>,
    document.body,
  );
}
