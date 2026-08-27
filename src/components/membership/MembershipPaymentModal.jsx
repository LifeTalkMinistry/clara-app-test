import { createPortal } from "react-dom";
import SupportPaymentSheet from "@/components/support/SupportPaymentSheet";
import { getSupportTier } from "@/lib/clara-support";

export default function MembershipPaymentModal({ tierKey, onClose }) {
  if (!tierKey || typeof document === "undefined") return null;

  const tier = getSupportTier(tierKey);
  if (!tier) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483500] flex items-end justify-center bg-black/70 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-8 backdrop-blur-md sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${tier.name} membership payment`}
        className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-[28px] border border-[#4d8cff]/18 bg-[linear-gradient(180deg,rgba(7,18,43,.995),rgba(3,8,25,.998))] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,.65),0_0_40px_rgba(77,140,255,.08)]"
      >
        <SupportPaymentSheet
          tier={tier}
          onBack={onClose}
          onClose={onClose}
        />
      </section>
    </div>,
    document.body
  );
}
