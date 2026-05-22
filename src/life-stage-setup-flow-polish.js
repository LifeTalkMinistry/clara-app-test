const FLOW_MARKER = "CLARA CONTEXT BOARD";

const STEP_META = {
  "CURRENT SETUP": {
    key: "setup",
    label: "CURRENT SETUP",
    question: "Which setup feels closest to your real life right now?",
    index: 0,
  },
  "MONEY RHYTHM": {
    key: "rhythm",
    label: "MONEY RHYTHM",
    question: "How does money usually come into your week or month?",
    index: 1,
  },
  "WEEKLY LOAD": {
    key: "workload",
    label: "WEEKLY LOAD",
    question: "How stretched does your normal week feel?",
    index: 2,
  },
  "PRESSURE RIGHT NOW": {
    key: "pressure",
    label: "PRESSURE RIGHT NOW",
    question: "What is putting the most pressure on your money right now?",
    index: 3,
  },
  "PRESSURE RESPONSE": {
    key: "coping",
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
    index: 4,
  },
  "WHEN PRESSURE HITS": {
    key: "coping",
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
    index: 4,
  },
  "PROTECTION GOAL": {
    key: "goal",
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
    index: 5,
  },
  "WHAT TO PROTECT": {
    key: "goal",
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
    index: 5,
  },
};

const meaning = (title, summary) => ({ title, summary });

