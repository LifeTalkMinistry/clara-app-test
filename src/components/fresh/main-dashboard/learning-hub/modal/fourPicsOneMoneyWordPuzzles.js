const WORD_TYPE = {
  core: { label: "Core Word", icon: "🧩" },
  challenge: { label: "Challenge Word", icon: "⚡" },
  boss: { label: "Boss Word", icon: "👑" },
};

const STAGE_HEADER_FALLBACK_LINE = "You can’t improve what you don’t notice.";

const STAGE_BLUEPRINTS = [
  {
    name: "Money Awareness",
    world: "Awareness",
    icon: "👁️",
    hint: "Start by recognizing what the money word means in real life.",
    lesson: "see what money is doing before making decisions",
    headerLine: "You can’t control money you don’t notice.",
    words: [
      ["Income", "Money coming in from work, business, or support."],
      ["Expense", "Money going out for needs, wants, or obligations."],
      ["Budget", "A plan that gives money a job before spending."],
      ["Savings", "Money kept instead of spent right away."],
      ["Wallet", "The place where spendable money is held."],
      ["Cash Flow", "Money moving in and out during the month."],
      ["Balance", "The amount left after money moves."],
      ["Transaction", "A recorded money movement."],
      ["Category", "A label that groups similar spending."],
      ["Money Awareness", "Knowing what your money is doing."],
    ],
  },
  {
    name: "Money Tracking",
    world: "Awareness",
    icon: "🧾",
    hint: "Follow the trail so spending stops hiding in memory.",
    lesson: "follow where money goes and spot patterns early",
    headerLine: "Money becomes clearer when every peso leaves a trail.",
    words: [
      ["Receipt", "Proof of a purchase or payment."],
      ["Spending Log", "A written trail of where money goes."],
      ["Expense Record", "A saved note of money spent."],
      ["Daily Spending", "The money used during one day."],
      ["Money Trail", "The path money leaves after each choice."],
      ["Category Check", "Reviewing if spending is labeled correctly."],
      ["Wallet Check", "Looking at remaining spendable money."],
      ["Spending Pattern", "A repeated way money disappears."],
      ["Monthly Review", "Looking back at the month’s money behavior."],
      ["Money Tracking", "Watching money movement consistently."],
    ],
  },
  {
    name: "Budget Basics",
    world: "Awareness",
    icon: "📋",
    hint: "Build the plan before emotion gets a vote.",
    lesson: "give each peso direction before spending starts",
    headerLine: "A plan gives your money direction before emotion spends it.",
    words: [
      ["Budget Plan", "The full plan for income, bills, spending, and saving."],
      ["Allocation", "Money assigned to a specific purpose."],
      ["Spending Limit", "The maximum amount allowed for a category."],
      ["Bills First", "Protecting essentials before wants."],
      ["Fixed Expense", "A cost that is usually the same every period."],
      ["Variable Expense", "A cost that changes depending on behavior."],
      ["Cash Envelope", "Separated money for one spending area."],
      ["Budget Gap", "The shortage between planned money and real money."],
      ["Budget Reset", "Adjusting the plan when reality changes."],
      ["Budget Basics", "The foundation of giving money clear direction."],
    ],
  },
  {
    name: "Needs vs Wants",
    world: "Awareness",
    icon: "⚖️",
    hint: "Train the user to separate survival, responsibility, and desire.",
    lesson: "separate necessities from desires before choosing",
    headerLine: "Clear priorities protect needs before wants get loud.",
    words: [
      ["Need", "Something important for basic life or responsibility."],
      ["Want", "Something nice to have but not required."],
      ["Priority", "The choice that must come first."],
      ["Trade Off", "Giving up one thing to protect another."],
      ["Sacrifice", "Letting go of a lower priority for a higher one."],
      ["Practical Choice", "A decision that fits real life, not just emotion."],
      ["Essential", "Something necessary and hard to skip."],
      ["Impulse Want", "A desire that appears suddenly and pushes spending."],
      ["Value Choice", "Choosing based on usefulness, not pressure."],
      ["Needs vs Wants", "The discipline of separating must-have from nice-to-have."],
    ],
  },
  {
    name: "Payday Control",
    world: "Control",
    icon: "💼",
    hint: "Protect salary before the month starts pulling it apart.",
    lesson: "protect income before quick spending takes over",
    headerLine: "Payday works better when the plan starts before spending.",
    words: [
      ["Payday", "The day income arrives."],
      ["Salary", "Regular income from work."],
      ["First Cut", "The first protected split for bills or savings."],
      ["Payday Plan", "A plan made before salary is spent."],
      ["Allowance", "A controlled amount for daily or weekly spending."],
      ["Pay Cycle", "The income schedule between paydays."],
      ["Salary Split", "Dividing income into clear purposes."],
      ["Payday Leak", "Money disappearing quickly after payday."],
      ["Payday Rule", "A personal rule that protects salary."],
      ["Payday Control", "Managing income before spending takes over."],
    ],
  },
  {
    name: "Spending Discipline",
    world: "Control",
    icon: "🧠",
    hint: "Slow the purchase down so the user can choose, not react.",
    lesson: "pause before buying and stay within safe limits",
    headerLine: "The pause before spending protects the money after payday.",
    words: [
      ["Self Control", "The ability to stop even when spending is tempting."],
      ["Delay", "Waiting before buying to reduce impulse."],
      ["Purchase Check", "A quick review before paying."],
      ["Spending Pause", "A moment of control before checkout."],
      ["No Spend Day", "A day intentionally protected from unnecessary spending."],
      ["Limit", "A boundary that spending should not cross."],
      ["Discipline", "Following the plan even when desire is loud."],
      ["Impulse Buy", "A purchase made too quickly."],
      ["Overspending", "Spending beyond the safe amount."],
      ["Spending Discipline", "The habit of controlling purchases before they control you."],
    ],
  },
  {
    name: "Emotional Spending",
    world: "Control",
    icon: "❤️‍🔥",
    hint: "Notice when feelings are using the wallet as an escape door.",
    lesson: "separate real needs from temporary feelings",
    headerLine: "Feelings get expensive when the wallet becomes the escape.",
    words: [
      ["Stress Spending", "Buying because pressure feels heavy."],
      ["Retail Therapy", "Shopping to feel better for a short moment."],
      ["Deserve Ko To", "A reward excuse that can bypass the budget."],
      ["Spending Trigger", "A feeling or situation that pushes spending."],
      ["Insecurity", "Feeling not enough and trying to buy confidence."],
      ["Boredom Spend", "Spending because nothing feels exciting."],
      ["Comfort Buy", "Buying something to calm emotion."],
      ["Emotional Leak", "Money lost through unmanaged feelings."],
      ["Mood Purchase", "A purchase caused by temporary emotion."],
      ["Emotional Spending", "Using money to answer feelings instead of needs."],
    ],
  },
  {
    name: "Money Leaks",
    world: "Control",
    icon: "💧",
    hint: "Find the small holes before they drain the month.",
    lesson: "find small drains before they weaken your budget",
    headerLine: "Small leaks stay small only when you notice them early.",
    words: [
      ["Money Leak", "A small repeated drain that slowly weakens the budget."],
      ["Subscription", "A recurring payment that can be forgotten."],
      ["Hidden Cost", "A cost that is not obvious at first."],
      ["Small Expense", "A tiny spend that can pile up."],
      ["Convenience Fee", "Extra money paid for easier access or speed."],
      ["Food Delivery", "Convenient meals that can quietly drain money."],
      ["Random Checkout", "A checkout that was not planned."],
      ["Unused Service", "Something paid for but rarely used."],
      ["Lifestyle Creep", "Spending rising as income rises."],
      ["Leak Audit", "A focused search for where money is escaping."],
    ],
  },
  {
    name: "Bills and Obligations",
    world: "Protection",
    icon: "🏠",
    hint: "Protect responsibilities before optional spending speaks.",
    lesson: "protect essential responsibilities before flexible spending",
    headerLine: "Essentials stay safe when bills are handled before wants.",
    words: [
      ["Rent", "A regular payment for a place to live."],
      ["Utilities", "Essential services like power, water, or internet."],
      ["Due Date", "The date a payment must be made."],
      ["Obligation", "Money responsibility that must be honored."],
      ["Monthly Bills", "Regular expenses that return each month."],
      ["Payment Schedule", "A timeline for when bills must be paid."],
      ["Penalty", "An extra cost for missing a rule or deadline."],
      ["Late Fee", "An added charge for paying too late."],
      ["Bill Buffer", "Extra money kept to protect bill payments."],
      ["Bills First", "Prioritizing obligations before flexible spending."],
    ],
  },
  {
    name: "Debt Awareness",
    world: "Protection",
    icon: "⛓️",
    hint: "Understand borrowed money before it becomes normal pressure.",
    lesson: "understand borrowing costs and repayment pressure",
    headerLine: "Debt becomes dangerous when you stop tracking its weight.",
    words: [
      ["Debt", "Money owed to someone else."],
      ["Loan", "Borrowed money that must be repaid."],
      ["Interest", "Extra cost paid for borrowing money."],
      ["Credit", "Access to borrowed spending power."],
      ["Installment", "A scheduled payment split into parts."],
      ["Principal", "The original borrowed amount before interest."],
      ["Balance", "The amount still owed or remaining."],
      ["Minimum Payment", "The smallest required debt payment."],
      ["Borrowing Cost", "The real price of using borrowed money."],
      ["Debt Awareness", "Knowing what debt means before using it."],
    ],
  },
  {
    name: "Debt Control",
    world: "Protection",
    icon: "🧯",
    hint: "Turn debt from a pressure cycle into a controlled plan.",
    lesson: "reduce debt with a clear payment plan",
    headerLine: "Debt loses power when every payment follows a plan.",
    words: [
      ["Payoff Plan", "A clear plan for reducing what is owed."],
      ["Debt Snowball", "Paying smaller debts first for momentum."],
      ["Debt Avalanche", "Paying high-interest debts first for savings."],
      ["Payment Priority", "Choosing which debt payment comes first."],
      ["Credit Limit", "The maximum amount available to borrow."],
      ["Debt Cycle", "Repeated borrowing and repayment pressure."],
      ["Late Payment", "A payment made after the due date."],
      ["Debt Stress", "Pressure caused by unpaid obligations."],
      ["Debt Free Goal", "A target to fully clear debt."],
      ["Debt Control", "Managing debt with a plan instead of panic."],
    ],
  },
  {
    name: "Emergency Protection",
    world: "Protection",
    icon: "🛡️",
    hint: "Build defense before life surprises the wallet.",
    lesson: "prepare for urgent costs without relying on debt",
    headerLine: "Prepared money turns surprise expenses into manageable moments.",
    words: [
      ["Emergency Fund", "Protected money for urgent needs."],
      ["Safety Net", "A backup that catches the user during pressure."],
      ["Buffer", "Extra money that creates breathing room."],
      ["Urgent Need", "A real need that cannot wait."],
      ["Protection Money", "Money kept to defend stability."],
      ["Medical Cost", "Health-related money pressure."],
      ["Repair Fund", "Money set aside for fixing important things."],
      ["Job Loss Fund", "Backup money if income suddenly stops."],
      ["Crisis Fund", "Money reserved for serious unexpected events."],
      ["Emergency Protection", "The discipline of preparing before pressure arrives."],
    ],
  },
  {
    name: "Safe Spending",
    world: "Protection",
    icon: "✅",
    hint: "Teach spending to pass through safety checks first.",
    lesson: "confirm a purchase fits your budget and balance",
    headerLine: "Spending feels safer when the money is already protected.",
    words: [
      ["Safe Spending", "A purchase that fits the real money situation."],
      ["Budget Fit", "When spending matches the assigned budget."],
      ["Remaining Balance", "The amount still available after spending."],
      ["Covered Expense", "A cost already planned and funded."],
      ["Spending Approval", "A green light after checking the budget."],
      ["Green Light", "A sign that spending is safe enough."],
      ["Red Flag", "A warning that spending may create pressure."],
      ["Wallet Impact", "How a purchase affects available money."],
      ["Affordability Check", "Testing if a purchase is truly safe."],
      ["Safe Spending Rule", "The rule that spending must pass before checkout."],
    ],
  },
  {
    name: "Saving Goals",
    world: "Growth",
    icon: "🎯",
    hint: "Give savings a reason so it does not disappear back into spending.",
    lesson: "save with a clear amount, purpose, and deadline",
    headerLine: "Savings grow faster when every peso has a purpose.",
    words: [
      ["Goal", "A clear financial target."],
      ["Target Amount", "The exact money needed for the goal."],
      ["Deadline", "The date the goal should be reached."],
      ["Progress", "How far the user has moved toward the target."],
      ["Sinking Fund", "Savings for a known future expense."],
      ["Goal Fund", "Money separated for one specific goal."],
      ["Saving Habit", "Regularly keeping money for the future."],
      ["Milestone", "A smaller win inside a bigger goal."],
      ["Future Purchase", "Something planned before buying."],
      ["Saving Goals", "Saving with purpose, amount, and direction."],
    ],
  },
  {
    name: "Cash Flow Mastery",
    world: "Growth",
    icon: "🔄",
    hint: "Understand the timing and movement of the whole month.",
    lesson: "manage money timing across the full month",
    headerLine: "Money feels clearer when you know where it moves.",
    words: [
      ["Inflow", "Money entering the user’s system."],
      ["Outflow", "Money leaving the user’s system."],
      ["Monthly Cycle", "The repeated money rhythm of the month."],
      ["Cash Flow Map", "A picture of how money moves."],
      ["Surplus", "Money left after obligations and spending."],
      ["Shortfall", "When money is not enough for the plan."],
      ["Timing Gap", "A mismatch between income and due dates."],
      ["Cash Cushion", "Extra money that softens timing pressure."],
      ["Money Movement", "The flow of money through categories."],
      ["Cash Flow Mastery", "Understanding and controlling money movement."],
    ],
  },
  {
    name: "Income Growth",
    world: "Growth",
    icon: "📈",
    hint: "Grow the source, not only the discipline.",
    lesson: "notice earning opportunities beyond your main income",
    headerLine: "More income works best when value grows with it.",
    words: [
      ["Side Hustle", "Extra work that creates additional income."],
      ["Freelance", "Paid work offered independently."],
      ["Commission", "Income earned from results or sales."],
      ["Business Income", "Money earned from a business activity."],
      ["Extra Income", "Money added beyond the main source."],
      ["Skill Income", "Income connected to a useful ability."],
      ["Passive Income", "Income that does not require constant active work."],
      ["Income Stream", "One source of money coming in."],
      ["Upsell", "Earning more by offering a higher-value option."],
      ["Income Growth", "Increasing the money coming in."],
    ],
  },
  {
    name: "Skill and Value",
    world: "Growth",
    icon: "🛠️",
    hint: "Connect money growth to usefulness, trust, and capability.",
    lesson: "connect skills to trust, value, and earning power",
    headerLine: "Strong skills turn effort into earning power.",
    words: [
      ["Skill", "An ability that can create value."],
      ["Value", "Usefulness that people are willing to reward."],
      ["Promotion", "A higher role or responsibility at work."],
      ["Productivity", "Creating useful output with time and effort."],
      ["Career Growth", "Improving work position or earning potential."],
      ["Work Quality", "How good and reliable the output is."],
      ["Reliability", "Being trusted to deliver consistently."],
      ["High Value", "Being useful enough to be hard to ignore."],
      ["Personal Brand", "The reputation connected to a person’s value."],
      ["Skill Leverage", "Using skill to multiply opportunity."],
    ],
  },
  {
    name: "Asset vs Liability",
    world: "Wealth",
    icon: "🏦",
    hint: "Separate what builds value from what quietly drains it.",
    lesson: "see what builds value and what drains money",
    headerLine: "Wealth grows when money builds more than it drains.",
    words: [
      ["Asset", "Something that can hold or create value."],
      ["Liability", "Something that takes money out or creates obligation."],
      ["Appreciation", "Value increasing over time."],
      ["Depreciation", "Value decreasing over time."],
      ["Ownership", "Having legal or practical control of something."],
      ["Equity", "Owned value after obligations are removed."],
      ["Resale Value", "The possible value when something is sold again."],
      ["Cash Producing Asset", "Something that can create income."],
      ["Money Drain", "Something that repeatedly pulls money away."],
      ["Asset vs Liability", "Knowing what builds value and what drains value."],
    ],
  },
  {
    name: "Inflation and Buying Power",
    world: "Wealth",
    icon: "🎈",
    hint: "Understand why the same money can feel weaker over time.",
    lesson: "plan around rising prices and weaker buying power",
    headerLine: "Rising prices require sharper spending decisions.",
    words: [
      ["Inflation", "Prices rising while money buys less."],
      ["Price Increase", "A higher cost for the same item or service."],
      ["Buying Power", "What money can actually purchase."],
      ["Cost of Living", "The price of basic daily life."],
      ["Real Value", "Value after considering price changes."],
      ["Shrinkflation", "Getting less product for the same or higher price."],
      ["Price Watch", "Paying attention to changing prices."],
      ["Budget Pressure", "Stress placed on the budget by rising costs."],
      ["Value Drop", "When money or an item becomes worth less."],
      ["Inflation Defense", "Actions that protect money from rising prices."],
    ],
  },
  {
    name: "Wealth Building",
    world: "Wealth",
    icon: "🏆",
    hint: "Move from survival to long-term financial strength.",
    lesson: "build long-term strength through habits and assets",
    headerLine: "Wealth grows through protected habits, not random leftovers.",
    words: [
      ["Investment", "Money placed with the goal of future growth."],
      ["Net Worth", "Total assets minus total liabilities."],
      ["Capital", "Money or resources used to build more value."],
      ["Compound Growth", "Growth that builds on previous growth."],
      ["Portfolio", "A collection of investments or assets."],
      ["Diversification", "Spreading risk across different places."],
      ["Long Term Plan", "A financial direction built beyond today."],
      ["Financial Freedom", "Having enough stability and options to choose freely."],
      ["Wealth Habit", "A repeated action that supports long-term growth."],
      ["Wealth Building", "The process of creating long-term financial strength."],
    ],
  },
];

