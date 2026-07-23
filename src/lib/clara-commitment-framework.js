export const POST_ONBOARDING_BOOKLET_INTENT_KEY = "clara_open_commitment_booklet_after_onboarding";
export const COMMITTED_MONTHLY_PURCHASE_INTENT = "monthly_direct";

// Legacy migration only: stale sessions from the removed 7-day trial are normalized to monthly commitment.
const LEGACY_TRIAL_PURCHASE_INTENT = "trial_7d";

export const CLARA_COMMITMENT_BOOKLET_PAGES = [
  {
    label: "Page 1",
    title: "Ready to know who CLARA is?",
    paragraphs: [
      "Most people think CLARA is only a budgeting app.",
      "That's understandable.",
      "You record income.",
      "Track expenses.",
      "Create budgets.",
      "But CLARA was built to help you understand and improve the way you handle money.",
      "Let's discover the CLARA Framework one letter at a time.",
    ],
  },
  {
    label: "Page 2",
    title: "C — Control",
    paragraphs: [
      "Before money can improve, it has to become visible.",
      "Control means knowing what comes in.",
      "What must go out.",
      "Where money is quietly disappearing.",
      "And what is still yours to direct.",
      "CLARA helps you see the real picture—not to restrict you, but to put financial decisions back in your hands.",
      "Control shows the money.",
    ],
  },
  {
    label: "Page 3",
    title: "L — Lifestyle",
    paragraphs: [
      "Money does not move through numbers alone.",
      "Your schedule.",
      "Your responsibilities.",
      "Your work and family situation.",
      "Your stress, habits, and environment.",
      "All of these influence the way you spend, save, and make decisions.",
      "CLARA looks at the life behind the money so your financial system can fit your real situation.",
      "Lifestyle explains the pattern.",
    ],
  },
  {
    label: "Page 4",
    title: "A — Achievement",
    paragraphs: [
      "A budget needs a purpose.",
      "Achievement means knowing what your money system is trying to build.",
    ],
    bullets: [
      "More breathing room",
      "A growing emergency fund",
      "Less debt",
      "A meaningful savings goal",
      "Greater financial stability",
    ],
    closingParagraphs: [
      "CLARA connects today's decisions to the progress you want to see.",
      "Achievement shows what can be built.",
    ],
  },
  {
    label: "Page 5",
    title: "R — Repetition",
    paragraphs: [
      "One good decision is not yet a system.",
      "Progress grows when the right actions repeat.",
      "Every payday.",
      "Every week.",
      "And every time you are about to spend.",
      "CLARA helps turn good intentions into routines that can survive real life.",
      "Repetition creates the discipline.",
    ],
  },
  {
    label: "Page 6",
    title: "A — Accountability",
    paragraphs: [
      "Progress needs protection.",
      "Accountability means reviewing what happened.",
      "Recognizing when an old pattern is returning.",
      "And adjusting before one setback becomes another cycle.",
      "CLARA stays with the process—not to judge you, but to help you continue.",
      "Accountability protects the progress.",
    ],
  },
  {
    label: "Final Page",
    title: "Ready to Commit?",
    paragraphs: [
      "The Committed Version brings the complete CLARA Framework together:",
    ],
    checks: [
      "Control",
      "Lifestyle",
      "Achievement",
      "Repetition",
      "Accountability",
    ],
    closingParagraphs: [
      "Control shows the money. Lifestyle explains the pattern. Achievement shows what can be built.",
      "Repetition creates the discipline. Accountability protects the progress.",
    ],
  },
];

export function normalizeCommitmentBookletIntent(intent) {
  const normalizedIntent = String(intent || "").trim();
  if (!normalizedIntent || normalizedIntent === LEGACY_TRIAL_PURCHASE_INTENT) {
    return COMMITTED_MONTHLY_PURCHASE_INTENT;
  }
  return normalizedIntent === COMMITTED_MONTHLY_PURCHASE_INTENT ? COMMITTED_MONTHLY_PURCHASE_INTENT : null;
}

export function buildCommitmentBookletIntent({
  intent = COMMITTED_MONTHLY_PURCHASE_INTENT,
  planKey = "",
  productId = "",
  openedAt = Date.now(),
} = {}) {
  const normalizedIntent = normalizeCommitmentBookletIntent(intent);
  if (!normalizedIntent) return null;
  return { intent: normalizedIntent, planKey, productId, openedAt };
}

export function persistCommitmentBookletIntent(options = {}) {
  if (typeof window === "undefined") return null;
  const bookletIntent = buildCommitmentBookletIntent(options) || buildCommitmentBookletIntent();
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
    if (!parsed || typeof parsed !== "object") return null;
    return buildCommitmentBookletIntent(parsed);
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
