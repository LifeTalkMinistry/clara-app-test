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

const STARTING_TIME_BANK = 60;
const CORRECT_TIME_BONUS = 10;
const STARTING_HEARTS = 3;
const HEART_INDICATORS = [1, 2, 3];

const MONEY_RUSH_QUESTIONS = [
  {
    id: 'payday-priority',
    question: 'What should usually come first after receiving income?',
    options: ['Random sale items', 'Bills and essentials', 'New gadgets', 'Food delivery only'],
    answer: 'Bills and essentials',
    claraLine: 'Good decision. Essentials protect the month before wants compete for space.',
  },
  {
    id: 'pause-before-buying',
    question: 'What is a smart reason to pause before buying something?',
    options: ['To check if it fits your budget', 'To make the seller wait', 'To avoid thinking', 'To spend faster'],
    answer: 'To check if it fits your budget',
    claraLine: 'A pause gives your brain time to check reality before emotion decides.',
  },
  {
    id: 'impulse-control',
    question: 'Which action helps prevent impulse spending?',
    options: ['Buying immediately', 'Comparing it with your budget first', 'Ignoring your balance', 'Spending because you feel stressed'],
    answer: 'Comparing it with your budget first',
    claraLine: 'Fast is good, but smart is better. Check the budget before the wallet reacts.',
  },
  {
    id: 'money-leak',
    question: 'What is a money leak?',
    options: ['A small repeated expense that quietly drains money', 'A bank error only', 'Free money', 'A salary increase'],
    answer: 'A small repeated expense that quietly drains money',
    claraLine: 'Small leaks become heavy when they repeat without being noticed.',
  },
  {
    id: 'awareness-control',
    question: 'Why is money awareness important?',
    options: ['You cannot control what you do not notice', 'Money should always be spent fast', 'Budgets are useless', 'Wants are always more important'],
    answer: 'You cannot control what you do not notice',
    claraLine: 'Awareness is the first step. You can only improve what you can see.',
  },
  {
    id: 'safe-spending',
    question: 'When is spending usually safer?',
    options: ['When it is planned and affordable', 'When you are bored', 'When everyone else is buying', 'When you are hiding it from your budget'],
    answer: 'When it is planned and affordable',
    claraLine: 'Planned spending is not the enemy. Unchecked spending creates pressure.',
  },
  {
    id: 'budget-purpose',
    question: 'What is the real purpose of a budget?',
    options: ['To give money direction', 'To punish yourself', 'To remove all fun', 'To make spending random'],
    answer: 'To give money direction',
    claraLine: 'A budget is direction. It tells money where to go before pressure decides.',
  },
  {
    id: 'emergency-fund',
    question: 'What is an emergency fund mainly for?',
    options: ['Protection when life gets expensive', 'Random online shopping', 'Showing off savings', 'Replacing every budget category'],
    answer: 'Protection when life gets expensive',
    claraLine: 'Emergency money protects you when life suddenly becomes expensive.',
  },
  {
    id: 'needs-first',
    question: 'Which choice best protects financial stability?',
    options: ['Pay essentials before flexible wants', 'Spend first and check later', 'Ignore due dates', 'Use savings for every craving'],
    answer: 'Pay essentials before flexible wants',
    claraLine: 'Stability grows when essentials are protected before flexible spending.',
  },
  {
    id: 'ask-before-spend',
    question: 'What is the strongest CLARA habit before spending?',
    options: ['Ask before you spend', 'Spend before you think', 'Buy because it is trending', 'Avoid checking your wallet'],
    answer: 'Ask before you spend',
    claraLine: 'That is the habit. Ask first, then spend only when it fits your real life.',
  },
];

