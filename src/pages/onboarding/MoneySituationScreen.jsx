import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, X } from "lucide-react";
import ClaraBrandName from "@/components/ClaraBrandName";

const MONEY_SITUATION_STORAGE_KEY = "clara_onboarding_money_situation_v1";

const MONEY_SITUATIONS = [
  {
    id: "first-time-worker",
    label: "I’m earning my first real income",
    pain: "You’re starting to earn, but it can be hard to know what to save, what to enjoy, and which habits could become expensive later.",
    help: "CLARA helps you build intentional spending, saving, and budgeting habits before bad patterns become normal.",
  },
  {
    id: "salary-increase",
    label: "My income increased, but my lifestyle keeps increasing too",
    pain: "More income can quickly turn into more spending without creating real financial progress.",
    help: "CLARA helps you protect part of every increase so earning more can also mean becoming financially stronger.",
  },
  {
    id: "breadwinner",
    label: "I support my family financially",
    pain: "You want to help the people you love, but it can be difficult to know how much you can give without sacrificing your own stability.",
    help: "CLARA helps you see what is safe to give, what must stay protected, and what your money still needs to cover.",
  },
  {
    id: "family-household",
    label: "Our household expenses keep surprising us",
    pain: "Groceries, bills, school costs, utilities, and family needs can make money feel constantly reactive.",
    help: "CLARA helps organize recurring costs and prepare for upcoming household needs before they become emergencies.",
  },
  {
    id: "single-parent",
    label: "I’m carrying the finances as a single parent",
    pain: "One income may need to protect your child, daily essentials, bills, and emergencies with very little room for mistakes.",
    help: "CLARA helps you prioritize essentials, protect limited resources, and make spending decisions around what matters most.",
  },
  {
    id: "working-student",
    label: "I’m balancing work, school, and daily expenses",
    pain: "School requirements, transport, food, and personal needs can compete for the same limited income.",
    help: "CLARA helps you allocate money around your current priorities without losing sight of your future.",
  },
  {
    id: "freelancer",
    label: "My income changes from month to month",
    pain: "A good month can feel safe even when the next month is uncertain.",
    help: "CLARA helps you decide what is truly safe to spend while preparing for lower-income months.",
  },
  {
    id: "business-money",
    label: "I keep mixing business money and personal money",
    pain: "Available business cash can easily feel spendable even when it is still needed for operations or reinvestment.",
    help: "CLARA helps you protect business needs before deciding what can safely become personal spending.",
  },
  {
    id: "living-alone",
    label: "I’m living independently for the first time",
    pain: "Rent, utilities, food, transport, and everyday costs can be much higher than expected when you start carrying them yourself.",
    help: "CLARA helps you understand the real cost of independent living and plan spending around it.",
  },
  {
    id: "before-payday",
    label: "I keep running out of money before payday",
    pain: "Money disappears during the month and you’re left trying to survive until the next salary comes in.",
    help: "CLARA helps you see where the pressure is coming from and make safer spending decisions before the money is gone.",
  },
  {
    id: "impulsive-spending",
    label: "I struggle with impulsive spending",
    pain: "Emotion, convenience, stress, excitement, or a quick “deserve ko ’to” can turn into purchases you later regret.",
    help: "CLARA creates a pause before spending and helps you check whether the purchase actually fits your situation.",
  },
  {
    id: "online-shopping",
    label: "I keep overspending on online shopping",
    pain: "Small checkouts can feel harmless one by one while quietly becoming a large monthly expense.",
    help: "CLARA helps you notice the pattern and adds accountability before another checkout happens.",
  },
  {
    id: "gambling-recovery",
    label: "I’m rebuilding my finances after gambling losses",
    pain: "Gambling-related losses can damage savings, income, debt levels, and the money needed for everyday essentials.",
    help: "CLARA can support the financial side of recovery by helping protect essential money, rebuild structure, and track progress.",
  },
  {
    id: "debt",
    label: "I feel buried in debt",
    pain: "Repayments can consume most of your income and make it difficult to see a realistic way forward.",
    help: "CLARA helps organize obligations and keep new spending decisions aligned with your recovery plan.",
  },
  {
    id: "borrowing-payday",
    label: "I keep borrowing money before payday",
    pain: "Borrowing fills the gap today, but it can make the next payday start already behind.",
    help: "CLARA helps identify the gap earlier and reduce the spending decisions that keep the borrowing cycle going.",
  },
  {
    id: "credit-card",
    label: "I rely too much on my credit card",
    pain: "Available credit can start to feel like extra income even though every swipe creates a future obligation.",
    help: "CLARA helps judge affordability using your real financial capacity instead of your available credit limit.",
  },
  {
    id: "no-emergency-fund",
    label: "I don’t have an emergency fund yet",
    pain: "One unexpected expense can immediately turn into borrowing, debt, or money taken from important goals.",
    help: "CLARA helps you gradually build and protect a buffer for the things you cannot predict.",
  },
  {
    id: "emergency-fund-used",
    label: "An emergency wiped out my savings",
    pain: "Your safety net did its job, but now you feel exposed because the buffer is gone.",
    help: "CLARA helps you balance current needs while making rebuilding that protection a visible priority again.",
  },
  {
    id: "job-loss",
    label: "I suddenly lost my job",
    pain: "Income may stop immediately while rent, food, bills, debt, and family responsibilities continue.",
    help: "CLARA helps shift your money decisions toward preservation, essentials, and extending how long your available money can last.",
  },
  {
    id: "income-drop",
    label: "My income suddenly dropped",
    pain: "Your old spending rhythm may no longer fit what you earn now.",
    help: "CLARA helps you adjust spending around your new reality before the gap becomes debt.",
  },
  {
    id: "lost-breadwinner",
    label: "Our household suddenly lost its main breadwinner",
    pain: "A death, disability, or major life event can suddenly remove the income the household depended on.",
    help: "CLARA helps reorganize available resources, essential expenses, obligations, and immediate priorities around the new reality.",
  },
  {
    id: "unexpected-expense",
    label: "A major medical or family expense suddenly happened",
    pain: "One urgent cost can disrupt the entire budget and force difficult choices about what gets paid first.",
    help: "CLARA helps you see what can be protected, adjusted, delayed, or reallocated while dealing with the urgent expense.",
  },
  {
    id: "separation",
    label: "I’m rebuilding financially after a breakup or separation",
    pain: "Expenses that used to be shared can suddenly become your responsibility alone.",
    help: "CLARA helps you rebuild a financial structure that fits your new situation and responsibilities.",
  },
  {
    id: "marriage",
    label: "I’m preparing to get married",
    pain: "Marriage can introduce new shared expenses, responsibilities, goals, and financial expectations.",
    help: "CLARA helps you prepare for those commitments before they arrive instead of reacting afterward.",
  },
  {
    id: "expecting-child",
    label: "We’re expecting a child",
    pain: "A growing family can change household costs quickly, from healthcare and supplies to childcare and future needs.",
    help: "CLARA helps you prepare your money before those new responsibilities become part of everyday life.",
  },
  {
    id: "aging-parents",
    label: "I’m starting to support my aging parents",
    pain: "Caregiving responsibilities can grow while your own bills, savings, and future goals still need protection.",
    help: "CLARA helps you balance family support with the financial stability you also need to maintain.",
  },
  {
    id: "moving-out",
    label: "I want to move out and live on my own",
    pain: "Wanting independence is different from knowing whether your current income can safely sustain it.",
    help: "CLARA helps you compare the real cost of moving out with your income, obligations, savings, and buffer.",
  },
  {
    id: "major-purchase",
    label: "I’m thinking about a major purchase",
    pain: "Having enough cash today does not always mean the purchase is financially safe.",
    help: "CLARA helps check the purchase against upcoming obligations, savings, goals, and the money you still need to protect.",
  },
  {
    id: "installment",
    label: "I’m considering buying something on installment",
    pain: "A small monthly payment can hide the size and length of the commitment you are taking on.",
    help: "CLARA helps you look at the full obligation and whether your future income can safely carry it.",
  },
  {
    id: "saving-goal",
    label: "I’m saving for something important",
    pain: "Everyday spending can quietly delay a goal even when you genuinely want to reach it.",
    help: "CLARA keeps the goal connected to today’s spending decisions so you can see what each choice changes.",
  },
  {
    id: "taking-savings-back",
    label: "I save money, but I keep taking it back",
    pain: "Savings can feel like extra available money when there is no clear boundary protecting what it is for.",
    help: "CLARA helps distinguish protected savings from money that is genuinely available to spend.",
  },
  {
    id: "guilty-spending",
    label: "I feel guilty whenever I spend money",
    pain: "Even responsible purchases can feel wrong when you are never sure what is actually safe to spend.",
    help: "CLARA helps you recognize when a purchase genuinely fits so discipline can create freedom, not constant fear.",
  },
  {
    id: "gut-feeling",
    label: "I mostly manage money based on gut feeling",
    pain: "“Feeling ko kaya naman” can ignore bills, goals, savings, and commitments that are not visible in the moment.",
    help: "CLARA helps turn a feeling into a decision backed by the financial context around you.",
  },
  {
    id: "overwhelmed",
    label: "I feel overwhelmed by my finances",
    pain: "Income, bills, debt, savings, family needs, and goals can all compete for attention at the same time.",
    help: "CLARA helps turn the noise into clearer priorities so you can focus on the next decision instead of everything at once.",
  },
  {
    id: "inconsistent-budgeting",
    label: "I know how to budget, but I can’t stay consistent",
    pain: "Knowing what to do does not always make it easy to keep doing it when life gets busy or motivation disappears.",
    help: "CLARA brings budgeting back into everyday decisions through repetition, reminders, and accountability.",
  },
  {
    id: "start-business",
    label: "I want to start a business",
    pain: "Starting something new requires risk, but it can be hard to know how much financial risk your current life can carry.",
    help: "CLARA helps you protect essentials and understand how much room you have before committing money to the opportunity.",
  },
  {
    id: "career-change",
    label: "I’m considering a career change",
    pain: "A better opportunity can still feel dangerous when it might temporarily reduce or interrupt stable income.",
    help: "CLARA helps you prepare the financial breathing room that can make the transition safer.",
  },
  {
    id: "pursue-dream",
    label: "I want more room to pursue a bigger goal or dream",
    pain: "When every peso is already committed to survival, opportunities can feel impossible even when they could improve your future.",
    help: "CLARA helps build financial breathing room for goals, learning, opportunities, and calculated risks.",
  },
];

