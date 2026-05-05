import { useState } from "react";

export default function LearningMaterialModal({ isOpen, material, onClose }) {
  const [pageIndex, setPageIndex] = useState(0);

  if (!isOpen || !material) return null;

  const pages = material.pages || [];
  const current = pages[pageIndex];

  const next = () => {
    if (pageIndex < pages.length - 1) setPageIndex((p) => p + 1);
  };

  const prev = () => {
    if (pageIndex > 0) setPageIndex((p) => p - 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-slate-900 rounded-2xl p-5 w-[92%] max-w-md border border-white/10 backdrop-blur-xl">
        {/* HEADER */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white/90">{material.title}</h2>
          <p className="text-xs text-white/50">Page {pageIndex + 1} / {pages.length}</p>
        </div>

        {/* PAGE (BOOK STYLE) */}
        <div className="min-h-[160px] rounded-xl bg-white/5 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white/80 mb-2">
              {current?.title}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              {current?.body}
            </p>
          </div>

          {/* NAVIGATION */}
          <div className="flex justify-between mt-4">
            <button
              onClick={prev}
              disabled={pageIndex === 0}
              className="text-xs text-white/40 disabled:opacity-30"
            >
              Back
            </button>

            <button
              onClick={next}
              disabled={pageIndex === pages.length - 1}
              className="text-xs text-emerald-300 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="mt-4 text-xs text-white/50"
        >
          Close
        </button>
      </div>
    </div>
  );
}
