import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { generateInsights } from "@/lib/insight-engine";

export default function DashboardInsightCarousel({ expenses = [], budgets = [] }) {
  const navigate = useNavigate();

  const insights = useMemo(() => generateInsights(expenses, budgets), [expenses, budgets]);

  if (!insights.length) return null;

  return (
    <div className="px-4 mt-4">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {insights.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate("/analytics")}
            className="min-w-[260px] cursor-pointer rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-md"
          >
            <p className="text-xs text-white/50 mb-1">{item.eyebrow}</p>
            <p className="text-sm text-white/90 font-medium">{item.title}</p>
            <p className="text-xs text-white/60 mt-1">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
