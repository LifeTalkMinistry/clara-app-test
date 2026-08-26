from pathlib import Path

path = Path('src/components/fresh/main-dashboard/assistant/ClaraDebtObligationOverlay.jsx')
text = path.read_text()

text = text.replace(
'''    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-[17px] border px-3.5 py-2.5 text-left text-[12px] font-black leading-4 transition active:scale-[.985] disabled:opacity-40 ${tone}`}
    >''',
'''    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative z-20 min-h-12 w-full touch-manipulation rounded-[18px] border px-4 text-left text-[13px] font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${tone}`}
    >''')

text = text.replace(
'''  const tone = danger
    ? "border-rose-300/20 bg-rose-400/[0.08] text-rose-100"
    : secondary
      ? "border-white/10 bg-white/[0.035] text-white/82"
      : "border-blue-300/22 bg-[#0b2144]/92 text-white shadow-[0_8px_20px_rgba(0,0,0,.16)]";''',
'''  const tone = danger
    ? "border-rose-300/20 bg-rose-400/[0.08] text-rose-100"
    : secondary
      ? "border-white/10 bg-white/[0.035] text-white/88"
      : "border-blue-300/25 bg-[linear-gradient(135deg,rgba(23,105,255,0.96),rgba(13,79,198,0.96))] text-white shadow-[0_12px_30px_rgba(23,105,255,0.22)]";''')

text = text.replace(
'''      className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,.28)]"''',
'''      className="relative z-20 flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,0.28)]"''')

old = '''    <div
      data-clara-debt-obligation-chat="true"
      className="fixed inset-0 z-[120] flex min-h-0 flex-col bg-[radial-gradient(circle_at_top,rgba(23,105,255,.10),transparent_34%),#040b18] text-white"
    >
      <header className="relative z-20 shrink-0 border-b border-white/[0.06] bg-[#061126]/96 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[720px] items-center justify-center px-16">
          <h1 className="text-center text-[16px] font-black tracking-[-0.02em]">Debt / Obligations</h1>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition active:scale-95"
            aria-label="Close Debt / Obligations"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main ref={viewportRef} data-clara-ai-message-viewport="true" className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div data-clara-ai-message-stack="true" className="mx-auto flex w-full max-w-[720px] flex-col gap-3 pb-4">'''

new = '''    <div
      data-clara-debt-obligation-chat="true"
      data-clara-ai-layout-variant="debt-obligation"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      className="fixed inset-0 z-[400] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 min-h-[64px] shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_56%,rgba(7,31,38,0.96))] shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
        <h1 className="absolute inset-0 flex items-center justify-center px-[76px] text-center text-[16px] font-black leading-none tracking-[-0.02em] text-white">Debt / Obligations</h1>
        <button
          type="button"
          onClick={onClose}
          className="absolute inset-y-0 right-[6px] z-30 my-auto grid h-9 w-9 touch-manipulation place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 transition active:scale-95"
          aria-label="Close Debt / Obligations"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <main
        ref={viewportRef}
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div data-clara-ai-message-stack="true" className="flex min-h-full flex-col gap-3">'''

if old not in text:
    raise SystemExit('Debt shell block not found')
text = text.replace(old, new)

path.write_text(text)
print('patched debt chat visual parity')
