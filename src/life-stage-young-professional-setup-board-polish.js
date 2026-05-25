import {
  YOUNG_PROFESSIONAL_STAGE_KEY,
  YOUNG_PROFESSIONAL_ROOTS,
  YOUNG_PROFESSIONAL_BRANCHES,
  YOUNG_PROFESSIONAL_DISPLAY_LABELS,
  getYoungProfessionalDisplayLabel,
} from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";

const FLOW_MARKER = "CLARA CONTEXT BOARD";

const STEP_META = {
  "CURRENT SETUP": { key: "setup" },
  "MONEY RHYTHM": { key: "rhythm" },
  "WEEKLY LOAD": { key: "workload" },
  "PRESSURE RIGHT NOW": { key: "pressure" },
  "PRESSURE RESPONSE": { key: "coping" },
  "WHEN PRESSURE HITS": { key: "coping" },
  "PROTECTION GOAL": { key: "goal" },
  "WHAT TO PROTECT": { key: "goal" },
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();
const lower = (value) => clean(value).toLowerCase();
const isVisible = (node) => !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
const getStepMeta = (value) => STEP_META[loud(value)] || null;

function collectBranchOptions(branches = {}) {
  const values = [];
  Object.values(branches || {}).forEach((branch) => {
    Object.values(branch || {}).forEach((entry) => {
      if (Array.isArray(entry)) values.push(...entry);
      else if (entry && typeof entry === "object") {
        Object.values(entry).forEach((list) => {
          if (Array.isArray(list)) values.push(...list);
        });
      }
    });
  });
  return values;
}

function branchStepOptions(branch, key) {
  const entry = branch?.[key];
  if (Array.isArray(entry)) return entry;
  if (entry && typeof entry === "object") return Object.values(entry).flatMap((list) => Array.isArray(list) ? list : []);
  return [];
}

function collectYoungProfessionalOptionsByStep() {
  const rows = [];
  YOUNG_PROFESSIONAL_ROOTS.forEach((raw) => rows.push({ raw, step: "setup" }));
  Object.values(YOUNG_PROFESSIONAL_BRANCHES || {}).forEach((branch) => {
    (branch.rhythm || []).forEach((raw) => rows.push({ raw, step: "rhythm" }));
    ["workload", "pressure", "coping", "goal"].forEach((step) => {
      branchStepOptions(branch, step).forEach((raw) => rows.push({ raw, step }));
    });
  });
  return rows;
}

const YOUNG_PROFESSIONAL_OPTION_SET = new Set([
  ...YOUNG_PROFESSIONAL_ROOTS,
  ...collectBranchOptions(YOUNG_PROFESSIONAL_BRANCHES),
  ...Object.keys(YOUNG_PROFESSIONAL_DISPLAY_LABELS),
  ...Object.values(YOUNG_PROFESSIONAL_DISPLAY_LABELS),
].map(loud));

function visibleOptions(section) {
  return Array.from(section?.querySelectorAll("button") || [])
    .map((button) => clean(button.innerText || button.textContent))
    .filter(Boolean);
}

function isYoungProfessionalSection(section) {
  const options = visibleOptions(section).map(loud);
  return options.length > 0 && options.filter((option) => YOUNG_PROFESSIONAL_OPTION_SET.has(option)).length >= Math.min(2, options.length);
}

function isSelectedButton(button) {
  const className = String(button?.className || "");
  return className.includes("border-cyan") || className.includes("text-cyan-50") || className.includes("bg-cyan");
}

function selectedOption(section) {
  const buttons = Array.from(section?.querySelectorAll("button") || []);
  const selected = buttons.find(isSelectedButton) || buttons[0];
  return clean(selected?.innerText || selected?.textContent || "");
}

function findActiveQuestionSection() {
  for (const label of Array.from(document.querySelectorAll("section p"))) {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (meta && section && isVisible(section) && section.querySelector("button") && isYoungProfessionalSection(section)) {
      return { section, meta };
    }
  }
  return null;
}

function findStageBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === FLOW_MARKER);
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, summary };
}

