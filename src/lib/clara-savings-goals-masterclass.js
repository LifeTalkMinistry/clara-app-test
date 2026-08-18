import { SAVINGS_GOALS_MASTERCLASS_ROUTE } from "./clara-savings-goals-masterclass-route";

export { SAVINGS_GOALS_MASTERCLASS_ROUTE };

export const SAVINGS_GOALS_MASTERCLASS_TITLE = "Savings Goals Masterclass";

const supportSet = (anotherWay, realLife, simplest) => [
  {
    buttonLabel: "Show me another way",
    userText: "Show me another way to see this.",
    eyebrow: "CLARA · ANOTHER WAY TO SEE IT · 1/3",
    text: anotherWay,
  },
  {
    buttonLabel: "Show me a real-life example",
    userText: "Show me how this looks in real life.",
    eyebrow: "CLARA · IN REAL LIFE · 2/3",
    text: realLife,
  },
  {
    buttonLabel: "Give me the simplest version",
    userText: "Give me the simplest version of this point.",
    eyebrow: "CLARA · SIMPLEST VERSION · 3/3",
    text: simplest,
  },
];

export const SAVINGS_GOALS_MASTERCLASS_STEPS = [
  {
    id: "savings-goal-is-direction",
    title: "What a Savings Goal really is",
    topic: "A Savings Goal is money assigned to a specific future purpose, giving saved money a clear job instead of leaving it anonymous.",
    text: "A Savings Goal is money you deliberately protect for a specific future purpose. It is more precise than simply saying, “I want to save more,” because the goal answers a practical question: what exactly is this money waiting for?\n\nWhen the money has a named job, decisions become clearer. You can see what you are protecting, how far you have come, and whether a new spending decision would interfere with that future purpose.\n\nThe point is direction. A Savings Goal turns part of what you already have into money with an intentional destination.",
  },
  {
    id: "give-the-goal-a-reason",
    title: "Give the goal a real reason",
    topic: "A meaningful reason makes protected savings easier to understand and defend than anonymous savings.",
    text: "A goal becomes easier to protect when it represents something real. That reason could be a phone, tuition, travel, a certification, a family need, business equipment, a wedding, a gift, or another purpose that matters to you.\n\nCLARA is not declaring those examples automatically good or bad. The important part is that the money has a reason you can identify.\n\nA named reason gives you something concrete to compare against when another purchase competes for the same money.",
  },
  {
    id: "give-the-goal-a-finish-line",
    title: "Give it a finish line",
    topic: "A target amount is an operational finish line for one goal, not a measure of the user's worth or financial success.",
    text: "A target amount answers three useful questions: what does enough mean for this goal, how much remains, and when is this particular goal complete?\n\nThat makes the target an operational finish line. It helps CLARA show progress and helps you decide what still needs protection.\n\nA larger target does not make a person more successful. The number belongs to the job, not to your identity. Target means finish line for this purpose — not personal worth.",
  },
  {
    id: "goal-vs-emergency-fund",
    title: "Savings Goal vs Emergency Fund",
    topic: "Savings Goals prepare for known or chosen future purposes, while Emergency Funds protect against unexpected financial disruption.",
    text: "A Savings Goal and an Emergency Fund can both be protected money, but they are protected for different jobs.\n\nA Savings Goal prepares money for a known or chosen future purpose. An Emergency Fund protects you when an unexpected disruption threatens essential life or normal financial stability.\n\nKeeping those jobs separate matters. Money for a planned laptop is not automatically emergency money, and emergency protection should not be casually re-labeled as a planned goal just because both balances are being saved.",
  },
  {
    id: "goal-purpose-vs-wallet-location",
    title: "Purpose vs location",
    topic: "A Savings Goal describes why money is protected, while a wallet describes where that real money physically exists.",
    text: "In CLARA, a Savings Goal answers WHY money is protected. A wallet answers WHERE that money actually exists.\n\nCreating a Savings Goal does not create an imaginary second bank account. CLARA can associate protected savings with the real wallet that contains the money so the purpose and the physical location remain connected.\n\nThink of the goal as the label on the job and the wallet as the place holding the real funds.",
  },
  {
    id: "protected-is-not-free-money",
    title: "Protected money is not free money",
    topic: "A wallet balance can include money already committed to Savings Goals, so visible balance does not automatically equal casual spending room.",
    text: "A wallet can visibly contain money while part of that balance already belongs to a Savings Goal. If a wallet shows ₱10,000 and ₱4,000 of it is protected for a goal, the full ₱10,000 should not be treated as casual spending room.\n\nThe money is still physically in the wallet, but financially some of it already has a job.\n\nThis connects to the same principle taught in Budgeting: a visible balance does not automatically mean every peso is free to spend.",
  },
  {
    id: "save-from-real-money",
    title: "Savings must come from real money",
    topic: "Funding a Savings Goal protects money that actually exists and must respect money already protected for other responsibilities.",
    text: "Real savings is not created by changing a number on a screen. The money being protected must actually exist.\n\nWhen you fund a Savings Goal in CLARA, the intention is to protect real available money while respecting amounts that are already protected for other responsibilities.\n\nThat is why a goal balance should represent real financial capacity, not a wish entered as though the money had already arrived.",
  },
  {
    id: "progress-is-direction",
    title: "Progress is direction, not a scoreboard",
    topic: "Savings progress measures one user's position relative to their own chosen goal and should never be used for comparison-based financial worth.",
    text: "₱1,000 saved toward a ₱50,000 goal does not make someone financially inferior to a person who has ₱40,000 toward the same target. The percentages only describe where each person currently stands relative to their own chosen goal.\n\nProgress is useful because it gives direction: what has already been protected and what remains. It is not a ranking system for human value.\n\nCLARA's philosophy is simple: recognize what you have, protect it, direct it intentionally, and grow from there.",
  },
  {
    id: "dates-and-priority",
    title: "Dates and priority help you pace the goal",
    topic: "A planned-use date explains when money may be needed, while priority explains how important that goal is when available money cannot fund everything at once.",
    text: "A planned-use date and a priority answer different questions. The date asks, “When do I expect this money to be needed?” Priority asks, “If my available money cannot fund every goal at once, how important is this one right now?”\n\nThose signals help you pace your decisions without turning a goal into pressure.\n\nIf a date moves or a lower-priority goal takes longer, that is not automatically failure. The point is to make the tradeoff visible and intentional.",
  },
  {
    id: "use-vs-release",
    title: "Using Savings vs releasing Savings",
    topic: "Using Savings records real spending for the goal, while releasing Savings removes protection without automatically making wallet money leave.",
    text: "CLARA intentionally separates USING Savings from RELEASING Savings.\n\nUSE SAVINGS means the money is actually spent for the goal or purpose. The real wallet is affected and the protected Savings Goal amount decreases.\n\nRELEASE SAVINGS means you decide that some protected money no longer belongs to this goal. The protected goal amount decreases, but the wallet money itself does not automatically leave. One action records use; the other changes what the money is protected for.",
  },
  {
    id: "realign-without-rewriting-history",
    title: "Realign without pretending history didn't happen",
    topic: "Goals can change legitimately, but deliberate corrections or releases are different from rewriting past decisions so everything appears planned.",
    text: "Targets may change. Dates may change. Priorities may change. A goal may stop being relevant, and records may sometimes need correction. Realignment is part of real financial life, not proof that you failed.\n\nWhat matters is being deliberate about the kind of change you are making. Correcting a mistake or releasing protection because the purpose changed is different from casually rewriting history so every past decision looks planned.\n\nCLARA should preserve clarity: change the plan when life changes, but do not erase the meaning of what actually happened.",
  },
  {
    id: "goals-serve-your-life",
    title: "The goal exists to serve your life",
    topic: "The achievement is intentional direction and protection that lets money serve a meaningful purpose, not reaching a number as proof of success.",
    text: "The achievement is not, “I reached a number, therefore I am successful.” The achievement is that you identified something that mattered, gave your money direction, protected that direction, and practiced the decision consistently.\n\nWhen the time comes, the money can serve the purpose you created it for. That is what the number was helping you prepare for.\n\nRecognize what you have → Protect it → Direct it intentionally → Grow from there.",
  },
];

