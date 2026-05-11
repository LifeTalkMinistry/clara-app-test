import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];
const QUICK = [50, 100, 500];

function cleanAmount(value) {
  const cleaned = String(value || "").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const whole = String(parts[0] || "").replace(/^0+(?=\d)/, "");
  const cents = parts.slice(1).join("").slice(0, 2);
  return cleaned.includes(".") ? `${whole || "0"}.${cents}` : whole;
}

function displayAmount(value) {
  const cleaned = cleanAmount(value);
  const numberValue = Number(cleaned || 0);
  if (!cleaned || !Number.isFinite(numberValue) || numberValue <= 0) return "₱0";

  const [whole = "0", cents = ""] = cleaned.split(".");
  const formattedWhole = Number(whole || 0).toLocaleString("en-PH");
  return cents ? `₱${formattedWhole}.${cents}` : `₱${formattedWhole}`;
}

export default function ManualExpenseNumberPad({ value = "", onChange }) {
  const amountValue = cleanAmount(value);

  const updateValue = (nextValue) => {
    onChange?.(cleanAmount(nextValue));
  };

  const press = (key) => {
    if (key === "backspace") {
      updateValue(amountValue.slice(0, -1));
      return;
    }
    if (key === "." && amountValue.includes(".")) return;
    updateValue(`${amountValue}${key}`);
  };

  const quickAdd = (amount) => {
    const current = Number(amountValue || 0);
    updateValue(String((Number.isFinite(current) ? current : 0) + amount));
  };

  return (
    <div className="rounded-[30px] border border-white/12 bg-white/[0.038] p-4 shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/54">CLARA Number Pad</p>
          <p className="mt-1 text-[13px] font-semibold text-white/78">{displayAmount(amountValue)}</p>
        </div>
        <div className="flex gap-2">
          {QUICK.map((amount) => (
            <button key={amount} type="button" onClick={() => quickAdd(amount)} className="rounded-2xl border border-emerald-200/15 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-50 active:scale-95">
              +{amount}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {KEYS.map((key) => (
          <button key={key} type="button" onClick={() => press(key)} className="flex min-h-[54px] items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.055] text-xl font-black text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-[0.97]">
            {key === "backspace" ? <Delete className="h-5 w-5" /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}
