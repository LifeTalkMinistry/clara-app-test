import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  CalendarDays,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  WalletCards,
  PiggyBank,
} from "lucide-react";

import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";
import {
  getLocalExpenses,
  getPendingExpenses,
  isClaraOnline,
} from "@/lib/clara-offline-finance";

// ---------- Helpers ----------
const num = (v) => Number(v || 0);
const peso = (v) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(num(v));

const formatDate = (d) =>
  new Date(d).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatDateOnly = (d) =>
  new Date(d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const isJSONLike = (text) =>
  text?.startsWith("{") || text?.startsWith("[");

// ---------- Month Generator ----------
const getLast12Months = () => {
  const list = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const label = d.toLocaleDateString("en-PH", {
      month: "short",
      year: "numeric",
    });

    list.push({ key, label });
  }

  return list;
};

// ---------- Component ----------
export default function TransactionHub() {
  const navigate = useNavigate();
  const { user } = useUserRole();
  const financial = useFinancialData(user);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState(getLast12Months()[0].key);
  const [refreshing, setRefreshing] = useState(false);

  const months = getLast12Months();

  const activity = useMemo(() => {
    const all = [
      ...(financial.expenses || []),
      ...(financial.walletTransactions || []),
      ...(financial.transfers || []),
    ];

    return all.map((item) => {
      const date = item.created_at || item.date;
      const mKey = `${new Date(date).getFullYear()}-${
        new Date(date).getMonth() + 1
      }`;

      return {
        ...item,
        date,
        monthKey: mKey,
        title:
          item.category ||
          item.type ||
          item.source_type ||
          "Transaction",
        amount: num(item.amount),
        note: isJSONLike(item.notes) ? "" : item.notes,
      };
    });
  }, [financial]);

  // ---------- Filters ----------
  const filtered = useMemo(() => {
    return activity.filter((t) => {
      const matchMonth = t.monthKey === month;
      const matchSearch =
        !search ||
        JSON.stringify(t).toLowerCase().includes(search.toLowerCase());

      const matchFilter =
        filter === "all" ||
        (filter === "expense" && t.amount < 0) ||
        (filter === "income" && t.amount > 0);

      return matchMonth && matchSearch && matchFilter;
    });
  }, [activity, search, filter, month]);

  // ---------- Group by Date ----------
  const grouped = useMemo(() => {
    const map = {};

    filtered.forEach((t) => {
      const key = formatDateOnly(t.date);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });

    return Object.entries(map);
  }, [filtered]);

  // ---------- Summary ----------
  const summary = useMemo(() => {
    let out = 0;
    let income = 0;

    filtered.forEach((t) => {
      if (t.amount < 0) out += Math.abs(t.amount);
      if (t.amount > 0) income += t.amount;
    });

    return {
      out,
      income,
      net: income - out,
    };
  }, [filtered]);

  const refresh = async () => {
    if (!financial.refreshData) return;
    setRefreshing(true);
    await financial.refreshData();
    setRefreshing(false);
  };

  // ---------- UI ----------
  return (
    <div className="p-4 text-white space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <button onClick={() => navigate("/dashboard")}>
          <ArrowLeft />
        </button>
        <button onClick={refresh}>
          <RefreshCw className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* MONTH SELECTOR */}
      <div className="flex gap-2 overflow-x-auto">
        {months.map((m) => (
          <button
            key={m.key}
            onClick={() => setMonth(m.key)}
            className={`px-4 py-2 rounded-full ${
              month === m.key ? "bg-green-500" : "bg-white/10"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-2">
        <div>Out: {peso(summary.out)}</div>
        <div>In: {peso(summary.income)}</div>
        <div>Net: {peso(summary.net)}</div>
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 bg-black/30 rounded"
      />

      {/* EMPTY */}
      {!grouped.length && (
        <div className="text-center opacity-60">
          No activity for this view
        </div>
      )}

      {/* LIST */}
      {grouped.map(([date, items]) => (
        <div key={date}>
          <div className="sticky top-0 bg-black/50">{date}</div>

          {items.map((t, i) => (
            <div key={i} className="p-3 border-b border-white/10">
              <div className="flex justify-between">
                <div>{t.title}</div>
                <div>{peso(t.amount)}</div>
              </div>
              <div className="text-xs opacity-60">
                {formatDate(t.date)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
