const EXACT_PICTURE_CLUES = Object.freeze({
  income: [["💼", "Work"], ["💵", "Money in"], ["📥", "Received"], ["🏪", "Business"]],
  expense: [["💸", "Money out"], ["🛒", "Purchase"], ["📤", "Leaves wallet"], ["🧾", "Receipt"]],
  budget: [["📋", "Plan"], ["🧮", "Numbers"], ["🏷️", "Categories"], ["✅", "Limit"]],
  savings: [["🏦", "Saved money"], ["🔒", "Set aside"], ["🎯", "Goal"], ["📈", "Progress"]],
  wallet: [["👛", "Wallet"], ["💵", "Cash"], ["💳", "Card"], ["📱", "Mobile pay"]],
  "cash flow": [["📥", "Money in"], ["📤", "Money out"], ["🔄", "Movement"], ["📆", "Monthly cycle"]],
  balance: [["⚖️", "Balance"], ["💵", "Money left"], ["🏦", "Account"], ["🧮", "Total"]],
  transaction: [["↔️", "Money move"], ["🧾", "Record"], ["💳", "Payment"], ["✅", "Posted"]],
  category: [["🏷️", "Label"], ["🗂️", "Group"], ["🧾", "Expenses"], ["📊", "Sorted"]],
  receipt: [["🧾", "Receipt"], ["🛒", "Purchase"], ["✅", "Proof"], ["📄", "Record"]],
  payday: [["📅", "Pay date"], ["💼", "Work"], ["💵", "Salary"], ["🏦", "Deposit"]],
  salary: [["💼", "Job"], ["💵", "Pay"], ["📅", "Regular"], ["🏦", "Deposit"]],
  allowance: [["💵", "Set amount"], ["📆", "Weekly"], ["👛", "Pocket money"], ["✅", "Controlled"]],
  need: [["🍚", "Food"], ["🏠", "Shelter"], ["💊", "Health"], ["✅", "Required"]],
  want: [["🎁", "Nice to have"], ["🛍️", "Shopping"], ["✨", "Desire"], ["⏳", "Can wait"]],
  priority: [["⭐", "Important"], ["1️⃣", "First"], ["🧭", "Direction"], ["✅", "Choose"]],
  debt: [["⛓️", "Owed"], ["💳", "Credit"], ["🧾", "Bill"], ["📉", "Pressure"]],
  loan: [["🏦", "Lender"], ["🤝", "Borrow"], ["💵", "Cash"], ["📆", "Repay"]],
  interest: [["%", "Percent"], ["💸", "Extra cost"], ["📈", "Grows"], ["🏦", "Loan"]],
  credit: [["💳", "Credit card"], ["🏦", "Limit"], ["🤝", "Borrow"], ["📆", "Pay later"]],
  installment: [["🧾", "Bill"], ["📆", "Schedule"], ["➗", "Split"], ["💳", "Payment"]],
  principal: [["💵", "Original amount"], ["🏦", "Loan"], ["🧾", "Owed"], ["🎯", "Base debt"]],
  buffer: [["🧱", "Cushion"], ["💵", "Extra money"], ["🛡️", "Protection"], ["😮‍💨", "Breathing room"]],
  goal: [["🎯", "Target"], ["💰", "Amount"], ["📅", "Deadline"], ["📈", "Progress"]],
  progress: [["📈", "Moving up"], ["✅", "Steps done"], ["🎯", "Closer"], ["📊", "Tracker"]],
  asset: [["🏦", "Value"], ["📈", "Grows"], ["🌱", "Builds"], ["💰", "Owns value"]],
  liability: [["⛓️", "Obligation"], ["💸", "Money out"], ["📉", "Drains"], ["🧾", "Payment"]],
  inflation: [["🎈", "Rising"], ["🛒", "Prices"], ["📈", "Cost up"], ["💵", "Buys less"]],
  investment: [["🌱", "Plant money"], ["📈", "Growth"], ["🏦", "Asset"], ["⏳", "Long term"]],
  skill: [["🛠️", "Ability"], ["🧠", "Learning"], ["💼", "Work"], ["📈", "Growth"]],
  value: [["⭐", "Worth"], ["🤝", "Useful"], ["💵", "Reward"], ["📈", "Higher"]],
});

