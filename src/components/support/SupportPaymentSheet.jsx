import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clipboard, ImagePlus, Landmark, Loader2, Smartphone, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";

const METHOD_ICONS = Object.freeze({
  gcash: Smartphone,
  maya: Smartphone,
  security_bank: Landmark,
});

const MAX_PROOF_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_PROOF_DATA_URL_BYTES = 1_150_000;

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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read that screenshot."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That screenshot could not be opened."));
    image.src = dataUrl;
  });
}

function estimatedDataUrlBytes(dataUrl) {
  const commaIndex = String(dataUrl || "").indexOf(",");
  const base64Length = commaIndex >= 0 ? dataUrl.length - commaIndex - 1 : dataUrl.length;
  return Math.ceil((base64Length * 3) / 4);
}

async function preparePaymentProof(file) {
  if (!file || !/^image\/(png|jpeg|jpg|webp)$/i.test(file.type || "")) {
    throw new Error("Choose a PNG, JPG, or WebP payment screenshot.");
  }
  if (file.size > MAX_PROOF_SOURCE_BYTES) {
    throw new Error("That screenshot is too large. Choose an image smaller than 8 MB.");
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const attempts = [
    { maxSide: 1400, quality: 0.82 },
    { maxSide: 1200, quality: 0.72 },
    { maxSide: 1000, quality: 0.62 },
  ];

  for (const attempt of attempts) {
    const longestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height, 1);
    const scale = Math.min(1, attempt.maxSide / longestSide);
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare that screenshot.");
    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", attempt.quality);
    if (estimatedDataUrlBytes(dataUrl) <= MAX_PROOF_DATA_URL_BYTES) {
      return {
        dataUrl,
        name: `payment-proof-${Date.now()}.jpg`,
        originalName: file.name || "payment-screenshot",
      };
    }
  }

  throw new Error("That screenshot is still too large after compression. Try cropping it first.");
}

