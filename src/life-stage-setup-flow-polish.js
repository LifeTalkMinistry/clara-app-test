import {
  WORKING_STUDENT_STAGE_KEY,
  WORKING_STUDENT_ROOTS,
  WORKING_STUDENT_BRANCHES,
  WORKING_STUDENT_DISPLAY_LABELS,
  getWorkingStudentDisplayLabel,
} from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";
import {
  YOUNG_PROFESSIONAL_STAGE_KEY,
  YOUNG_PROFESSIONAL_ROOTS,
  YOUNG_PROFESSIONAL_BRANCHES,
  YOUNG_PROFESSIONAL_DISPLAY_LABELS,
  getYoungProfessionalDisplayLabel,
} from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";
import {
  LIVING_WITH_PARTNER_STAGE_KEY,
  LIVING_WITH_PARTNER_ROOTS,
  LIVING_WITH_PARTNER_BRANCHES,
  getLivingWithPartnerDisplayLabel,
} from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";
import { LIFE_STAGE_INTELLIGENCE, STAGES } from "./components/fresh/main-dashboard/dashboard-panels/me/lifeStageIntelligenceData";

const FLOW_MARKER = "CLARA CONTEXT BOARD";
const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const STEP_META = {
  "CURRENT SETUP": { key: "setup", label: "CURRENT SETUP", question: "Which setup feels closest to your real life right now?", index: 0 },
  "MONEY RHYTHM": { key: "rhythm", label: "MONEY RHYTHM", question: "How does money usually come into your week or month?", index: 1 },
  "WEEKLY LOAD": { key: "workload", label: "WEEKLY LOAD", question: "How stretched does your normal week feel?", index: 2 },
  "PRESSURE RIGHT NOW": { key: "pressure", label: "PRESSURE RIGHT NOW", question: "What is putting the most pressure on your money right now?", index: 3 },
  "PRESSURE RESPONSE": { key: "coping", label: "WHEN PRESSURE HITS", question: "What do you usually do when money pressure gets heavy?", index: 4 },
  "WHEN PRESSURE HITS": { key: "coping", label: "WHEN PRESSURE HITS", question: "What do you usually do when money pressure gets heavy?", index: 4 },
  "PROTECTION GOAL": { key: "goal", label: "WHAT TO PROTECT", question: "What are you trying to protect most right now?", index: 5 },
  "WHAT TO PROTECT": { key: "goal", label: "WHAT TO PROTECT", question: "What are you trying to protect most right now?", index: 5 },
};

const STAGE_NAMES = Array.from(new Set([WORKING_STUDENT_STAGE_KEY, YOUNG_PROFESSIONAL_STAGE_KEY, LIVING_WITH_PARTNER_STAGE_KEY, ...STAGES]));

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();
const lower = (value) => clean(value).toLowerCase();
const isVisible = (node) => !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
const getStepMeta = (text) => STEP_META[loud(text)] || null;

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

function collectFieldOptions(fields = {}) {
  return Object.values(fields || {}).flatMap((value) => Array.isArray(value) ? value : []);
}

function makeOptionSet({ roots = [], branches = {}, fields = {}, displayLabels = {} } = {}) {
  return new Set([
    ...roots,
    ...collectBranchOptions(branches),
    ...collectFieldOptions(fields),
    ...Object.keys(displayLabels),
    ...Object.values(displayLabels),
  ].map(loud));
}

const STAGE_OPTION_SETS = STAGE_NAMES.reduce((sets, stage) => {
  sets[stage] = makeOptionSet({ fields: LIFE_STAGE_INTELLIGENCE[stage]?.fields || {} });
  return sets;
}, {});

STAGE_OPTION_SETS[WORKING_STUDENT_STAGE_KEY] = makeOptionSet({
  roots: WORKING_STUDENT_ROOTS,
  branches: WORKING_STUDENT_BRANCHES,
  fields: LIFE_STAGE_INTELLIGENCE[WORKING_STUDENT_STAGE_KEY]?.fields || {},
  displayLabels: WORKING_STUDENT_DISPLAY_LABELS,
});
STAGE_OPTION_SETS[YOUNG_PROFESSIONAL_STAGE_KEY] = makeOptionSet({
  roots: YOUNG_PROFESSIONAL_ROOTS,
  branches: YOUNG_PROFESSIONAL_BRANCHES,
  fields: LIFE_STAGE_INTELLIGENCE[YOUNG_PROFESSIONAL_STAGE_KEY]?.fields || {},
  displayLabels: YOUNG_PROFESSIONAL_DISPLAY_LABELS,
});
STAGE_OPTION_SETS[LIVING_WITH_PARTNER_STAGE_KEY] = makeOptionSet({
  roots: LIVING_WITH_PARTNER_ROOTS,
  branches: LIVING_WITH_PARTNER_BRANCHES,
  fields: LIFE_STAGE_INTELLIGENCE[LIVING_WITH_PARTNER_STAGE_KEY]?.fields || {},
});

function branchStepOptions(branch, key) {
  const entry = branch?.[key];
  if (Array.isArray(entry)) return entry;
  if (entry && typeof entry === "object") return Object.values(entry).flatMap((list) => Array.isArray(list) ? list : []);
  return [];
}

function collectWorkingStudentOptionsByStep() {
  const rows = [];
  WORKING_STUDENT_ROOTS.forEach((raw) => rows.push({ raw, step: "setup" }));
  Object.values(WORKING_STUDENT_BRANCHES || {}).forEach((branch) => {
    (branch.rhythm || []).forEach((raw) => rows.push({ raw, step: "rhythm" }));
    ["workload", "pressure", "coping", "goal"].forEach((step) => {
      branchStepOptions(branch, step).forEach((raw) => rows.push({ raw, step }));
    });
  });
  return rows;
}