const PHRASE_RULES = [
  [/money awareness|awareness/, [["👁️", "See clearly"], ["💵", "Money"], ["🧭", "Direction"], ["💡", "Realization"]]],
  [/money tracking|spending log|expense record|money trail|monthly review/, [["🧾", "Records"], ["🔎", "Trace"], ["📊", "Pattern"], ["🗓️", "Review"]]],
  [/daily spending/, [["📅", "Today"], ["🛒", "Buys"], ["💸", "Money out"], ["🧾", "Track"]]],
  [/category check|wallet check/, [["🔎", "Check"], ["🏷️", "Label"], ["👛", "Wallet"], ["✅", "Correct"]]],
  [/spending pattern/, [["🔁", "Repeated"], ["🛒", "Spending"], ["📊", "Pattern"], ["👀", "Notice"]]],
  [/budget plan|budget basics/, [["📋", "Plan"], ["🧮", "Numbers"], ["💵", "Income"], ["✅", "Control"]]],
  [/allocation|salary split|first cut/, [["✂️", "Split"], ["💵", "Money"], ["🏷️", "Purpose"], ["✅", "Assigned"]]],
  [/spending limit|limit|credit limit/, [["🚧", "Limit"], ["🛑", "Stop"], ["💵", "Amount"], ["✅", "Boundary"]]],
  [/bills first/, [["🧾", "Bills"], ["1️⃣", "First"], ["🏠", "Essentials"], ["✅", "Protected"]]],
  [/fixed expense/, [["📌", "Fixed"], ["🧾", "Bill"], ["📆", "Monthly"], ["💵", "Same cost"]]],
  [/variable expense/, [["〽️", "Changes"], ["🛒", "Spending"], ["📊", "Flexible"], ["💸", "Cost"]]],
  [/cash envelope/, [["✉️", "Envelope"], ["💵", "Cash"], ["🏷️", "Category"], ["🔒", "Separated"]]],
  [/budget gap/, [["🕳️", "Gap"], ["📋", "Plan"], ["💸", "Short"], ["⚠️", "Pressure"]]],
  [/budget reset/, [["🔄", "Reset"], ["📋", "Plan"], ["🧮", "Adjust"], ["✅", "Restart"]]],
  [/needs vs wants/, [["🍚", "Need"], ["🎁", "Want"], ["⚖️", "Choose"], ["🧠", "Think"]]],
  [/trade off/, [["⚖️", "Choice"], ["↔️", "Exchange"], ["✅", "Keep"], ["❌", "Give up"]]],
  [/sacrifice/, [["❌", "Let go"], ["⭐", "Higher priority"], ["🛡️", "Protect"], ["🧠", "Discipline"]]],
  [/practical choice|value choice/, [["🧠", "Think"], ["⚖️", "Compare"], ["✅", "Useful"], ["💵", "Worth it"]]],
  [/essential/, [["🏠", "Home"], ["🍚", "Food"], ["💡", "Utilities"], ["✅", "Must have"]]],
  [/impulse want|impulse buy/, [["⚡", "Sudden"], ["🛍️", "Buy"], ["🧠", "Pause"], ["⚠️", "Risk"]]],
  [/payday plan|payday rule|payday control/, [["📅", "Payday"], ["📋", "Plan"], ["🛡️", "Protect"], ["✅", "Rule"]]],
  [/pay cycle/, [["📅", "Schedule"], ["🔄", "Cycle"], ["💵", "Income"], ["⏳", "Until next pay"]]],
  [/payday leak/, [["📅", "Payday"], ["💧", "Leak"], ["💸", "Money gone"], ["⚠️", "Fast drain"]]],
  [/self control|discipline|spending discipline/, [["🧠", "Control"], ["🛑", "Stop"], ["⏳", "Wait"], ["✅", "Follow plan"]]],
  [/delay|spending pause/, [["⏳", "Wait"], ["🛒", "Before buying"], ["🧠", "Think"], ["✅", "Choose later"]]],
  [/purchase check/, [["🔎", "Check"], ["🛒", "Purchase"], ["📋", "Budget"], ["✅", "Approve"]]],
  [/no spend day/, [["🚫", "No spend"], ["📅", "One day"], ["👛", "Wallet safe"], ["✅", "Discipline"]]],
  [/overspending/, [["💸", "Too much"], ["📉", "Budget down"], ["⚠️", "Warning"], ["🛑", "Stop"]]],
  [/emotional spending|stress spending|retail therapy|comfort buy|mood purchase|boredom spend/, [["❤️", "Feeling"], ["🛍️", "Shopping"], ["😣", "Stress"], ["💸", "Money out"]]],
  [/deserve ko to/, [["🎁", "Reward"], ["😌", "Deserve"], ["🛒", "Buy"], ["⚠️", "Excuse"]]],
  [/spending trigger/, [["⚡", "Trigger"], ["❤️", "Feeling"], ["🛒", "Spending"], ["🛑", "Pause"]]],
  [/insecurity/, [["😟", "Not enough"], ["🛍️", "Buy confidence"], ["🪞", "Image"], ["⚠️", "Pressure"]]],
  [/emotional leak/, [["❤️", "Emotion"], ["💧", "Leak"], ["💸", "Money lost"], ["🔎", "Notice"]]],
  [/money leak|leak audit/, [["💧", "Leak"], ["🔎", "Find"], ["💸", "Small drains"], ["🧾", "Expenses"]]],
  [/subscription|unused service/, [["🔁", "Recurring"], ["📱", "Service"], ["💳", "Auto pay"], ["⚠️", "Forgotten"]]],
  [/hidden cost/, [["🕵️", "Hidden"], ["💸", "Cost"], ["👀", "Not obvious"], ["⚠️", "Surprise"]]],
  [/small expense/, [["🪙", "Small"], ["🧾", "Expense"], ["🔁", "Repeated"], ["💧", "Leak"]]],
  [/convenience fee|food delivery/, [["🛵", "Delivery"], ["⏩", "Convenience"], ["💳", "Fee"], ["💸", "Extra cost"]]],
  [/random checkout/, [["🛒", "Checkout"], ["🎲", "Random"], ["💸", "Spend"], ["⚠️", "Unplanned"]]],
  [/lifestyle creep/, [["📈", "Income up"], ["🛍️", "Spending up"], ["🏙️", "Lifestyle"], ["⚠️", "Creep"]]],
  [/rent|utilities|monthly bills|obligation|payment schedule|due date/, [["🏠", "Home"], ["🧾", "Bill"], ["📅", "Due"], ["💵", "Pay"]]],
  [/penalty|late fee|late payment/, [["⏰", "Late"], ["🧾", "Charge"], ["⚠️", "Penalty"], ["💸", "Extra cost"]]],
  [/bill buffer/, [["🧾", "Bills"], ["🧱", "Buffer"], ["💵", "Extra"], ["🛡️", "Protect"]]],
  [/minimum payment/, [["⬇️", "Smallest"], ["💳", "Debt"], ["🧾", "Required"], ["📆", "Due"]]],
  [/borrowing cost/, [["🤝", "Borrow"], ["%", "Interest"], ["💸", "Cost"], ["🏦", "Lender"]]],
  [/debt awareness|debt control|debt cycle|debt stress/, [["⛓️", "Debt"], ["🧾", "Payments"], ["🔄", "Cycle"], ["😣", "Pressure"]]],
  [/payoff plan|debt free goal/, [["🎯", "Goal"], ["📋", "Plan"], ["💳", "Debt"], ["✅", "Paid off"]]],
  [/debt snowball/, [["❄️", "Snowball"], ["💳", "Debt"], ["1️⃣", "Small first"], ["📈", "Momentum"]]],
  [/debt avalanche/, [["🏔️", "Avalanche"], ["%", "High interest"], ["💳", "Debt"], ["📉", "Cost down"]]],
  [/payment priority/, [["⭐", "Priority"], ["🧾", "Payment"], ["1️⃣", "First"], ["✅", "Choose"]]],
  [/emergency fund|safety net|urgent need|protection money|emergency protection/, [["🛡️", "Protection"], ["🚨", "Emergency"], ["💵", "Saved cash"], ["🏥", "Urgent need"]]],
  [/medical cost/, [["🏥", "Medical"], ["🧾", "Bill"], ["💵", "Cost"], ["🚨", "Urgent"]]],
  [/repair fund/, [["🔧", "Repair"], ["💵", "Fund"], ["🛠️", "Fix"], ["🛡️", "Prepared"]]],
  [/job loss fund/, [["💼", "Job"], ["❌", "Lost"], ["💵", "Backup"], ["🛡️", "Protection"]]],
  [/crisis fund/, [["🚨", "Crisis"], ["💵", "Reserve"], ["🛡️", "Protection"], ["😮‍💨", "Relief"]]],
  [/safe spending|safe spending rule|budget fit|covered expense|spending approval|green light|red flag|wallet impact|affordability check|remaining balance/, [["✅", "Safe"], ["📋", "Budget"], ["👛", "Wallet"], ["🚦", "Decision"]]],
  [/target amount|deadline|saving goals|goal fund|sinking fund|saving habit|milestone|future purchase/, [["🎯", "Goal"], ["💰", "Target"], ["📅", "Deadline"], ["📈", "Progress"]]],
  [/inflow|outflow|monthly cycle|cash flow map|money movement|cash flow mastery|timing gap|cash cushion|surplus|shortfall/, [["📥", "Inflow"], ["📤", "Outflow"], ["🔄", "Cycle"], ["📊", "Map"]]],
  [/side hustle|freelance|commission|business income|extra income|skill income|passive income|income stream|upsell|income growth/, [["💼", "Work"], ["💵", "Income"], ["📈", "Growth"], ["🏪", "Opportunity"]]],
  [/promotion|productivity|career growth|work quality|reliability|high value|personal brand|skill leverage/, [["🧑‍💼", "Career"], ["🛠️", "Skill"], ["⭐", "Value"], ["📈", "Growth"]]],
  [/appreciation|depreciation|ownership|equity|resale value|cash producing asset|money drain|asset vs liability/, [["🏦", "Asset"], ["⛓️", "Liability"], ["📈", "Value up"], ["📉", "Value down"]]],
  [/price increase|buying power|cost of living|real value|shrinkflation|price watch|budget pressure|value drop|inflation defense/, [["🛒", "Prices"], ["📈", "Rising"], ["💵", "Buying power"], ["🛡️", "Defense"]]],
  [/net worth|capital|compound growth|portfolio|diversification|long term plan|financial freedom|wealth habit|wealth building/, [["🏦", "Assets"], ["📊", "Portfolio"], ["📈", "Growth"], ["🏆", "Wealth"]]],
];

