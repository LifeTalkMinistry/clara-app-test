import { useState, useEffect } from "react";
import { Receipt, TrendingUp } from "lucide-react";

export default function QuickAddModal({ open, onClose }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">

      <div className="w-full max-w-md bg-[#071018] rounded-t-3xl p-5 border-t border-white/10">

        <h2 className="text-white font-bold mb-4">Quick Add</h2>

        {/* TYPE SWITCH */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setType("expense")}
            className={`flex-1 p-3 rounded-xl ${
              type === "expense" ? "bg-red-500 text-white" : "bg-white/10 text-white/70"
            }`}
          >
            <Receipt size={16} /> Expense
          </button>

          <button
            onClick={() => setType("income")}
            className={`flex-1 p-3 rounded-xl ${
              type === "income" ? "bg-green-500 text-white" : "bg-white/10 text-white/70"
            }`}
          >
            <TrendingUp size={16} /> Funds
          </button>
        </div>

        {/* INPUT */}
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-3 rounded-xl bg-[#020617] text-white border border-white/10 mb-4"
        />

        {/* ACTION */}
        <button className="w-full p-3 bg-green-500 rounded-xl text-white font-semibold">
          Save
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 text-sm text-white/50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}