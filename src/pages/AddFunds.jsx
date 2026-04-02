import { useState } from "react";
import { Plus, TrendingUp, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";

export default function AddFunds() {
  const [incomes, setIncomes] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    source: "",
    wallet: "Cash",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const handleSubmit = () => {
    if (!form.amount || !form.source) return;

    const newIncome = {
      id: Date.now(),
      ...form,
      amount: parseFloat(form.amount),
    };

    setIncomes([newIncome, ...incomes]);
    setForm({
      amount: "",
      source: "",
      wallet: "Cash",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });

    setOpen(false);
  };

  const handleDelete = (id) => {
    setIncomes(incomes.filter((i) => i.id !== id));
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <PageHeader title="Add Funds" subtitle="Track your income" />

      <button
        onClick={() => setOpen(!open)}
        className="mb-4 bg-green-600 text-white px-4 py-2 rounded"
      >
        <Plus className="inline w-4 h-4 mr-1" /> Add Funds
      </button>

      {open && (
        <div className="space-y-2 mb-4 border p-4 rounded">
          <input
            type="number"
            placeholder="Amount"
            className="w-full border p-2"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <input
            placeholder="Source"
            className="w-full border p-2"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
          <button
            onClick={handleSubmit}
            className="w-full bg-green-600 text-white p-2 rounded"
          >
            Add
          </button>
        </div>
      )}

      {incomes.length === 0 ? (
        <p>No income yet</p>
      ) : (
        incomes.map((inc) => (
          <div
            key={inc.id}
            className="flex justify-between items-center border p-2 mb-2 rounded"
          >
            <div>
              <p>{inc.source}</p>
              <p className="text-sm text-gray-500">{inc.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-green-600 font-bold">
                +{fmt(inc.amount)}
              </p>
              <button onClick={() => handleDelete(inc.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}