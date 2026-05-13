import { useEffect, useMemo, useRef, useState } from "react";
import { Box, MessageCircle, Sparkles } from "lucide-react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

const FALLBACK_MESSAGES = [];
const HIDDEN_WELCOME_TEXT = "What are you thinking of buying?";

const GUIDE_GROUPS = [
  {
    key: "cards",
    label: "Core Features",
    Icon: Box,
    iconClassName: "text-cyan-200",
    activeClassName:
      "border-cyan-100/42 bg-cyan-300/[0.13] text-white shadow-[0_0_26px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.11)]",
    inactiveClassName:
      "border-white/10 bg-white/[0.045] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]",
  },
  {
    key: "smart_actions",
    label: "Smart Actions",
    Icon: Sparkles,
    iconClassName: "text-violet-200",
    activeClassName:
      "border-violet-100/40 bg-violet-300/[0.12] text-white shadow-[0_0_24px_rgba(196,181,253,0.15),inset_0_1px_0_rgba(255,255,255,0.10)]",
    inactiveClassName:
      "border-white/10 bg-white/[0.04] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.048)]",
  },
  {
    key: "advice",
    label: "Ask Advice",
    Icon: MessageCircle,
    iconClassName: "text-fuchsia-200",
    activeClassName:
      "border-fuchsia-100/38 bg-fuchsia-300/[0.11] text-white shadow-[0_0_22px_rgba(217,70,239,0.14),inset_0_1px_0_rgba(255,255,255,0.09)]",
    inactiveClassName:
      "border-white/10 bg-white/[0.035] text-white/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  },
];

const GUIDE_BUBBLE_CAROUSELS = {
  cards: ["Core Features", "Budget Plan", "Wallets", "Savings"],
  smart_actions: ["Smart Actions", "Log Expense", "Rebalance", "Review Today"],
  advice: ["Ask Advice", "Should I buy this?", "Can I afford it?", "Delay or buy?"],
};

function GuideActionCard({ active, group, onClick }) {
  const Icon = group.Icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[74px] min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-[22px] border px-2.5 text-center backdrop-blur-xl transition duration-200 hover:bg-white/[0.07] hover:text-white active:scale-[0.98] ${
        active ? group.activeClassName : group.inactiveClassName
      }`}
    >
      <Icon className={`h-5 w-5 ${group.iconClassName}`} strokeWidth={1.8} />
      <span className="whitespace-nowrap text-[10.5px] font-black leading-none tracking-tight">
        {group.label}
      </span>
    </button>
  );
}

function ClaraQuickActions({ activeGroup, onSelectGroup }) {
  const currentGroup = activeGroup || "cards";

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="h-px flex-1 bg-white/[0.045]" />
        <p className="text-[10.5px] font-bold tracking-wide text-white/30">
          Quick actions
        </p>
        <div className="h-px flex-1 bg-white/[0.045]" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {GUIDE_GROUPS.map((group) => (
          <GuideActionCard
            key={group.key}
            group={group}
            active={currentGroup === group.key}
            onClick={() => onSelectGroup(group.key)}
          />
        ))}
      </div>
    </div>
  );
}

function ClaraGuideBubbleCarousel({ activeGroup }) {
  const items = GUIDE_BUBBLE_CAROUSELS[activeGroup] || GUIDE_BUBBLE_CAROUSELS.cards;

  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.065] px-2.5 py-2.5 text-[11px] font-semibold leading-5 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition duration-200">
      <div className="flex snap-x gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <div
            key={item}
            className="min-w-fit snap-start rounded-[20px] border border-white/[0.07] bg-white/[0.035] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
          >
            <p className="whitespace-nowrap font-black text-white/92">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
