import { input } from "./budgetGuidedUtils";

export default function BasicsAmountInput({ value, onChange, clearNotice }) {
  return (
    <div className="mt-4">
      <label className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
        Available amount
      </label>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-200/80">
          ₱
        </span>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            clearNotice();
          }}
          placeholder="25,000"
          className={`${input} pl-10 text-lg font-black tracking-[-0.02em]`}
        />
      </div>
    </div>
  );
}
