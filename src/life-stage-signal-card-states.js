const SIGNAL_CARD_COPY = {
  tired: {
    awarenessTitle: "Energy pressure is showing up.",
    guidanceTitle: "Make tired days easier.",
  },
  stress: {
    awarenessTitle: "Stress may be asking for relief.",
    guidanceTitle: "Name the pressure first.",
  },
  sleepy: {
    awarenessTitle: "Low sleep weakens control.",
    guidanceTitle: "Delay bigger decisions.",
  },
  hungry: {
    awarenessTitle: "Hunger can trigger impulse spending.",
    guidanceTitle: "Protect a small food buffer.",
  },
  pressure: {
    awarenessTitle: "Time pressure becomes money pressure.",
    guidanceTitle: "Prepare one thing early.",
  },
  moneyTiming: {
    awarenessTitle: "Money timing can create pressure.",
    guidanceTitle: "Protect the waiting period.",
  },
  commute: {
    awarenessTitle: "Commute pressure affects spending.",
    guidanceTitle: "Plan the travel cost early.",
  },
};

const DAILY_SIGNAL_BANK = {
  tired: [
    ["Energy may be low today, so shortcuts can feel more reasonable than usual.", "Choose one low-effort rule: fare ready, food limit set, or one expense check."],
    ["When your body is tired, spending often becomes faster and less reviewed.", "Make the next choice smaller. Decide one safe amount before leaving home."],
    ["Tiredness can make comfort spending feel like recovery, not a decision.", "Pick one recovery move that does not cost much: water, meal, rest, or pause."],
    ["A heavy day can weaken tracking because the mind wants fewer tasks.", "Do the easiest check only: current wallet balance versus today’s remaining need."],
    ["Fatigue can turn convenience into a pattern before you notice it.", "Prepare one repeated need early so tiredness does not decide later."],
    ["Low energy often makes small treats feel deserved after effort.", "Keep the treat small and planned so it stays relief, not budget leakage."],
    ["When school and work stack up, discipline can feel heavier than spending.", "Use a tiny boundary: one food choice, one ride decision, one spending pause."],
    ["Tired days can blur the difference between need, comfort, and escape.", "Ask: is this helping my body, my schedule, or only my mood for a moment?"],
    ["Mental tiredness can make budget checking feel like another assignment.", "Do a 20-second check instead of a full review. Small awareness still helps."],
    ["When energy drops, the easiest option can become the most expensive one.", "Choose one cheaper easy option before the day becomes too heavy."],
    ["A tired mind may avoid numbers because it wants silence, not planning.", "Check only the next expense. You do not need to solve the whole month now."],
    ["Fatigue can make repeated small purchases feel invisible.", "Name the repeated cost today: snack, ride, drink, data, or delivery."],
    ["When rest is missing, money control often weakens quietly.", "Protect one basic need first: food, fare, sleep, or school requirement."],
    ["Tiredness can make you pay for convenience just to survive the day.", "Set a convenience ceiling. Decide how much comfort spending is allowed today."],
    ["Energy pressure can make planning feel impossible even when you care.", "Use a fallback plan: cheapest meal, fixed fare, and no extra stop if tired."],
    ["When your body is asking for recovery, spending may answer too quickly.", "Try one non-spending recovery first, then decide if the purchase still matters."],
    ["A draining week can make small leaks feel harmless.", "Track only one category today. Start with food, fare, or drinks."],
    ["Fatigue can make you choose what is near, fast, and comfortable.", "Prepare the near option yourself when possible: packed snack, water, or fare."],
    ["When you are tired, future goals can feel far away.", "Connect one small choice today to one bigger goal you still want."],
    ["Low energy can make skipped tracking feel like self-protection.", "Use gentle tracking: write only the amount, not the full details."],
    ["Tired days can make budget discipline feel unfair.", "Lower the effort, not the boundary. Keep one simple spending rule active."],
    ["Fatigue often increases the desire for comfort after class or work.", "Plan the comfort before the craving starts so it stays controlled."],
    ["A heavy schedule can make spending feel like the only reward.", "Reward yourself with a limit already chosen before you spend."],
    ["When you are tired, delayed meals and rushed rides become risk points.", "Prepare food or fare first. Protect the two costs most affected by fatigue."],
    ["Energy pressure can make decision quality drop near the end of the day.", "Avoid late-day impulse buys unless they are already planned."],
    ["When your mind is overloaded, every peso choice feels heavier.", "Simplify: decide what you will not spend on today."],
    ["Tiredness can make small financial rules feel annoying.", "Use one rule only. One protected boundary is better than no boundary."],
    ["If the day feels heavy, spending may become emotional relief.", "Pause before relief spending and ask what you actually need: rest, food, or space."],
    ["Fatigue can make tomorrow’s money less visible.", "Before spending, leave something for tomorrow’s fare or food."],
    ["A tired student often needs structure that is easy, not perfect.", "Create one tiny routine that survives tired days: check, limit, or prepare."]
  ],
  stress: [
    ["Stress can make spending feel like a quick way to breathe.", "Name the stress first, then decide if money is really the answer."],
    ["When pressure feels crowded, comfort purchases can feel urgent.", "Delay the purchase for ten minutes and let the feeling settle first."],
    ["Stress often asks for control, and buying can feel like control.", "Choose one controlled amount before spending, not after."],
    ["School, work, and family pressure can make small spending feel justified.", "Separate the pressure from the purchase. What problem is the money solving?"],
    ["When the mind is full, budget discipline can feel like another burden.", "Make the rule gentle: one spending pause before one purchase."],
    ["Stress can turn wants into needs when emotions are loud.", "Ask if this still matters tomorrow. If not, keep the peso safe."],
    ["A tense day can push you toward reward spending after effort.", "Plan the reward with a limit so stress does not choose the amount."],
    ["Pressure may make you avoid checking the real number.", "Look at the balance once. Awareness reduces panic more than guessing."],
    ["Stress can make small expenses feel invisible because attention is elsewhere.", "Track only stress-related spending today: food, treats, rides, or online buys."],
    ["When emotions feel heavy, spending can become a reset button.", "Try a reset without spending first: walk, water, message, or quiet break."],
    ["Stress can make convenience feel necessary even when it is optional.", "Choose the cheapest convenience that still solves the pressure."],
    ["A pressured mind may spend to feel normal again.", "Keep normalcy small: one planned comfort, not open-ended spending."],
    ["Stress can make future consequences feel distant.", "Protect one future cost before buying anything extra today."],
    ["When pressure builds, you may want a quick win.", "Let the quick win be control: skip one unnecessary spend."],
    ["Stress spending often starts as one harmless purchase.", "Watch the second purchase. That is where the pattern usually begins."],
    ["When everything feels urgent, money decisions can become reactive.", "Slow one decision down. Urgency does not always mean necessity."],
    ["Emotional pressure can hide inside food, drinks, and small online buys.", "Ask what emotion is being paid for before you tap or buy."],
    ["Stress can make discipline feel like denial.", "Reframe the limit as protection, not punishment."],
    ["A stressful week can make you seek relief more often.", "Set a relief budget for today before stress chooses it for you."],
    ["When pressure feels unfair, spending can feel like compensation.", "Compensate carefully. Choose one affordable comfort, not many small leaks."],
    ["Stress can make you decide faster than your budget can respond.", "Pause and check whether the expense affects fare, food, or school needs."],
    ["A crowded mind often wants the easiest yes.", "Give yourself one allowed no today. Protect one peso boundary."],
    ["When stress is high, avoidance can feel safer than tracking.", "Track softly. One number is enough to regain direction."],
    ["Stress can make spending feel private and harmless.", "Write it down anyway. Hidden spending grows faster."],
    ["Pressure can make you buy peace for a moment.", "Choose peace that does not create pressure later."],
    ["Stress can make budget rules feel too strict.", "Use a flexible limit, but keep a limit."],
    ["When the day feels emotionally full, impulse control gets weaker.", "Move the purchase later. Distance helps control return."],
    ["Stress often changes how expensive small comfort feels.", "Check the total, not just the item. Repetition matters."],
    ["A pressured student may spend to feel less trapped.", "Protect one choice for later by not spending all relief money now."],
    ["Stress is real, but it should not quietly run the wallet.", "Let CLARA hold the boundary: decide, limit, then spend only if still needed."]
  ],
  sleepy: [
    ["Low sleep makes automatic spending more likely.", "Avoid bigger money decisions until your mind is clearer."],
    ["Sleepy days can turn caffeine and snacks into repeated costs.", "Set a small energy-spending limit before the first purchase."],
    ["When sleep is low, planning feels harder than spending.", "Use one pre-decided rule instead of making many choices."],
    ["A sleepy mind may choose what is easiest, not what is safest.", "Pause before paying for convenience. Check if a cheaper option still works."],
    ["Low rest weakens patience with budget limits.", "Do not negotiate with tired cravings. Follow the limit you set earlier."],
    ["Sleep debt can make treats feel necessary for survival.", "Choose food or rest first before spending on extra comfort."],
    ["When you are sleepy, impulse buys can feel harmless.", "Delay online purchases until after rest or tomorrow morning."],
    ["Low sleep can make you miss small spending patterns.", "Track only quick buys today: coffee, snacks, rides, and drinks."],
    ["Sleepy weeks can make school and work costs feel heavier.", "Protect fare and food before buying anything extra."],
    ["A tired brain wants fewer decisions.", "Decide your spending limit once, then stop re-deciding all day."],
    ["Low sleep makes emotional control harder.", "Pause when spending feels urgent. Sleepiness may be pushing the decision."],
    ["Sleepy days often increase convenience spending.", "Prepare one simple option: water, snack, fare, or packed item."],
    ["When rest is low, future goals feel less real.", "Before spending, remember one goal that needs today’s peso."],
    ["Sleepiness can make skipped tracking feel understandable.", "Write the amount only. Details can wait."],
    ["Low sleep can make cravings louder than budgets.", "Eat or rest before deciding on treats."],
    ["When you are sleepy, small mistakes repeat easier.", "Set one no-repeat rule for today’s common leak."],
    ["Sleep loss can make waiting feel harder.", "Use a 15-minute delay before unplanned spending."],
    ["A sleepy commute can trigger extra snacks or rides.", "Separate travel money from comfort money before leaving."],
    ["Low rest can make you overspend for energy.", "Choose the smallest energy support that works."],
    ["Sleepy minds may avoid checking balances.", "Check once, then let that number guide the next purchase."],
    ["Low sleep makes discipline feel personal, but it is biological too.", "Make the rule easier today, not absent."],
    ["When sleep is poor, decision fatigue appears faster.", "Avoid stores or apps that usually trigger unplanned buys."],
    ["Sleepy spending often feels practical in the moment.", "Ask if this is practical or just low-energy relief."],
    ["Rest debt can turn small costs into daily habits.", "Notice the repeat. Repeated tiny costs are still patterns."],
    ["Low sleep can make money feel harder to control.", "Protect the first necessary expenses before any comfort expense."],
    ["Sleepy days are not the best time for big financial choices.", "Move the decision to tomorrow unless it is urgent."],
    ["When the brain is tired, marketing works better.", "Do not buy from ads or cravings while sleepy."],
    ["Low sleep may make you spend to keep functioning.", "Function first, but choose the lowest-cost support."],
    ["Sleepiness can hide behind the phrase ‘I deserve this.’", "You may deserve rest more than another purchase."],
    ["A sleepy student needs fewer money decisions, not no money rules.", "Use one simple boundary until your energy returns."]
  ],
  hungry: [
    ["Hunger can make food spending feel urgent.", "Protect a small food budget before the day gets long."],
    ["Delayed meals can turn snacks into bigger spending.", "Eat earlier if possible so hunger does not decide the price."],
    ["When you are hungry, treats can feel like needs.", "Buy the meal first, then decide if the treat still matters."],
    ["Skipping food can weaken spending control later.", "Keep one affordable backup snack or meal plan ready."],
    ["Hunger often increases impulse choices near stores or commute stops.", "Avoid buying while very hungry if a cheaper meal is close."],
    ["Food pressure is real for working students.", "Separate meal money from comfort food money before spending."],
    ["A long day can make delivery feel like survival.", "Choose the lowest-cost meal that actually solves hunger."],
    ["When meals are late, small food costs stack quickly.", "Track food spending today as one category, not separate harmless buys."],
    ["Hunger can make drinks, snacks, and extras feel automatic.", "Choose one main food expense first and pause extras."],
    ["Low food planning can create repeated budget leaks.", "Set a daily food ceiling before class or work starts."],
    ["Hunger can make you impatient with budget limits.", "Decide while calmer: where will today’s food money go?"],
    ["A hungry commute often costs more than expected.", "Bring water or a small snack if the trip usually triggers spending."],
    ["When your body needs food, your wallet reacts faster.", "Feed the need, but avoid emotional add-ons."],
    ["Hunger can make convenience stores dangerous for budgets.", "Enter with one item in mind, not an open choice."],
    ["Meal gaps can make spending feel less optional.", "Plan one reliable meal time to reduce impulse buys."],
    ["Food spending can look small until repeated daily.", "Watch the repeat, not only the price."],
    ["A hungry mind may ignore tomorrow’s fare or food.", "Leave money for the next meal before buying extras today."],
    ["Long school-work days need food protection.", "Treat food as a planned essential, not a last-minute emergency."],
    ["Hunger can make emotional reward spending easier.", "Ask if you need a meal, a drink, or comfort."],
    ["When you eat too late, the budget often pays extra.", "Spend earlier and smaller rather than later and impulsive."],
    ["Food pressure can drain savings quietly.", "Set a small weekly food buffer if daily meals often break the plan."],
    ["Hunger makes choices faster and less careful.", "Slow the choice by checking the amount before ordering."],
    ["A student day without food structure becomes expensive.", "Choose one affordable default meal for heavy days."],
    ["When hungry, you may buy more than what solves hunger.", "Stop at enough. Extra comfort is a separate decision."],
    ["Food cravings can hide stress or tiredness too.", "Check if the craving is hunger, stress, or fatigue."],
    ["Meal spending is not bad, but unplanned repetition matters.", "Plan the meal and limit the extras."],
    ["Hunger can turn a small stop into a bigger receipt.", "Use cash or a fixed wallet amount for food today."],
    ["When the day is packed, food becomes a financial pressure point.", "Protect one simple meal before protecting comfort spending."],
    ["A late meal can make budget discipline collapse quickly.", "Eat before the most tempting part of your route."],
    ["Food is care, but the pattern still needs boundaries.", "Choose care with a price you already accepted." ]
  ],
  pressure: [
    ["Rushed days can make extra spending feel unavoidable.", "Prepare one predictable cost before the rush begins."],
    ["Time pressure often turns small mistakes into expenses.", "Check fare, food, and school needs before leaving."],
    ["When you are late, convenience becomes more expensive.", "Choose one backup plan for rushed moments."],
    ["A crowded schedule can make planning feel impossible.", "Plan only the next pressure point, not the whole day."],
    ["Last-minute choices often cost more than early choices.", "Prepare the item you usually forget most."],
    ["Time pressure can make transport spending jump quickly.", "Set fare money aside before any optional spend."],
    ["Rushing can hide repeated costs like snacks, rides, or supplies.", "Notice which cost appears whenever you are late."],
    ["When deadlines stack, money decisions become reactive.", "Pause once before paying for speed."],
    ["A tight schedule can make every shortcut look necessary.", "Pick the shortcut that protects the most time for the lowest cost."],
    ["Time pressure can make school needs expensive at the last minute.", "Prepare one school item early today."],
    ["Rushed movement can create small leaks across the day.", "Keep emergency coins or fare separate from spending money."],
    ["When the day feels packed, budget attention drops.", "Use a simple rule: essentials first, extras later."],
    ["Time pressure can make you spend to avoid stress.", "Ask if paying more solves the real problem or only the panic."],
    ["A late start can create expensive choices later.", "Prepare the first hour of the day better than the rest."],
    ["Rushed days make planning less likely but more important.", "Plan one repeated expense: transport, food, load, or supplies."],
    ["When time is short, prices feel less important.", "Look at the amount once before paying."],
    ["Time pressure can turn convenience into a habit.", "Use convenience only for the highest-pressure moment."],
    ["A full schedule can make you forget future needs.", "Before spending, ask what still needs money today."],
    ["Rushing makes tiny decisions expensive.", "Slow one tiny decision down."],
    ["Time pressure can make you choose speed over safety.", "Keep one safe budget boundary even when rushing."],
    ["Deadlines can make emotional spending easier afterward.", "After the rush, pause before rewarding yourself."],
    ["A rushed commute can trigger unplanned food or fare.", "Prepare route money before comfort money."],
    ["When every minute matters, spending feels practical.", "Check if it is practical once or becoming repeated."],
    ["Time pressure can make you buy what preparation could have prevented.", "Prepare one common item tonight for tomorrow."],
    ["Rushed weeks can damage tracking habits.", "Log only the big spend today if small tracking feels hard."],
    ["When time is tight, your budget needs shortcuts too.", "Use one default decision for heavy days."],
    ["Time pressure often repeats around the same moments.", "Find the repeated moment and prepare before it."],
    ["Last-minute spending can feel like survival.", "Keep a small emergency amount for real last-minute needs only."],
    ["Rushing can make spending feel invisible.", "Review the rushed expense once when the day slows down."],
    ["Time pressure is easier to manage before it starts.", "Protect tomorrow by preparing one small thing today."]
  ],
  moneyTiming: [
    ["When money arrives late, even small costs feel heavier.", "Protect fare, food, load, and school needs until the next money comes."],
    ["Income gaps can make the week feel unstable before payday.", "List what must survive first, then delay what can wait."],
    ["Money timing pressure often comes from bills arriving before funds.", "Create a waiting-period budget for the days before income arrives."],
    ["Late allowance or salary can make borrowing feel tempting.", "Check if a smaller adjustment can avoid borrowing today."],
    ["Irregular money can make planning feel unfair.", "Use priorities, not perfect amounts: fare, food, school, then extras."],
    ["When cash flow is delayed, emotional spending becomes riskier.", "Pause non-essential spending until the timing gap is clearer."],
    ["Money timing can make the same expense feel more stressful.", "Separate urgent costs from costs that only feel urgent."],
    ["A waiting period can quietly drain small pesos.", "Track every small spend until money arrives."],
    ["When income is uncertain, comfort spending has a bigger impact.", "Keep comfort spending small until essentials are protected."],
    ["Late money can make you feel behind before the week starts.", "Protect the first three needs only. Solve the rest after income arrives."],
    ["Cash-flow pressure can make future money feel already spent.", "Write down what the next income must cover before using it."],
    ["When money timing is off, repeated small costs become louder.", "Avoid new small subscriptions, add-ons, or treats during the gap."],
    ["A delayed payment can affect food, fare, and school rhythm.", "Choose the lowest safe version of each essential until money comes."],
    ["Waiting for money can create mental pressure too.", "Check the exact gap instead of guessing. Clarity reduces panic."],
    ["Money timing issues can make borrowing look like relief.", "Borrow only after checking what can be delayed safely."],
    ["When funds are late, every unplanned spend becomes more powerful.", "Make today a no-extra day until essentials are secured."],
    ["Cash timing pressure can make you avoid your balance.", "Look once. The number helps you plan the waiting period."],
    ["A gap before income can test discipline the most.", "Keep a small survival list and follow it strictly."],
    ["When money arrives irregularly, spending needs stronger order.", "Use this order today: must pay, must eat, must travel, then optional."],
    ["Late money can make future expenses collide.", "Reserve for the next due date before spending on comfort."],
    ["Income timing can make normal days feel risky.", "Lower optional spending until the next money is confirmed."],
    ["A delayed allowance can make every peso feel pressured.", "Spend only on what protects tomorrow too."],
    ["Money timing pressure often repeats monthly or weekly.", "Notice the pattern and prepare one day earlier next time."],
    ["When funds are not yet here, wants become more expensive emotionally.", "Wait until the money arrives before deciding on extras."],
    ["Cash gaps can make small emergencies feel bigger.", "Keep a tiny emergency amount untouched if possible."],
    ["Late money can push you into repair mode.", "Avoid adding new pressure while repairing the old one."],
    ["Timing pressure can make you spend future money too early.", "Assign the next income before it arrives."],
    ["When allowance or pay is delayed, control matters more than comfort.", "Choose one comfort only after essentials are safe."],
    ["Cash-flow uncertainty can make the week feel unstable.", "Plan by days remaining, not by the whole month."],
    ["Money timing is not your fault, but it needs a boundary.", "Protect the gap with a simple survival budget." ]
  ],
  commute: [
    ["Commute pressure can quietly add fare, food, and drink costs.", "Set aside fare first before any optional spending."],
    ["Long travel can make convenience spending feel normal.", "Bring one small item that reduces route spending."],
    ["Traffic and waiting can trigger snacks, drinks, or extra rides.", "Choose one travel buffer and keep it separate."],
    ["A rushed commute often costs more than a planned one.", "Prepare fare and route before leaving."],
    ["Movement pressure can drain money in small stops.", "Avoid one usual stop today if it is not essential."],
    ["Commuting tired can make comfort spending easier.", "Plan the cheapest comfort before the trip starts."],
    ["Long rides can make food and drink spending repeat daily.", "Track commute-related spending as one category today."],
    ["Travel delays can turn time pressure into money pressure.", "Keep emergency fare only for real delays."],
    ["Commute stress can make extra transport feel necessary.", "Check if the extra ride saves enough time to be worth it."],
    ["A difficult route can create hidden weekly costs.", "Estimate today’s travel total before the first ride."],
    ["Commute pressure often appears through small add-ons.", "Watch drinks, snacks, charging, data, and extra rides."],
    ["When travel is long, spending can become a coping tool.", "Choose one affordable coping item, not several."],
    ["Rushed movement can make you forget the budget.", "Put fare money apart from food money."],
    ["Commute fatigue can make delivery or rides more tempting later.", "Plan a low-cost arrival routine before you get tired."],
    ["Travel costs can affect school money more than expected.", "Protect fare for tomorrow before buying extras today."],
    ["When the route is stressful, comfort stops become habits.", "Skip one routine stop and see if the day still works."],
    ["Commuting can make time and hunger collide.", "Prepare food or water before the longest travel segment."],
    ["A long route can make small spending feel deserved.", "Keep the reward planned and limited."],
    ["Commute pressure can make the budget leak twice: going and returning.", "Plan both directions before spending in between."],
    ["When travel is unpredictable, money needs a small buffer.", "Keep a travel buffer separate from comfort money."],
    ["Traffic can make waiting expensive.", "Decide before waiting what you will not buy."],
    ["Transport choices can quickly change the day’s budget.", "Compare time saved versus pesos lost before upgrading the ride."],
    ["Long commutes can make fatigue spending stronger.", "Protect rest and food so the commute does not trigger extra costs."],
    ["A stressful trip can make the next purchase emotional.", "Pause after arriving before buying comfort."],
    ["Commute costs repeat, so small changes matter.", "Find one recurring route expense you can reduce today."],
    ["Travel pressure can make cash disappear before class starts.", "Start the day with fare already separated."],
    ["When movement is rushed, mistakes cost money.", "Check keys, materials, fare, and route before leaving."],
    ["Commute spending can look normal because it happens daily.", "Review the weekly total, not just today’s fare."],
    ["Long travel can make convenience feel like survival.", "Use convenience only where it protects time or safety."],
    ["Your route affects your wallet more than it seems.", "Plan the route like a budget category, not an afterthought." ]
  ]
};