export const SAVINGS_GOALS_MASTERCLASS_SUPPORT_SEQUENCE = {
  "savings-goal-is-direction": supportSet(
    "Think of ordinary savings as money standing in a waiting room. A Savings Goal gives some of that money a destination and says what it is waiting for.",
    "You protect ₱2,000 and name it “Certification fee.” The same ₱2,000 is now easier to defend from an unrelated impulse purchase because you know its future job.",
    "Savings Goal = real money protected for one named future purpose."
  ),
  "give-the-goal-a-reason": supportSet(
    "A reason gives the goal emotional and practical meaning. Anonymous money is easier to borrow from because nothing specific seems to be lost.",
    "“Save ₱15,000” can feel abstract. “₱15,000 for my board exam and documents” immediately tells you what would be delayed if you spend it elsewhere.",
    "Give the money a reason you can name."
  ),
  "give-the-goal-a-finish-line": supportSet(
    "The target is like a distance marker on a route. It tells you where this journey ends; it does not grade the person walking it.",
    "If a laptop goal needs ₱30,000 and you already protected ₱12,000, the target lets you see that ₱18,000 remains and that the goal finishes at ₱30,000.",
    "Target = how much this goal needs to be complete, not how much you are worth."
  ),
  "goal-vs-emergency-fund": supportSet(
    "Both are protected, but one prepares for a chosen destination and the other absorbs an unexpected disruption.",
    "A planned tuition payment belongs to a Savings Goal. An urgent medical disruption that could not reasonably be planned may belong to Emergency Fund protection.",
    "Goal = planned purpose. Emergency Fund = unexpected disruption."
  ),
  "goal-purpose-vs-wallet-location": supportSet(
    "Imagine a labeled envelope inside a drawer. The label explains the purpose; the drawer explains where the money is physically kept.",
    "Your “New Laptop” goal can protect ₱4,000 that is physically sitting in your Maya wallet. The goal is the purpose; Maya is the storage location.",
    "Savings Goal = why. Wallet = where."
  ),
  "protected-is-not-free-money": supportSet(
    "Do not read a wallet balance as one undivided pile. Some pesos may already be spoken for even though the app can still show them inside the same wallet.",
    "Wallet: ₱10,000. Goal protection: ₱4,000. Treating all ₱10,000 as casual spending could quietly consume money already assigned to the goal.",
    "Visible balance can include protected money. Protected money is not free spending money."
  ),
  "save-from-real-money": supportSet(
    "A goal tracker should describe protection that exists, not manufacture money by declaration. You can plan a target before you have it, but saved progress should come from real funds.",
    "You can create a ₱50,000 travel target today, but entering the target does not mean ₱50,000 was saved. Funding progress happens as real available money is protected.",
    "A target can be a plan. Saved amount must represent real money."
  ),
  "progress-is-direction": supportSet(
    "Treat progress like a location pin, not a leaderboard. It says where this goal is now and what remains to reach its own destination.",
    "Two people can both be doing well with different progress because their income, responsibilities, timing, and chosen goals are different.",
    "Progress measures this goal, not your worth."
  ),
  "dates-and-priority": supportSet(
    "Date helps with timing; priority helps with tradeoffs. You can change either when circumstances change without turning the adjustment into shame.",
    "A certification needed in October may get higher priority than a vacation planned next year, even if the vacation target is larger.",
    "Date = when. Priority = how important when money is limited."
  ),
  "use-vs-release": supportSet(
    "Using answers, “Did the money leave for the purpose?” Releasing answers, “Does this money still belong to this goal?” Those are different financial events.",
    "You spend ₱5,000 from the goal on the laptop: use Savings. You cancel the laptop plan and free ₱5,000 to remain in the wallet for another purpose: release Savings.",
    "Use = spent. Release = no longer protected for this goal."
  ),
  "realign-without-rewriting-history": supportSet(
    "A healthy system can admit that plans changed. Realignment updates today's intention while corrections fix genuine record mistakes; neither requires pretending every past choice was intentional.",
    "You move a goal date because tuition was postponed: realignment. You fix an accidentally duplicated savings entry: correction. Those are clearer than silently editing history until the record tells a false story.",
    "Plans can change. Keep the record honest about what actually changed."
  ),
  "goals-serve-your-life": supportSet(
    "The number is a tool that helps future-you do something meaningful. The purpose is not to worship the balance; it is to make the money ready to serve your life.",
    "When your certification date arrives, the achievement is not simply seeing 100%. It is being able to pay for the certification without scrambling because you prepared deliberately.",
    "The goal serves your life. You do not exist to serve the number."
  ),
};

export const SAVINGS_GOALS_MASTERCLASS_FINISH =
  "You now have the core framework: give saved money a specific purpose, give the purpose a finish line, keep the goal distinct from emergency protection, connect the purpose to the real wallet holding the money, protect only money that truly exists, and understand the difference between using, releasing, correcting, and realigning savings.\n\nThe important shift is this: Savings Goals are not scoreboards. They are a way to give what you already have deliberate direction.";

export const SAVINGS_GOALS_MASTERCLASS_CLOSING =
  "Good. A Savings Goal does not need to impress anyone. It only needs to make your own future intention clearer and easier to protect.\n\nRecognize what you have → Protect it → Direct it intentionally → Grow from there.";
