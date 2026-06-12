import { createPortal } from "react-dom";

export default function LearningVideoWatchModal({ isOpen, material, onClose }) {
  if (!isOpen || !material || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-end justify-center bg-black/75 px-3 pb-3 pt-8 text-white backdrop-blur-md sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${material.title} video`}
        className="relative max-h-[calc(100dvh-24px)] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-cyan-100/12 bg-slate-950 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.48)] sm:p-5"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/28 text-white/72 backdrop-blur-md transition hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
        >
          ×
        </button>

        <p className="text-[10px] font-black uppercase tracking-[0.20em] text-cyan-50/78">
          {material.coverLabel || "Masterclass Episode"}
        </p>
        <h3 className="mt-3 pr-12 text-[24px] font-black leading-tight tracking-[-0.03em] text-white sm:text-[30px]">
          {material.title}
        </h3>
        <p className="mt-2 max-w-2xl text-[13px] leading-snug text-white/64 sm:text-[14px]">
          {material.subtitle}
        </p>

        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/34">
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={material.embedUrl}
              title={material.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>

        {material.externalUrl ? (
          <div className="mt-4 flex justify-end">
            <a
              href={material.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-cyan-100/14 bg-cyan-100/[0.10] px-4 py-2 text-[12px] font-black text-cyan-50 transition hover:bg-cyan-100/[0.16] active:scale-[0.98]"
            >
              Open on YouTube
            </a>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
