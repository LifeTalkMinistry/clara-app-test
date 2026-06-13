export const POST_ONBOARDING_BOOKLET_INTENT_KEY = "clara_open_commitment_booklet_after_onboarding";
export const TRIAL_PURCHASE_INTENT = "trial_7d";

export const CLARA_COMMITMENT_BOOKLET_PAGES = [
  {
    label: "Page 1",
    title: "Ready to know who CLARA is?",
    paragraphs: [
      "Most people think CLARA is a budgeting app.",
      "That's understandable.",
      "You record income.",
      "Track expenses.",
      "Create budgets.",
      "But that's not what CLARA was built to do.",
      "Let's discover CLARA through its main framework.",
    ],
  },
  {
    label: "Page 2",
    title: "C — Commitment",
    paragraphs: [
      "Most financial apps sell access.",
      "CLARA sells commitment.",
      "Most people already know what they should do with money.",
      "Knowledge is rarely the problem.",
      "Consistency is.",
      "That's why CLARA begins with a commitment.",
    ],
  },
  {
    label: "Page 3",
    title: "L — Lifestyle Clarity",
    paragraphs: [
      "Money doesn't exist in isolation.",
      "It follows your lifestyle, habits, responsibilities, emotions, and goals.",
      "CLARA helps you understand where your money goes and why it goes there.",
      "When you can see your financial behavior clearly, better decisions become easier.",
    ],
  },
  {
    label: "Page 4",
    title: "A — Ask Before You Spend",
    paragraphs: [
      "One question can change a financial future.",
      "Should I buy this?",
      "Many financial mistakes happen because decisions are made too quickly.",
      "CLARA was built around one simple principle: Ask Before You Spend.",
      "That small pause can be the difference between impulse and intention.",
    ],
  },
  {
    label: "Page 5",
    title: "Supporting Guidance",
    paragraphs: [
      "Records tell you what happened.",
      "Guidance helps you decide what happens next.",
      "CLARA creates an environment where you can reflect, learn, plan, and improve.",
    ],
  },
  {
    label: "Page 6",
    title: "Supporting Advocacy",
    paragraphs: [
      "Your commitment doesn't stop with you.",
      "10% of every monthly commitment goes into the CLARA Charity Fund.",
      "As CLARA grows, so does its ability to help others.",
    ],
  },
  {
    label: "Final Page",
    title: "Ready to Commit?",
    paragraphs: ["You're not just unlocking tools.", "You're committing to:"],
    checks: ["Commitment", "Lifestyle Clarity", "Ask Before You Spend"],
    closingParagraphs: [
      "Supported by real guidance and advocacy.",
      "The tools are simply the vehicle.",
      "The real goal is helping you become someone who consistently makes better money decisions.",
    ],
  },
];

export function buildCommitmentBookletIntent({
  intent = TRIAL_PURCHASE_INTENT,
  planKey = "",
  productId = "",
  openedAt = Date.now(),
} = {}) {
  return { intent, planKey, productId, openedAt };
}

export function persistCommitmentBookletIntent(options = {}) {
  if (typeof window === "undefined") return null;
  const bookletIntent = buildCommitmentBookletIntent(options);
  try {
    window.sessionStorage?.setItem(POST_ONBOARDING_BOOKLET_INTENT_KEY, JSON.stringify(bookletIntent));
  } catch (error) {
    if (import.meta.env?.DEV) console.warn("CLARA commitment booklet intent persistence skipped:", error);
  }
  return bookletIntent;
}

export function readCommitmentBookletIntentFromSession() {
  if (typeof window === "undefined") return null;
  try {
    const rawIntent = window.sessionStorage?.getItem(POST_ONBOARDING_BOOKLET_INTENT_KEY);
    if (!rawIntent) return null;
    window.sessionStorage?.removeItem(POST_ONBOARDING_BOOKLET_INTENT_KEY);
    const parsed = JSON.parse(rawIntent);
    return parsed?.intent === TRIAL_PURCHASE_INTENT ? parsed : null;
  } catch (error) {
    console.warn("Unable to read CLARA commitment booklet intent", error);
    try {
      window.sessionStorage?.removeItem(POST_ONBOARDING_BOOKLET_INTENT_KEY);
    } catch {
      // Best effort cleanup only.
    }
    return null;
  }
}