const EXTRA_SIGNAL_ICONS = [
  { id: "moneyTiming", icon: "💸", label: "Money Timing" },
  { id: "commute", icon: "🚌", label: "Commute Pressure" },
];

const STATE = { signalId: null, mode: "awareness" };

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function signalOffset(signalId) {
  return String(signalId || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getDailySignalPair(signalId) {
  const bank = DAILY_SIGNAL_BANK[signalId] || DAILY_SIGNAL_BANK.tired;
  const now = new Date();
  const dayNumber = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
  return bank[(dayNumber + signalOffset(signalId)) % bank.length] || bank[0];
}

function findLifeStageHero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function findSupportCard() {
  const hero = findLifeStageHero();
  if (!hero) return null;

  let current = hero.nextElementSibling;
  while (current) {
    if (current.matches?.("[data-clara-pressure-signals='true']")) {
      current = current.nextElementSibling;
      continue;
    }
    if (clean(current.querySelector?.("h3")?.textContent) || current.querySelector?.("svg")) return current;
    current = current.nextElementSibling;
  }
  return null;
}

function findTextNodes(card) {
  const title = card?.querySelector("h3");
  const body = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, body };
}

function findHeartNode(card) {
  return card?.querySelector("svg")?.closest("div") || null;
}

function getCopy(signalId, mode) {
  const copy = SIGNAL_CARD_COPY[signalId] || SIGNAL_CARD_COPY.tired;
  const daily = getDailySignalPair(signalId);
  if (mode === "guidance") return { title: copy.guidanceTitle, body: daily[1] };
  return { title: copy.awarenessTitle, body: daily[0] };
}

function setActiveIcon(signalId) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = button.dataset.claraPressureSignal === signalId ? "true" : "false";
  });
}

