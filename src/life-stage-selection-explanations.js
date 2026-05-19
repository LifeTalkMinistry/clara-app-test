const MODAL_SELECTOR = "#root div[class*='fixed'][class*='z-[9999]']";

const optionCopy = {
  "First job": "Meaning: your pay routine is new and still forming. CLARA will watch first-salary habits, impulse rewards, and help you build a simple save-before-spend rhythm.",
  "Early career": "Meaning: you have started earning, but your lifestyle and responsibilities are still adjusting. CLARA will watch lifestyle creep, bills, and early savings discipline.",
  "Exploring income": "Meaning: your earning path is still open and changing. CLARA will focus on flexible budgeting, small buffers, and decisions that keep your options safe.",
  "Building independence": "Meaning: you are learning to carry more of your own needs. CLARA will prioritize rent-like costs, personal boundaries, emergency savings, and stable routines.",
  "Allowance + work": "Meaning: money comes from both support and effort. CLARA will separate school needs, work income, and personal spending so one source does not hide the pressure of the other.",
  "Part-time only": "Meaning: your income has a smaller ceiling and less room for mistakes. CLARA will protect essentials first and keep spending decisions realistic for limited hours.",
  "Income is irregular": "Meaning: money does not arrive the same way every period. CLARA will avoid fixed-payday assumptions and prioritize buffer, bill timing, and safer daily spending.",
  "Seasonal income": "Meaning: some periods may be strong while others are quiet. CLARA will help stretch income, prepare for low months, and avoid treating peak income as normal.",
  "Just us together": "Meaning: your daily money rhythm is shared with your partner. CLARA will watch shared bills, couple routines, emotional spending, and future planning pressure.",
  "With my family": "Meaning: family environment still shapes your spending. CLARA will consider shared costs, support requests, privacy, and the balance between helping and saving.",
  "With partner’s family": "Meaning: your setup includes relationship and family expectations. CLARA will watch contribution pressure, boundaries, and money conversations that may feel sensitive.",
  "Still moving around": "Meaning: your home base is not fully stable yet. CLARA will focus on flexibility, transport, temporary costs, and keeping a safety buffer before big commitments.",
  "With parents": "Meaning: you may have some cost support, but also possible contribution pressure. CLARA will help balance family help, personal savings, and adult independence.",
  "With siblings": "Meaning: shared family routines can affect food, bills, and requests. CLARA will watch small shared costs and help you keep your own money plan visible.",
  "Whole family": "Meaning: many household needs can compete at once. CLARA will help identify which expenses are yours, which are shared, and what needs boundaries.",
  "Shared home": "Meaning: bills and daily routines are shared with others. CLARA will track recurring household costs, contribution rhythm, and spending leaks from group living.",
  "One child": "Meaning: your decisions already carry child-centered responsibility. CLARA will protect essentials, childcare needs, and emergency money before flexible spending.",
  "Two children": "Meaning: needs multiply and mistakes affect more people. CLARA will focus on food, school, medical buffer, and a clearer priority order for spending.",
  "Three or more": "Meaning: your household has high responsibility and less room for random spending. CLARA will emphasize survival needs, buffers, and predictable routines.",
  "Co-parenting setup": "Meaning: responsibility may be shared across schedules or households. CLARA will watch timing, child-related expenses, and clear planning around support.",
  Corporate: "Meaning: your work structure may be steady and predictable. CLARA will use that rhythm to strengthen budgeting, savings automation, and planned self-reward.",
  "BPO/call center": "Meaning: shift work and stress can affect spending patterns. CLARA will watch cutoff behavior, food delivery, commute, sleep fatigue, and reward spending.",
  "Office work": "Meaning: your routine likely creates daily spending triggers. CLARA will watch lunch, commute, work stress, and small weekday leaks that repeat often.",
  "Remote work": "Meaning: home and work routines may blend together. CLARA will watch convenience spending, subscriptions, home costs, and emotional spending during flexible hours.",
  "Client-based": "Meaning: your income depends on client flow and payment timing. CLARA will prioritize cash buffer, invoice gaps, and separating personal money from work money.",
  "Project-based": "Meaning: income arrives by output, not always by date. CLARA will help stretch project payments and prevent strong-payment weeks from causing overspending.",
  "Side hustle": "Meaning: extra income is growing beside your main life. CLARA will help decide what should be saved, reinvested, or used without mixing it carelessly.",
  "Full freelance": "Meaning: flexibility is high, but stability depends on your system. CLARA will focus on buffers, client timing, separate wallets, and low-income month protection.",
  "Just starting": "Meaning: the business is still fragile and cash can move fast. CLARA will focus on runway, simple tracking, and keeping personal money protected.",
  "Growing already": "Meaning: momentum is present, but growth can create pressure. CLARA will watch reinvestment, profit clarity, and whether the business is draining personal stability.",
  "Side business": "Meaning: business and personal money can easily mix. CLARA will help separate wallets, identify true profit, and avoid using sales as spending permission.",
  "Main income": "Meaning: the business now supports your life. CLARA will prioritize operating costs, owner pay, emergency runway, and stable cash-flow decisions.",
  "Stable salary": "Meaning: income is predictable enough to build structure. CLARA will push planned savings, recurring bills, and consistent spending limits instead of reactive decisions.",
  "Cutoff cycle": "Meaning: your spending may rise and fall around payday. CLARA will watch early-cutoff spending, mid-cycle shortages, and end-cycle survival behavior.",
  "Income still changing": "Meaning: your earning level is not fully settled. CLARA will keep budgets flexible, avoid overcommitment, and protect cash while your income stabilizes.",
  "Learning rhythm": "Meaning: you are still discovering your money pattern. CLARA will help observe what repeats, what breaks the plan, and what routines are realistic.",
  "Mostly stable": "Meaning: your season has some structure. CLARA can build stronger rules, but will still watch hidden leaks and emotional spending patterns.",
  "Still finding rhythm": "Meaning: the routine is not clear yet. CLARA will keep advice flexible and help identify what pattern is starting to repeat.",
  "This is new": "Meaning: the setup is still fresh and untested. CLARA will avoid assuming stability and will watch adjustment costs, emotion, and surprise expenses.",
  "Temporary for now": "Meaning: this situation may change soon. CLARA will focus on short-term safety, flexible plans, and avoiding commitments that trap future options.",
  "Stable home": "Meaning: your environment has routine. CLARA can use that predictability to plan bills, savings, and steady household contributions.",
  "Home is changing": "Meaning: your environment may shift soon. CLARA will watch transition costs, family needs, and avoid locking money into rigid plans.",
  "Shared routine": "Meaning: other people influence your daily rhythm. CLARA will consider shared meals, bills, requests, and the way group habits affect spending.",
  "Busy household": "Meaning: many needs happen at once. CLARA will help separate urgent costs from emotional or convenience spending caused by household pressure.",
  "Stable routine": "Meaning: your days are predictable enough to build a system. CLARA will use that routine to protect essentials, savings, and repeatable money habits.",
  "Childcare changes": "Meaning: time and care needs may shift suddenly. CLARA will watch schedule costs, backup expenses, and emergency needs connected to childcare.",
  "School-heavy season": "Meaning: school expenses may dominate the budget. CLARA will prioritize fees, supplies, transport, food, and timing before flexible purchases.",
  "Unpredictable days": "Meaning: your routine can change without warning. CLARA will focus on emergency cash, simple rules, and decisions that still work during chaotic days.",
  "Every cutoff": "Meaning: your money rhythm is tied to payday cycles. CLARA will plan by cutoff, watch early overspending, and protect money for the second half.",
  "Monthly salary": "Meaning: one payment must cover a longer period. CLARA will help divide money into weeks so the month does not collapse near the end.",
  "Shift-based": "Meaning: work schedule affects energy and spending. CLARA will watch food, transport, sleep fatigue, and convenience buys around difficult shifts.",
  "Monthly clients": "Meaning: income may be somewhat predictable through clients. CLARA will still watch payment delays and help separate client money into clear purposes.",
  "Seasonal work": "Meaning: work demand changes by season. CLARA will protect cash during strong periods so slow periods do not force debt or panic spending.",
  "Growing slowly": "Meaning: progress exists but may not feel fast. CLARA will focus on consistency, realistic goals, and not overspending before growth becomes stable.",
  Reinvesting: "Meaning: money is going back into the business. CLARA will watch whether reinvestment is strategic or quietly harming personal stability.",
  "Sales not steady": "Meaning: revenue is not predictable yet. CLARA will prioritize runway, cost control, and avoiding decisions based only on a good sales day.",
  "Monthly cycle": "Meaning: the business has a repeating month pattern. CLARA will help map sales, expenses, owner pay, and slow points in the cycle.",
  "Scaling up": "Meaning: growth is increasing complexity. CLARA will watch operating costs, reinvestment pressure, and whether expansion is still financially safe.",
  "Living pressure": "Meaning: basic living costs are shaping your decisions. CLARA will focus on essentials, recurring bills, and reducing random spending that weakens stability.",
  "Comfort spending": "Meaning: spending may be used to feel better or rewarded. CLARA will help replace short-term relief with planned self-care that does not break the budget.",
  "Peer pressure": "Meaning: other people may influence your spending choices. CLARA will help protect boundaries and decide when social spending is worth it.",
  "Low buffer": "Meaning: you have limited protection if something goes wrong. CLARA will prioritize emergency savings and avoid choices that leave you exposed.",
  "School costs": "Meaning: education expenses are creating pressure. CLARA will prioritize tuition, supplies, transport, and deadlines before lifestyle spending.",
  "Transport pressure": "Meaning: movement costs are eating into your budget. CLARA will watch commute patterns, fare spikes, and convenience spending caused by travel fatigue.",
  "Burnout risk": "Meaning: exhaustion can turn into spending decisions. CLARA will watch comfort buys, food shortcuts, and help design cheaper recovery routines.",
  "Family expectations": "Meaning: family needs or pressure affect your money choices. CLARA will help balance support, boundaries, and your own stability.",
  "Shared expenses": "Meaning: bills or purchases are connected to another person. CLARA will focus on clarity, fairness, and avoiding silent resentment around money.",
  "Future planning": "Meaning: long-term decisions are already influencing spending. CLARA will watch savings, commitments, and whether today’s choices support tomorrow’s plan.",
  "Money communication": "Meaning: the issue is not only money but conversation. CLARA will help make costs, expectations, and limits clearer before they become conflict.",
  "Emotionally sensitive": "Meaning: this money area can affect feelings or relationships. CLARA will suggest decisions that protect peace, clarity, and stability.",
  "Household contribution": "Meaning: you may need to help at home. CLARA will help define a contribution that is supportive without destroying your personal safety.",
  "Support pressure": "Meaning: people may depend on you financially. CLARA will watch giving patterns, emergency limits, and the line between help and overextension.",
  "Family requests": "Meaning: money requests may appear suddenly. CLARA will help you prepare a response system instead of deciding only from guilt or pressure.",
  "Personal boundaries": "Meaning: your money needs clearer limits. CLARA will help protect your goals while still respecting relationships and responsibilities.",
  "Daily needs": "Meaning: everyday essentials carry the pressure. CLARA will prioritize food, transport, child needs, and bills before anything flexible.",
  "School expenses": "Meaning: education-related costs are a major risk point. CLARA will track timing, deadlines, and buffers for fees, supplies, and school needs.",
  "Emergency risk": "Meaning: one surprise expense could disrupt the month. CLARA will focus on buffer building and safer decisions before non-essential spending.",
  "Time pressure": "Meaning: lack of time can make spending feel like the easiest solution. CLARA will watch convenience costs and suggest cheaper time-saving options.",
  "Lifestyle pressure": "Meaning: income may invite upgrades that become normal. CLARA will watch recurring lifestyle creep and help separate reward from habit.",
  "Stress spending": "Meaning: stress may trigger purchases for relief. CLARA will watch timing, categories, and cheaper recovery options before spending becomes automatic.",
  "Family support": "Meaning: part of your income may go to others. CLARA will help plan support as a budget item instead of letting it surprise the month.",
  "Routine fatigue": "Meaning: repetition can drain discipline. CLARA will watch payday rewards, food shortcuts, and spending caused by emotional tiredness.",
  "Income variability": "Meaning: income changes while expenses remain real. CLARA will prioritize cash buffer, lower fixed costs, and conservative spending decisions.",
  "Client delays": "Meaning: money may be earned but not yet received. CLARA will watch due dates, waiting periods, and spending before payments arrive.",
  "Uncertain months": "Meaning: future income is not guaranteed. CLARA will keep the plan defensive, reduce risky commitments, and protect survival cash.",
  "Reinvestment pressure": "Meaning: growth asks for money before it guarantees return. CLARA will help separate smart reinvestment from emotional overcommitting.",
  "Inventory pressure": "Meaning: stock or materials may tie up cash. CLARA will watch cash flow, unsold inventory, and whether buying more is truly safe.",
  "Operating costs": "Meaning: the business has costs that keep running. CLARA will protect rent, tools, subscriptions, supplies, and owner pay from mixing together.",
  "Personal/business mix": "Meaning: personal and business money may be blurred. CLARA will push separation so profit, spending, and runway are easier to see.",
  "Build habits": "Meaning: your focus is consistency. CLARA will start with small repeatable rules rather than complicated plans that are hard to maintain.",
  "Emergency fund first": "Meaning: your priority is protection. CLARA will push cash buffer before wants, upgrades, and risky commitments.",
  "Reduce impulse buys": "Meaning: your focus is stopping unplanned spending. CLARA will watch triggers, timing, and reasons before purchases happen.",
  "Save first": "Meaning: you want savings to happen before spending. CLARA will treat savings as the first move, not whatever is left over.",
  "Graduate safely": "Meaning: school completion is the priority. CLARA will protect tuition, transport, food, requirements, and energy so money stress does not derail progress.",
  "Save slowly": "Meaning: you want progress without unrealistic pressure. CLARA will support small consistent savings that fit your actual income.",
  "Avoid debt": "Meaning: your goal is to prevent future pressure. CLARA will be careful with borrowing, installment temptation, and spending ahead of income.",
  "Help family": "Meaning: supporting family matters to you. CLARA will help make that support planned, sustainable, and not damaging to your own stability.",
  "Build savings together": "Meaning: shared progress matters. CLARA will help align saving rules, contribution rhythm, and shared goals with your partner.",
  "Plan our future": "Meaning: you want decisions to support a bigger direction. CLARA will connect spending choices to long-term stability and shared plans.",
  "Stability first": "Meaning: safety matters more than speed. CLARA will favor predictable bills, buffers, and calm decisions before aggressive goals.",
  "Contribute wisely": "Meaning: you want to help without losing yourself. CLARA will help set realistic household support and keep personal goals protected.",
  "Build safety": "Meaning: your focus is financial protection. CLARA will prioritize emergency cash, predictable essentials, and lower risk decisions.",
  "Reduce stress spending": "Meaning: spending may be connected to emotional pressure. CLARA will help spot triggers and suggest replacement actions that cost less.",
  "Personal stability": "Meaning: your own foundation needs protection. CLARA will focus on your essentials, savings, boundaries, and mental bandwidth.",
  "Protect essentials": "Meaning: survival needs come first. CLARA will protect food, child needs, bills, transport, and emergency cash before flexible spending.",
  "Reduce debt": "Meaning: you want to lower pressure from past borrowing. CLARA will prioritize payments, avoid new debt triggers, and protect essentials during payoff.",
  "Save consistently": "Meaning: the goal is repeatable progress. CLARA will align savings with payday or income rhythm so it happens automatically.",
  "Reduce random spending": "Meaning: small unplanned costs are the target. CLARA will watch repeated categories and help you decide before casual spending piles up.",
  "Build discipline": "Meaning: you want stronger control. CLARA will use simple rules, reminders, and spending checks to reduce emotional decisions.",
  "Build buffer": "Meaning: you need breathing room between income and expenses. CLARA will prioritize cash reserves before upgrades or risky choices.",
  "Stabilize income": "Meaning: you want less uncertainty. CLARA will watch patterns, client flow, side income, and spending plans that depend on reliable cash.",
  "Separate wallets": "Meaning: you want clearer money boundaries. CLARA will split purposes so bills, savings, business, and spending do not blur together.",
  "Grow clients": "Meaning: income growth is the priority. CLARA will still protect cash flow so growth efforts do not create personal instability.",
  "Separate money": "Meaning: personal and business money need clearer walls. CLARA will help protect owner pay, runway, operating funds, and real profit visibility.",
  "Build runway": "Meaning: you need months of breathing room. CLARA will prioritize reserve cash so the business can survive slow sales or delays.",
  "Control spending": "Meaning: cash leakage is the risk. CLARA will watch operating costs, personal withdrawals, and purchases that feel urgent but are not strategic.",
  "Grow sustainably": "Meaning: you want growth without breaking stability. CLARA will balance reinvestment, personal needs, and cash safety before expansion.",
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function modal() {
  return document.querySelector(MODAL_SELECTOR);
}

function screenOf(root) {
  const title = clean(root?.querySelector("header h3")?.textContent).toLowerCase();
  if (title.includes("shape the environment")) return "environment";
  if (title.includes("set your focus")) return "focus";
  return title ? "stage" : "";
}

function groupsOf(root) {
  const panel = Array.from(root?.querySelectorAll("main section") || []).find((section) =>
    String(section.className || "").includes("space-y-5")
  );
  return Array.from(panel?.children || []).filter((item) => item.querySelector("button"));
}

function visibleGroup(groups) {
  return groups.find((group) => group.dataset.claraProgressiveVisible === "true") || groups[0] || null;
}

function selectedOption(group) {
  if (group?.dataset.claraUserTouched !== "true") return "";
  const selected = Array.from(group.querySelectorAll("button")).find((button) =>
    String(button.className || "").includes("bg-cyan-200")
  );
  return clean(selected?.textContent);
}

function intro(label) {
  const value = String(label || "").toLowerCase();
  if (value.includes("current setup")) return "This section tells CLARA what kind of environment you are operating from right now. Choose the tile that best fits your real situation.";
  if (value.includes("current rhythm")) return "This section tells CLARA how stable or changing this season feels. Choose the tile that best fits your rhythm.";
  if (value.includes("pressure")) return "This section tells CLARA what pressure affects your money decisions the most right now.";
  if (value.includes("main focus")) return "This section tells CLARA what you want to protect first in this season.";
  return "Choose the tile that best fits your situation.";
}

function explanationFor(group) {
  const label = clean(group?.querySelector("p")?.textContent);
  const picked = selectedOption(group);
  if (!picked) return intro(label);
  return optionCopy[picked] || `Meaning: ${picked} is part of your current season. CLARA will use this answer to adjust budgeting, priorities, and spending guidance around your real situation.`;
}

function headerMessage(root) {
  return root?.querySelector("header h3")?.nextElementSibling || null;
}

function removeOldCardNotes(root) {
  root?.querySelectorAll("[data-clara-life-explanation='true']").forEach((node) => node.remove());
}

function refresh() {
  const root = modal();
  if (!root) return;
  if (!["environment", "focus"].includes(screenOf(root))) return;
  const groups = groupsOf(root);
  groups.forEach((group) => {
    if (!group.dataset.claraUserTouched) group.dataset.claraUserTouched = "false";
  });
  removeOldCardNotes(root);
  const message = headerMessage(root);
  if (message) message.textContent = explanationFor(visibleGroup(groups));
}

function handleClick(event) {
  const root = modal();
  if (!root || !["environment", "focus"].includes(screenOf(root))) return;
  const button = event.target?.closest?.("button");
  if (!button || button.closest("footer")) return;
  const group = button.closest("[data-clara-progressive-group]") || button.parentElement?.parentElement;
  if (group) group.dataset.claraUserTouched = "true";
  requestAnimationFrame(refresh);
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_EXPLANATIONS__) {
  window.__CLARA_LIFE_EXPLANATIONS__ = true;
  document.addEventListener("click", handleClick, true);
  const observer = new MutationObserver(() => requestAnimationFrame(refresh));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  requestAnimationFrame(refresh);
}
