import { createPortal } from "react-dom";

export default function LearningVideoWatchModal({ isOpen, material, onClose }) {
  if (!isOpen || !material || typeof document === "undefined") return null;

  const titleId = "clara-learning-video-watch-title";
  const subtitleId = "clara-learning-video-watch-subtitle";

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.20),transparent_38%),linear-gradient(135deg,#020617,#061826_48%,#100926)] text-white">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        className="relative flex h-full w-full flex-col overflow-hidden"
      >
        <header className="relative z-20 flex shrink-0 items-start justify-between gap-4 px-4 pb-3 pt-[max(18px,env(safe-area-inset-top))] landscape:absolute landscape:left-0 landscape:right-0 landscape:top-0 landscape:bg-gradient-to-b landscape:from-black/72 landscape:to-transparent landscape:px-3 landscape:pb-8 landscape:pt-[max(10px,env(safe-area-inset-top))]">
          <div className="min-w-0 pr-2 landscape:hidden">
            <p className="inline-flex rounded-full border border-cyan-100/18 bg-white/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.20em] text-cyan-50/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
              {material.coverLabel || "Masterclass Episode"}
            </p>
            <h3
              id={titleId}
              className="mt-3 text-[24px] font-black leading-tight tracking-[-0.03em] text-white"
            >
              {material.title}
            </h3>
            <p
              id={subtitleId}
              className="mt-2 max-w-2xl text-[13px] leading-snug text-white/66"
            >
              {material.subtitle}
            </p>
          </div>

          <div className="hidden min-w-0 pr-14 landscape:block">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/68">
              {material.coverLabel || "Masterclass Episode"}
            </p>
            <h3
              id={`${titleId}-landscape`}
              className="mt-1 max-w-[55vw] truncate text-[15px] font-black text-white/86"
            >
              {material.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="absolute right-4 top-[max(18px,env(safe-area-inset-top))] z-30 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/42 text-white/76 backdrop-blur-md transition hover:bg-white/[0.10] hover:text-white active:scale-[0.98] landscape:right-3 landscape:top-[max(10px,env(safe-area-inset-top))] landscape:h-9 landscape:w-9"
          >
            ×
          </button>
        </header>

        <main className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 landscape:h-full landscape:w-full landscape:flex-none landscape:p-0">
          <div className="w-full max-w-5xl overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.46)] landscape:flex landscape:h-[100dvh] landscape:max-h-[100dvh] landscape:max-w-none landscape:items-center landscape:justify-center landscape:rounded-none landscape:border-0 landscape:shadow-none">
            <div className="relative w-full landscape:h-full landscape:max-h-[100dvh] landscape:max-w-[calc(100dvh*16/9)]" style={{ aspectRatio: "16 / 9" }}>
              <iframe
                className="absolute inset-0 h-full w-full landscape:relative"
                src={material.embedUrl}
                title={material.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </main>

        <footer className="relative z-20 shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] landscape:hidden">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[22px] border border-white/10 bg-black/22 p-4 backdrop-blur-md">
            <p className="text-[12px] leading-relaxed text-white/58">
              Use the YouTube controls inside the frame for play, pause, timeline, volume, and fullscreen.
            </p>

            {material.externalUrl ? (
              <a
                href={material.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-cyan-100/16 bg-cyan-100/[0.10] px-4 py-2.5 text-[12px] font-black text-cyan-50 transition hover:bg-cyan-100/[0.16] active:scale-[0.98]"
              >
                Open on YouTube
              </a>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