function inferWorkingStudentStepFromLabel(label) {
  const text = lower(label);
  if (["save", "protect", "build", "create", "control", "reduce", "avoid debt", "set a", "finish", "choose", "stop pressure", "repayment rhythm", "buffer"].some((term) => text.includes(term))) return "goal";
  if (["i ", "borrow", "avoid", "delay", "cut", "reward", "pause", "overwork", "forget", "push", "spend when", "switch plans", "start saving"].some((term) => text.includes(term))) return "coping";
  if (["pressure", "cost", "debt", "tuition", "fare", "food", "family contribution", "weak", "margin", "goals feel", "priority"].some((term) => text.includes(term))) return "pressure";
  if (["tired", "busy", "heavy", "routine", "workload", "deadlines", "commute", "little time", "stretched", "overlap", "learning while earning"].some((term) => text.includes(term))) return "workload";
  if (["income", "pay", "allowance", "money", "salary", "side", "part-time", "support", "waves"].some((term) => text.includes(term))) return "rhythm";
  return "setup";
}

function workingStudentMeaningFor(label, step) {
  const text = lower(label);

  if (text.includes("supported, learning independence")) return "Choosing “Supported, learning independence” usually means support still exists, but independence is starting to become real. The pressure is learning how to handle personal money before bigger responsibilities arrive.";
  if (text.includes("working to protect school")) return "Choosing “Working to protect school” usually means work is closely tied to staying in school. Money decisions may feel heavier because income is connected to tuition, requirements, fare, and attendance.";
  if (text.includes("studying while helping family")) return "Choosing “Studying while helping family” usually means student money is connected to people at home, not only personal needs. Helping family can feel meaningful and heavy at the same time.";
  if (text.includes("mostly self-supporting")) return "Choosing “Mostly self-supporting” usually means school and daily survival are being carried with limited support. Food, fare, school costs, and timing gaps can make every peso feel important.";
  if (text.includes("exhausted by school-work overlap")) return "Choosing “Exhausted by school-work overlap” usually means energy is part of the money problem. When school, work, and rest compete, spending can shift toward shortcuts, comfort, or skipped tracking.";
  if (text.includes("building with unstable income")) return "Choosing “Building with unstable income” usually means ambition is present, but the money rhythm is not fully steady yet. Planning can feel hard when future goals are clear but income still changes.";
  if (text.includes("recovering from money pressure")) return "Choosing “Recovering from money pressure” usually means past money stress is still affecting the current season. Even new income can feel less free when old pressure, delayed needs, or recovery spending is still present.";

  if (text.includes("allowance base + extra work")) return "Choosing “Allowance base + extra work” usually means allowance may cover the basics while work income gives extra breathing room. The extra money can feel helpful, but it may disappear quickly without a clear role.";
  if (text.includes("fixed part-time pay")) return "Choosing “Fixed part-time pay” usually means income is more predictable, but still limited. A fixed part-time rhythm can make planning easier while small leaks still matter.";
  if (text.includes("occasional side income")) return "Choosing “Occasional side income” usually means money comes in sometimes, but not always when needed. Planning can feel flexible and uncertain at the same time.";
  if (text.includes("extra money leaks fast")) return "Choosing “Extra money leaks fast” usually means extra income arrives, but small purchases absorb it quickly. The pressure is usually repeated little choices, not one major expense.";
  if (text.includes("money arrives after bills are due")) return "Choosing “Money arrives after bills are due” usually means income timing is working against the payment schedule. The week can feel late before the money even arrives.";
  if (text.includes("borrow, then repay repeatedly")) return "Choosing “I borrow, then repay repeatedly” usually means borrowing has become part of the money rhythm. Repayment may happen, but the next income can still feel already reduced.";
  if (text.includes("pressure carries into next week")) return "Choosing “Pressure carries into next week” usually means the current week is still affected by the last one. Money stress can feel continuous when expenses keep arriving before recovery happens.";
  if (text.includes("debt/delays affect the week")) return "Choosing “Debt/delays affect the week” usually means old obligations are shaping current choices. Even normal spending can feel heavy when debt or delayed payments are already taking space.";

  if (text.includes("the month feels like repair mode")) return "Choosing “The month feels like repair mode” usually means money is being used to fix old pressure instead of starting fresh. It can make the current week feel like recovery before progress even begins.";
  if (text.includes("old pressure affects today")) return "Choosing “Old pressure affects today” usually means earlier money stress is still influencing present choices. Even small decisions can feel heavier when the past is not fully cleared.";
  if (text.includes("tired from catching up")) return "Choosing “Tired from catching up” usually means recovery itself is becoming exhausting. Constantly trying to catch up can make budgeting feel heavy before the next decision even starts.";
  if (text.includes("little room to reset")) return "Choosing “Little room to reset” usually means there is very little space between old pressure and new needs. A small surprise can feel bigger when there is no clear reset point yet.";
  if (text.includes("manageable, but uneven")) return "Choosing “Manageable, but uneven” usually means the situation is not out of control, but it is not fully steady either. Some weeks may feel fine while others require extra adjustment.";
  if (text.includes("busy during exam/work weeks")) return "Choosing “Busy during exam/work weeks” usually means time pressure changes the spending rhythm. School and work peaks can make food, transport, and small shortcuts more likely.";
  if (text.includes("social + school costs overlap")) return "Choosing “Social + school costs overlap” usually means school life and social life are pulling from the same small budget. Spending can feel normal in the moment but tight afterward.";
  if (text.includes("control is still available")) return "Choosing “Control is still available” usually means planning still has room to work. The situation may be tight, but early decisions can still change how the week feels.";
  if (text.includes("manageable, but leak-prone")) return "Choosing “Manageable, but leak-prone” usually means the budget can survive, but small repeated spending can weaken it. The issue is not one big mistake, but quiet leakage.";
  if (text.includes("busy enough to reward myself")) return "Choosing “Busy enough to reward myself” usually means effort is turning into a reason to spend. Rewards may feel deserved, especially when school and work both take energy.";
  if (text.includes("food, fare, school extras")) return "Choosing “Food, fare, school extras” usually means daily attendance costs are taking real space. Small school-related expenses can make the week feel tighter than expected.";
  if (text.includes("social/reward spending")) return "Choosing “Social/reward spending” usually means spending may be tied to relief, belonging, or feeling normal after effort. The concern is the pattern, not one single purchase.";
  if (text.includes("saving feels inconsistent")) return "Choosing “Saving feels inconsistent” usually means saving happens when the week allows it, not always by rhythm. The intention may be present even when the money timing is uneven.";
  if (text.includes("independence while supported")) return "Choosing “Independence while supported” usually means support is still present while personal responsibility is growing. It can feel like a transition between being helped and learning to carry more.";
  if (text.includes("small spending goes unnoticed")) return "Choosing “Small spending goes unnoticed” usually means tiny purchases are easy to miss. The amount may feel harmless one by one, but the pattern can quietly reduce what is left.";
  if (text.includes("i reward myself after effort")) return "Choosing “I reward myself after effort” usually means spending is becoming a way to recognize hard work. It can feel emotionally fair after a tiring school-work day.";
  if (text.includes("i avoid strict tracking")) return "Choosing “I avoid strict tracking” usually means detailed money rules may feel too heavy right now. The situation may need simplicity because pressure and energy are already competing.";
  if (text.includes("i can pause when prepared")) return "Choosing “I can pause when prepared” usually means self-control is stronger when the plan is clear early. The challenge usually appears when decisions happen while rushed or tired.";
  if (text.includes("build discipline early")) return "Choosing “Build discipline early” usually means the goal is to practice control before bigger responsibilities arrive. It shows a desire to grow habits while the stakes are still forming.";
  if (text.includes("save small without guilt")) return "Choosing “Save small without guilt” usually means even tiny savings matter in this season. It reflects the need to protect progress without feeling bad about starting small.";
  if (text.includes("control small leaks")) return "Choosing “Control small leaks” usually means repeated small spending is the main thing to notice. The goal is not perfection, but reducing quiet losses that add up.";
  if (text.includes("give extra income a purpose")) return "Choosing “Give extra income a purpose” usually means extra money needs a clear role before it disappears. It shows the difference between earning more and actually keeping progress.";
  if (text.includes("keep rewards, set limits")) return "Choosing “Keep rewards, set limits” usually means enjoyment still matters, but it needs a boundary. The situation is about balance, not removing every small reward.";

  if (text.includes("fixed work income for tuition")) return "Choosing “Fixed work income for tuition” usually means work money is directly connected to school payments. Income feels important because it helps protect enrollment, deadlines, or requirements.";
  if (text.includes("irregular income for school needs")) return "Choosing “Irregular income for school needs” usually means school costs are real, but the money for them is not always steady. This can make deadlines feel more stressful.";
  if (text.includes("project work before deadlines")) return "Choosing “Project work before deadlines” usually means income appears around urgent school timing. Money and academic pressure may rise together when deadlines get close.";
  if (text.includes("allowance cannot cover school")) return "Choosing “Allowance cannot cover school” usually means basic support is not enough for actual school costs. Extra work or tradeoffs may become part of staying enrolled.";
  if (text.includes("class and work are both required")) return "Choosing “Class and work are both required” usually means neither responsibility can easily be dropped. Time, energy, and money all become part of the same pressure.";
  if (text.includes("school deadlines create pressure")) return "Choosing “School deadlines create pressure” usually means requirements and timing are shaping the budget. Printing, projects, payments, or submissions can make money feel urgent.";
  if (text.includes("little room near payment dates")) return "Choosing “Little room near payment dates” usually means the budget tightens when school fees or deadlines approach. Normal spending can feel riskier around those dates.";
  if (text.includes("i keep going while tired")) return "Choosing “I keep going while tired” usually means effort is continuing even when energy is low. That can make spending decisions harder because rest is already limited.";
  if (text.includes("income waves near deadlines")) return "Choosing “Income waves near deadlines” usually means money movement follows school pressure. Some periods may feel active and urgent while others feel uncertain.";
  if (text.includes("tuition/school payments")) return "Choosing “Tuition/school payments” usually means education costs are the clearest pressure right now. The money question is connected to staying enrolled and keeping school stable.";
  if (text.includes("projects, printing, materials")) return "Choosing “Projects, printing, materials” usually means smaller school requirements are adding up. These costs may look minor individually but still affect the week.";
  if (text.includes("daily fare and food")) return "Choosing “Daily fare and food” usually means attendance itself has a daily cost. Getting to school and eating enough can become part of the budget pressure.";
  if (text.includes("fear of stopping school")) return "Choosing “Fear of stopping school” usually means money pressure is touching the future directly. The concern is not only expense, but the possibility of progress being interrupted.";
  if (text.includes("i cut needs for school costs")) return "Choosing “I cut needs for school costs” usually means school is being protected by reducing personal needs. It can feel responsible, but also heavy when basic comfort gets sacrificed.";
  if (text.includes("i delay non-school payments")) return "Choosing “I delay non-school payments” usually means school costs are taking priority over other obligations. The pressure may move forward when delayed payments wait for the next week.";
  if (text.includes("i work extra while tired")) return "Choosing “I work extra while tired” usually means school pressure is pushing effort beyond normal energy. The money may help, but the body and schedule carry the cost.";
  if (text.includes("i avoid spending on myself")) return "Choosing “I avoid spending on myself” usually means personal needs are being pushed aside to keep school stable. It can feel disciplined and draining at the same time.";
  if (text.includes("protect school continuity")) return "Choosing “Protect school continuity” usually means the priority is staying enrolled and moving forward. Money feels important because it protects momentum.";
  if (text.includes("avoid school-related debt")) return "Choosing “Avoid school-related debt” usually means school costs are already heavy enough without adding borrowing. It reflects the pressure to continue without creating future strain.";
  if (text.includes("keep food and fare stable")) return "Choosing “Keep food and fare stable” usually means daily attendance basics need protection. School becomes harder when transport or meals are uncertain.";
  if (text.includes("finish school without burning out")) return "Choosing “Finish school without burning out” usually means the goal is not only to survive financially, but to keep enough energy to complete the path. School, work, and rest all matter in this answer.";

  if (text.includes("part of income goes home")) return "Choosing “Part of income goes home” usually means home responsibility is already part of the money rhythm. Personal spending may feel different when income is partly shared.";
  if (text.includes("i give when family needs appear")) return "Choosing “I give when family needs appear” usually means support decisions can happen suddenly. The month may change when family needs enter before the budget is ready.";
  if (text.includes("allowance/work money gets shared")) return "Choosing “Allowance/work money gets shared” usually means student money does not stay fully personal. The same money may need to cover school, self, and home.";
  if (text.includes("i earn extra for family")) return "Choosing “I earn extra for family” usually means work income is connected to helping at home. Effort may carry emotional meaning beyond personal progress.";
  if (text.includes("school, work, and home overlap")) return "Choosing “School, work, and home overlap” usually means responsibilities are competing in the same week. It can feel like every area needs attention at once.";
  if (text.includes("i feel responsible while tired")) return "Choosing “I feel responsible while tired” usually means care and obligation continue even when energy is low. Responsibility can feel meaningful but also exhausting.";
  if (text.includes("family needs change the week")) return "Choosing “Family needs change the week” usually means home requests can shift the plan quickly. The budget may need to adjust around people, not only numbers.";
  if (text.includes("i try to keep school stable")) return "Choosing “I try to keep school stable” usually means school remains important even while home needs exist. This answer carries both responsibility and self-protection.";
  if (text.includes("family contribution")) return "Choosing “Family contribution” usually means part of the budget is shaped by helping at home. This can make personal planning feel less flexible.";
  if (text.includes("guilt when i protect my money")) return "Choosing “Guilt when I protect my money” usually means boundaries feel emotionally difficult. Protecting personal needs may feel selfish even when it is necessary.";
  if (text.includes("school costs vs home needs")) return "Choosing “School costs vs home needs” usually means two important responsibilities are competing. The pressure comes from caring about both at the same time.";
  if (text.includes("weak personal buffer")) return "Choosing “Weak personal buffer” usually means there is little protection left for personal surprises. Support and daily needs may be using most of the available money.";
  if (text.includes("i give even when tight")) return "Choosing “I give even when tight” usually means support continues even when the budget is already stretched. The emotional side of helping may be stronger than the numbers.";
  if (text.includes("i delay my own needs")) return "Choosing “I delay my own needs” usually means personal care or essentials are being moved back. It can happen when other responsibilities feel more urgent.";
  if (text.includes("i hide money stress")) return "Choosing “I hide money stress” usually means the pressure is being carried quietly. The situation may look manageable outside while feeling heavy inside.";
  if (text.includes("i set limits but feel guilty")) return "Choosing “I set limits but feel guilty” usually means boundaries exist, but they are emotionally hard. It shows the tension between helping and staying stable.";
  if (text.includes("help family without losing stability")) return "Choosing “Help family without losing stability” usually means the goal is balance between care and self-protection. It reflects a desire to support without becoming financially unsafe.";
  if (text.includes("set a support boundary")) return "Choosing “Set a support boundary” usually means home support needs clearer limits. The answer points to protecting both generosity and personal stability.";
  if (text.includes("protect school and daily needs")) return "Choosing “Protect school and daily needs” usually means education and basics both need space. It shows that support should not erase the essentials that keep the student going.";
  if (text.includes("build a personal safety buffer")) return "Choosing “Build a personal safety buffer” usually means the student needs a small protected amount for self-stability. It reflects the need to avoid being completely emptied by responsibility.";

  if (text.includes("fixed low-income work")) return "Choosing “Fixed low-income work” usually means income is predictable but not enough to feel easy. Stability exists, but the amount may still create pressure.";
  if (text.includes("irregular survival income")) return "Choosing “Irregular survival income” usually means basic needs depend on money that does not always arrive steadily. This can make planning feel fragile.";
  if (text.includes("borrowing between pay cycles")) return "Choosing “Borrowing between pay cycles” usually means timing gaps are creating pressure before the next income arrives. Borrowing may be filling the space between needs and pay.";
  if (text.includes("project income with gaps")) return "Choosing “Project income with gaps” usually means money comes through work bursts rather than a smooth rhythm. The gaps can make daily needs harder to plan.";
  if (text.includes("school and survival costs compete")) return "Choosing “School and survival costs compete” usually means education expenses and daily basics are pulling from the same limited money. It can make every choice feel like a tradeoff.";
  if (text.includes("food/fare need careful planning")) return "Choosing “Food/fare need careful planning” usually means meals and transport cannot be treated as small extras. They are daily survival costs that decide whether school or work can continue smoothly.";
  if (text.includes("no room for surprise costs")) return "Choosing “No room for surprise costs” usually means the budget has very little margin. Even a small unexpected expense can feel like a major disruption.";
  if (text.includes("tired, but i must continue")) return "Choosing “Tired, but I must continue” usually means stopping does not feel like an option. The pressure is not only financial, but physical and emotional too.";
  if (text.includes("food and transport survival")) return "Choosing “Food and transport survival” usually means the most basic daily costs are the clearest pressure. Getting through the day safely becomes the main money concern.";
  if (text.includes("tuition/school deadlines")) return "Choosing “Tuition/school deadlines” usually means school timing is creating urgency. Payments, submissions, or requirements may be shaping the whole budget.";
  if (text.includes("no emergency margin")) return "Choosing “No emergency margin” usually means there is almost no space for surprises. The week may feel stable only if nothing unexpected happens.";
  if (text.includes("borrowing risk when timing fails")) return "Choosing “Borrowing risk when timing fails” usually means a late or short income can quickly turn into debt pressure. The risk comes from timing as much as the amount.";
  if (text.includes("i cut meals/needs to stretch money")) return "Choosing “I cut meals/needs to stretch money” usually means the budget is being stretched through personal sacrifice. It can protect money briefly while making daily life harder.";
  if (text.includes("i avoid checking when low")) return "Choosing “I avoid checking when low” usually means the numbers feel painful to face. Avoidance can happen when checking feels like confirmation of pressure.";
  if (text.includes("i borrow to survive gaps")) return "Choosing “I borrow to survive gaps” usually means borrowing is covering basic timing problems. It points to a gap between daily needs and actual income arrival.";
  if (text.includes("i overwork when pressure hits")) return "Choosing “I overwork when pressure hits” usually means extra effort becomes the response to financial stress. The money may help, but the body and schedule absorb the cost.";
  if (text.includes("build a tiny emergency buffer")) return "Choosing “Build a tiny emergency buffer” usually means even a small protected amount would feel meaningful. The goal is basic safety, not a large savings target yet.";
  if (text.includes("stop survival borrowing")) return "Choosing “Stop survival borrowing” usually means borrowing has become too close to daily needs. It shows the desire to break the gap between essentials and debt.";
  if (text.includes("protect food and fare first")) return "Choosing “Protect food and fare first” usually means meals and movement are the first stability point. The answer centers on getting through the week without sacrificing basics.";

  if (text.includes("fixed pay, low recovery")) return "Choosing “Fixed pay, low recovery” usually means income may be predictable, but energy is not recovering well. The week can feel financially planned but physically heavy.";
  if (text.includes("irregular income + heavy schedule")) return "Choosing “Irregular income + heavy schedule” usually means both money and time feel unstable. The pressure comes from not knowing what the week will demand.";
  if (text.includes("work shifts disrupt school")) return "Choosing “Work shifts disrupt school” usually means work timing is affecting academic rhythm. The cost is not only money, but attention, sleep, and consistency.";
  if (text.includes("extra work near deadlines")) return "Choosing “Extra work near deadlines” usually means the hardest work periods happen near school pressure. Time and money urgency may rise together.";
  if (text.includes("heavy school-work overlap")) return "Choosing “Heavy school-work overlap” usually means school and work are competing directly. The week may feel crowded before personal rest is even considered.";
  if (text.includes("little time to rest")) return "Choosing “Little time to rest” usually means recovery is being squeezed out of the routine. When rest disappears, spending and tracking can both become harder.";
  if (text.includes("commute drains energy")) return "Choosing “Commute drains energy” usually means travel is part of the pressure. Fare, time, and tiredness can all affect the way money decisions feel.";
  if (text.includes("deadlines and shifts collide")) return "Choosing “Deadlines and shifts collide” usually means two urgent systems are demanding energy at once. The pressure can feel intense because both school and work have consequences.";
  if (text.includes("convenience spending from exhaustion")) return "Choosing “Convenience spending from exhaustion” usually means tiredness is turning into spending. Convenience can feel like the fastest way to survive a heavy day.";
  if (text.includes("rushed food and transport")) return "Choosing “Rushed food and transport” usually means speed is affecting spending. When the day is rushed, food and fare choices can become more expensive or less planned.";
  if (text.includes("i miss tracking when tired")) return "Choosing “I miss tracking when tired” usually means record-keeping drops when energy is low. The issue is not carelessness, but limited capacity at the end of heavy days.";
  if (text.includes("work-school schedule conflict")) return "Choosing “Work-school schedule conflict” usually means the calendar itself is creating pressure. Money choices may be affected by time conflict, not just income.";
  if (text.includes("i buy comfort after hard days")) return "Choosing “I buy comfort after hard days” usually means spending becomes a way to recover emotionally. The purchase may feel like relief after carrying too much effort.";
  if (text.includes("i choose convenience to save energy")) return "Choosing “I choose convenience to save energy” usually means spending is being used to protect remaining energy. It can happen when cheaper choices require effort the user does not have.";
  if (text.includes("i forget to track expenses")) return "Choosing “I forget to track expenses” usually means tracking is being pushed out by a busy routine. The budget may lose visibility when the day is already full.";
  if (text.includes("i push rest aside")) return "Choosing “I push rest aside” usually means rest is being treated as optional. That can make the money situation feel heavier because recovery is not getting space.";
  if (text.includes("create low-energy money rules")) return "Choosing “Create low-energy money rules” usually means the money system needs to work even when the user is tired. It reflects the reality that discipline drops when energy is low.";
  if (text.includes("reduce convenience leaks")) return "Choosing “Reduce convenience leaks” usually means small shortcut spending is taking space. The issue is usually repeated convenience, not one rushed purchase.";
  if (text.includes("protect rest as part of budgeting")) return "Choosing “Protect rest as part of budgeting” usually means energy is being treated as part of financial stability. It recognizes that exhausted people make different money decisions.";

  if (text.includes("income changes monthly")) return "Choosing “Income changes monthly” usually means planning cannot rely on the same amount every time. The budget may need to adjust because income shifts from month to month.";
  if (text.includes("side hustle is growing slowly")) return "Choosing “Side hustle is growing slowly” usually means progress exists, but it is not yet steady enough to carry everything. The future may look hopeful while the present still feels tight.";
  if (text.includes("support and work both fluctuate")) return "Choosing “Support and work both fluctuate” usually means both sources of money can change. Stability feels harder when neither support nor income is fully predictable.";
  if (text.includes("some weeks strong, some tight")) return "Choosing “Some weeks strong, some tight” usually means the money rhythm changes sharply. A good week may not remove the pressure of a difficult one.";
  if (text.includes("ambitious but stretched")) return "Choosing “Ambitious but stretched” usually means future drive is present while current capacity is limited. The pressure is wanting progress while already carrying a lot.";
  if (text.includes("my routine changes often")) return "Choosing “My routine changes often” usually means planning is affected by an unstable schedule. A fixed budget may feel difficult when the week keeps shifting.";
  if (text.includes("learning while earning")) return "Choosing “Learning while earning” usually means growth and survival are happening at the same time. The user is building skills while still needing money to move through the week.";
  if (text.includes("future pressure makes me anxious")) return "Choosing “Future pressure makes me anxious” usually means ambition is mixed with worry. The future matters, but the current money situation can make it feel far away.";
  if (text.includes("unstable income rhythm")) return "Choosing “Unstable income rhythm” usually means money does not arrive in a calm pattern. Planning can feel difficult when income timing keeps changing.";
  if (text.includes("repeated small expenses")) return "Choosing “Repeated small expenses” usually means little costs are becoming the main leak. The spending may not feel large until it repeats enough times.";
  if (text.includes("future goals feel far")) return "Choosing “Future goals feel far” usually means the current season feels far from the desired life. It can make motivation and money decisions feel emotionally heavy.";
  if (text.includes("i do not know what to prioritize")) return "Choosing “I do not know what to prioritize” usually means too many money needs are competing. The pressure is not only lack of money, but lack of clarity.";
  if (text.includes("i switch plans often")) return "Choosing “I switch plans often” usually means the user is trying to adjust, but the direction keeps changing. This can happen when income and pressure are both unstable.";
  if (text.includes("i spend when stuck")) return "Choosing “I spend when stuck” usually means spending may become a response to frustration. It can feel like movement when the bigger plan feels blocked.";
  if (text.includes("i start saving, then stop")) return "Choosing “I start saving, then stop” usually means the intention is there, but the rhythm is not yet stable. Saving may break when pressure or timing changes.";
  if (text.includes("i need clearer priorities")) return "Choosing “I need clearer priorities” usually means the money situation feels crowded. The user may know progress matters but not which step should come first.";
  if (text.includes("create a simple money rhythm")) return "Choosing “Create a simple money rhythm” usually means the goal is consistency before complexity. It shows a need for a money pattern that can survive student life.";
  if (text.includes("protect future goals slowly")) return "Choosing “Protect future goals slowly” usually means long-term progress still matters, even if the current pace is small. The answer accepts gradual movement rather than instant change.";
  if (text.includes("choose one priority first")) return "Choosing “Choose one priority first” usually means the situation needs focus. Too many goals can make the whole money picture feel stuck.";
  if (text.includes("control micro-spending")) return "Choosing “Control micro-spending” usually means tiny expenses are the main pattern to understand. The issue is how small choices collect over time.";

  const stepCopy = {
    setup: `Choosing “${label}” usually means this is the starting situation shaping student money. It describes the main environment around school, work, support, or recovery right now.`,
    rhythm: `Choosing “${label}” usually means this is how money normally enters or slips through the week. The amount, timing, and reliability of that money can shape whether planning feels calm or uncertain.`,
    workload: `Choosing “${label}” usually means this is the weekly load affecting energy and focus. The situation may influence spending because tired or crowded weeks change how decisions feel.`,
    pressure: `Choosing “${label}” usually means this is the pressure taking the most space right now. It can make ordinary money choices feel heavier because the concern is already active.`,
    coping: `Choosing “${label}” usually means this is the response that tends to appear when pressure gets heavy. It shows how stress may turn into behavior during real student weeks.`,
    goal: `Choosing “${label}” usually means this is the part of life the user wants to protect most. It shows what stability would feel like in the current working-student season.`,
  };
  return stepCopy[step] || `Choosing “${label}” usually means this is one active part of the working-student situation. It reflects what feels present in school, work, money, or energy right now.`;
}