const OPTION_MEANINGS = {
  "Supported, learning independence": meaning(
    "Learning independence with support",
    "You may still have support around you, but you are slowly learning what financial responsibility feels like. Many students in this stage become more careful with spending because independence starts feeling real."
  ),
  "Working to protect school": meaning(
    "Working to protect school",
    "This usually means earning money is not about luxury; it is about keeping school possible. Tuition, projects, fare, food, and deadline pressure can make every peso feel connected to your future."
  ),
  "Studying while helping family": meaning(
    "Studying while helping family",
    "This means your student life is also carrying home responsibility. Money decisions can feel emotional because helping others and protecting your own school needs may happen at the same time."
  ),
  "Mostly self-supporting": meaning(
    "Mostly self-supporting",
    "This means you are carrying a larger part of school and daily survival yourself. Decisions often become less about comfort and more about stability, timing, and avoiding setbacks."
  ),
  "Exhausted by school-work overlap": meaning(
    "Exhausted by school-work overlap",
    "This means your schedule may be using the same energy that your money discipline needs. When school and work overlap heavily, convenience spending and missed tracking can happen simply because you are tired."
  ),
  "Building with unstable income": meaning(
    "Building with unstable income",
    "This means you are trying to move forward even when money does not arrive in a predictable rhythm. Planning can feel harder because strong weeks and tight weeks ask for different decisions."
  ),
  "Recovering from money pressure": meaning(
    "Recovering from money pressure",
    "This means old financial pressure may still be affecting the current week. Borrowing, delayed payments, or cash-flow gaps can make life feel like repair mode even when you are trying to reset."
  ),
  "Allowance base + extra work": meaning(
    "Allowance base plus extra work",
    "This means support may cover part of your life while your own effort adds flexibility. The main risk is treating extra income as free money before school, food, fare, and small savings are protected."
  ),
  "Fixed part-time pay": meaning(
    "Fixed part-time pay",
    "This means your income has a steadier rhythm than most student side income. Planning can become easier, but the budget still has to respect school pressure and energy limits."
  ),
  "Occasional side income": meaning(
    "Occasional side income",
    "This means money arrives when opportunities appear, not always when expenses appear. Strong days need a purpose so they can help cover weaker days."
  ),
  "Extra money leaks fast": meaning(
    "Extra money leaks fast",
    "This means additional income may disappear through small purchases before it becomes useful. The problem is usually repetition, not one big mistake."
  ),
  "Fixed work income for tuition": meaning(
    "Fixed work income for tuition",
    "This means your work has a clear education purpose. Paydays need to protect school payments first before flexible spending gets room."
  ),
  "Irregular income for school needs": meaning(
    "Irregular income for school needs",
    "This means school requirements may depend on income that is not always consistent. CLARA should treat timing as a real pressure, not just the total amount of money."
  ),
  "Project work before deadlines": meaning(
    "Project work before deadlines",
    "This means income may increase when school pressure is already high. It can help financially, but it can also drain energy near the same deadlines you are trying to survive."
  ),
  "Allowance cannot cover school": meaning(
    "Allowance cannot cover school",
    "This means basic support may not be enough for the real cost of studying. Work income becomes a protection layer for tuition, materials, food, fare, and deadlines."
  ),
  "Part of income goes home": meaning(
    "Part of income goes home",
    "This means your money already has a responsibility before it reaches your own needs. A clear support limit matters so helping home does not quietly weaken school stability."
  ),
  "I give when family needs appear": meaning(
    "I give when family needs appear",
    "This means family needs can change your financial plan suddenly. The emotional pressure is real, so boundaries should be prepared before the request arrives."
  ),
  "Allowance/work money gets shared": meaning(
    "Allowance and work money gets shared",
    "This means your resources are not fully personal even while you are still studying. Budgeting needs to protect shared responsibility and your own essentials at the same time."
  ),
  "I earn extra for family": meaning(
    "Earning extra for family",
    "This means your extra effort is connected to care and responsibility. It can be meaningful, but it also needs limits so support does not become exhaustion."
  ),
  "Fixed low-income work": meaning(
    "Fixed low-income work",
    "This means the money may be predictable but still limited. The safest plan protects food, fare, school costs, and tiny buffers before asking for bigger goals."
  ),
  "Irregular survival income": meaning(
    "Irregular survival income",
    "This means income is not just extra; it may be needed for basic survival. Gaps can quickly affect meals, transport, school requirements, or borrowing pressure."
  ),
  "Borrowing between pay cycles": meaning(
    "Borrowing between pay cycles",
    "This means the timing of money may be the real problem. Borrowing can become a bridge when expenses arrive before income does."
  ),
  "Project income with gaps": meaning(
    "Project income with gaps",
    "This means income can arrive in useful bursts but leave quiet spaces in between. The strong periods need to protect the gap days before they happen."
  ),
  "Fixed pay, low recovery": meaning(
    "Fixed pay with low recovery",
    "This means money may be predictable, but your energy may not be recovering enough. Spending pressure can still rise when tired days make planning harder."
  ),
  "Irregular income + heavy schedule": meaning(
    "Irregular income and heavy schedule",
    "This means both money and time may feel unstable. When income changes and your schedule is heavy, simple rules work better than complicated tracking."
  ),
  "Work shifts disrupt school": meaning(
    "Work shifts disrupt school",
    "This means work timing may be interrupting your study rhythm. The financial pressure is connected to time, sleep, commute, and missed preparation."
  ),
  "Extra work near deadlines": meaning(
    "Extra work near deadlines",
    "This means pressure can peak from both sides at once. You may earn more, but you also risk spending more on convenience because time is tight."
  ),
  "Income changes monthly": meaning(
    "Income changes monthly",
    "This means each month may need a different spending rhythm. A flexible plan is safer than one strict budget that only works on good income months."
  ),
  "Side hustle is growing slowly": meaning(
    "Side hustle growing slowly",
    "This means your income has potential but may not be dependable yet. The goal is to protect growth without treating early progress as guaranteed money."
  ),
  "Support and work both fluctuate": meaning(
    "Support and work both fluctuate",
    "This means both income sources may change at the same time. That can make planning emotional because there may be no single stable base to lean on."
  ),
  "Some weeks strong, some tight": meaning(
    "Some weeks strong, some tight",
    "This means your life may feel okay one week and pressured the next. Strong weeks should prepare for tight weeks instead of becoming spending weeks."
  ),
  "Money arrives after bills are due": meaning(
    "Money arrives after bills are due",
    "This means the problem may be timing, not only income size. Expenses can feel heavier when payment dates come before money arrives."
  ),
  "I borrow, then repay repeatedly": meaning(
    "Borrowing and repaying repeatedly",
    "This means pressure may be cycling instead of fully ending. Repayment helps, but the next goal is preventing the same gap from returning."
  ),
  "Pressure carries into next week": meaning(
    "Pressure carries into next week",
    "This means one short week can affect the next one. CLARA should help stop pressure from stacking before it becomes normal."
  ),
  "Debt/delays affect the week": meaning(
    "Debt and delays affect the week",
    "This means old obligations are already shaping today’s choices. Flexible spending has less room when repayment or delayed payments are active."
  ),
  "Manageable, but uneven": meaning(
    "Manageable but uneven",
    "This means your week still has control, but it may not feel consistent. Small routines can protect you before busier school or work days arrive."
  ),
  "Busy during exam/work weeks": meaning(
    "Busy during exam and work weeks",
    "This means pressure may not be constant, but it spikes during certain weeks. Budgeting should prepare for those spikes instead of reacting late."
  ),
  "Social + school costs overlap": meaning(
    "Social and school costs overlap",
    "This means student life expenses can mix with social pressure. Spending may feel small in the moment, but overlap can quietly drain your week."
  ),
  "Control is still available": meaning(
    "Control is still available",
    "This means you still have enough room to plan before pressure takes over. It is a good stage to build limits while decisions still feel manageable."
  ),
  "Manageable, but leak-prone": meaning(
    "Manageable but leak-prone",
    "This means your situation may not be in crisis, but small spending can still escape attention. The pattern to watch is repeated leaks hiding inside normal days."
  ),
  "Busy enough to reward myself": meaning(
    "Busy enough to reward myself",
    "This means effort may make reward spending feel deserved. Rewards are human, but they need limits before they become the automatic ending of every hard day."
  ),
  "Class and work are both required": meaning(
    "Class and work are both required",
    "This means neither school nor work can easily be dropped. Your plan needs to respect both the money need and the energy cost."
  ),
  "School deadlines create pressure": meaning(
    "School deadlines create pressure",
    "This means deadlines may create both financial and emotional strain. Printing, materials, transport, food, and extra work can collide near the same dates."
  ),
  "Little room near payment dates": meaning(
    "Little room near payment dates",
    "This means your budget may tighten whenever school fees or deadlines approach. Planning needs to reserve money before those dates arrive."
  ),
  "I keep going while tired": meaning(
    "I keep going while tired",
    "This means discipline is present, but recovery may be low. Spending decisions can become weaker when you are pushing through instead of resting."
  ),
  "Income waves near deadlines": meaning(
    "Income waves near deadlines",
    "This means money and school pressure may rise together. The income helps, but the timing can still create exhaustion and rushed spending."
  ),
  "School, work, and home overlap": meaning(
    "School, work, and home overlap",
    "This means several responsibilities are asking from the same time and energy. Money decisions may feel heavier because each area matters."
  ),
  "I feel responsible while tired": meaning(
    "Responsible while tired",
    "This means you may keep showing up even when your energy is already low. CLARA should protect recovery because tired responsibility can lead to silent burnout."
  ),
  "Family needs change the week": meaning(
    "Family needs change the week",
    "This means your plan can be interrupted by home needs. The safest move is to create a flexible support boundary before the week becomes pressured."
  ),
  "I try to keep school stable": meaning(
    "Trying to keep school stable",
    "This means school remains a priority even with other responsibilities. Budgeting should protect school basics so family or work pressure does not interrupt progress."
  ),
  "School and survival costs compete": meaning(
    "School and survival costs compete",
    "This means education needs and daily basics may be pulling from the same small money pool. Essentials must be separated before flexible spending."
  ),
  "Food/fare need careful planning": meaning(
    "Food and fare need careful planning",
    "This means daily movement and meals are not automatic. Small gaps in food or fare can affect attendance, energy, and emotional stability."
  ),
  "No room for surprise costs": meaning(
    "No room for surprise costs",
    "This means one unexpected expense can disturb the entire week. A tiny buffer matters more than a perfect emergency fund right now."
  ),
  "Tired, but I must continue": meaning(
    "Tired but still continuing",
    "This means rest may be treated as optional even when it is needed. CLARA should make money rules that still work on low-energy days."
  ),
  "Heavy school-work overlap": meaning(
    "Heavy school-work overlap",
    "This means your responsibilities are competing for the same hours. Rushed food, transport shortcuts, and missed tracking can become part of the cost."
  ),
  "Little time to rest": meaning(
    "Little time to rest",
    "This means your recovery window is getting thin. Spending may become a shortcut for comfort when real rest is hard to access."
  ),
  "Commute drains energy": meaning(
    "Commute drains energy",
    "This means travel itself may be part of the financial pressure. Fare, food, time, and tiredness can combine into one hidden cost."
  ),
  "Deadlines and shifts collide": meaning(
    "Deadlines and shifts collide",
    "This means school pressure and work pressure can peak together. The plan needs emergency simplicity because complicated tracking may fail on collision days."
  ),
  "Ambitious but stretched": meaning(
    "Ambitious but stretched",
    "This means effort and pressure are both present. You may have direction, but limited margin can make progress feel slower than your ambition."
  ),
  "My routine changes often": meaning(
    "Routine changes often",
    "This means your budget cannot depend on one perfect weekly schedule. Flexible rules matter because your time and income may keep shifting."
  ),
  "Learning while earning": meaning(
    "Learning while earning",
    "This means you are building skills and money rhythm at the same time. Mistakes may happen, but they can become part of the system if you track the pattern."
  ),
  "Future pressure makes me anxious": meaning(
    "Future pressure feels heavy",
    "This means future goals may feel urgent even while today’s money is limited. CLARA should make progress smaller, clearer, and less overwhelming."
  ),
  "The month feels like repair mode": meaning(
    "The month feels like repair mode",
    "This means much of your money may already be assigned to fixing old pressure. The first win is making the next week lighter than the last."
  ),
  "Old pressure affects today": meaning(
    "Old pressure affects today",
    "This means previous shortfalls are still influencing current choices. CLARA should separate old pressure from today’s essentials so everything does not feel mixed."
  ),
  "Tired from catching up": meaning(
    "Tired from catching up",
    "This means financial recovery is also emotional work. Catching up can drain energy, so the plan should reduce pressure without demanding perfection."
  ),
  "Little room to reset": meaning(
    "Little room to reset",
    "This means you may want a fresh start but not have enough space yet. Small reset moves matter more than a full budget restart."
  ),
  "Food, fare, school extras": meaning(
    "Food, fare, and school extras",
    "This means repeated student costs are shaping your week. These expenses may look small separately, but together they can control your available money."
  ),
  "Social/reward spending": meaning(
    "Social and reward spending",
    "This means spending may be connected to belonging, relief, or feeling normal as a student. The goal is not to remove joy, but to prevent quiet overspending."
  ),
  "Saving feels inconsistent": meaning(
    "Saving feels inconsistent",
    "This means saving may start with good intention but gets interrupted by real-life costs. A smaller saving rule may work better than a strict one."
  ),
  "Independence while supported": meaning(
    "Independence while supported",
    "This means you want more control even while support still exists. CLARA should help you practice responsibility without treating you as fully alone."
  ),
  "Social spending pressure": meaning(
    "Social spending pressure",
    "This means relationships and school life may influence spending decisions. It can feel hard to say no when belonging is part of the moment."
  ),
  "Small rewards after school/work": meaning(
    "Small rewards after school or work",
    "This means rewards may become a way to recover from effort. The safer plan keeps rewards allowed but chosen before stress peaks."
  ),
  "Tuition/school payments": meaning(
    "Tuition and school payments",
    "This means education payments are the main pressure point. These need early protection because they directly affect continuity and peace of mind."
  ),
  "Projects, printing, materials": meaning(
    "Projects, printing, and materials",
    "This means school has many smaller costs beyond tuition. They can surprise you if they are not treated as a recurring school budget."
  ),
  "Daily fare and food": meaning(
    "Daily fare and food",
    "This means basic attendance and energy are tied to daily spending. Protecting fare and meals protects school performance too."
  ),
  "Fear of stopping school": meaning(
    "Fear of stopping school",
    "This means the pressure is emotional as well as financial. CLARA should protect school continuity first because the fear can shape every spending choice."
  ),
  "Family contribution": meaning(
    "Family contribution",
    "This means part of your money may already be committed to home. The safest plan helps family without letting school, meals, fare, or rest collapse."
  ),
  "Guilt when I protect my money": meaning(
    "Guilt when protecting your money",
    "This means saying no or setting limits may feel emotionally difficult. CLARA should support boundaries without making you feel selfish."
  ),
  "School costs vs home needs": meaning(
    "School costs versus home needs",
    "This means your budget may be pulled between your future and your family’s present needs. Both matter, so the plan needs clear separation."
  ),
  "Weak personal buffer": meaning(
    "Weak personal buffer",
    "This means you may have little backup for your own food, fare, school, or emergencies. Even a small protected amount can reduce pressure."
  ),
  "Food and transport survival": meaning(
    "Food and transport survival",
    "This means daily survival costs are the first protection layer. Without them, school attendance, work, and energy can all be affected."
  ),
  "Tuition/school deadlines": meaning(
    "Tuition and school deadlines",
    "This means dates matter as much as amounts. CLARA should prepare for payment timing before the deadline becomes urgent."
  ),
  "No emergency margin": meaning(
    "No emergency margin",
    "This means there may be no room for even a small surprise. The next protection should be tiny but real, like fare, food, or urgent school backup."
  ),
  "Borrowing risk when timing fails": meaning(
    "Borrowing risk when timing fails",
    "This means one delayed income or unexpected cost can push you toward borrowing. Timing protection is the key issue."
  ),
  "Convenience spending from exhaustion": meaning(
    "Convenience spending from exhaustion",
    "This means tiredness may be turning into extra cost. The spending is often about saving energy, not being careless."
  ),
  "Rushed food and transport": meaning(
    "Rushed food and transport",
    "This means speed may be costing money. When schedules are tight, food outside and transport shortcuts can become hidden pressure."
  ),
  "I miss tracking when tired": meaning(
    "Missing tracking when tired",
    "This means tracking may fail when energy is lowest. CLARA should use simple low-effort check-ins instead of expecting perfect logs."
  ),
  "Work-school schedule conflict": meaning(
    "Work-school schedule conflict",
    "This means time pressure is directly affecting money decisions. Conflict days need simpler rules because normal planning may be harder."
  ),
  "Unstable income rhythm": meaning(
    "Unstable income rhythm",
    "This means money may arrive in a pattern that is hard to trust. A flexible plan should protect essentials first and adjust when income changes."
  ),
  "Repeated small expenses": meaning(
    "Repeated small expenses",
    "This means the pattern may be hidden in frequency. Small purchases can matter when they happen often enough."
  ),
  "Future goals feel far": meaning(
    "Future goals feel far",
    "This means progress may feel slow compared with what you want. CLARA should make the next step smaller so the goal feels reachable."
  ),
  "I do not know what to prioritize": meaning(
    "Priority feels unclear",
    "This means the pressure may come from not knowing what should come first. The next move is to choose one thing to protect before trying to fix everything."
  ),
  "Repayment pressure": meaning(
    "Repayment pressure",
    "This means old obligations are already part of the current budget. Repayment needs a rhythm so it does not keep restarting pressure every week."
  ),
  "Cash-flow timing mismatch": meaning(
    "Cash-flow timing mismatch",
    "This means money and due dates are not lining up well. The budget should map when money arrives, not only how much arrives."
  ),
  "Borrowing before next income": meaning(
    "Borrowing before next income",
    "This means the gap before payday is becoming risky. CLARA should help protect the last stretch before money comes in."
  ),
  "Avoiding money because it feels heavy": meaning(
    "Avoiding money because it feels heavy",
    "This means checking finances may feel emotionally loaded. Short, gentle check-ins can be safer than avoiding the full picture."
  ),
  "Small spending goes unnoticed": meaning(
    "Small spending goes unnoticed",
    "This means the money may leave quietly through purchases that feel too small to track. The pattern matters more than any single item."
  ),
  "I reward myself after effort": meaning(
    "Reward after effort",
    "This means spending may feel like a deserved recovery after school, work, or stress. That is human, but the reward needs a limit before it repeats too often."
  ),
  "I avoid strict tracking": meaning(
    "Avoiding strict tracking",
    "This means detailed tracking may feel too heavy or restrictive. A lighter system can still build awareness without making money feel like punishment."
  ),
  "I can pause when prepared": meaning(
    "Pause when prepared",
    "This means preparation helps you make calmer decisions. CLARA should use early planning as a strength, not wait until pressure hits."
  ),
  "I cut needs for school costs": meaning(
    "Cutting needs for school costs",
    "This means school is being protected, but personal needs may be sacrificed too much. Food, rest, and daily basics still need protection."
  ),
  "I delay non-school payments": meaning(
    "Delaying non-school payments",
    "This means school costs may be pushing other obligations forward. CLARA should prevent delays from becoming the normal way to survive."
  ),
  "I work extra while tired": meaning(
    "Working extra while tired",
    "This means you are trying to solve pressure with more effort even when energy is low. The money may help, but burnout risk needs to be watched."
  ),
  "I avoid spending on myself": meaning(
    "Avoiding spending on yourself",
    "This means you may be cutting personal needs to keep obligations covered. CLARA should protect essentials so sacrifice does not become damage."
  ),
  "I give even when tight": meaning(
    "Giving even when tight",
    "This means generosity may continue even when your own budget is strained. A support boundary protects both your care and your stability."
  ),
  "I delay my own needs": meaning(
    "Delaying your own needs",
    "This means your own food, rest, school, or personal needs may be pushed aside. CLARA should make sure support does not erase self-protection."
  ),
  "I hide money stress": meaning(
    "Hiding money stress",
    "This means the pressure may be carried privately. Quiet stress can affect spending, rest, and decisions even when nobody else sees it."
  ),
  "I set limits but feel guilty": meaning(
    "Setting limits but feeling guilty",
    "This means boundaries exist, but they still feel emotionally heavy. CLARA should help make limits clear and compassionate."
  ),
  "I cut meals/needs to stretch money": meaning(
    "Cutting meals or needs",
    "This means survival budgeting may be getting too harsh. Stretching money should not remove the basics that keep you studying and functioning."
  ),
  "I avoid checking when low": meaning(
    "Avoid checking when money is low",
    "This means low balance may feel too stressful to face. A small check-in can reduce surprise pressure without forcing a full review."
  ),
  "I borrow to survive gaps": meaning(
    "Borrowing to survive gaps",
    "This means borrowing may be filling timing gaps in food, fare, school, or daily needs. CLARA should help detect those gaps earlier."
  ),
  "I overwork when pressure hits": meaning(
    "Overworking when pressure hits",
    "This means your response to money pressure may be more work, even when your body needs rest. CLARA should protect income and recovery together."
  ),
  "I buy comfort after hard days": meaning(
    "Buying comfort after hard days",
    "This means spending may become a way to recover emotionally. Comfort is understandable, but repeated comfort buys need a safer limit."
  ),
  "I choose convenience to save energy": meaning(
    "Choosing convenience to save energy",
    "This means convenience may be an energy-saving move, not laziness. The plan should prepare cheaper low-energy options before exhaustion arrives."
  ),
  "I forget to track expenses": meaning(
    "Forgetting to track expenses",
    "This means tracking drops when life gets heavy. CLARA should make the system lighter so awareness still exists on busy days."
  ),
  "I push rest aside": meaning(
    "Pushing rest aside",
    "This means recovery may be sacrificed to keep up with school and work. When rest disappears, spending can become the easiest form of relief."
  ),
  "I switch plans often": meaning(
    "Switching plans often",
    "This means your money strategy may change when pressure changes. CLARA should help simplify the plan so it survives unstable weeks."
  ),
  "I spend when stuck": meaning(
    "Spending when stuck",
    "This means spending may happen when frustration or uncertainty rises. The system should create a pause before stuck feelings turn into purchases."
  ),
  "I start saving, then stop": meaning(
    "Starting saving, then stopping",
    "This means saving intent is present, but the rhythm may be too fragile. Smaller automatic goals can help progress survive real-life interruptions."
  ),
  "I need clearer priorities": meaning(
    "Need clearer priorities",
    "This means the main pressure may be decision order. CLARA should help choose what to protect first instead of forcing everything at once."
  ),
  "I delay payments to survive": meaning(
    "Delaying payments to survive",
    "This means today’s needs may be pushing payment pressure into the future. CLARA should reduce stacking so survival does not create a heavier next week."
  ),
  "I avoid the full picture": meaning(
    "Avoiding the full picture",
    "This means seeing everything at once may feel overwhelming. CLARA can start with one small area instead of forcing a full financial review."
  ),
  "I borrow again for daily costs": meaning(
    "Borrowing again for daily costs",
    "This means basic expenses may still be underprotected. The next move is a tiny food or fare buffer before flexible spending."
  ),
  "I cut needs too much": meaning(
    "Cutting needs too much",
    "This means sacrifice may be crossing into risk. CLARA should protect food, transport, rest, health, and school essentials as non-negotiables."
  ),
  "Build discipline early": meaning(
    "Build discipline early",
    "This means you want better habits before bigger responsibilities arrive. Small repeatable limits matter more than strict rules."
  ),
  "Save small without guilt": meaning(
    "Save small without guilt",
    "This means progress should feel possible, not pressured. Even small savings count when income and schedule are limited."
  ),
  "Control small leaks": meaning(
    "Control small leaks",
    "This means the goal is to catch repeated tiny spending before it becomes monthly pressure. CLARA should watch patterns, not shame purchases."
  ),
  "Give extra income a purpose": meaning(
    "Give extra income a purpose",
    "This means extra money needs direction before it disappears. A purpose can turn side income into stability instead of short-term spending."
  ),
  "Keep rewards, set limits": meaning(
    "Keep rewards, set limits",
    "This means you do not need to remove every reward. The healthier goal is to choose the amount and timing before stress decides for you."
  ),
  "Protect school continuity": meaning(
    "Protect school continuity",
    "This means the main priority is keeping education moving. CLARA should protect tuition, materials, fare, meals, and deadlines first."
  ),
  "Avoid school-related debt": meaning(
    "Avoid school-related debt",
    "This means you want school costs handled without creating future pressure. Planning ahead for requirements and deadlines matters."
  ),
  "Keep food and fare stable": meaning(
    "Keep food and fare stable",
    "This means daily basics are the protection goal. Stable meals and transport can protect school attendance and energy."
  ),
  "Finish school without burning out": meaning(
    "Finish school without burning out",
    "This means graduation matters, but not at the cost of your health and energy. CLARA should protect progress and recovery together."
  ),
  "Help family without losing stability": meaning(
    "Help family without losing stability",
    "This means you want to support home while keeping your own foundation safe. Clear boundaries protect both generosity and survival."
  ),
  "Set a support boundary": meaning(
    "Set a support boundary",
    "This means help should have a limit before pressure starts. A boundary makes support sustainable instead of emotionally draining."
  ),
  "Protect school and daily needs": meaning(
    "Protect school and daily needs",
    "This means your own basics must stay covered while other responsibilities exist. CLARA should separate school, food, fare, and support money clearly."
  ),
  "Build a personal safety buffer": meaning(
    "Build a personal safety buffer",
    "This means you need a small protected amount for yourself. Even a tiny buffer can reduce fear when unexpected costs appear."
  ),
  "Build a tiny emergency buffer": meaning(
    "Build a tiny emergency buffer",
    "This means the emergency goal should start small and realistic. Food, fare, data, or urgent school backup can be the first protection layer."
  ),
  "Finish school safely": meaning(
    "Finish school safely",
    "This means the goal is steady completion without creating deeper survival pressure. CLARA should protect school and essential needs first."
  ),
  "Stop survival borrowing": meaning(
    "Stop survival borrowing",
    "This means borrowing should no longer be the normal bridge for basic needs. The plan should protect the gap before borrowing becomes necessary."
  ),
  "Protect food and fare first": meaning(
    "Protect food and fare first",
    "This means daily movement and meals are the priority. When these are stable, school and work become easier to maintain."
  ),
  "Create low-energy money rules": meaning(
    "Create low-energy money rules",
    "This means your money system must work even when you are tired. Simple rules are better than perfect routines that fail on heavy days."
  ),
  "Reduce convenience leaks": meaning(
    "Reduce convenience leaks",
    "This means convenience spending should be lowered gently, not removed harshly. CLARA should prepare cheaper shortcuts before exhaustion hits."
  ),
  "Protect rest as part of budgeting": meaning(
    "Protect rest as part of budgeting",
    "This means rest is not separate from money behavior. Better recovery can reduce rushed spending, missed tracking, and emotional purchases."
  ),
  "Create a simple money rhythm": meaning(
    "Create a simple money rhythm",
    "This means the goal is repeatable structure, not a perfect budget. A simple rhythm can survive unstable income and changing schedules."
  ),
  "Protect future goals slowly": meaning(
    "Protect future goals slowly",
    "This means progress should be steady and realistic. Small protected actions can keep the future moving without overwhelming the present."
  ),
  "Choose one priority first": meaning(
    "Choose one priority first",
    "This means clarity matters more than doing everything. One protected priority can reduce pressure and make the next step easier."
  ),
  "Control micro-spending": meaning(
    "Control micro-spending",
    "This means small purchases need visibility because they repeat. The goal is not guilt; it is noticing where money quietly goes."
  ),
  "Stop pressure from stacking": meaning(
    "Stop pressure from stacking",
    "This means old gaps should not keep controlling new weeks. CLARA should help prevent one shortfall from becoming a cycle."
  ),
  "Build a no-new-debt rule": meaning(
    "Build a no-new-debt rule",
    "This means the next protection is preventing new borrowing while handling current pressure. The rule should be realistic enough to follow."
  ),
  "Create a repayment rhythm": meaning(
    "Create a repayment rhythm",
    "This means repayment needs a predictable place in the week. Even small planned payments can reduce repair-mode stress."
  ),
  "Protect a tiny food/fare buffer": meaning(
    "Protect a tiny food/fare buffer",
    "This means the first buffer should protect daily survival. A small food or fare backup can prevent borrowing and panic decisions."
  ),
  "Family-supported with some work": meaning(
    "Learning independence with support",
    "You may still have support around you, but you are slowly learning what financial responsibility feels like. Many students in this stage become more careful with spending because independence starts feeling real."
  ),
  "Self-supporting student": meaning(
    "Mostly self-supporting",
    "This means you are carrying a larger part of school and daily survival yourself. Decisions often become less about comfort and more about stability, timing, and avoiding setbacks."
  ),
  "Working mainly for school costs": meaning(
    "Working to protect school",
    "This usually means earning money is not about luxury; it is about keeping school possible. Tuition, projects, fare, food, and deadline pressure can make every peso feel connected to your future."
  ),
  "Side hustle / extra-income student": meaning(
    "Side hustle and extra income",
    "This means you are creating extra money through flexible effort. The main watch area is whether the extra income builds stability or disappears through small spending."
  ),
  "Allowance + work income": meaning(
    "Allowance base plus extra work",
    "This means support may cover part of your life while your own effort adds flexibility. The main risk is treating extra income as free money before school, food, fare, and small savings are protected."
  ),
  "Irregular side hustle income": meaning(
    "Irregular side income",
    "This means income may change from week to week. Strong income days need to help cover weaker days."
  ),
  "Project / seasonal income": meaning(
    "Project or seasonal income",
    "This means money may arrive in waves instead of a steady flow. Strong periods need to protect slower periods."
  ),
  "Mostly allowance with occasional work": meaning(
    "Mostly allowance with occasional work",
    "This means allowance is still the base, while work gives extra room. CLARA should help separate basic money from flexible money."
  ),
  "Manageable class-work load": meaning(
    "Still manageable",
    "This means your schedule still has room for control. It is a good time to build simple habits before pressure becomes heavier."
  ),
  "Tight but still controlled": meaning(
    "Tight but still controlled",
    "This means your week is stretched, but not fully out of control. Small leaks in rest or money can become noticeable faster."
  ),
  "Almost no margin / survival mode": meaning(
    "Almost no margin",
    "This means there is very little room for mistakes right now. CLARA should focus on protection first instead of expecting a perfect budget."
  ),
  "Tuition or school costs": meaning(
    "Tuition and school costs",
    "This means school expenses are the main pressure point. CLARA should protect tuition, requirements, and education-related costs before optional spending."
  ),
  "Daily food and transport": meaning(
    "Daily food and transport",
    "This means repeated daily survival costs are shaping the month. Small costs may look harmless alone, but frequency can drain the week."
  ),
  "Debt or borrowed money": meaning(
    "Debt or borrowed money",
    "This means borrowed money is already part of the pressure. CLARA should focus on preventing the same shortfall from repeating week after week."
  ),
  "I spend on small rewards to feel okay": meaning(
    "Small rewards to feel okay",
    "This means spending may sometimes become emotional relief. CLARA should not shame rewards, but it should help keep them from becoming repeated leaks."
  ),
  "I avoid checking my money": meaning(
    "Avoid checking money",
    "This means checking money may feel stressful or heavy. CLARA should make check-ins lighter, shorter, and easier to face."
  ),
  "I borrow or delay payments": meaning(
    "Borrow or delay payments",
    "This means today’s pressure may be getting pushed forward. CLARA should help spot gaps earlier before delay becomes a repeating cycle."
  ),
  "I cut my needs too much": meaning(
    "Cutting needs too much",
    "This means sacrifice may be crossing into risk. CLARA should protect food, transport, rest, health, and school essentials as non-negotiables."
  ),
  "I ask for help before it gets worse": meaning(
    "Ask for help early",
    "This means you know how to reach for support before pressure becomes heavier. CLARA can turn that support into a clearer plan, not just emergency rescue."
  ),
  "Avoid debt": meaning(
    "Avoid debt",
    "This means your main goal is preventing borrowed money from becoming normal. CLARA should help you catch shortfalls earlier and protect essentials first."
  ),
  "Build savings slowly": meaning(
    "Build savings slowly",
    "This means you want progress without forcing an unrealistic savings plan. CLARA should focus on small, steady protection instead of pressure-based saving."
  ),
  "Control stress spending": meaning(
    "Control stress spending",
    "This means you want to understand pressure before it turns into repeated spending. CLARA should help create relief options that do not quietly damage your budget."
  ),
};

