from pathlib import Path
import re

path = Path("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx")
text = path.read_text()

selector_pattern = re.compile(
    r'function BuyCheckAttitudeSelector\(\{ value, onChange, onClose \}\) \{.*?\n\}\n\nconst BUY_CHECK_ACKNOWLEDGMENTS',
    re.S,
)
selector_replacement = '''function BuyCheckAttitudeSelector({ value, onChange }) {
  const selected = CLARA_ATTITUDE_OPTIONS.find((option) => option.id === value) || CLARA_ATTITUDE_OPTIONS[2];

  return (
    <section
      data-clara-buy-check-attitude-selector="true"
      className="absolute bottom-[72px] right-0 z-40 w-[min(336px,calc(100vw-28px))] rounded-[18px] border border-blue-200/16 bg-[#050d1f]/98 p-2 shadow-[0_20px_58px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl"
    >
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="CLARA communication attitude">
        {CLARA_ATTITUDE_OPTIONS.map((option) => {
          const active = option.id === selected.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange?.(option.id)}
              className={`min-w-0 flex-1 rounded-[12px] px-1.5 py-2.5 text-center text-[10.5px] font-black tracking-[-0.02em] transition active:scale-[0.97] ${active
                ? "bg-[#ffd84a]/12 text-[#ffe783] shadow-[inset_0_0_0_1px_rgba(255,216,74,0.32)]"
                : "text-blue-50/68 hover:bg-white/[0.045] hover:text-white/90"}`}
            >
              {option.label}
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

path.write_text(text)
