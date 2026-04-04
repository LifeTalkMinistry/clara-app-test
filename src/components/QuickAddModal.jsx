import { useState, useEffect } from "react";
import { Receipt, TrendingUp, X } from "lucide-react";

export default function QuickAddModal({ open, onClose }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!open) {
      setType("expense");
      setAmount("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="w-full max-w-md rounded-t-[30px] border-t border-white/10 bg-[#071018] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Quick Add</h2>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setType("expense")}
            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
              type === "expense"
                ? "bg-red-500 text-white shadow-[0_10px_24px_rgba(239,68,68,0.22)]"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <Receipt size={16} />
            Expense
          </button>

          <button
            onClick={() => setType("income")}
            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
              type === "income"
                ? "bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)]"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <TrendingUp size={16} />
            Funds
          </button>
        </div>

        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-4 w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-3 text-white outline-none placeholder:text-white/35"
        />

        <button className="w-full rounded-2xl bg-[linear-gradient(135deg,#22c55e,#0ea5a0)] px-4 py-3 font-semibold text-white shadow-[0_14px_30px_rgba(34,197,94,0.22)]">
          Save
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-sm text-white/50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}