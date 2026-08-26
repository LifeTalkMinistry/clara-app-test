from pathlib import Path

path = Path('src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx')
text = path.read_text()

version_line = 'const CLARA_AI_BRAIN_VERSION = "progressive-buy-check-v9-compact";'
acknowledgments = '''const BUY_CHECK_ACKNOWLEDGMENTS = [
  "Good move—you paused before buying. Let’s see if it fits your money.",
  "Nice. You stopped before spending. Let’s check this purchase together.",
  "That pause matters. Now let’s see if this purchase makes sense for you.",
  "No judgment—just a clearer decision before your money leaves.",
  "You brought the decision here before spending. That is real progress.",
];'''

if 'const BUY_CHECK_ACKNOWLEDGMENTS = [' not in text:
    if version_line not in text:
        raise SystemExit('CLARA brain version marker not found')
    text = text.replace(version_line, version_line + '\n\n' + acknowledgments, 1)

if 'function selectAcknowledgment(' not in text:
    marker = '''function money(value = 0) {
  const parsed = Number(String(value || "").replace(/[₱,\\s]/g, ""));
  return `₱${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}'''
    helper = '''

function selectAcknowledgment(previousIndex = -1) {
  let index = Math.floor(Math.random() * BUY_CHECK_ACKNOWLEDGMENTS.length);
  if (BUY_CHECK_ACKNOWLEDGMENTS.length > 1 && index === previousIndex) {
    index = (index + 1) % BUY_CHECK_ACKNOWLEDGMENTS.length;
  }
  return { index, message: BUY_CHECK_ACKNOWLEDGMENTS[index] };
}'''
    if marker not in text:
        raise SystemExit('money helper marker not found')
    text = text.replace(marker, marker + helper, 1)

start = text.find('function PauseEntryBoard(')
end = text.find('\nfunction FinalDecisionPanel', start)
if start < 0 or end < 0:
    raise SystemExit('PauseEntryBoard boundaries not found')

pause_board = '''function PauseEntryBoard({ acknowledgmentMessage, pacingEnabled = true, onReadyChange }) {
  const [ready, setReady] = useState(!pacingEnabled);
  const readTimerRef = useRef(null);

  useEffect(() => {
    if (!pacingEnabled) {
      setReady(true);
      onReadyChange?.(true);
      return undefined;
    }
    setReady(false);
    onReadyChange?.(false);
    return () => {
      if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
      readTimerRef.current = null;
    };
  }, [acknowledgmentMessage, pacingEnabled]);

  const finishAcknowledgment = () => {
    if (!pacingEnabled) return;
    if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
    readTimerRef.current = window.setTimeout(() => {
      setReady(true);
      onReadyChange?.(true);
      readTimerRef.current = null;
    }, getClaraReadDelay());
  };

  return (
    <section
      data-clara-pause-entry-board="true"
      data-clara-buy-check-board="true"
      data-clara-buy-check-opening-board="true"
      className="relative overflow-hidden rounded-[30px] border border-blue-200/20 bg-[#061226]/78 px-6 pb-7 pt-7 text-center shadow-[0_26px_80px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_0%,rgba(23,105,255,0.24),transparent_38%),radial-gradient(circle_at_94%_18%,rgba(229,57,69,0.13),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(255,216,74,0.05),transparent_32%),linear-gradient(145deg,rgba(3,12,27,0.82),rgba(2,6,23,0.95))]" />
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-200/52">BUY CHECK</p>
      <div className="mx-auto mt-4 flex min-h-[92px] max-w-[318px] items-center justify-center rounded-[22px] border border-blue-200/12 bg-black/20 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <p className="text-[16px] font-extrabold leading-[1.48] text-white/94">
          {pacingEnabled ? (
            <CanonicalTypewriter text={acknowledgmentMessage} onComplete={finishAcknowledgment} />
          ) : acknowledgmentMessage}
        </p>
      </div>
      <div
        data-clara-buy-check-active-question="true"
        aria-live="polite"
        className={`mx-auto mt-5 max-w-[318px] text-center transition-opacity duration-300 ${ready ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <strong className="block text-[16px] font-black leading-[1.4] text-white/95">What do you want to buy?</strong>
        <span className="mt-1.5 block text-[12px] font-semibold leading-[1.55] text-slate-300/72">Type the exact item for us to start.</span>
        <span className="mt-1 block text-[11.5px] font-extrabold leading-[1.5] text-[#ffd84a]/82">Example: Running shoes</span>
      </div>
    </section>
  );
}
'''
text = text[:start] + pause_board + text[end:]

refs_old = '''}) {
  const previousActiveRef = useRef(false);'''
refs_new = '''}) {
  const previousAcknowledgmentIndexRef = useRef(-1);
  const acknowledgmentSessionRef = useRef({ active: false, sessionId: "", index: -1, message: "" });
  const previousActiveRef = useRef(false);'''
if 'const previousAcknowledgmentIndexRef = useRef(-1);' not in text:
    if refs_old not in text:
        raise SystemExit('component refs marker not found')
    text = text.replace(refs_old, refs_new, 1)

session_marker = '''  const resultMode = step === "complete";

'''
session_logic = '''  const resultMode = step === "complete";

  if (isActive && (!acknowledgmentSessionRef.current.active || acknowledgmentSessionRef.current.sessionId !== sessionId)) {
    const selection = selectAcknowledgment(previousAcknowledgmentIndexRef.current);
    acknowledgmentSessionRef.current = { active: true, sessionId, ...selection };
    previousAcknowledgmentIndexRef.current = selection.index;
  } else if (!isActive && acknowledgmentSessionRef.current.active) {
    acknowledgmentSessionRef.current = { active: false, sessionId: "", index: -1, message: "" };
  }

'''
if 'acknowledgmentSessionRef.current.active' not in text:
    if session_marker not in text:
        raise SystemExit('resultMode session marker not found')
    text = text.replace(session_marker, session_logic, 1)

simple_call = '<PauseEntryBoard onReadyChange={setEntryReady} />'
original_call = '''<PauseEntryBoard
              acknowledgmentMessage={acknowledgmentSessionRef.current.message || BUY_CHECK_ACKNOWLEDGMENTS[0]}
              pacingEnabled={pacingEnabled}
              onReadyChange={setEntryReady}
            />'''
if simple_call in text:
    text = text.replace(simple_call, original_call, 1)
elif 'acknowledgmentMessage={acknowledgmentSessionRef.current.message' not in text:
    raise SystemExit('PauseEntryBoard invocation marker not found')

path.write_text(text)