function readSavedSituationId() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(MONEY_SITUATION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function rememberSituationId(id) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MONEY_SITUATION_STORAGE_KEY, id);
  } catch {
    // This interaction should still work even when local storage is unavailable.
  }
}

export default function MoneySituationScreen() {
  const reduceMotion = useReducedMotion();
  const [selectedId, setSelectedId] = useState(readSavedSituationId);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selected = useMemo(
    () => MONEY_SITUATIONS.find((item) => item.id === selectedId) || null,
    [selectedId]
  );

  const selectSituation = (id) => {
    setSelectedId(id);
    rememberSituationId(id);
    setSelectorOpen(false);
  };

  return (
    <>
      <style>{`
        .clara-onboarding-situation-screen {
          justify-content: center;
        }

        .clara-onboarding-situation-title {
          max-width: 370px;
          margin-top: 22px;
          font-size: clamp(1.9rem, 8.2vw, 2.38rem);
        }

        .clara-onboarding-situation-intro {
          max-width: 342px;
          margin-top: 14px;
        }

        .clara-onboarding-situation-trigger {
          width: 100%;
          max-width: 380px;
          min-height: 58px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 30px;
          align-items: center;
          gap: 12px;
          margin-top: 25px;
          padding: 13px 14px 13px 17px;
          border: 1px solid rgba(89, 147, 255, .22) !important;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(18, 42, 83, .52), rgba(7, 18, 40, .66)) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 16px 40px rgba(0,0,0,.14) !important;
          color: #f8fbff;
          text-align: left;
          outline: none;
        }

        .clara-onboarding-situation-trigger-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .clara-onboarding-situation-trigger-kicker {
          color: rgba(151, 193, 255, .62);
          font-size: 9px;
          line-height: 1;
          font-weight: 720;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .clara-onboarding-situation-trigger-label {
          color: ${selected ? "#f8fbff" : "rgba(239,245,255,.62)"};
          font-size: 12.5px;
          line-height: 1.42;
          font-weight: ${selected ? "650" : "520"};
          letter-spacing: -.012em;
        }

        .clara-onboarding-situation-trigger-icon {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(126, 172, 246, .15);
          border-radius: 10px;
          color: #8abaff;
          background: rgba(59, 130, 246, .06);
        }

        .clara-onboarding-situation-trigger-icon svg { width: 16px; height: 16px; }

        .clara-onboarding-situation-board {
          width: 100%;
          max-width: 380px;
          margin-top: 17px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, .085);
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(11, 27, 57, .74), rgba(5, 14, 33, .82));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 18px 44px rgba(0,0,0,.14);
          text-align: left;
        }

        .clara-onboarding-situation-board-section {
          padding: 15px 17px;
        }

        .clara-onboarding-situation-board-section--clara {
          border-top: 1px solid rgba(92, 146, 230, .12);
          background: linear-gradient(180deg, rgba(31, 87, 191, .055), rgba(8, 25, 57, .025));
        }

        .clara-onboarding-situation-board-kicker {
          margin: 0;
          color: rgba(238, 245, 255, .36);
          font-size: 8.5px;
          line-height: 1;
          font-weight: 760;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .clara-onboarding-situation-board-section--clara .clara-onboarding-situation-board-kicker {
          color: #82b6ff;
        }

        .clara-onboarding-situation-board-title {
          margin: 8px 0 0;
          color: rgba(249, 252, 255, .92);
          font-size: 13px;
          line-height: 1.35;
          font-weight: 680;
          letter-spacing: -.016em;
        }

        .clara-onboarding-situation-board-copy {
          margin: 7px 0 0;
          color: rgba(238, 245, 255, .56);
          font-size: 11.5px;
          line-height: 1.58;
          font-weight: 450;
          letter-spacing: -.006em;
        }

        .clara-onboarding-situation-sheet-shell {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 18px;
          background: rgba(1, 4, 13, .72);
          backdrop-filter: blur(8px);
        }

        .clara-onboarding-situation-sheet {
          width: 100%;
          max-width: 430px;
          max-height: min(72dvh, 620px);
          display: flex;
          min-height: 0;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(111, 160, 236, .17);
          border-radius: 26px;
          background: linear-gradient(180deg, #08152c 0%, #040b1c 100%);
          box-shadow: 0 30px 90px rgba(0,0,0,.56), inset 0 1px 0 rgba(255,255,255,.055);
        }

        .clara-onboarding-situation-sheet-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 18px 14px;
          border-bottom: 1px solid rgba(255,255,255,.065);
        }

        .clara-onboarding-situation-sheet-eyebrow {
          margin: 0;
          color: #83b7ff;
          font-size: 8.5px;
          line-height: 1;
          font-weight: 760;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .clara-onboarding-situation-sheet-title {
          margin: 7px 0 0;
          color: #fbfdff;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 680;
          letter-spacing: -.028em;
        }

        .clara-onboarding-situation-sheet-close {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.09) !important;
          border-radius: 12px;
          background: rgba(255,255,255,.035) !important;
          color: rgba(244,248,255,.68);
          outline: none;
        }

        .clara-onboarding-situation-sheet-close svg { width: 17px; height: 17px; }

        .clara-onboarding-situation-options {
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 9px 10px 16px;
          scrollbar-width: none;
        }

        .clara-onboarding-situation-options::-webkit-scrollbar { display: none; }

        .clara-onboarding-situation-option {
          width: 100%;
          min-height: 52px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 28px;
          align-items: center;
          gap: 12px;
          padding: 11px 10px 11px 12px;
          border: 0 !important;
          border-bottom: 1px solid rgba(255,255,255,.052) !important;
          border-radius: 12px;
          background: transparent !important;
          color: rgba(242,247,255,.72);
          text-align: left;
          outline: none;
        }

        .clara-onboarding-situation-option.is-selected {
          background: rgba(40, 108, 237, .10) !important;
          color: #f8fbff;
        }

        .clara-onboarding-situation-option-label {
          font-size: 12px;
          line-height: 1.42;
          font-weight: 570;
          letter-spacing: -.01em;
        }

        .clara-onboarding-situation-option-check {
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(120, 166, 239, .12);
          border-radius: 9px;
          color: transparent;
        }

        .clara-onboarding-situation-option.is-selected .clara-onboarding-situation-option-check {
          border-color: rgba(92, 152, 255, .28);
          color: #8fc0ff;
          background: rgba(43, 117, 255, .10);
        }

        .clara-onboarding-situation-option-check svg { width: 15px; height: 15px; }

        @media (max-height: 760px) {
          .clara-onboarding-situation-title { margin-top: 17px; font-size: clamp(1.72rem, 7.4vw, 2.08rem); }
          .clara-onboarding-situation-intro { margin-top: 11px; }
          .clara-onboarding-situation-trigger { margin-top: 17px; min-height: 53px; }
          .clara-onboarding-situation-board { margin-top: 12px; }
          .clara-onboarding-situation-board-section { padding: 12px 15px; }
          .clara-onboarding-situation-board-copy { font-size: 11px; line-height: 1.48; }
        }

        @media (prefers-reduced-motion: reduce) {
          .clara-onboarding-situation-trigger,
          .clara-onboarding-situation-option,
          .clara-onboarding-situation-sheet-close {
            transition: none !important;
          }
        }
      `}</style>

      <div className="clara-onboarding-screen clara-onboarding-screen--dense clara-onboarding-situation-screen">
        <span className="clara-onboarding-eyebrow clara-onboarding-eyebrow--gold">
          Now make it personal
        </span>
        <h1 className="clara-onboarding-title clara-onboarding-situation-title">
          What money situation feels heaviest for you right now?
        </h1>
        <p className="clara-onboarding-body clara-onboarding-situation-intro">
          Choose the one that feels most important today. <ClaraBrandName /> will show you where it can help.
        </p>

        <button
          type="button"
          className="clara-onboarding-situation-trigger"
          onClick={() => setSelectorOpen(true)}
          aria-expanded={selectorOpen}
          aria-haspopup="dialog"
        >
          <span className="clara-onboarding-situation-trigger-copy">
            <span className="clara-onboarding-situation-trigger-kicker">
              {selected ? "Your situation" : "Choose one"}
            </span>
            <span className="clara-onboarding-situation-trigger-label">
              {selected?.label || "Choose your current money situation"}
            </span>
          </span>
          <span className="clara-onboarding-situation-trigger-icon" aria-hidden="true">
            <ChevronDown />
          </span>
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.div
              key={selected.id}
              className="clara-onboarding-situation-board"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 9, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.995 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <section className="clara-onboarding-situation-board-section">
                <p className="clara-onboarding-situation-board-kicker">Your current reality</p>
                <p className="clara-onboarding-situation-board-title">{selected.label}</p>
                <p className="clara-onboarding-situation-board-copy">{selected.pain}</p>
              </section>
              <section className="clara-onboarding-situation-board-section clara-onboarding-situation-board-section--clara">
                <p className="clara-onboarding-situation-board-kicker">How CLARA can help</p>
                <p className="clara-onboarding-situation-board-copy">{selected.help}</p>
              </section>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectorOpen ? (
          <motion.div
            className="clara-onboarding-situation-sheet-shell"
            role="presentation"
            onClick={() => setSelectorOpen(false)}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
          >
            <motion.section
              className="clara-onboarding-situation-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Choose your current money situation"
              onClick={(event) => event.stopPropagation()}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className="clara-onboarding-situation-sheet-header">
                <div>
                  <p className="clara-onboarding-situation-sheet-eyebrow">Your money reality</p>
                  <h2 className="clara-onboarding-situation-sheet-title">Choose one situation</h2>
                </div>
                <button
                  type="button"
                  className="clara-onboarding-situation-sheet-close"
                  onClick={() => setSelectorOpen(false)}
                  aria-label="Close situation selector"
                >
                  <X />
                </button>
              </header>

              <div className="clara-onboarding-situation-options">
                {MONEY_SITUATIONS.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`clara-onboarding-situation-option ${isSelected ? "is-selected" : ""}`}
                      onClick={() => selectSituation(item.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="clara-onboarding-situation-option-label">{item.label}</span>
                      <span className="clara-onboarding-situation-option-check" aria-hidden="true">
                        {isSelected ? <Check /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