function buildWorkingStudentSelectionMeanings() {
  const meanings = new Map();
  collectWorkingStudentOptionsByStep().forEach(({ raw, step }) => {
    const label = getWorkingStudentDisplayLabel(raw) || clean(raw);
    const body = workingStudentMeaningFor(label, step);
    meanings.set(loud(raw), body);
    meanings.set(loud(label), body);
  });
  Object.values(WORKING_STUDENT_DISPLAY_LABELS).forEach((label) => {
    const normalized = loud(label);
    if (!meanings.has(normalized)) meanings.set(normalized, workingStudentMeaningFor(label, inferWorkingStudentStepFromLabel(label)));
  });
  return meanings;
}

const WORKING_STUDENT_SELECTION_MEANINGS = buildWorkingStudentSelectionMeanings();

const EXACT_SELECTION_MEANINGS = new Map(Object.entries({
  "First stable job": "This usually means income is becoming more stable, but adult responsibility still feels new. Payday may feel exciting while bills, commute, food, and personal choices are still finding their rhythm.",
  "Independent with bills": "This usually means independence now has real monthly pressure attached to it. Rent, bills, food, and commute can make every spending choice feel more serious.",
  "Career + family support": "This usually means your salary is not only for your own progress. Family support may affect how much room you have for savings, career growth, and personal stability.",
  "Career growth pressure": "This usually means ambition is adding pressure to your money decisions. Career costs may feel necessary, but they can also come from comparison, urgency, or the fear of falling behind.",
  "Salary disappears fast": "This usually means the salary is there, but it does not stay long enough to feel secure. Small repeated costs, subscriptions, installments, or early-month spending may be quietly taking space.",
  "Shift/BPO routine": "This usually means your work schedule affects your spending pattern. When sleep, calls, commute, or shifting routines drain you, convenience and comfort can become harder to resist.",
  "Debt/pay-later recovery": "This usually means income is being used to fix old pressure instead of building a fresh month. It can make payday feel less freeing because past obligations are still taking space.",
}).map(([key, value]) => [loud(key), value]));

function readProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function isSelectedButton(button) {
  const className = String(button?.className || "");
  return className.includes("border-cyan") || className.includes("text-cyan-50") || className.includes("bg-cyan");
}

function getSelectedOption(section) {
  const buttons = Array.from(section?.querySelectorAll("button") || []);
  const selected = buttons.find(isSelectedButton) || buttons[0];
  return clean(selected?.innerText || selected?.textContent || "");
}

function getVisibleOptions(section) {
  return Array.from(section?.querySelectorAll("button") || [])
    .map((button) => clean(button.innerText || button.textContent))
    .filter(Boolean);
}

function inferStageFromActiveSection(active) {
  const options = getVisibleOptions(active?.section).map(loud);
  const candidates = Object.entries(STAGE_OPTION_SETS)
    .map(([stage, set]) => ({ stage, score: options.filter((option) => set.has(option)).length }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.stage.localeCompare(b.stage));
  return candidates[0]?.stage || "";
}

function currentStage(active = null) {
  const inferred = inferStageFromActiveSection(active);
  if (inferred) return inferred;
  return clean(readProfile().stage) || WORKING_STUDENT_STAGE_KEY;
}

function findActiveQuestionSection() {
  for (const label of Array.from(document.querySelectorAll("section p"))) {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (meta && section && isVisible(section) && section.querySelector("button")) return { label, section, meta };
  }
  return null;
}

function findStageBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === FLOW_MARKER);
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { header, title, summary };
}

