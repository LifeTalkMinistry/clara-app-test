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
      toast.success("Payment submitted for review. Thank you for supporting CLARA 💙");
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
        <p className="mt-1 text-xs leading-5 text-white/45">Select GCash, Maya, or Security Bank. CLARA will show the payment details configured specifically for the ₱{tier.price} tier.</p>
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
                onClick={() => { setSelectedKey(method.key); setReference(""); setProof(null); setSubmitted(false); }}
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
          No payment methods are enabled yet for this tier. Configure them from the CLARA Admin Dashboard → Settings.
        </div>
      )}

      {selected && (
        <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Pay ₱{tier.price} with {selected.label}</p>
              <p className="mt-1 text-[11px] leading-4 text-white/45">{selected.instructions || "Use the details below to send your support."}</p>
            </div>
            <Check className="h-5 w-5 text-cyan-300" />
          </div>

          {selected.qrCodeDataUrl && (
            <div className="mt-4 rounded-2xl bg-white p-3">
              <img src={selected.qrCodeDataUrl} alt={`${selected.label} ₱${tier.price} payment QR code`} className="mx-auto block max-h-[260px] w-auto max-w-full object-contain" />
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
                Payment proof submitted and is now Pending Review. Your supporter badge activates only after an administrator verifies the payment. 💙
              </div>
            ) : (
              <>
                <label className="text-[10px] font-bold tracking-[0.12em] text-white/45">AFTER YOU SEND THE PAYMENT</label>
                <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
                  <p className="text-[10px] font-black tracking-[0.12em] text-cyan-100/70">OPTION 1 · RECOMMENDED</p>
                  <p className="mt-1 text-xs font-bold text-white">Upload your payment screenshot</p>
                  <p className="mt-1 text-[10px] leading-4 text-white/40">This is the fastest way for CLARA to verify what you sent.</p>

                  <input
                    id={`support-payment-proof-${tier.key}-${selected.key}`}
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
                    htmlFor={`support-payment-proof-${tier.key}-${selected.key}`}
                    className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] text-xs font-bold text-cyan-100"
                  >
                    {proofBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {proof ? "Replace screenshot" : "Upload payment screenshot"}
                  </label>

                  {proof && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-2">
                      <img src={proof.dataUrl} alt="Payment screenshot preview" className="mx-auto max-h-44 w-auto max-w-full rounded-lg object-contain" />
                      <div className="mt-2 flex items-center justify-between gap-2 px-1">
                        <span className="min-w-0 truncate text-[10px] text-white/45">{proof.originalName}</span>
                        <button type="button" onClick={() => setProof(null)} className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-200/70">
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="my-3 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-[9px] font-black tracking-[0.15em] text-white/30">OR</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <div>
                  <p className="text-[10px] font-black tracking-[0.12em] text-white/40">OPTION 2</p>
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Enter reference number (optional with screenshot)"
                    className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/35"
                  />
                </div>

                <p className="mt-3 text-center text-[10px] leading-4 text-white/35">You only need one: a screenshot or the payment reference number.</p>

                <button
                  type="button"
                  disabled={submitting || proofBusy}
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