function meaningFor(label, step) {
  const text = lower(label);

  if (text.includes("first stable job")) return "Choosing “First stable job” usually means income is becoming steadier, but the full rhythm of adult responsibility is still forming. Bills, commute, food, and personal choices may feel new because this stage is still adjusting.";
  if (text.includes("independent with bills")) return "Choosing “Independent with bills” usually means independence now has real monthly obligations attached to it. Rent, utilities, food, and commute can make every spending choice feel more serious.";
  if (text.includes("career + family support")) return "Choosing “Career + family support” usually means salary is carrying both personal growth and family responsibility. Progress can feel slower when home support and career needs compete for the same income.";
  if (text.includes("career growth pressure")) return "Choosing “Career growth pressure” usually means ambition is affecting money decisions. Courses, tools, image, or networking may feel important because career progress feels urgent.";
  if (text.includes("salary disappears fast")) return "Choosing “Salary disappears fast” usually means income looks stable at first but does not stay long enough to feel secure. Repeated costs, lifestyle upgrades, or automatic payments may be quietly taking space.";
  if (text.includes("shift/bpo routine")) return "Choosing “Shift/BPO routine” usually means schedule and energy are part of the money pattern. Sleep, commute, calls, and recovery time can strongly affect food, transport, and comfort spending.";
  if (text.includes("debt/pay-later recovery")) return "Choosing “Debt/pay-later recovery” usually means old obligations are still entering the current salary. Payday may feel less free when past balances or repayments are already waiting.";

  if (text.includes("first salary rhythm")) return "Choosing “First salary rhythm” usually means the user is still learning how salary behaves across a full month. Payday may feel clear, but the real test is how the money lasts between obligations.";
  if (text.includes("twice-a-month cutoff")) return "Choosing “Twice-a-month cutoff” usually means the month is divided into two money cycles. One cutoff can feel manageable while the other carries bills, gaps, or tighter choices.";
  if (text.includes("monthly salary + new bills")) return "Choosing “Monthly salary + new bills” usually means income and responsibility are growing at the same time. The salary may feel larger, but new bills quickly make it more structured.";
  if (text.includes("salary + side income")) return "Choosing “Salary + side income” usually means the main income has support from extra work. That can create breathing room, but it may also make spending feel safer than it really is.";
  if (text.includes("bills are due before payday")) return "Choosing “Bills are due before payday” usually means timing is the main pressure. Even with salary, due dates can create stress when payments arrive before income does.";
  if (text.includes("rent and utilities monthly")) return "Choosing “Rent and utilities monthly” usually means fixed costs are shaping the budget first. These obligations make independence feel real because they return every month.";
  if (text.includes("food and commute drain the week")) return "Choosing “Food and commute drain the week” usually means daily movement and meals are taking steady money. The pressure may come from repetition more than from one large expense.";
  if (text.includes("subscription and lifestyle costs stack")) return "Choosing “Subscription and lifestyle costs stack” usually means small recurring expenses are accumulating quietly. Each cost may feel manageable alone, but together they reduce salary space.";
  if (text.includes("part of salary goes home")) return "Choosing “Part of salary goes home” usually means family support is already part of the salary rhythm. Personal plans may need to adjust because the income is not fully personal.";
  if (text.includes("family requests change the month")) return "Choosing “Family requests change the month” usually means the budget can shift when home needs appear. Planning may feel harder because responsibility can arrive without warning.";
  if (text.includes("support is fixed but income is tight")) return "Choosing “Support is fixed but income is tight” usually means family help has a regular place in the budget even when salary is limited. The pressure comes from keeping support steady without losing personal stability.";
  if (text.includes("i give extra when emergencies happen")) return "Choosing “I give extra when emergencies happen” usually means family emergencies can override the original plan. It reflects care, but it can also make the month financially unpredictable.";
  if (text.includes("salary supports career upgrades")) return "Choosing “Salary supports career upgrades” usually means income is being used for growth, not only survival. Career spending can feel necessary when the user is trying to level up.";
  if (text.includes("courses or tools feel necessary")) return "Choosing “Courses or tools feel necessary” usually means skill growth is affecting spending. The user may feel that investing in work readiness is part of staying competitive.";
  if (text.includes("networking and image costs appear")) return "Choosing “Networking and image costs appear” usually means professional presence is starting to cost money. Clothes, events, meals, or social expectations may feel connected to career progress.";
  if (text.includes("promotion pressure affects spending")) return "Choosing “Promotion pressure affects spending” usually means ambition is creating money pressure. Spending may feel linked to proving readiness or keeping up with the next level.";
  if (text.includes("payday feels strong then fades")) return "Choosing “Payday feels strong then fades” usually means salary feels powerful at first but weakens quickly. The problem is often the gap between payday confidence and actual monthly needs.";
  if (text.includes("cutoff survival repeats")) return "Choosing “Cutoff survival repeats” usually means the same tight period keeps returning before the next pay. It suggests salary rhythm exists, but the middle or end of the cycle feels pressured.";
  if (text.includes("installments eat the salary")) return "Choosing “Installments eat the salary” usually means fixed repayments are taking money before choices begin. The salary may arrive, but part of it is already committed.";
  if (text.includes("lifestyle costs grow quietly")) return "Choosing “Lifestyle costs grow quietly” usually means spending has increased without feeling dramatic. Comfort, convenience, and upgrades may be expanding in the background.";
  if (text.includes("salary is fixed but sleep is unstable")) return "Choosing “Salary is fixed but sleep is unstable” usually means income may be predictable while the body is not. Low recovery can change spending through food, transport, and comfort choices.";
  if (text.includes("night shift changes spending")) return "Choosing “Night shift changes spending” usually means work hours affect the budget. Meals, transport, recovery, and convenience can look different when the schedule is outside normal routines.";
  if (text.includes("commute and meals vary by shift")) return "Choosing “Commute and meals vary by shift” usually means daily costs change depending on schedule. The budget may feel harder to predict when shifts change food and transport needs.";
  if (text.includes("incentives or ot affect income")) return "Choosing “Incentives or OT affect income” usually means extra income depends on workload. The user may feel more flexible in some cutoffs, but that flexibility may come with fatigue.";
  if (text.includes("debt payments hit every cutoff")) return "Choosing “Debt payments hit every cutoff” usually means repayments are built into each salary cycle. Income may feel reduced before personal choices even start.";
  if (text.includes("pay-later balances stack")) return "Choosing “Pay-later balances stack” usually means past purchases are accumulating into present pressure. The amounts may feel small separately but heavier when they arrive together.";
  if (text.includes("old shortfalls use new salary")) return "Choosing “Old shortfalls use new salary” usually means the current pay is repairing previous gaps. It can make progress feel delayed because new income is already assigned to old needs.";
  if (text.includes("minimum payments keep repeating")) return "Choosing “Minimum payments keep repeating” usually means repayment is happening without fully reducing the pressure. The cycle may feel controlled on paper but still emotionally heavy.";

  if (text.includes("learning work-life balance")) return "Choosing “Learning work-life balance” usually means the user is still adjusting to how work affects time, money, and energy. Spending may change as the routine becomes more demanding.";
  if (text.includes("busy but manageable")) return "Choosing “Busy but manageable” usually means the schedule is active but not yet overwhelming. There is still room to plan if the money routine stays simple.";
  if (text.includes("new office/commute routine")) return "Choosing “New office/commute routine” usually means the daily pattern is still settling. Travel, meals, and workday habits may be creating new spending rhythms.";
  if (text.includes("adjusting to adulting")) return "Choosing “Adjusting to adulting” usually means responsibility is becoming more real. The user may be learning how bills, work, rest, and personal needs fit together.";
  if (text.includes("cutoff week feels tight")) return "Choosing “Cutoff week feels tight” usually means the period before payday creates pressure. Spending may feel restricted because the remaining money has to stretch.";
  if (text.includes("adulting tasks take mental space")) return "Choosing “Adulting tasks take mental space” usually means bills, errands, and responsibilities are using mental energy. Money decisions may feel heavier because life admin is already taking space.";
  if (text.includes("household errands add pressure")) return "Choosing “Household errands add pressure” usually means independence brings small tasks that still cost time and money. Groceries, repairs, laundry, or bills may quietly shape the week.";
  if (text.includes("work and home responsibilities overlap")) return "Choosing “Work and home responsibilities overlap” usually means personal life and job demands are both active. The user may feel stretched because neither side fully pauses.";
  if (text.includes("planning is possible but tiring")) return "Choosing “Planning is possible but tiring” usually means structure can work, but it requires energy. The budget may not be impossible; it just feels mentally demanding.";
  if (text.includes("bill timing feels stressful")) return "Choosing “Bill timing feels stressful” usually means due dates are creating emotional pressure. The issue may be timing as much as the amount.";
  if (text.includes("career and family needs overlap")) return "Choosing “Career and family needs overlap” usually means professional growth and home support are competing for attention. The user may be trying to move forward while still carrying responsibility.";
  if (text.includes("i feel responsible even after work")) return "Choosing “I feel responsible even after work” usually means duty does not end when the shift ends. Family or personal obligations may continue to use energy after working hours.";
  if (text.includes("rest feels guilty sometimes")) return "Choosing “Rest feels guilty sometimes” usually means recovery may feel undeserved when responsibilities remain. This can make the user push past fatigue instead of resting freely.";
  if (text.includes("boundaries are hard to explain")) return "Choosing “Boundaries are hard to explain” usually means saying no or setting limits feels emotionally complicated. The pressure is partly financial and partly relational.";
  if (text.includes("family needs interrupt plans")) return "Choosing “Family needs interrupt plans” usually means the budget can change when home needs appear. Even a good plan may feel fragile when family pressure enters suddenly.";
  if (text.includes("workload is growing")) return "Choosing “Workload is growing” usually means career responsibility is increasing. More work can affect spending because time, energy, and recovery needs also grow.";
  if (text.includes("i feel behind others")) return "Choosing “I feel behind others” usually means comparison is affecting the stage. Spending or pressure may come from trying to close the gap with peers or expectations.";
  if (text.includes("i am investing in myself")) return "Choosing “I am investing in myself” usually means growth is becoming part of the budget. The user may see spending on skills, tools, or readiness as necessary for progress.";
  if (text.includes("rest and ambition compete")) return "Choosing “Rest and ambition compete” usually means the desire to grow is clashing with the need to recover. Money choices may reflect that tension between progress and exhaustion.";
  if (text.includes("routine is stable but tiring")) return "Choosing “Routine is stable but tiring” usually means predictability exists, but energy still gets drained. Stable work does not always mean the body or budget feels light.";
  if (text.includes("spending feels automatic")) return "Choosing “Spending feels automatic” usually means purchases are happening with little pause. The pattern may be familiar enough that it no longer feels like a decision.";
  if (text.includes("weekends become recovery spending")) return "Choosing “Weekends become recovery spending” usually means rest days are turning into spending days. After a demanding week, money may become a way to feel restored.";
  if (text.includes("i know i should plan earlier")) return "Choosing “I know I should plan earlier” usually means awareness is present, but timing is the struggle. The user may see the pattern only after money has already moved.";
  if (text.includes("sleep schedule affects decisions")) return "Choosing “Sleep schedule affects decisions” usually means low or unusual sleep changes spending behavior. Tired choices may prioritize convenience, food, or comfort.";
  if (text.includes("long calls or shifts drain energy")) return "Choosing “Long calls or shifts drain energy” usually means the workday leaves limited recovery. Money decisions after work may be more emotional or convenience-based.";
  if (text.includes("rest days become spending days")) return "Choosing “Rest days become spending days” usually means days off may become the main time for reward or recovery purchases. The spending may feel connected to finally having space to breathe.";
  if (text.includes("tracking feels hard after work")) return "Choosing “Tracking feels hard after work” usually means financial visibility drops when energy is already low. The issue is not lack of concern, but reduced capacity after a draining shift.";
  if (text.includes("money feels like repair mode")) return "Choosing “Money feels like repair mode” usually means salary is being used to fix previous pressure. The user may feel like each cutoff is about catching up instead of moving forward.";
  if (text.includes("old choices affect current peace")) return "Choosing “Old choices affect current peace” usually means past money decisions still affect emotional calm. Even normal expenses can feel heavier when old obligations remain.";
  if (text.includes("i feel tired from catching up")) return "Choosing “I feel tired from catching up” usually means financial recovery itself is draining. The user may be doing the right things but still feel worn down by the process.";
  if (text.includes("there is little room to reset")) return "Choosing “There is little room to reset” usually means there is not much space between old pressure and new needs. Even small mistakes can feel hard to recover from.";

  if (text.includes("living costs feel real")) return "Choosing “Living costs feel real” usually means expenses are no longer theoretical. Food, bills, commute, and basic routines may now be shaping daily money decisions.";
  if (text.includes("payday reward spending")) return "Choosing “Payday reward spending” usually means salary is connected to relief and celebration. The purchase may feel deserved after work, but it can shape the rest of the cutoff.";
  if (text.includes("low emergency buffer")) return "Choosing “Low emergency buffer” usually means there is little protection if something unexpected happens. The user may feel okay only when the month goes exactly as planned.";
  if (text.includes("lifestyle comparison")) return "Choosing “Lifestyle comparison” usually means other people’s choices are affecting what feels normal. Spending pressure may come from wanting to keep up or look stable.";
  if (text.includes("cutoff dependency")) return "Choosing “Cutoff dependency” usually means the budget depends heavily on the next salary date. The days before payday may feel tight or emotionally loaded.";
  if (text.includes("rent, utilities, and food")) return "Choosing “Rent, utilities, and food” usually means core living costs are the main pressure. These are not optional expenses, so they shape the whole salary plan.";
  if (text.includes("emergency buffer gap")) return "Choosing “Emergency buffer gap” usually means the user has little room for surprise costs. Even a small problem can interrupt the budget when there is no cushion.";
  if (text.includes("cash-flow timing mismatch")) return "Choosing “Cash-flow timing mismatch” usually means income and due dates do not line up smoothly. The month can feel stressful even if the total income seems enough.";
  if (text.includes("convenience spending after work")) return "Choosing “Convenience spending after work” usually means tiredness is influencing purchases. After work, ease can feel more important than the cheapest option.";
  if (text.includes("family contribution")) return "Choosing “Family contribution” usually means support at home is a clear financial responsibility. It can make personal goals feel slower because part of the salary already has a role.";
  if (text.includes("guilt when i protect my own money")) return "Choosing “Guilt when I protect my own money” usually means boundaries feel emotionally difficult. Saving or saying no may feel uncomfortable even when it is necessary.";
  if (text.includes("weak personal buffer")) return "Choosing “Weak personal buffer” usually means the user has little money left for personal safety. Family support, bills, or daily costs may be using most of the salary.";
  if (text.includes("career costs compete with home needs")) return "Choosing “Career costs compete with home needs” usually means growth spending and family responsibility are pulling from the same income. The pressure comes from wanting to honor both.";
  if (text.includes("career investment pressure")) return "Choosing “Career investment pressure” usually means career growth feels financially demanding. The user may feel pressure to spend on development before feeling fully ready.";
  if (text.includes("professional image spending")) return "Choosing “Professional image spending” usually means appearance or presentation is becoming part of career pressure. Clothes, tools, or status signals may feel tied to being taken seriously.";
  if (text.includes("burnout from proving myself")) return "Choosing “Burnout from proving myself” usually means the user is spending energy to show capability. The pressure may come from wanting to be seen as ready, strong, or ahead.";
  if (text.includes("lifestyle creep")) return "Choosing “Lifestyle creep” usually means spending has slowly grown with income. The change may feel normal because salary looks more stable than before.";
  if (text.includes("subscriptions and installments")) return "Choosing “Subscriptions and installments” usually means recurring costs are taking space before new decisions happen. The salary may feel smaller because several expenses are already scheduled.";
  if (text.includes("low savings despite stable income")) return "Choosing “Low savings despite stable income” usually means income exists, but it is not turning into security. The issue may be the gap between earning and keeping.";
  if (text.includes("sleep and recovery spending")) return "Choosing “Sleep and recovery spending” usually means spending is connected to the need to feel restored. Tiredness may turn food, comfort, or convenience into recovery tools.";
  if (text.includes("convenience food and transport")) return "Choosing “Convenience food and transport” usually means schedule pressure is affecting daily spending. Fast choices may become normal when time and energy are limited.";
  if (text.includes("burnout spending risk")) return "Choosing “Burnout spending risk” usually means exhaustion may be turning into spending. The user may buy relief because recovery feels hard to get in other ways.";
  if (text.includes("debt repayment pressure")) return "Choosing “Debt repayment pressure” usually means repayment is taking serious space in the current salary. The pressure is not only paying back, but living normally while doing it.";
  if (text.includes("borrowing again before payday")) return "Choosing “Borrowing again before payday” usually means the gap before salary is becoming risky. Borrowing may feel like a bridge when essentials arrive before money does.";
  if (text.includes("avoiding money because it feels heavy")) return "Choosing “Avoiding money because it feels heavy” usually means the numbers feel emotionally difficult to face. Avoidance can be a sign that the pressure already feels overwhelming.";

  if (text.includes("i reward myself after payday")) return "Choosing “I reward myself after payday” usually means payday feels connected to emotional relief. Spending may feel like proof that the effort was worth it.";
  if (text.includes("i avoid tracking when busy")) return "Choosing “I avoid tracking when busy” usually means visibility drops when work or life gets crowded. The user may care about the budget but lose track when attention is stretched.";
  if (text.includes("i say yes to social spending")) return "Choosing “I say yes to social spending” usually means connection and belonging are affecting the budget. It can be hard to refuse when spending is tied to relationships or image.";
  if (text.includes("i save what is left")) return "Choosing “I save what is left” usually means saving happens after spending instead of before it. The intention is there, but the leftover amount may change too much.";
  if (text.includes("i delay checking balances")) return "Choosing “I delay checking balances” usually means the user may avoid looking because the answer feels stressful. The delay can protect emotions briefly while uncertainty grows.";
  if (text.includes("i use convenience to save energy")) return "Choosing “I use convenience to save energy” usually means spending is helping conserve limited energy. The purchase may be about surviving the day, not just wanting comfort.";
  if (text.includes("i move money around before payday")) return "Choosing “I move money around before payday” usually means the user is trying to stretch funds near the end of the cycle. It suggests the budget needs flexibility because timing is tight.";
  if (text.includes("i set aside bills first")) return "Choosing “I set aside bills first” usually means fixed obligations are being protected early. This shows responsibility and awareness around independent living costs.";
  if (text.includes("i give even when tight")) return "Choosing “I give even when tight” usually means support continues even when the budget is already strained. The emotional need to help may be stronger than the available margin.";
  if (text.includes("i delay my own goals")) return "Choosing “I delay my own goals” usually means personal progress is being moved back to handle responsibility. The user may be choosing stability for others before growth for self.";
  if (text.includes("i hide money stress")) return "Choosing “I hide money stress” usually means the pressure is being carried quietly. The situation may look fine outside while feeling heavy inside.";
  if (text.includes("i try to set a support limit")) return "Choosing “I try to set a support limit” usually means the user is attempting boundaries without abandoning responsibility. It shows care, but also the need to protect personal stability.";
  if (text.includes("i buy tools or courses quickly")) return "Choosing “I buy tools or courses quickly” usually means career urgency can lead to fast purchases. The user may be trying to feel prepared before the pressure settles.";
  if (text.includes("i spend to feel more prepared")) return "Choosing “I spend to feel more prepared” usually means money is being used to reduce career anxiety. Buying something can feel like progress when the next step feels uncertain.";
  if (text.includes("i compare my progress")) return "Choosing “I compare my progress” usually means career pressure is being measured against others. The emotional weight may come from feeling behind, not only from actual finances.";
  if (text.includes("i plan upgrades carefully")) return "Choosing “I plan upgrades carefully” usually means career spending is being approached with caution. The user still wants growth, but not at the cost of losing control.";
  if (text.includes("i overspend early then restrict later")) return "Choosing “I overspend early then restrict later” usually means payday confidence is followed by cutoff pressure. The month may swing between freedom and restriction.";
  if (text.includes("i pay later for wants")) return "Choosing “I pay later for wants” usually means wants are being moved into future income. It can make the present easier while making the next cutoff heavier.";
  if (text.includes("i ignore small recurring costs")) return "Choosing “I ignore small recurring costs” usually means repeated payments are easy to overlook. Subscriptions, fees, or installments can quietly reduce the salary before it is noticed.";
  if (text.includes("i want clearer payday rules")) return "Choosing “I want clearer payday rules” usually means the user recognizes that payday needs structure. The issue is not lack of income, but lack of a reliable starting pattern.";
  if (text.includes("i buy comfort after shifts")) return "Choosing “I buy comfort after shifts” usually means spending is tied to recovery after draining work. The purchase may feel like a way to feel human again after a hard shift.";
  if (text.includes("i choose convenience to survive the day")) return "Choosing “I choose convenience to survive the day” usually means the user is spending to reduce pressure in the moment. Convenience becomes easier when the schedule is already exhausting.";
  if (text.includes("i forget to track when tired")) return "Choosing “I forget to track when tired” usually means money visibility drops when energy is low. The behavior is connected to fatigue, not simply discipline.";
  if (text.includes("i prepare shift money in advance")) return "Choosing “I prepare shift money in advance” usually means the user is trying to plan around an irregular routine. It reflects awareness that shift days need their own money rhythm.";
  if (text.includes("i pay minimums and hope it improves")) return "Choosing “I pay minimums and hope it improves” usually means debt is being managed enough to continue, but not enough to feel free. The pressure can stay active when payments only keep the situation moving.";
  if (text.includes("i avoid checking the total")) return "Choosing “I avoid checking the total” usually means the full number feels emotionally heavy. Avoidance often appears when the user already senses the pressure is bigger than comfortable.";
  if (text.includes("i borrow again when short")) return "Choosing “I borrow again when short” usually means the debt cycle is still active when cash runs out. Borrowing may feel like the only option near the end of a cutoff.";
  if (text.includes("i want a no-new-debt rule")) return "Choosing “I want a no-new-debt rule” usually means the user wants to stop adding pressure before solving everything. It shows a desire for a clean boundary around future borrowing.";

  if (text.includes("build salary rhythm")) return "Choosing “Build salary rhythm” usually means the user wants income to feel more structured across the whole month. It reflects the need for a repeatable pattern, not just payday excitement.";
  if (text.includes("save before spending")) return "Choosing “Save before spending” usually means security needs to come before flexible purchases. The user is trying to stop savings from depending only on leftovers.";
  if (text.includes("control payday rewards")) return "Choosing “Control payday rewards” usually means payday spending still matters, but needs a limit. The goal is balance between enjoying income and protecting the rest of the cutoff.";
  if (text.includes("start emergency fund")) return "Choosing “Start emergency fund” usually means the user wants a small safety layer. It reflects the need to feel less exposed when unexpected costs appear.";
  if (text.includes("protect fixed bills first")) return "Choosing “Protect fixed bills first” usually means essential obligations need to be secured before anything flexible. This answer centers on rent, utilities, food, and other non-negotiables.";
  if (text.includes("build one-month buffer slowly")) return "Choosing “Build one-month buffer slowly” usually means the user wants more breathing room over time. It accepts gradual progress instead of expecting instant financial safety.";
  if (text.includes("reduce convenience leaks")) return "Choosing “Reduce convenience leaks” usually means repeated easy purchases are taking space. The goal is to notice where tired choices are quietly affecting the salary.";
  if (text.includes("make payday rules automatic")) return "Choosing “Make payday rules automatic” usually means the first decisions after salary should become easier. It reflects a need for structure before the money starts moving.";
  if (text.includes("help family without losing stability")) return "Choosing “Help family without losing stability” usually means support still matters, but personal safety matters too. The goal is to care without becoming financially empty.";
  if (text.includes("set a support boundary")) return "Choosing “Set a support boundary” usually means family help needs a clearer limit. It reflects the emotional challenge of giving while protecting personal stability.";
  if (text.includes("protect my personal buffer")) return "Choosing “Protect my personal buffer” usually means the user needs money that remains safe for self-stability. This is about having protection even while carrying responsibility.";
  if (text.includes("keep career growth funded")) return "Choosing “Keep career growth funded” usually means professional progress still needs space in the budget. The user is trying not to lose growth while helping at home.";
  if (text.includes("invest without panic")) return "Choosing “Invest without panic” usually means career spending needs calm judgment. The user wants growth, but not purchases driven by fear or comparison.";
  if (text.includes("separate career fund")) return "Choosing “Separate career fund” usually means growth expenses need their own boundary. This answer treats career development as important but not unlimited.";
  if (text.includes("control comparison spending")) return "Choosing “Control comparison spending” usually means the user wants to reduce purchases driven by feeling behind. It points to pressure from peers, image, or career timelines.";
  if (text.includes("protect rest and savings")) return "Choosing “Protect rest and savings” usually means ambition should not consume recovery or security. The user is trying to grow without exhausting the whole system.";
  if (text.includes("stop salary leaks")) return "Choosing “Stop salary leaks” usually means money is leaving through repeated patterns more than one major mistake. The goal is to make stable income actually feel stable.";
  if (text.includes("build automatic savings")) return "Choosing “Build automatic savings” usually means savings need to happen before the salary is absorbed. It reflects a desire for security that does not depend on willpower at the end.";
  if (text.includes("control installments")) return "Choosing “Control installments” usually means recurring repayments need a clearer limit. The user may feel salary shrinking because too much is already committed.";
  if (text.includes("make cutoff smoother")) return "Choosing “Make cutoff smoother” usually means the user wants fewer tight days before the next pay. It reflects the desire for a calmer salary rhythm across the whole cycle.";
  if (text.includes("create shift-proof money rules")) return "Choosing “Create shift-proof money rules” usually means the budget must survive irregular energy and schedule. The user needs rules that still work after tiring shifts.";
  if (text.includes("protect recovery without overspending")) return "Choosing “Protect recovery without overspending” usually means rest and relief matter, but they need boundaries. This answer recognizes that recovery can affect the budget.";
  if (text.includes("stabilize cutoff rhythm")) return "Choosing “Stabilize cutoff rhythm” usually means the user wants each pay cycle to feel less unpredictable. It points to smoother planning between salary dates.";
  if (text.includes("stop new debt first")) return "Choosing “Stop new debt first” usually means the first priority is preventing the pressure from growing. It reflects a need to stop adding obligations before fixing all old ones.";
  if (text.includes("create repayment rhythm")) return "Choosing “Create repayment rhythm” usually means debt needs a predictable place in the budget. Repayment feels less overwhelming when it has a steady pattern.";
  if (text.includes("protect essentials while repaying")) return "Choosing “Protect essentials while repaying” usually means debt should not erase daily needs. The user is trying to pay back without becoming unstable.";
  if (text.includes("build a small no-borrow buffer")) return "Choosing “Build a small no-borrow buffer” usually means even a small cushion could reduce borrowing pressure. The goal is a little space before the next shortfall appears.";

  return `This Young Professional answer still needs a dedicated meaning: “${label}”.`;
}