function isStagePickerOpen() {
  const labels = Array.from(document.querySelectorAll("main button") || []).map((button) => clean(button.innerText || button.textContent));
  return STAGE_NAMES.some((stage) => labels.includes(stage));
}

function getProgressGroup(header) {
  return Array.from(header?.querySelectorAll("div") || []).find((group) => {
    const bars = Array.from(group.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
    return bars.length >= 3 && bars.every((bar) => String(bar.className || "").includes("rounded-full"));
  });
}

function ensureSixProgressBars(group) {
  let bars = Array.from(group?.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
  if (!bars.length) return [];
  while (bars.length < 6) {
    group.appendChild(bars[bars.length - 1].cloneNode(false));
    bars = Array.from(group.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
  }
  Array.from(group.querySelectorAll("[data-clara-moving-tile='true']") || []).forEach((node) => node.remove());
  return bars.slice(0, 6);
}

function updateSimpleProgress(header, activeIndex) {
  const group = getProgressGroup(header);
  if (!group) return;
  if (isStagePickerOpen()) {
    group.style.setProperty("display", "none", "important");
    return;
  }
  group.style.setProperty("display", "flex", "important");
  group.style.setProperty("gap", "0.45rem", "important");
  group.style.setProperty("align-items", "center", "important");
  group.style.setProperty("position", "relative", "important");
  ensureSixProgressBars(group).forEach((bar, index) => {
    const active = index === activeIndex;
    bar.style.setProperty("width", active ? "2rem" : "1.65rem", "important");
    bar.style.setProperty("height", "0.25rem", "important");
    bar.style.setProperty("border-radius", "9999px", "important");
    bar.style.setProperty("background", active ? "rgb(165 243 252)" : "rgba(255,255,255,.12)", "important");
    bar.style.setProperty("box-shadow", active ? "0 0 16px rgba(125,211,252,.35)" : "none", "important");
    bar.style.setProperty("opacity", active ? "1" : ".6", "important");
    bar.style.setProperty("transition", "background 160ms ease, opacity 160ms ease, width 160ms ease", "important");
  });
}

function polishQuestionCards() {
  Array.from(document.querySelectorAll("section p")).forEach((label) => {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (!meta || !section || !section.querySelector("button")) return;
    label.textContent = meta.label;
    const next = label.nextElementSibling;
    if (next?.dataset?.claraFlowQuestion === "true") {
      if (next.textContent !== meta.question) next.textContent = meta.question;
      return;
    }
    const question = document.createElement("p");
    question.dataset.claraFlowQuestion = "true";
    question.className = "clara-flow-question";
    question.textContent = meta.question;
    label.insertAdjacentElement("afterend", question);
  });
}

function includesAny(value, terms) {
  const text = lower(value);
  return terms.some((term) => text.includes(term));
}

function titleFor(stage, selectedValue) {
  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) return getYoungProfessionalDisplayLabel(selectedValue) || selectedValue;
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) return getLivingWithPartnerDisplayLabel(selectedValue) || selectedValue;
  if (stage === WORKING_STUDENT_STAGE_KEY) return getWorkingStudentDisplayLabel(selectedValue) || selectedValue;
  return selectedValue;
}

function fallbackMeaning(stage, step, label) {
  const stageText = stage ? `in this ${stage} stage` : "in this life stage";
  const stepCopy = {
    setup: `This usually means “${label}” is the life setup shaping the money situation ${stageText}. It gives context to why the budget may feel light, heavy, stable, or pressured.`,
    rhythm: `This usually means “${label}” describes how money tends to arrive, move, or disappear ${stageText}. The timing of money can affect how safe planning feels.`,
    workload: `This usually means “${label}” is affecting the energy behind money decisions ${stageText}. When time or energy is stretched, even simple choices can feel harder.`,
    pressure: `This usually means “${label}” is taking the most financial or emotional space right now. It can make normal spending feel heavier because this pressure is already active.`,
    coping: `This usually means “${label}” is a common response when pressure becomes heavy. It shows how the situation may turn into real behavior during stressful days.`,
    goal: `This usually means “${label}” is the stability being protected first. It shows what matters most before asking for stricter discipline or bigger changes.`,
  };
  return stepCopy[step] || `This usually means “${label}” is one real part of the current life situation. It helps explain what feels active in money, time, energy, or responsibility.`;
}

function keywordMeaning(stage, selectedValue, label) {
  const text = `${selectedValue} ${label}`;
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) {
    if (includesAny(text, ["uneven", "one income", "one person", "covers gaps", "mismatch", "fairness", "one partner carries"])) return "This usually means fairness is already part of the shared money story. One person may be carrying more, even when both people care about making the setup work.";
    if (includesAny(text, ["family", "living with one family", "household", "support requests"])) return "This usually means family expectations may affect the couple’s budget too. Shared money can feel heavier when outside needs enter the relationship rhythm.";
    if (includesAny(text, ["avoid", "argue", "communication", "sensitive", "talk", "awkward"])) return "This usually means the money conversation itself needs care. The pressure may not only be the amount, but how safe it feels to talk about the amount.";
    if (includesAny(text, ["comfort", "spend together", "date", "food", "bonding"])) return "This usually means spending may be acting as bonding or emotional relief. That can feel good, but it may also make shared stability harder to protect.";
    if (includesAny(text, ["future", "planning", "move", "savings", "emergency", "shared goal"])) return "This usually means the relationship is trying to protect a future direction. Daily spending may feel different when a shared plan is starting to matter.";
  }
  if (includesAny(text, ["debt", "repay", "repayment", "borrow", "pay-later", "pay later", "repair mode", "cash-flow", "delayed", "pressure carries"])) return "This usually means old or delayed money pressure is affecting the present. Even new income can feel less free when past obligations are still taking space.";
  if (includesAny(text, ["family", "home", "support", "contribution", "goes home"])) return "This usually means money is connected to people who depend on the user. Support can be meaningful, but it can also reduce the space for personal stability.";
  if (includesAny(text, ["tired", "exhaust", "burnout", "rest", "sleep", "commute", "shift", "heavy", "draining"])) return "This usually means energy is part of the money situation. When the body or mind is tired, spending can become a shortcut, comfort, or survival response.";
  if (includesAny(text, ["tuition", "school", "class", "projects", "printing", "materials", "fare", "attendance"])) return "This usually means school-related costs are shaping the budget. Requirements, transportation, food, and deadlines can make even small spending feel important.";
  if (includesAny(text, ["salary", "payday", "cutoff", "income", "allowance", "side income", "overtime", "sales", "commission"])) return "This usually means the money rhythm itself matters. Income may exist, but the amount and timing can decide whether the week feels stable or tight.";
  if (includesAny(text, ["reward", "social", "lifestyle", "comfort", "convenience", "spending", "leaks"])) return "This usually means spending may be connected to relief, identity, or convenience. The concern is usually the repeated pattern, not one single purchase.";
  return "";
}

