from pathlib import Path
import re

OVERLAY = Path("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx")
FINALIZATION = Path("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js")
TEST = Path("tests/buy-check-gemini-authority.test.mjs")

overlay = OVERLAY.read_text()
overlay = overlay.replace(
    'const CLARA_AI_BRAIN_VERSION = "pause-react-owned-buy-check-v8-masterclass-pacing";',
    'const CLARA_AI_BRAIN_VERSION = "progressive-buy-check-v9-compact";',
)

overlay, count = re.subn(
    r'const BUY_CHECK_ACKNOWLEDGMENTS = \[.*?\];\n\n',
    '',
    overlay,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("opening acknowledgment array not found")

overlay, count = re.subn(
    r'function selectAcknowledgment\(.*?\n}\n\n(?=function CanonicalTypewriter)',
    '',
    overlay,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("selectAcknowledgment function not found")

start = overlay.find('function PauseEntryBoard(')
end = overlay.find('\nfunction FinalDecisionPanel', start)
if start < 0 or end < 0:
    raise SystemExit("PauseEntryBoard boundaries not found")

pause_board = '''function PauseEntryBoard({ onReadyChange }) {
  useEffect(() => {
    onReadyChange?.(true);
  }, [onReadyChange]);

  return (
    <section
      data-clara-pause-entry-board="true"
      data-clara-buy-check-board="true"
      data-clara-buy-check-opening-board="true"
      className="relative overflow-hidden rounded-[30px] border border-blue-200/20 bg-[#061226]/78 px-6 py-8 text-center shadow-[0_26px_80px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-200/52">BUY CHECK</p>
      <strong className="mt-4 block text-[18px] font-black leading-[1.4] text-white/95">What are you thinking about buying?</strong>
      <span className="mt-2 block text-[12px] font-semibold leading-[1.55] text-slate-300/72">Tell CLARA the item and price if you already know it.</span>
    </section>
  );
}
'''
overlay = overlay[:start] + pause_board + overlay[end:]

overlay = overlay.replace(
    '  const previousAcknowledgmentIndexRef = useRef(-1);\n  const acknowledgmentSessionRef = useRef({ active: false, sessionId: "", index: -1, message: "" });\n',
    '',
)

overlay, count = re.subn(
    r'\n  if \(isActive && \(!acknowledgmentSessionRef\.current\.active.*?\n  }\n\n  const visibleMessages',
    '\n\n  const visibleMessages',
    overlay,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("acknowledgment session block not found")

overlay, count = re.subn(
    r'<PauseEntryBoard\s+acknowledgmentMessage=.*?onReadyChange=\{setEntryReady\}\s*/>',
    '<PauseEntryBoard onReadyChange={setEntryReady} />',
    overlay,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("PauseEntryBoard call not found")

old_result = '<p className="mt-2 text-[13px] font-semibold leading-6 text-slate-100/88">{finalDecision.result?.message}</p>'
new_result = old_result + '\n        <p className="mt-4 text-[14px] font-black text-white/94">Anything else you want to check?</p>'
if old_result not in overlay:
    raise SystemExit("resolved result copy not found")
overlay = overlay.replace(old_result, new_result, 1)

overlay = overlay.replace('>\n            Check another\n          </button>', '>\n            Yes\n          </button>', 1)
overlay = overlay.replace('>\n            Done\n          </button>', '>\n            No, I’m done\n          </button>', 1)

OVERLAY.write_text(overlay)

finalization = FINALIZATION.read_text()
old_message = '''            message: metricImpact?.projectedScoreAfterPurchase != null
              ? `${purchase.item} was added to your transactions and deducted from ${wallet.name}. Means: ${metricImpact.currentScore} → ${metricImpact.projectedScoreAfterPurchase}.`
              : `${purchase.item} was added to your transactions and deducted from ${wallet.name}.`,'''
new_message = '''            message: `${purchase.item} was added to your transactions and deducted from ${wallet.name}.`,'''
if old_message not in finalization:
    raise SystemExit("post-save Means telemetry copy not found")
finalization = finalization.replace(old_message, new_message, 1)
FINALIZATION.write_text(finalization)

test = TEST.read_text()
needle = '''  assert.match(overlay, />\\s*Ask more\\s*</);\n  assert.match(flow, /I want to ask more before deciding/);'''
replacement = '''  assert.match(overlay, />\\s*Ask more\\s*</);\n  assert.match(overlay, /Anything else you want to check\\?/);\n  assert.match(overlay, />\\s*No, I’m done\\s*</);\n  assert.match(flow, /I want to ask more before deciding/);'''
if needle not in test:
    raise SystemExit("authority choice assertion marker not found")
test = test.replace(needle, replacement, 1)
TEST.write_text(test)
