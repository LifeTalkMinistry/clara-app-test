from pathlib import Path

expert_path = Path("src/lib/clara-buy-check-expert-ai.js")
router_path = Path("src/lib/clara-buy-check-intelligence-router.js")
router_test_path = Path("tests/buy-check-progressive-router.test.mjs")
authority_test_path = Path("tests/buy-check-gemini-authority.test.mjs")

expert = expert_path.read_text()
old = '''function basePrompt() {
  return `You are CLARA, a personal money accountability companion.
Be warm, direct, human, and brief.
Ask one question at a time.
Never lecture or sound like a report.
Never invent a financial fact.
The application owns every financial calculation.`;
}'''
new = '''function basePrompt() {
  return `FEATURE: ASK BEFORE YOU SPEND / BUY CHECK
You are CLARA, a personal money accountability companion.
Be warm, direct, human, and brief.
Ask one question at a time.
Never lecture or sound like a report.
Never invent a financial fact.
The application owns every financial calculation.
All unlabelled purchase amounts are Philippine pesos (₱). Never render a peso amount with $.`;
}'''
if old not in expert:
    raise SystemExit("basePrompt block not found")
expert = expert.replace(old, new, 1)
expert_path.write_text(expert)

router = router_path.read_text()
old = '''const AFFIRMATIVE_PATTERN = /^(yes|yeah|yep|yup|correct|right|exactly|that'?s right|oo|opo|yes\\s+that'?s\\s+right)[.!\\s]*$/i;
'''
new = '''const AFFIRMATIVE_PATTERN = /^(yes|yeah|yep|yup|correct|right|exactly|that'?s right|oo|opo|yes\\s+that'?s\\s+right)[.!\\s]*$/i;
const NEGATIVE_ONLY_PATTERN = /^(no|nope|nah|not really|hindi|wala)[.!\\s]*$/i;
const META_DISCOVERY_QUESTION_PATTERN = /^(why|what|how|can you|could you|would you|explain|tell me)\\b.*\\?$/i;
const WAIT_SIGNAL_PATTERN = /\\b(wait|waiting|later|nothing|happen|happens|affected|affect|delay|skip|skipping)\\b/i;
const URGENCY_SIGNAL_PATTERN = /\\b(urgent|urgently|asap|today|tomorrow|now|immediately|broken|work|school|deadline)\\b/i;

function isPurposeReply(message = "") {
  const source = clean(message);
  if (!source || AFFIRMATIVE_PATTERN.test(source) || NEGATIVE_ONLY_PATTERN.test(source)) return false;
  return !META_DISCOVERY_QUESTION_PATTERN.test(source);
}

function isDecisionSignalReply(message = "") {
  const source = clean(message);
  if (!source) return false;
  return !META_DISCOVERY_QUESTION_PATTERN.test(source);
}
'''
if old not in router:
    raise SystemExit("router pattern anchor not found")
router = router.replace(old, new, 1)

old = '''export function applyLocalPurchaseFacts(message = "", previousEvidence = {}) {
  const previous = sanitizeClaraPurchaseEvidence(previousEvidence);
  const next = { ...previous };
  const source = clean(message);
  const amounts = parseClaraMoneyAmounts(source);
'''
new = '''export function applyLocalPurchaseFacts(message = "", previousEvidence = {}) {
  const previous = sanitizeClaraPurchaseEvidence(previousEvidence);
  const next = { ...previous };
  const source = clean(message);
  const amounts = parseClaraMoneyAmounts(source);
  const previousHadPurchaseCore = Boolean(clean(previous.item) && hasConfirmedClaraPurchasePrice(previous));
'''
if old not in router:
    raise SystemExit("applyLocalPurchaseFacts header not found")
router = router.replace(old, new, 1)

old = '''  if (!next.item) {
    const item = inferItem(source);
    if (item) next.item = item;
  }

  return next;
}
'''
new = '''  if (!next.item) {
    const item = inferItem(source);
    if (item) next.item = item;
  }

  // Gemini is the preferred language-understanding layer, but a temporary AI
  // failure must not trap Buy Check in the same question forever. Once the
  // user has already established an item and authoritative price, preserve
  // their next plain-language replies as discovery evidence locally.
  if (previousHadPurchaseCore && previous.priceStatus !== "needs_confirmation") {
    if (!clean(previous.purpose) && isPurposeReply(source)) {
      next.purpose = source.slice(0, 360);
    } else if (
      clean(previous.purpose) &&
      !hasClaraSecondDecisionSignal(previous) &&
      isDecisionSignalReply(source)
    ) {
      if (WAIT_SIGNAL_PATTERN.test(source) || NEGATIVE_ONLY_PATTERN.test(source)) {
        next.consequenceOfWaiting = source.slice(0, 360);
      } else if (URGENCY_SIGNAL_PATTERN.test(source)) {
        next.urgency = source.slice(0, 360);
      } else {
        next.currentSituation = source.slice(0, 360);
      }
    }
  }

  return next;
}
'''
if old not in router:
    raise SystemExit("applyLocalPurchaseFacts tail not found")
router = router.replace(old, new, 1)
router_path.write_text(router)

router_test = router_test_path.read_text()
addition = '''

test("local discovery fallback carries reason and waiting consequence forward", () => {
  const purchase = applyLocalPurchaseFacts("Can I buy a T-shirt for ₱1,000?", {});
  const reason = applyLocalPurchaseFacts("I just like the design.", purchase);
  assert.equal(reason.purpose, "I just like the design.");
  assert.equal(isClaraPurchaseContextMature(reason), false);

  const context = applyLocalPurchaseFacts(
    "I already have enough shirts. Nothing happens if I wait.",
    reason,
  );
  assert.equal(context.consequenceOfWaiting, "I already have enough shirts. Nothing happens if I wait.");
  assert.equal(isClaraPurchaseContextMature(context), true);
  assert.equal(routeClaraBuyCheckPhase({ connected: true, evidence: context }), CLARA_BUY_CHECK_PHASE.METRIC);
});
'''
if "local discovery fallback carries reason and waiting consequence forward" not in router_test:
    router_test += addition
router_test_path.write_text(router_test)

authority_test = authority_test_path.read_text()
anchor = '''  assert.match(expert, /PHASE 3 — METRIC DECISION/);
'''
replacement = '''  assert.match(expert, /PHASE 3 — METRIC DECISION/);
  assert.match(expert, /FEATURE: ASK BEFORE YOU SPEND \/ BUY CHECK/);
  assert.match(expert, /Never render a peso amount with \\$/);
'''
if anchor not in authority_test:
    raise SystemExit("authority test anchor not found")
authority_test = authority_test.replace(anchor, replacement, 1)
authority_test_path.write_text(authority_test)

print("Buy Check phase allowlist identity and local discovery fallback patched.")