const HOW_TO_PLAY_RULES = [
  'Start with a 60-second Time Bank.',
  'Correct answers add +10 seconds.',
  'Three wrong answers end the run.',
  'Final score equals your remaining Time Bank.',
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

  const currentQuestion = MONEY_RUSH_QUESTIONS[currentQuestionIndex] || MONEY_RUSH_QUESTIONS[0];
  const totalQuestions = MONEY_RUSH_QUESTIONS.length;
  const isMenu = gameStatus === 'menu';
  const isHowToPlay = gameStatus === 'how-to-play';
  const isPlaying = gameStatus === 'playing';
  const isFinished = gameStatus === 'stage-clear' || gameStatus === 'game-over';
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

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
  }, [clearPendingTransitions]);

  const startGame = () => {
    clearPendingTransitions();
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
      return 'border-white/10 bg-white/[0.075] text-white/84 hover:border-cyan-100/30 hover:bg-cyan-100/[0.12] active:scale-[0.98]';
    }

    if (isCorrectAnswer) {
      return 'border-emerald-100/42 bg-emerald-400/[0.18] text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.22)]';
    }

    return 'border-rose-100/40 bg-rose-400/[0.17] text-rose-50 shadow-[0_0_24px_rgba(244,63,94,0.20)]';
  };

  const feedbackMessage = useMemo(() => {
    if (feedback === 'correct') return `Correct! +${CORRECT_TIME_BONUS}s added.`;
    if (feedback === 'wrong') return 'Wrong. 1 heart lost.';
    return 'Answer fast, but choose smart.';
  }, [feedback]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className='fixed inset-0 z-[9999] h-[100dvh] overflow-hidden bg-[#020617] text-white'>
      <div className='pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_4%_0%,rgba(34,211,238,0.30),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(168,85,247,0.30),transparent_34%),radial-gradient(circle_at_18%_96%,rgba(20,184,166,0.22),transparent_36%),linear-gradient(135deg,#031a2a,#071329_44%,#1c0f3f)]' />
      <div className='pointer-events-none fixed inset-x-0 top-0 h-[24dvh] bg-gradient-to-b from-white/[0.12] via-cyan-100/[0.035] to-transparent' />
      <div className='pointer-events-none fixed inset-x-0 bottom-0 h-[22dvh] bg-gradient-to-t from-black/58 via-violet-950/20 to-transparent' />

      <main className='relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden px-[clamp(0.78rem,3.8vw,1rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.65rem,env(safe-area-inset-top))]'>
        <header className='flex shrink-0 items-center justify-between gap-3'>
          <div>
            <p className='text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/62'>CLARA Game Mode</p>
            <h1 className='mt-1 bg-gradient-to-r from-white via-cyan-100 to-violet-100 bg-clip-text text-[clamp(24px,4dvh,34px)] font-black tracking-[-0.05em] text-transparent'>
              {material?.title || 'Money Rush'}
            </h1>
          </div>

          <div className='flex items-center gap-2'>
            {!isPlaying ? (
              <button
                type='button'
                onClick={openHowToPlay}
                aria-label='Open Money Rush rules'
                className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/16 bg-cyan-100/[0.10] text-cyan-50/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:bg-cyan-100/[0.16] hover:text-white active:scale-[0.98]'
              >
                <Lightbulb className='h-5 w-5' />
              </button>
            ) : null}

            <button
              type='button'
              onClick={onClose}
              aria-label='Close Money Rush'
              className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:bg-white/[0.13] hover:text-white active:scale-[0.98]'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </header>

        {isMenu ? (
          <section className='mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'>
            <div className='rounded-[26px] border border-cyan-100/16 bg-[linear-gradient(135deg,rgba(8,47,73,0.62),rgba(30,41,59,0.46)_48%,rgba(49,46,129,0.38))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_18px_42px_rgba(0,0,0,0.26)] backdrop-blur-2xl'>
              <div className='flex items-center gap-3'>
                <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/18 bg-cyan-100/[0.10] text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.14)]'>
                  <Zap className='h-5 w-5' />
                </span>
                <p className='text-[13px] font-bold leading-snug text-white/76'>
                  Pick a quiz mode. Test your money brain in seconds.
                </p>
              </div>

              <div className='mt-3 grid grid-cols-2 gap-2.5'>
                <div className='flex items-center justify-between rounded-2xl border border-cyan-100/12 bg-black/18 px-3 py-2.5 backdrop-blur-xl'>
                  <p className='text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/56'>Total Points</p>
                  <p className='text-[22px] font-black leading-none tracking-[-0.06em] text-white'>0</p>
                </div>
                <div className='flex items-center justify-between rounded-2xl border border-violet-100/12 bg-black/18 px-3 py-2.5 backdrop-blur-xl'>
                  <p className='text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/58'>Best Score</p>
                  <p className='text-[22px] font-black leading-none tracking-[-0.06em] text-white'>0</p>
                </div>
              </div>
            </div>

            <div className='flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/12 bg-white/[0.075] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_44px_rgba(0,0,0,0.25)] backdrop-blur-2xl'>
              <div className='mb-2.5 flex shrink-0 items-center justify-between gap-3'>
                <p className='text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/58'>Choose Mode</p>
                <span className='rounded-full border border-cyan-100/14 bg-cyan-100/[0.10] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50'>
                  1 Available
                </span>
              </div>

              <article className='rounded-[24px] border border-cyan-100/18 bg-[linear-gradient(135deg,rgba(8,47,73,0.58),rgba(15,23,42,0.54)_54%,rgba(49,46,129,0.34))] p-3.5 shadow-[0_16px_38px_rgba(34,211,238,0.10)]'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/62'>Main Mode</p>
                    <h4 className='mt-1 text-[21px] font-black leading-none tracking-[-0.05em] text-white'>Time Rush</h4>
                  </div>
                  <span className='rounded-full border border-emerald-100/18 bg-emerald-400/[0.12] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-50'>
                    Available
                  </span>
                </div>
                <p className='mt-2.5 text-[12.5px] font-semibold leading-relaxed text-white/64'>
                  Answer fast. Preserve your Time Bank.
                </p>
                <button
                  type='button'
                  onClick={startGame}
                  className='mt-3 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-100/20 bg-cyan-100/[0.14] px-5 py-3 text-[12px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_14px_32px_rgba(34,211,238,0.12)] transition hover:bg-cyan-100/[0.20] active:scale-[0.98]'
                >
                  <Play className='h-4 w-4 fill-current' />
                  Play Time Rush
                </button>
              </article>

              <div className='mt-2.5 rounded-2xl border border-white/10 bg-black/18 px-3 py-2.5'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-[9px] font-black uppercase tracking-[0.18em] text-white/42'>Coming Soon</span>
                  <span className='rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/68'>Money Ladder</span>
                  <span className='rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/68'>Chill Quiz</span>
                  <span className='rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/68'>Streak Run</span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {isHowToPlay ? (
          <section className='mt-5 flex min-h-0 flex-1 flex-col justify-center'>
            <div className='rounded-[32px] border border-cyan-100/16 bg-[linear-gradient(135deg,rgba(8,47,73,0.72),rgba(30,41,59,0.52)_48%,rgba(49,46,129,0.46))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl'>
              <span className='inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-cyan-100/20 bg-cyan-100/[0.10] text-cyan-50 shadow-[0_0_26px_rgba(34,211,238,0.18)]'>
                <Lightbulb className='h-7 w-7' />
              </span>
              <p className='mt-5 text-[13px] font-extrabold uppercase tracking-[0.20em] text-cyan-100/62'>Money Rush Rules</p>
              <h2 className='mt-2 text-[clamp(27px,4dvh,36px)] font-black leading-[0.96] tracking-[-0.05em] text-white'>
                Answer fast. Think smart. Every second counts.
              </h2>

              <div className='mt-5 grid gap-2.5'>
                {HOW_TO_PLAY_RULES.map((rule) => (
                  <div key={rule} className='flex items-center gap-3 rounded-2xl border border-white/10 bg-black/18 px-3.5 py-3 text-[13px] font-bold text-white/78'>
                    <CheckCircle2 className='h-4 w-4 shrink-0 text-cyan-100/78' />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>

              <p className='mt-5 rounded-2xl border border-cyan-100/12 bg-cyan-100/[0.08] px-4 py-3 text-[13px] font-black text-cyan-50/88'>
                Clara: Fast is good. Smart is better.
              </p>

              <button
                type='button'
                onClick={resetGame}
                className='mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-100/20 bg-cyan-100/[0.14] px-5 py-4 text-[14px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_18px_42px_rgba(34,211,238,0.14)] transition hover:bg-cyan-100/[0.20] active:scale-[0.98]'
              >
                Got it
              </button>
            </div>
          </section>
        ) : null}

        {isPlaying ? (
          <section className='mt-4 flex min-h-0 flex-1 flex-col'>
            <div className='grid shrink-0 grid-cols-3 gap-2'>
              <div className='rounded-2xl border border-cyan-100/18 bg-black/20 p-3 backdrop-blur-xl'>
                <div className='flex items-center gap-1.5 text-cyan-100/70'>
                  <Timer className='h-3.5 w-3.5' />
                  <span className='text-[9px] font-black uppercase tracking-[0.16em]'>Time Bank</span>
                </div>
                <p className='mt-1 text-[23px] font-black tracking-[-0.05em]'>{timeBank}s</p>
              </div>

              <div className='rounded-2xl border border-rose-100/16 bg-black/20 p-3 backdrop-blur-xl'>
                <div className='flex items-center gap-1.5 text-rose-100/70'>
                  <Heart className='h-3.5 w-3.5 fill-current' />
                  <span className='text-[9px] font-black uppercase tracking-[0.16em]'>Hearts</span>
                </div>
                <div className='mt-2 flex gap-1'>
                  {HEART_INDICATORS.map((heartNumber) => (
                    <Heart
                      key={heartNumber}
                      className={`h-4 w-4 ${heartNumber <= hearts ? 'fill-current text-rose-200' : 'text-white/18'}`}
                    />
                  ))}
                </div>
              </div>

              <div className='rounded-2xl border border-violet-100/16 bg-black/20 p-3 backdrop-blur-xl'>
                <div className='flex items-center gap-1.5 text-violet-100/70'>
                  <Trophy className='h-3.5 w-3.5' />
                  <span className='text-[9px] font-black uppercase tracking-[0.16em]'>Progress</span>
                </div>
                <p className='mt-1 text-[23px] font-black tracking-[-0.05em]'>{currentQuestionIndex + 1}/{totalQuestions}</p>
              </div>
            </div>

            <div className='mt-3 h-2 shrink-0 overflow-hidden rounded-full bg-white/10'>
              <div
                className='h-full rounded-full bg-gradient-to-r from-cyan-200/80 via-sky-200/80 to-violet-200/80 transition-all duration-300'
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className='mt-4 flex min-h-0 flex-1 flex-col rounded-[30px] border border-white/12 bg-white/[0.075] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_52px_rgba(0,0,0,0.28)] backdrop-blur-2xl'>
              <div className='rounded-[24px] border border-cyan-100/14 bg-[linear-gradient(135deg,rgba(8,47,73,0.56),rgba(30,41,59,0.45)_50%,rgba(49,46,129,0.38))] p-4'>
                <p className='text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/58'>Money Awareness</p>
                <h2 className='mt-2 text-[clamp(20px,3.1dvh,27px)] font-black leading-tight tracking-[-0.04em] text-white'>
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
                    className={`flex min-h-[54px] items-center justify-between rounded-2xl border px-4 py-3 text-left text-[14px] font-black leading-snug transition ${optionClassName(option)}`}
                  >
                    <span>{option}</span>
                    {isAnswerLocked && selectedAnswer === option ? (
                      feedback === 'correct' ? <CheckCircle2 className='h-5 w-5 shrink-0' /> : <XCircle className='h-5 w-5 shrink-0' />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className='mt-auto pt-4'>
                <div className='rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center backdrop-blur-xl'>
                  <p className='text-[12px] font-black text-white/82'>{feedbackMessage}</p>
                  <p className='mt-1 text-[11px] font-semibold leading-snug text-cyan-100/58'>
                    {feedback === 'correct' ? currentQuestion.claraLine : 'Clara: Fast answers still need smart choices.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {isFinished ? (
          <section className='mt-5 flex min-h-0 flex-1 flex-col justify-center'>
            <div className='rounded-[32px] border border-white/14 bg-[linear-gradient(135deg,rgba(8,47,73,0.72),rgba(30,41,59,0.52)_48%,rgba(49,46,129,0.46))] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl'>
              <span className='mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[26px] border border-cyan-100/20 bg-white/[0.08] text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,0.18)]'>
                {gameStatus === 'stage-clear' ? <Trophy className='h-8 w-8' /> : <XCircle className='h-8 w-8' />}
              </span>
              <p className='mt-5 text-[11px] font-black uppercase tracking-[0.20em] text-cyan-100/58'>Money Rush Result</p>
              <h2 className='mt-2 text-[clamp(30px,4.2dvh,40px)] font-black tracking-[-0.06em] text-white'>
                {resultTitle}
              </h2>
              <p className='mt-2 text-[14px] font-semibold text-white/66'>{resultLine}</p>

              <div className='mt-5 rounded-[26px] border border-cyan-100/16 bg-black/22 p-5'>
                <p className='text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/56'>Final Score</p>
                <p className='mt-2 text-[48px] font-black leading-none tracking-[-0.08em] text-white'>
                  {finalScore}
                </p>
                <p className='mt-1 text-[13px] font-black uppercase tracking-[0.16em] text-cyan-100/70'>Points</p>
                <p className='mt-3 text-[12px] font-semibold text-white/56'>
                  Time Bank Preserved: {finalScore}s
                </p>
              </div>

              <p className='mt-4 text-[13px] font-semibold leading-relaxed text-white/64'>
                Clara: Every second you preserve shows faster awareness under pressure.
              </p>

              <div className='mt-6 grid grid-cols-2 gap-3'>
                <button
                  type='button'
                  onClick={resetGame}
                  className='inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-white/82 transition hover:bg-white/[0.13] active:scale-[0.98]'
                >
                  <RotateCcw className='h-4 w-4' />
                  Menu
                </button>
                <button
                  type='button'
                  onClick={startGame}
                  className='inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-100/20 bg-cyan-100/[0.14] px-4 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:bg-cyan-100/[0.20] active:scale-[0.98]'
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