export default function SupportPaymentSheet({ tier, onBack, onClose }) {
  const token = getStoredBackendToken();
  const [methods, setMethods] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState(null);
  const [proofBusy, setProofBusy] = useState(false);
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
        // The backend route keeps its historical support name for compatibility;
        // the selected key now represents a CLARA membership tier.
        const tierKey = encodeURIComponent(String(tier?.key || "supporter"));
        const result = await backendRequest(`/api/support/payment-methods?tier=${tierKey}`, { token });
        if (cancelled) return;
        setMethods(Array.isArray(result?.methods) ? result.methods : []);
        setSelectedKey("");
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || "Payment methods could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    setError("");
    load();
    return () => { cancelled = true; };
  }, [token, tier?.key]);

  const selected = useMemo(
    () => methods.find((method) => method.key === selectedKey) || null,
    [methods, selectedKey]
  );

  const handleProofFile = async (file) => {
    if (!file || proofBusy) return;
    try {
      setProofBusy(true);
      const prepared = await preparePaymentProof(file);
      setProof(prepared);
      setSubmitted(false);
      toast.success("Payment screenshot ready to submit.");
    } catch (proofError) {
      toast.error(proofError?.message || "Unable to prepare that screenshot.");
    } finally {
      setProofBusy(false);
    }
  };

  const submitPaymentNotice = async () => {
    if (!token || !selected || submitting || proofBusy) return;
    const cleanReference = reference.trim();
    if (!cleanReference && !proof?.dataUrl) {
      toast.error("Upload a payment screenshot or enter the reference number.");
      return;
    }

    try {
      setSubmitting(true);
      // Existing endpoint is intentionally reused. Admin verification continues
      // to activate the same backend plan key after payment review.
      await backendRequest("/api/support/payments", {
        method: "POST",
        token,
        body: {
          tierKey: tier.key,
          paymentMethodKey: selected.key,
          paymentReference: cleanReference,
          proofImageDataUrl: proof?.dataUrl || "",
          proofImageName: proof?.name || "",
        },
      });
      setSubmitted(true);
      toast.success("Payment submitted for verification. Your CLARA membership will activate after confirmation.");
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
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold text-white/65 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          aria-label="Close CLARA membership payment"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/60 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[22px] border border-blue-400/25 bg-[linear-gradient(145deg,rgba(30,64,175,0.14),rgba(2,6,23,0.72)_62%)] px-4 py-4 shadow-[0_16px_42px_rgba(0,0,0,0.18)]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, #2563eb 0 58%, #facc15 58% 72%, #ef4444 72% 100%)",
          }}
        />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black tracking-[0.18em] text-blue-200/55">CLARA MEMBERSHIP</p>
            <p className="mt-1 truncate text-[15px] font-bold text-white">{tier.name}</p>
          </div>
          <p className="shrink-0 text-[22px] font-black tracking-tight text-white">
            ₱{tier.price}<span className="ml-1 text-[9px] font-semibold text-white/35">/ month</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-white">Choose payment method</p>
        <p className="text-[10px] font-medium text-white/30">GCash · Maya · Bank</p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-9 text-white/45"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : error ? (
        <div className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-3 py-3 text-xs leading-5 text-rose-100/75">{error}</div>
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
                onClick={() => { setSelectedKey(method.key); setReference(""); setProof(null); setSubmitted(false); }}
                className={`relative rounded-2xl border px-2 py-3.5 text-center transition duration-200 disabled:cursor-not-allowed disabled:opacity-30 ${
                  active
                    ? "border-blue-400/55 bg-blue-500/[0.11] text-white shadow-[0_0_0_1px_rgba(59,130,246,0.08)_inset,0_10px_26px_rgba(37,99,235,0.10)]"
                    : "border-white/10 bg-white/[0.028] text-white/58 hover:bg-white/[0.05] hover:text-white/80"
                }`}
              >
                {active && (
                  <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-slate-950">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
                <Icon className="mx-auto h-[19px] w-[19px]" />
                <span className="mt-1.5 block text-[10px] font-bold">{method.label}</span>
                {!method.configured && <span className="mt-1 block text-[7px] font-bold tracking-wide text-white/30">UNAVAILABLE</span>}
              </button>
            );
          })}
        </div>
      )}

      {!loading && !error && methods.length === 0 && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-white/50">
          No payment methods are available yet.
        </div>
      )}

      {selected && (
        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Pay ₱{tier.price} via {selected.label}</p>
              {selected.instructions && (
                <p className="mt-1 text-[10px] leading-4 text-white/38">{selected.instructions}</p>
              )}
            </div>
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(250,204,21,0.45)]" />
          </div>

          {selected.qrCodeDataUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl bg-white">
              <img src={selected.qrCodeDataUrl} alt={`${selected.label} ₱${tier.price} payment QR code`} className="block h-auto w-full" />
            </div>
          )}

          <div className="mt-4 space-y-2">
            {selected.accountName && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
                <p className="text-[8px] font-bold tracking-[0.14em] text-white/28">ACCOUNT NAME</p>
                <p className="mt-1 text-sm font-semibold text-white/90">{selected.accountName}</p>
              </div>
            )}
            {selected.accountNumber && (
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-bold tracking-[0.14em] text-white/28">NUMBER / ACCOUNT</p>
                  <p className="mt-1 break-all text-sm font-semibold text-white/90">{selected.accountNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(selected.accountNumber, selected.label)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/[0.07] text-blue-200"
                  aria-label={`Copy ${selected.label} account number`}
                >
                  <Clipboard className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-white/[0.08] pt-4">
            {submitted ? (
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs leading-5 text-emerald-100/75">
                Payment submitted for verification. Your {tier.name} membership will activate after confirmation.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold tracking-[0.10em] text-white/42">PAYMENT PROOF</p>
                  <p className="text-[9px] text-white/25">Screenshot or reference</p>
                </div>

                <input
                  id={`membership-payment-proof-${tier.key}-${selected.key}`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={proofBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleProofFile(file);
                    event.target.value = "";
                  }}
                />
                <label
                  htmlFor={`membership-payment-proof-${tier.key}-${selected.key}`}
                  className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/[0.07] text-xs font-bold text-blue-100 transition hover:bg-blue-500/[0.11]"
                >
                  {proofBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {proof ? "Replace screenshot" : "Upload screenshot"}
                </label>

                {proof && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-black/15 p-2">
                    <img src={proof.dataUrl} alt="Payment screenshot preview" className="mx-auto max-h-44 w-auto max-w-full rounded-lg object-contain" />
                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      <span className="min-w-0 truncate text-[9px] text-white/35">{proof.originalName}</span>
                      <button type="button" onClick={() => setProof(null)} className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-200/60">
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                )}

                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Reference number (optional)"
                  className="mt-2.5 h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-sm text-white outline-none placeholder:text-white/22 focus:border-blue-400/30"
                />

                <button
                  type="button"
                  disabled={submitting || proofBusy}
                  onClick={submitPaymentNotice}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-[0_10px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  I’ve sent the payment
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-[9px] leading-4 text-white/28">
        Membership activates after payment verification.
      </p>
    </div>
  );
}