function getSelectionMeaning(stage, step, selectedValue, label) {
  if (stage === WORKING_STUDENT_STAGE_KEY) {
    return WORKING_STUDENT_SELECTION_MEANINGS.get(loud(selectedValue))
      || WORKING_STUDENT_SELECTION_MEANINGS.get(loud(label))
      || `This Working Student answer still needs a dedicated meaning: “${label}”.`;
  }
  const exact = EXACT_SELECTION_MEANINGS.get(loud(selectedValue)) || EXACT_SELECTION_MEANINGS.get(loud(label));
  if (exact) return exact;
  return keywordMeaning(stage, selectedValue, label) || fallbackMeaning(stage, step, label);
}

function getBoardFromCurrentSelection(active) {
  const selectedValue = getSelectedOption(active.section);
  const stage = currentStage(active);
  const label = titleFor(stage, selectedValue);
  return {
    stage,
    selectedValue,
    title: label || selectedValue,
    body: getSelectionMeaning(stage, active.meta.key, selectedValue, label || selectedValue),
  };
}

function polishContextBoard() {
  const active = findActiveQuestionSection();
  const { header, summary, title } = findStageBoard();
  if (!active || !header || !summary || !title) return;
  const board = getBoardFromCurrentSelection(active);
  const signature = `${board.stage}:${active.meta.key}:${board.selectedValue}:${board.title}:${board.body}`;
  updateSimpleProgress(header, active.meta.index);
  if (title.dataset.claraSimpleBoardSignature !== signature) {
    title.textContent = board.title;
    title.dataset.claraSimpleBoardSignature = signature;
  }
  if (summary.dataset.claraSimpleBoardSignature !== signature) {
    summary.textContent = board.body;
    summary.dataset.claraSimpleBoardSignature = signature;
    summary.classList.add("clara-flow-board-summary");
    summary.style.setProperty("white-space", "normal", "important");
    summary.style.setProperty("line-height", "1.5", "important");
  }
}

function polishFlow() {
  polishQuestionCards();
  polishContextBoard();
}

function installLifeStageSetupFlowPolish() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraLifeStageSetupFlowPolishInstalled) return;
  window.__claraLifeStageSetupFlowPolishInstalled = true;
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      polishFlow();
    });
  };
  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  document.addEventListener("click", schedule, true);
  window.addEventListener("storage", schedule);
}

try {
  installLifeStageSetupFlowPolish();
} catch (error) {
  console.warn("CLARA life stage setup flow polish failed:", error);
}