function buildYoungProfessionalSelectionMeanings() {
  const meanings = new Map();
  collectYoungProfessionalOptionsByStep().forEach(({ raw, step }) => {
    const label = getYoungProfessionalDisplayLabel(raw) || clean(raw);
    const body = meaningFor(label, step);
    meanings.set(loud(raw), body);
    meanings.set(loud(label), body);
  });
  Object.values(YOUNG_PROFESSIONAL_DISPLAY_LABELS).forEach((label) => {
    const normalized = loud(label);
    if (!meanings.has(normalized)) meanings.set(normalized, meaningFor(label, "setup"));
  });
  return meanings;
}

const YOUNG_PROFESSIONAL_SELECTION_MEANINGS = buildYoungProfessionalSelectionMeanings();

function updateBoard() {
  const active = findActiveQuestionSection();
  const { title, summary } = findStageBoard();
  if (!active || !title || !summary) return;
  const selected = selectedOption(active.section);
  const label = getYoungProfessionalDisplayLabel(selected) || selected;
  const body = YOUNG_PROFESSIONAL_SELECTION_MEANINGS.get(loud(selected))
    || YOUNG_PROFESSIONAL_SELECTION_MEANINGS.get(loud(label))
    || `This Young Professional answer still needs a dedicated meaning: “${label}”.`;
  const signature = `${YOUNG_PROFESSIONAL_STAGE_KEY}:${active.meta.key}:${selected}:${label}:${body}`;

  if (title.dataset.claraYoungProfessionalSignature !== signature) {
    title.textContent = label;
    title.dataset.claraYoungProfessionalSignature = signature;
  }
  if (summary.dataset.claraYoungProfessionalSignature !== signature) {
    summary.textContent = body;
    summary.dataset.claraYoungProfessionalSignature = signature;
    summary.classList.add("clara-flow-board-summary");
    summary.style.setProperty("white-space", "normal", "important");
    summary.style.setProperty("line-height", "1.5", "important");
  }
}

function installYoungProfessionalSetupBoardPolish() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraYoungProfessionalSetupBoardPolishInstalled) return;
  window.__claraYoungProfessionalSetupBoardPolishInstalled = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      updateBoard();
    }, 35);
  };

  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  document.addEventListener("click", () => {
    schedule();
    window.setTimeout(updateBoard, 90);
    window.setTimeout(updateBoard, 180);
  }, true);
}

try {
  installYoungProfessionalSetupBoardPolish();
} catch (error) {
  console.warn("CLARA Young Professional setup board polish failed:", error);
}