const DEFAULT_BOARD = meaning(
  "Selected answer",
  "This choice helps CLARA understand the situation you are selecting right now.\n\nCLARA will use this as a simple signal when giving guidance later."
);

const STAGE_NAMES = [
  "Working Student",
  "Young Professional",
  "Living with Partner",
  "Family Household",
  "Single Parent",
  "Full-Time Earner",
  "Freelance Season",
  "Business Builder",
];

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();

function isVisible(node) {
  return !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
}

function getStepMeta(text) {
  return STEP_META[loud(text)] || null;
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

function findActiveQuestionSection() {
  const labels = Array.from(document.querySelectorAll("section p"));
  for (const label of labels) {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (meta && section && isVisible(section) && section.querySelector("button")) {
      return { label, section, meta };
    }
  }
  return null;
}

function findStageBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === FLOW_MARKER);
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { marker, header, title, summary };
}

function isStagePickerOpen() {
  const buttons = Array.from(document.querySelectorAll("main button") || []);
  const labels = buttons.map((button) => clean(button.innerText || button.textContent));
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
    const clone = bars[bars.length - 1].cloneNode(false);
    group.appendChild(clone);
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

  const bars = ensureSixProgressBars(group);
  bars.forEach((bar, index) => {
    const active = index === activeIndex;
    bar.style.setProperty("width", active ? "2rem" : "1.65rem", "important");
    bar.style.setProperty("height", "0.25rem", "important");
    bar.style.setProperty("border-radius", "9999px", "important");
    bar.style.setProperty("background", active ? "rgb(165 243 252)" : "rgba(255, 255, 255, 0.12)", "important");
    bar.style.setProperty("box-shadow", active ? "0 0 16px rgba(125, 211, 252, 0.35)" : "none", "important");
    bar.style.setProperty("opacity", active ? "1" : "0.6", "important");
    bar.style.setProperty("transition", "background 160ms ease, opacity 160ms ease, width 160ms ease", "important");
  });
}

