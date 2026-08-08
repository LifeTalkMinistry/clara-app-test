import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clipboard, Landmark, Loader2, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";

const METHOD_ICONS = Object.freeze({
  gcash: Smartphone,
  maya: Smartphone,
  security_bank: Landmark,
});

async function copyText(value, label) {
  const text = String(value || "").trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied.`);
  } catch {
    toast("Press and hold the number to copy it.");
  }
}

export default function SupportPaymentSheet({ tier, onBack, onClose }) {
  const token = getStoredBackendToken();
  const [methods, setMethods] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        setError("Please sign in again before opening payment details.");
        setLoading(false);
        return;
      }
      try {
        const result = await backendRequest("/api/support/payment-methods", { token });
        if (cancelled) return;
        setMethods(Array.isArray(result?.methods) ? result.methods : []);
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || "Payment methods could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const selected = useMemo(
    () => methods.find((method) => method.key === selectedKey) || null,
    [methods, selectedKey]
  );

  const submitPaymentNotice = async () => {
    if (!token || !selected || submitting) return;
    const cleanReference = reference.trim();
    if (!cleanReference) {
      toast.error("Enter the payment reference number first.");
      return;
    }

    try {
      setSubmitting(true);
      await backendRequest("/api/support/messages", {
        method: "POST",
        token,
        body: {
          topic: "Support payment confirmation",
          content: [
            `Tier: ${tier.name}`,
            `Amount: PHP ${tier.price}`,
            `Payment method: ${selected.label}`,
            `Reference number: ${cleanReference}`,
            "User marked this payment as sent and is requesting manual verification.",
          ].join("\n"),
        },
      });
      setSubmitted(true);
      toast.success("Payment sent for verification. Thank you for supporting CLARA 💙");
    } catch (submitError) {
      toast.error(submitError?.message || "Unable to submit payment verification.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          aria-label="Close Support CLARA"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
        <p className="text-[10px] font-black tracking-[0.16em] text-cyan-200/70">YOU CHOSE</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <p className="text-base font-bold text-white">{tier.name}</p>
            <p className="mt-1 text-xs text-white/50">{tier.positioning}</p>
          </div>
          <p className="text-2xl font-black text-white">₱{tier.price}<span className="text-[10px] font-semibold text-white/40"> / month</span></p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-white">Choose how you want to support</p>
        <p className="mt-1 text-xs leading-5 text-white/45">Select GCash, Maya, or Security Bank. CLARA will show the payment details you configured in the Admin Dashboard.</p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-10 text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.06] px-3 py-3 text-xs leading-5 text-rose-100/80">{error}</div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {methods.map((method) => {
            const Icon = METHOD_ICONS[method.key] || Landmark;
            const active = selectedKey === method.key;
            return (
              <button
                key={method.key}
                type="button"
                disabled={!method.configured}
                onClick={() => { setSelectedKey(method.key); setReference(""); setSubmitted(false); }}
                className={`rounded-2xl border px-2 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-cyan-300/50 bg-cyan-300/[0.11] text-cyan-100" : "border-white/10 bg-white/[0.04] text-white/65"}`}
              >
                <Icon className="mx-auto h-5 w-5" />
                <span className="mt-1.5 block text-[11px] font-bold">{method.label}</span>
                {!method.configured && <span className="mt-1 block text-[8px] font-bold tracking-wide text-white/35">SET UP FIRST</span>}
              </button>
            );
          })}
        </div>
      )}

      {!loading && !error && methods.length === 0 && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs leading-5 text-white/55">
          No payment methods are enabled yet. Configure them from the CLARA Admin Dashboard → Settings.
        </div>
      )}

      {selected && (
        <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Pay with {selected.label}</p>
              <p className="mt-1 text-[11px] leading-4 text-white/45">{selected.instructions || "Use the details below to send your support."}</p>
            </div>
            <Check className="h-5 w-5 text-cyan-300" />
          </div>

          {selected.qrCodeDataUrl && (
            <div className="mt-4 rounded-2xl bg-white p-3">
              <img src={selected.qrCodeDataUrl} alt={`${selected.label} payment QR code`} className="mx-auto block max-h-[260px] w-auto max-w-full object-contain" />
            </div>
          )}

          <div className="mt-4 space-y-2">
            {selected.accountName && (
              <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2.5">
                <p className="text-[9px] font-bold tracking-[0.14em] text-white/35">ACCOUNT NAME</p>
                <p className="mt-1 text-sm font-bold text-white">{selected.accountName}</p>
              </div>
            )}
            {selected.accountNumber && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold tracking-[0.14em] text-white/35">NUMBER / ACCOUNT</p>
                  <p className="mt-1 break-all text-sm font-bold text-white">{selected.accountNumber}</p>
                </div>
                <button type="button" onClick={() => copyText(selected.accountNumber, selected.label)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-200" aria-label={`Copy ${selected.label} account number`}>
                  <Clipboard className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            {submitted ? (
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] p-3 text-xs leading-5 text-emerald-100/80">
                Payment reference submitted for manual verification. Thank you for helping keep CLARA free. 💙
              </div>
            ) : (
              <>
                <label className="text-[10px] font-bold tracking-[0.12em] text-white/45">AFTER YOU SEND THE PAYMENT</label>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Enter payment reference number"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/35"
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={submitPaymentNotice}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300/15 text-sm font-bold text-cyan-100 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  I’ve sent the payment
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-[10px] leading-4 text-white/35">
        Support is voluntary. Core CLARA features remain free whether you contribute or not.
      </p>
    </div>
  );
}