const FALLBACK_CLUES = Object.freeze([
  ["💵", "Money"],
  ["🔎", "Clue"],
  ["🧠", "Think"],
  ["✅", "Answer"],
]);

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toClue([icon, label]) {
  return { icon, label };
}

function addUniqueClues(target, cluePairs) {
  cluePairs.forEach((pair) => {
    if (!Array.isArray(pair) || pair.length < 2) return;
    const [, label] = pair;
    const normalizedLabel = normalizeKey(label);

    if (target.some((item) => normalizeKey(item.label) === normalizedLabel)) return;
    target.push(toClue(pair));
  });
}

export function getMoneyWordPictureClues(puzzle) {
  const answerKey = normalizeKey(puzzle?.answer);
  const exactClues = EXACT_PICTURE_CLUES[answerKey];

  if (exactClues) return exactClues.map(toClue);

  const searchText = normalizeKey(`${puzzle?.answer || ""} ${puzzle?.hint || ""} ${puzzle?.stageName || ""}`);
  const clues = [];

  PHRASE_RULES.forEach(([pattern, cluePairs]) => {
    if (clues.length >= 4) return;
    if (pattern.test(searchText)) addUniqueClues(clues, cluePairs);
  });

  addUniqueClues(clues, FALLBACK_CLUES);

  return clues.slice(0, 4);
}