function polishQuestionCards() {
  const labels = Array.from(document.querySelectorAll("section p"));
  labels.forEach((label) => {
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

function buildSimpleBoard(selectedValue) {
  const selected = clean(selectedValue);
  return OPTION_MEANINGS[selected] || {
    ...DEFAULT_BOARD,
    title: selected || DEFAULT_BOARD.title,
  };
}

function polishContextBoard() {
  const active = findActiveQuestionSection();
  const { header, summary, title } = findStageBoard();
  if (!active || !header || !summary || !title) return;

  const selectedValue = getSelectedOption(active.section);
  const board = buildSimpleBoard(selectedValue);
  const signature = `${active.meta.key}:${selectedValue}`;

  updateSimpleProgress(header, active.meta.index);

  if (title.dataset.claraSimpleBoardSignature !== signature) {
    title.textContent = board.title;
    title.dataset.claraSimpleBoardSignature = signature;
  }

  if (summary.dataset.claraSimpleBoardSignature !== signature) {
    summary.textContent = board.summary;
    summary.dataset.claraSimpleBoardSignature = signature;
    summary.classList.add("clara-flow-board-summary");
    summary.style.setProperty("white-space", "pre-line", "important");
    summary.style.setProperty("line-height", "1.55", "important");
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
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  document.addEventListener("click", schedule, true);
}

try {
  installLifeStageSetupFlowPolish();
} catch (error) {
  console.warn("CLARA life stage setup flow polish failed:", error);
}
