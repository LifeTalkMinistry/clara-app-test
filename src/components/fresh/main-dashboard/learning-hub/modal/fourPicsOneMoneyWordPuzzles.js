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
      ["Income", "Money coming in from work, business, or support.", "know how much money you can plan around"],
      ["Expense", "Money going out for needs, wants, or obligations.", "see what reduces your available money each month"],
      ["Budget", "A plan that gives money a job before spending.", "decide what to spend, save, and protect first"],
      ["Savings", "Money kept instead of spent right away.", "prepare for future needs without using debt"],
      ["Wallet", "The place where spendable money is held.", "know how much spendable money is still available"],
      ["Cash Flow", "Money moving in and out during the month.", "see whether money timing supports your month"],
      ["Balance", "The amount left after money moves.", "check what remains before making another money move"],
      ["Transaction", "A recorded money movement.", "trace each money movement clearly and accurately"],
      ["Category", "A label that groups similar spending.", "group similar spending so patterns become easier to see"],
      ["Money Awareness", "Knowing what your money is doing.", "notice what money is doing before decisions become rushed"],
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
      ["Receipt", "Proof of a purchase or payment.", "confirm purchases instead of relying on memory"],
      ["Spending Log", "A written trail of where money goes.", "track small choices before they become invisible"],
      ["Expense Record", "A saved note of money spent.", "save spending details for clearer reviews later"],
      ["Daily Spending", "The money used during one day.", "notice today’s money use before it piles up"],
      ["Money Trail", "The path money leaves after each choice.", "see where money went and spot repeated leaks"],
      ["Category Check", "Reviewing if spending is labeled correctly.", "correct labels so reports show the real pattern"],
      ["Wallet Check", "Looking at remaining spendable money.", "check remaining cash before choosing another purchase"],
      ["Spending Pattern", "A repeated way money disappears.", "spot repeated habits that quietly shape your budget"],
      ["Monthly Review", "Looking back at the month’s money behavior.", "compare the month’s choices before planning again"],
      ["Money Tracking", "Watching money movement consistently.", "keep money movement visible instead of guessed"],
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
      ["Budget Plan", "The full plan for income, bills, spending, and saving.", "keep income, bills, spending, and saving organized"],
      ["Allocation", "Money assigned to a specific purpose.", "assign money to a purpose before it gets used elsewhere"],
      ["Spending Limit", "The maximum amount allowed for a category.", "keep category spending within a safe amount"],
      ["Bills First", "Protecting essentials before wants.", "protect essentials before optional spending takes over"],
      ["Fixed Expense", "A cost that is usually the same every period.", "prepare for costs that return with little change"],
      ["Variable Expense", "A cost that changes depending on behavior.", "adjust flexible costs when real life changes"],
      ["Cash Envelope", "Separated money for one spending area.", "separate spendable money so one category stays controlled"],
      ["Budget Gap", "The shortage between planned money and real money.", "spot shortages before the plan breaks"],
      ["Budget Reset", "Adjusting the plan when reality changes.", "update the plan when reality no longer matches"],
      ["Budget Basics", "The foundation of giving money clear direction.", "give every peso direction before spending begins"],
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
      ["Need", "Something important for basic life or responsibility.", "protect essentials before optional spending grows"],
      ["Want", "Something nice to have but not required.", "separate desire from real responsibility"],
      ["Priority", "The choice that must come first.", "decide what must come first when money is limited"],
      ["Trade Off", "Giving up one thing to protect another.", "choose what to give up when priorities compete"],
      ["Sacrifice", "Letting go of a lower priority for a higher one.", "release lower priorities to protect the important ones"],
      ["Practical Choice", "A decision that fits real life, not just emotion.", "match decisions with real money"],
      ["Essential", "Something necessary and hard to skip.", "identify costs that are difficult or risky to skip"],
      ["Impulse Want", "A desire that appears suddenly and pushes spending.", "pause sudden desires before they pull money away"],
      ["Value Choice", "Choosing based on usefulness, not pressure.", "pick useful options instead of pressure-based spending"],
      ["Needs vs Wants", "The discipline of separating must-have from nice-to-have.", "separate essentials from nice-to-have choices"],
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
      ["Payday", "The day income arrives.", "plan income before fast spending starts"],
      ["Salary", "Regular income from work.", "know the regular money your month depends on"],
      ["First Cut", "The first protected split for bills or savings.", "protect bills or savings before flexible spending begins"],
      ["Payday Plan", "A plan made before salary is spent.", "assign salary before quick spending takes over"],
      ["Allowance", "A controlled amount for daily or weekly spending.", "control daily spending without touching protected money"],
      ["Pay Cycle", "The income schedule between paydays.", "match spending plans to the next income date"],
      ["Salary Split", "Dividing income into clear purposes.", "divide income clearly before money gets mixed"],
      ["Payday Leak", "Money disappearing quickly after payday.", "spot where salary disappears soon after arrival"],
      ["Payday Rule", "A personal rule that protects salary.", "follow a simple boundary when salary arrives"],
      ["Payday Control", "Managing income before spending takes over.", "manage income before the month pulls it apart"],
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
      ["Self Control", "The ability to stop even when spending is tempting.", "stop a purchase when the plan says wait"],
      ["Delay", "Waiting before buying to reduce impulse.", "create space before buying decisions become permanent"],
      ["Purchase Check", "A quick review before paying.", "review purpose, price, and budget before paying"],
      ["Spending Pause", "A moment of control before checkout.", "slow down checkout before emotion decides"],
      ["No Spend Day", "A day intentionally protected from unnecessary spending.", "protect one day from unnecessary purchases"],
      ["Limit", "A boundary that spending should not cross.", "keep spending inside a safe boundary"],
      ["Discipline", "Following the plan even when desire is loud.", "follow the money plan even when desire is strong"],
      ["Impulse Buy", "A purchase made too quickly.", "catch rushed purchases before they create pressure"],
      ["Overspending", "Spending beyond the safe amount.", "notice when spending goes beyond the safe amount"],
      ["Spending Discipline", "The habit of controlling purchases before they control you.", "review purchases before they cross the plan"],
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
      ["Stress Spending", "Buying because pressure feels heavy.", "notice pressure before it turns into purchases"],
      ["Retail Therapy", "Shopping to feel better for a short moment.", "separate short comfort from real money needs"],
      ["Deserve Ko To", "A reward excuse that can bypass the budget.", "check reward spending before it bypasses the plan"],
      ["Spending Trigger", "A feeling or situation that pushes spending.", "identify feelings or situations that push spending"],
      ["Insecurity", "Feeling not enough and trying to buy confidence.", "avoid buying confidence that the purchase cannot provide"],
      ["Boredom Spend", "Spending because nothing feels exciting.", "spot empty-time spending before it becomes a habit"],
      ["Comfort Buy", "Buying something to calm emotion.", "notice emotional relief before paying for it"],
      ["Emotional Leak", "Money lost through unmanaged feelings.", "track money lost through unmanaged feelings"],
      ["Mood Purchase", "A purchase caused by temporary emotion.", "pause temporary emotions before they choose for you"],
      ["Emotional Spending", "Using money to answer feelings instead of needs.", "separate feelings from real financial needs"],
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
      ["Money Leak", "A small repeated drain that slowly weakens the budget.", "find repeated small drains before they grow"],
      ["Subscription", "A recurring payment that can be forgotten.", "review recurring charges before they become forgotten costs"],
      ["Hidden Cost", "A cost that is not obvious at first.", "spot extra costs before the purchase looks cheaper"],
      ["Small Expense", "A tiny spend that can pile up.", "track tiny spending before it piles up quietly"],
      ["Convenience Fee", "Extra money paid for easier access or speed.", "notice extra charges paid for speed or ease"],
      ["Food Delivery", "Convenient meals that can quietly drain money.", "compare convenience with the budget impact"],
      ["Random Checkout", "A checkout that was not planned.", "catch unplanned purchases before they drain cash"],
      ["Unused Service", "Something paid for but rarely used.", "cancel payments for things you rarely use"],
      ["Lifestyle Creep", "Spending rising as income rises.", "notice spending increases as income rises"],
      ["Leak Audit", "A focused search for where money is escaping.", "locate escaping money before the budget weakens"],
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
      ["Rent", "A regular payment for a place to live.", "prepare the housing payment before flexible spending"],
      ["Utilities", "Essential services like power, water, or internet.", "protect essential services by planning their payments"],
      ["Due Date", "The date a payment must be made.", "pay on time and avoid avoidable charges"],
      ["Obligation", "Money responsibility that must be honored.", "honor required payments before optional choices"],
      ["Monthly Bills", "Regular expenses that return each month.", "plan recurring responsibilities before the month starts"],
      ["Payment Schedule", "A timeline for when bills must be paid.", "track payment timing so bills are not missed"],
      ["Penalty", "An extra cost for missing a rule or deadline.", "avoid extra costs by following rules and deadlines"],
      ["Late Fee", "An added charge for paying too late.", "prevent added charges from paying too late"],
      ["Bill Buffer", "Extra money kept to protect bill payments.", "protect bill payments when timing gets tight"],
      ["Bills First", "Prioritizing obligations before flexible spending.", "handle required payments before flexible spending"],
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
      ["Debt", "Money owed to someone else.", "see money owed before borrowing feels normal"],
      ["Loan", "Borrowed money that must be repaid.", "understand repayment responsibility before taking borrowed money"],
      ["Interest", "Extra cost paid for borrowing money.", "recognize the extra price of borrowing"],
      ["Credit", "Access to borrowed spending power.", "use borrowing power without confusing it with income"],
      ["Installment", "A scheduled payment split into parts.", "plan smaller payments before they stack up"],
      ["Principal", "The original borrowed amount before interest.", "separate the original debt from added charges"],
      ["Balance", "The amount still owed or remaining.", "know what is still owed or available"],
      ["Minimum Payment", "The smallest required debt payment.", "avoid mistaking the smallest payment for progress"],
      ["Borrowing Cost", "The real price of using borrowed money.", "see the real price behind borrowed money"],
      ["Debt Awareness", "Knowing what debt means before using it.", "understand debt pressure before using borrowed money"],
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
      ["Payoff Plan", "A clear plan for reducing what is owed.", "reduce debt with clear steps and timing"],
      ["Debt Snowball", "Paying smaller debts first for momentum.", "clear smaller debts first to simplify repayment"],
      ["Debt Avalanche", "Paying high-interest debts first for savings.", "target costly debt first to reduce interest"],
      ["Payment Priority", "Choosing which debt payment comes first.", "choose which debt needs attention first"],
      ["Credit Limit", "The maximum amount available to borrow.", "know the boundary before borrowing more"],
      ["Debt Cycle", "Repeated borrowing and repayment pressure.", "spot repeated borrowing before it becomes normal"],
      ["Late Payment", "A payment made after the due date.", "prevent missed deadlines from adding pressure"],
      ["Debt Stress", "Pressure caused by unpaid obligations.", "notice repayment pressure before it affects choices"],
      ["Debt Free Goal", "A target to fully clear debt.", "focus payments toward a clear finish line"],
      ["Debt Control", "Managing debt with a plan instead of panic.", "manage repayment with structure instead of panic"],
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
      ["Emergency Fund", "Protected money for urgent needs.", "handle urgent needs without immediately borrowing"],
      ["Safety Net", "A backup that catches the user during pressure.", "cover pressure when income or expenses shift"],
      ["Buffer", "Extra money that creates breathing room.", "create room when timing or costs change"],
      ["Urgent Need", "A real need that cannot wait.", "separate true urgency from flexible wants"],
      ["Protection Money", "Money kept to defend stability.", "keep defense money away from daily spending"],
      ["Medical Cost", "Health-related money pressure.", "prepare for health expenses before they disrupt plans"],
      ["Repair Fund", "Money set aside for fixing important things.", "fix important things without breaking the budget"],
      ["Job Loss Fund", "Backup money if income suddenly stops.", "protect basic needs if income stops"],
      ["Crisis Fund", "Money reserved for serious unexpected events.", "reserve money for serious unexpected events"],
      ["Emergency Protection", "The discipline of preparing before pressure arrives.", "prepare before urgent costs force borrowing"],
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
      ["Safe Spending", "A purchase that fits the real money situation.", "confirm purchases fit your real money situation"],
      ["Budget Fit", "When spending matches the assigned budget.", "confirm spending matches the money already assigned"],
      ["Remaining Balance", "The amount still available after spending.", "know what stays available after a purchase"],
      ["Covered Expense", "A cost already planned and funded.", "use money that was already planned and funded"],
      ["Spending Approval", "A green light after checking the budget.", "check the budget before giving yourself a green light"],
      ["Green Light", "A sign that spending is safe enough.", "proceed only when spending passes safety checks"],
      ["Red Flag", "A warning that spending may create pressure.", "notice warning signs before spending creates pressure"],
      ["Wallet Impact", "How a purchase affects available money.", "see how a purchase changes available money"],
      ["Affordability Check", "Testing if a purchase is truly safe.", "test if a purchase is safe for today"],
      ["Safe Spending Rule", "The rule that spending must pass before checkout.", "follow one checkpoint before checkout decisions"],
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
      ["Goal", "A clear financial target.", "define what the saved money is for"],
      ["Target Amount", "The exact money needed for the goal.", "know the exact number the goal needs"],
      ["Deadline", "The date the goal should be reached.", "plan saving pace around a clear date"],
      ["Progress", "How far the user has moved toward the target.", "see how far the goal has moved"],
      ["Sinking Fund", "Savings for a known future expense.", "prepare for known costs before they arrive"],
      ["Goal Fund", "Money separated for one specific goal.", "keep savings focused on one clear purpose"],
      ["Saving Habit", "Regularly keeping money for the future.", "build regular saving into your routine"],
      ["Milestone", "A smaller win inside a bigger goal.", "measure smaller steps inside the bigger goal"],
      ["Future Purchase", "Something planned before buying.", "plan buying before money leaves your hands"],
      ["Saving Goals", "Saving with purpose, amount, and direction.", "save with purpose, amount, and direction"],
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
      ["Inflow", "Money entering the user’s system.", "track all money entering your system"],
      ["Outflow", "Money leaving the user’s system.", "see every direction money leaves your system"],
      ["Monthly Cycle", "The repeated money rhythm of the month.", "understand the month’s repeated money rhythm"],
      ["Cash Flow Map", "A picture of how money moves.", "view income and expenses in one picture"],
      ["Surplus", "Money left after obligations and spending.", "decide where extra money should go"],
      ["Shortfall", "When money is not enough for the plan.", "spot when planned money is not enough"],
      ["Timing Gap", "A mismatch between income and due dates.", "prepare when income and due dates do not match"],
      ["Cash Cushion", "Extra money that softens timing pressure.", "soften timing pressure without disrupting bills"],
      ["Money Movement", "The flow of money through categories.", "follow how money travels through categories"],
      ["Cash Flow Mastery", "Understanding and controlling money movement.", "manage timing across the whole month"],
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
      ["Side Hustle", "Extra work that creates additional income.", "separate extra earning from your main income"],
      ["Freelance", "Paid work offered independently.", "plan independent work as a money source"],
      ["Commission", "Income earned from results or sales.", "connect earnings to results or sales clearly"],
      ["Business Income", "Money earned from a business activity.", "track money earned from business activity"],
      ["Extra Income", "Money added beyond the main source.", "use added money without confusing the plan"],
      ["Skill Income", "Income connected to a useful ability.", "turn useful ability into planned earning"],
      ["Passive Income", "Income that does not require constant active work.", "understand income that needs less active effort"],
      ["Income Stream", "One source of money coming in.", "count each source money comes from"],
      ["Upsell", "Earning more by offering a higher-value option.", "increase earnings by offering higher-value options"],
      ["Income Growth", "Increasing the money coming in.", "notice new ways money can come in"],
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
      ["Skill", "An ability that can create value.", "recognize abilities that can create value"],
      ["Value", "Usefulness that people are willing to reward.", "understand usefulness people may reward"],
      ["Promotion", "A higher role or responsibility at work.", "prepare for higher responsibility and income potential"],
      ["Productivity", "Creating useful output with time and effort.", "create useful output with time and effort"],
      ["Career Growth", "Improving work position or earning potential.", "plan work improvement toward better opportunities"],
      ["Work Quality", "How good and reliable the output is.", "improve output so trust becomes easier"],
      ["Reliability", "Being trusted to deliver consistently.", "build trust by delivering consistently"],
      ["High Value", "Being useful enough to be hard to ignore.", "see usefulness as part of earning power"],
      ["Personal Brand", "The reputation connected to a person’s value.", "manage the reputation connected to your value"],
      ["Skill Leverage", "Using skill to multiply opportunity.", "use ability to multiply opportunities"],
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
      ["Asset", "Something that can hold or create value.", "recognize what can hold or create value"],
      ["Liability", "Something that takes money out or creates obligation.", "recognize what creates cost or obligation"],
      ["Appreciation", "Value increasing over time.", "notice when value increases over time"],
      ["Depreciation", "Value decreasing over time.", "plan for value dropping over time"],
      ["Ownership", "Having legal or practical control of something.", "know what you legally or practically control"],
      ["Equity", "Owned value after obligations are removed.", "see owned value after obligations are removed"],
      ["Resale Value", "The possible value when something is sold again.", "estimate what something may return later"],
      ["Cash Producing Asset", "Something that can create income.", "identify things that can generate income"],
      ["Money Drain", "Something that repeatedly pulls money away.", "spot things that repeatedly pull money away"],
      ["Asset vs Liability", "Knowing what builds value and what drains value.", "separate value builders from money drains"],
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
      ["Inflation", "Prices rising while money buys less.", "plan around prices rising and money weakening"],
      ["Price Increase", "A higher cost for the same item or service.", "notice when the same item costs more"],
      ["Buying Power", "What money can actually purchase.", "see what your money can really buy"],
      ["Cost of Living", "The price of basic daily life.", "plan around basic daily costs"],
      ["Real Value", "Value after considering price changes.", "compare value after prices change"],
      ["Shrinkflation", "Getting less product for the same or higher price.", "notice getting less for the same payment"],
      ["Price Watch", "Paying attention to changing prices.", "track changing prices before adjusting spending"],
      ["Budget Pressure", "Stress placed on the budget by rising costs.", "see how rising costs stress the plan"],
      ["Value Drop", "When money or an item becomes worth less.", "recognize when money or items lose worth"],
      ["Inflation Defense", "Actions that protect money from rising prices.", "protect money decisions from rising prices"],
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
      ["Investment", "Money placed with the goal of future growth.", "put money toward possible future growth"],
      ["Net Worth", "Total assets minus total liabilities.", "measure assets after liabilities are removed"],
      ["Capital", "Money or resources used to build more value.", "use resources to build more value"],
      ["Compound Growth", "Growth that builds on previous growth.", "understand growth building on earlier growth"],
      ["Portfolio", "A collection of investments or assets.", "organize assets and investments in one view"],
      ["Diversification", "Spreading risk across different places.", "spread risk instead of relying on one place"],
      ["Long Term Plan", "A financial direction built beyond today.", "guide decisions beyond today’s spending"],
      ["Financial Freedom", "Having enough stability and options to choose freely.", "plan for stability and future options"],
      ["Wealth Habit", "A repeated action that supports long-term growth.", "repeat actions that support long-term strength"],
      ["Wealth Building", "The process of creating long-term financial strength.", "build long-term strength through assets and habits"],
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
    .replace(/\bactually\b/gi, "really")
    .replace(/\bthe user’s\b/gi, "your")
    .replace(/\bthe user's\b/gi, "your")
    .replace(/\buser’s\b/gi, "your")
    .replace(/\buser's\b/gi, "your")
    .replace(/\bthe user\b/gi, "you");

  if (!cleaned) return "a money concept";
  return `${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
}

function makeBenefitPhrase(benefit) {
  const cleaned = String(benefit || "make clearer financial choices")
    .trim()
    .replace(/[.]+$/g, "");

  return cleaned || "make clearer financial choices";
}

function buildPuzzleLesson({ answer, clue, benefit }) {
  return `${answer} is ${makeDefinitionPhrase(clue)}. It helps you ${makeBenefitPhrase(benefit)}.`;
}

export const STAGES = STAGE_BLUEPRINTS.map((stage, stageIndex) => ({
  ...stage,
  headerLine: stage.headerLine || STAGE_HEADER_FALLBACK_LINE,
  stageNumber: stageIndex + 1,
  totalStages: STAGE_BLUEPRINTS.length,
  wordCount: stage.words.length,
}));

export const PUZZLES = STAGES.flatMap((stage, stageIndex) => (
  stage.words.map(([answer, clue, benefit], wordIndex) => {
    const wordType = getWordType(wordIndex);

    return {
      id: `stage-${stageIndex + 1}-${slugify(answer)}`,
      answer,
      hint: clue,
      lesson: buildPuzzleLesson({ answer, clue, benefit }),
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