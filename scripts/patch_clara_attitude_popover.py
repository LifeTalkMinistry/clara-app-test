from pathlib import Path
import re

path = Path("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx")
text = path.read_text()

text = text.replace(
    'import { ArrowUp, X } from "lucide-react";',
    'import { ArrowUp, SlidersHorizontal, X } from "lucide-react";',
    1,
)

selector_pattern = re.compile(
    r'function BuyCheckAttitudeSelector\(\{ value, onChange \}\) \{.*?\n\}\n\nconst BUY_CHECK_ACKNOWLEDGMENTS',
    re.S,
)
selector_replacement = '''function BuyCheckAttitudeSelector({ value, onChange, onClose }) {
  const selected = CLARA_ATTITUDE_OPTIONS.find((option) => option.id === value) || CLARA_ATTITUDE_OPTIONS[2];

  return (
    <section
      data-clara-buy-check-attitude-selector="true"
      className="absolute bottom-[76px] right-0 z-40 w-[min(340px,calc(100vw-28px))] rounded-[22px] border border-blue-200/20 bg-[#050d1f]/98 px-3.5 py-3.5 shadow-[0_24px_70px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-black tracking-[-0.01em] text-white/95">How should CLARA talk to you?</p>
          <p className="mt-0.5 text-[9.5px] font-bold text-blue-100/45">Same financial judgment. Different delivery.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/65 transition hover:bg-white/[0.07]"
          aria-label="Close CLARA communication style options"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="CLARA communication attitude">
        {CLARA_ATTITUDE_OPTIONS.map((option) => {
          const active = option.id === selected.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange?.(option.id)}
              className={`min-h-10 rounded-[15px] border px-3 text-left transition active:scale-[0.98] ${active
                ? "border-[#ffd84a]/48 bg-[#ffd84a]/10 text-[#ffe783] shadow-[0_8px_22px_rgba(255,216,74,0.07)]"
                : "border-blue-200/12 bg-white/[0.035] text-blue-50/74 hover:border-blue-200/25 hover:bg-white/[0.06]"}`}
            >
              <span className="block text-[11px] font-black">{option.label}</span>
              <span className={`mt-0.5 block text-[9.5px] font-semibold leading-4 ${active ? "text-[#ffe783]/68" : "text-slate-300/55"}`}>
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const BUY_CHECK_ACKNOWLEDGMENTS'''
text, count = selector_pattern.subn(selector_replacement, text, count=1)
if count != 1:
    raise SystemExit(f"Expected one selector replacement, got {count}")

composer_pattern = re.compile(
    r'const BuyCheckComposer = memo\(function BuyCheckComposer\(\{ isActive, inputLocked, busy, step, submitAnswer \}\) \{.*?\n\}\);\n\nexport default function ClaraAiEnvironmentOverlay',
    re.S,
)
composer_replacement = '''const BuyCheckComposer = memo(function BuyCheckComposer({
  isActive,
  inputLocked,
  busy,
  step,
  submitAnswer,
  communicationAttitude,
  onCommunicationAttitudeChange,
}) {
  const [draft, setDraft] = useState("");
  const [attitudeOpen, setAttitudeOpen] = useState(false);
  const inputRef = useRef(null);
  const hasDraft = Boolean(draft.trim());
  const selectedAttitude = CLARA_ATTITUDE_OPTIONS.find((option) => option.id === communicationAttitude) || CLARA_ATTITUDE_OPTIONS[2];

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      setAttitudeOpen(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || inputLocked || attitudeOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (document.activeElement !== inputRef.current) inputRef.current?.focus?.({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [attitudeOpen, busy, inputLocked, isActive, step]);

  useEffect(() => {
    if (!inputLocked && !busy) return;
    setAttitudeOpen(false);
  }, [busy, inputLocked]);

  const submitDraft = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const answer = draft.trim();
    if (!answer || inputLocked || busy) return;
    setAttitudeOpen(false);
    submitAnswer?.(answer);
    setDraft("");
  };

  const composerLocked = inputLocked || busy;
  const blockLockedInput = (event) => {
    if (composerLocked) event.preventDefault();
  };

  const chooseAttitude = (attitude) => {
    onCommunicationAttitudeChange?.(attitude);
    setAttitudeOpen(false);
  };

  return (
    <form
      onSubmit={submitDraft}
      data-clara-buy-check-react-form="true"
      data-clara-buy-check-composer-locked={composerLocked ? "true" : "false"}
      className="relative z-30 shrink-0 overflow-visible rounded-[28px] border border-blue-200/16 bg-[#040b1a]/96 p-2.5 shadow-[0_-18px_52px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-2xl"
    >
      {attitudeOpen ? (
        <BuyCheckAttitudeSelector
          value={communicationAttitude}
          onChange={chooseAttitude}
          onClose={() => setAttitudeOpen(false)}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)] opacity-80" />
      <div className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#08142b]/94 px-3 py-2 shadow-inner focus-within:border-blue-300/36">
        <input
          ref={inputRef}
          value={draft}
          onBeforeInput={blockLockedInput}
          onPaste={blockLockedInput}
          onDrop={blockLockedInput}
          onChange={(event) => {
            if (!composerLocked) setDraft(event.target.value);
          }}
          onFocus={() => {
            if (attitudeOpen) setAttitudeOpen(false);
          }}
          aria-disabled={composerLocked ? "true" : undefined}
          className={`min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/72 ${composerLocked ? "opacity-55" : ""}`}
          placeholder={placeholderFor(step)}
          inputMode="text"
          aria-label={placeholderFor(step)}
        />
        <button
          type={hasDraft ? "submit" : "button"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!hasDraft && !composerLocked) setAttitudeOpen((open) => !open);
          }}
          disabled={composerLocked}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-white transition active:scale-95 disabled:opacity-40 ${hasDraft
            ? "border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] shadow-[0_10px_28px_rgba(23,105,255,0.28)] hover:brightness-110"
            : attitudeOpen
              ? "border-[#ffd84a]/48 bg-[#ffd84a]/12 text-[#ffe783] shadow-[0_10px_28px_rgba(255,216,74,0.12)]"
              : "border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] shadow-[0_10px_28px_rgba(23,105,255,0.24)] hover:brightness-110"}`}
          aria-label={hasDraft ? "Send Ask Before You Spend answer" : `Choose how CLARA talks to you. Current style: ${selectedAttitude.label}`}
          aria-expanded={!hasDraft ? attitudeOpen : undefined}
          data-clara-attitude-trigger={!hasDraft ? "true" : undefined}
        >
          {hasDraft ? <ArrowUp className="h-5 w-5" /> : <SlidersHorizontal className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </form>
  );
});

export default function ClaraAiEnvironmentOverlay'''
text, count = composer_pattern.subn(composer_replacement, text, count=1)
if count != 1:
    raise SystemExit(f"Expected one composer replacement, got {count}")

old_opening = '''            {!isGuidePreview ? (
              <BuyCheckAttitudeSelector value={communicationAttitude} onChange={selectCommunicationAttitude} />
            ) : null}
'''
if old_opening not in text:
    raise SystemExit("Opening attitude selector not found")
text = text.replace(old_opening, "", 1)

old_props = '''          step={step}
          submitAnswer={submitAnswer}
'''
new_props = '''          step={step}
          submitAnswer={submitAnswer}
          communicationAttitude={communicationAttitude}
          onCommunicationAttitudeChange={selectCommunicationAttitude}
'''
if old_props not in text:
    raise SystemExit("Composer prop insertion point not found")
text = text.replace(old_props, new_props, 1)

path.write_text(text)