function applyImportantStyle(node, styles) {
  if (!node) return;
  Object.entries(styles).forEach(([property, value]) => {
    node.style.setProperty(property, value, "important");
  });
}

function ensureExtraSignalIcons() {
  document.querySelectorAll("[data-clara-pressure-signals='true'] .clara-pressure-track").forEach((track) => {
    EXTRA_SIGNAL_ICONS.forEach((signal) => {
      if (track.querySelector(`[data-clara-pressure-signal='${signal.id}']`)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "clara-pressure-chip";
      button.dataset.claraPressureSignal = signal.id;
      button.setAttribute("aria-label", `Show ${signal.label} awareness`);
      button.title = signal.label;
      button.innerHTML = `<span aria-hidden="true">${signal.icon}</span><strong>${signal.label}</strong>`;
      track.appendChild(button);
    });
  });
}

function prepareCardLayout(card, title, body) {
  const row = card.querySelector(":scope > div") || title.parentElement;
  const textColumn = title.parentElement;
  const heart = findHeartNode(card);

  applyImportantStyle(card, { overflow: "hidden" });

  applyImportantStyle(row, {
    display: "flex",
    "flex-direction": "row",
    "align-items": "center",
    "justify-content": "space-between",
    gap: "12px",
    height: "100%",
    "min-height": "100%",
  });

  applyImportantStyle(textColumn, {
    flex: "1 1 auto",
    "min-width": "0",
    display: "flex",
    "flex-direction": "column",
    "justify-content": "center",
    "align-items": "stretch",
  });

  applyImportantStyle(title, {
    "max-width": "100%",
    "font-size": "13.5px",
    "line-height": "1.13",
    margin: "0 0 7px",
    overflow: "visible",
    "text-overflow": "clip",
    "white-space": "normal",
    display: "block",
  });

  applyImportantStyle(body, {
    "max-width": "100%",
    "font-size": "10.8px",
    "line-height": "1.34",
    margin: "0",
    overflow: "visible",
    "text-overflow": "clip",
    "white-space": "normal",
    display: "block",
    "max-height": "none",
    "-webkit-line-clamp": "unset",
    "line-clamp": "unset",
    "-webkit-box-orient": "unset",
  });

  if (heart) {
    heart.dataset.claraHeartCta = "true";
    heart.setAttribute("role", "button");
    heart.setAttribute("tabindex", "0");
    applyImportantStyle(heart, {
      position: "relative",
      right: "auto",
      top: "auto",
      transform: "none",
      flex: "0 0 56px",
      width: "56px",
      height: "56px",
      "min-width": "56px",
      "min-height": "56px",
      margin: "0",
      "align-self": "center",
      display: "grid",
      "place-items": "center",
    });
  }
}

function applyCardState(signalId = STATE.signalId, mode = STATE.mode, animate = false) {
  if (!signalId) return;
  const card = findSupportCard();
  const { title, body } = findTextNodes(card);
  if (!card || !title || !body) return;

  prepareCardLayout(card, title, body);

  const copy = getCopy(signalId, mode);
  if (clean(title.textContent) === copy.title && clean(body.textContent) === copy.body) return;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalCardActive = "true";
  card.dataset.claraSelectedSignal = signalId;
  card.dataset.claraSignalMode = mode;

  const heart = findHeartNode(card);
  if (heart) {
    heart.title = mode === "guidance" ? "Showing gentle guidance" : "Show gentle guidance";
    heart.setAttribute("aria-label", heart.title);
  }

  const commit = () => {
    title.textContent = copy.title;
    body.textContent = copy.body;
    prepareCardLayout(card, title, body);
    title.style.opacity = "1";
    body.style.opacity = "1";
    title.style.transform = "translateY(0)";
    body.style.transform = "translateY(0)";
  };

  if (!animate) {
    commit();
    return;
  }

  title.style.opacity = "0";
  body.style.opacity = "0";
  title.style.transform = "translateY(4px)";
  body.style.transform = "translateY(4px)";
  window.setTimeout(commit, 90);
}

function installStyles() {
  if (document.getElementById("clara-signal-card-state-style")) return;
  const style = document.createElement("style");
  style.id = "clara-signal-card-state-style";
  style.textContent = `
    #root [data-clara-support-card="true"] h3,
    #root [data-clara-support-card="true"] h3 + p {
      transition: opacity 160ms ease, transform 160ms ease !important;
    }
    #root [data-clara-pressure-signal][data-active="true"] {
      border-color: rgba(165,243,252,.36) !important;
      background: radial-gradient(circle at 50% 0%, rgba(125,211,252,.20), rgba(255,255,255,.06)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 0 18px rgba(34,211,238,.16) !important;
    }
    #root [data-clara-support-card="true"][data-clara-signal-mode="guidance"] {
      box-shadow: 0 20px 54px rgba(0,0,0,.22), 0 0 24px rgba(244,114,182,.10), inset 0 1px 0 rgba(255,255,255,.07) !important;
    }
  `;
  document.head.appendChild(style);
}

function handleSignalClick(event) {
  const button = event.target?.closest?.("[data-clara-pressure-signal]");
  if (!button) return;

  const signalId = button.dataset.claraPressureSignal;
  if (!SIGNAL_CARD_COPY[signalId]) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  STATE.signalId = signalId;
  STATE.mode = "awareness";
  setActiveIcon(signalId);
  applyCardState(signalId, "awareness", true);
}

function handleHeartClick(event) {
  const heart = event.target?.closest?.("[data-clara-heart-cta='true']");
  if (!heart || !STATE.signalId) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  STATE.mode = "guidance";
  setActiveIcon(STATE.signalId);
  applyCardState(STATE.signalId, "guidance", true);
}

function maintainState() {
  installStyles();
  ensureExtraSignalIcons();
  if (STATE.signalId) {
    setActiveIcon(STATE.signalId);
    applyCardState(STATE.signalId, STATE.mode, false);
  }
}

function installSignalCardStates() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_SIGNAL_CARD_STATES__) return;
  window.__CLARA_SIGNAL_CARD_STATES__ = true;

  document.addEventListener("click", handleSignalClick, true);
  document.addEventListener("click", handleHeartClick, true);
  window.addEventListener("resize", maintainState, { passive: true });

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      maintainState();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("storage", schedule, { passive: true });
  schedule();
}

try {
  installSignalCardStates();
} catch (error) {
  console.warn("CLARA signal card state bridge failed:", error);
}