function normalizeAnswer(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getWordType(wordIndex) {
  if (wordIndex === 9) return WORD_TYPE.boss;
  if (wordIndex >= 7) return WORD_TYPE.challenge;
  return WORD_TYPE.core;
}

function buildClues({ stage, answer, clue, wordIndex }) {
  const wordType = getWordType(wordIndex);
  const letterCount = normalizeAnswer(answer).length;

  return [
    { icon: stage.icon, label: stage.name },
    { icon: wordType.icon, label: wordType.label },
    { icon: "🔎", label: clue },
    { icon: "🔤", label: `${letterCount} letters` },
  ];
}

function makeDefinitionPhrase(clue) {
  const cleaned = String(clue || "")
    .trim()
    .replace(/[.]+$/g, "")
    .replace(/\bthe user’s\b/gi, "your")
    .replace(/\bthe user's\b/gi, "your")
    .replace(/\buser’s\b/gi, "your")
    .replace(/\buser's\b/gi, "your")
    .replace(/\bthe user\b/gi, "you");

  if (!cleaned) return "a money concept";
  return `${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
}

function makeBenefitPhrase(stage) {
  const benefit = String(stage?.lesson || "make clearer financial choices")
    .trim()
    .replace(/[.]+$/g, "");

  return benefit || "make clearer financial choices";
}

function buildPuzzleLesson({ answer, clue, stage }) {
  return `${answer} is ${makeDefinitionPhrase(clue)}. It helps you ${makeBenefitPhrase(stage)}.`;
}

export const STAGES = STAGE_BLUEPRINTS.map((stage, stageIndex) => ({
  ...stage,
  headerLine: stage.headerLine || STAGE_HEADER_FALLBACK_LINE,
  stageNumber: stageIndex + 1,
  totalStages: STAGE_BLUEPRINTS.length,
  wordCount: stage.words.length,
}));

export const PUZZLES = STAGES.flatMap((stage, stageIndex) => (
  stage.words.map(([answer, clue], wordIndex) => {
    const wordType = getWordType(wordIndex);

    return {
      id: `stage-${stageIndex + 1}-${slugify(answer)}`,
      answer,
      hint: clue,
      lesson: buildPuzzleLesson({ answer, clue, stage }),
      clues: buildClues({ stage, answer, clue, wordIndex }),
      stageIndex,
      stageNumber: stageIndex + 1,
      totalStages: STAGE_BLUEPRINTS.length,
      stageName: stage.name,
      stageHeaderLine: stage.headerLine || STAGE_HEADER_FALLBACK_LINE,
      world: stage.world,
      stageIcon: stage.icon,
      stagePuzzleIndex: wordIndex,
      stageWordCount: stage.words.length,
      wordType: wordType.label,
    };
  })
));
