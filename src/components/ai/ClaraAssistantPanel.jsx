import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

const INITIAL_MESSAGE = "I’m here. Ask me before you act.";
const FALLBACK_REPLY = "Got it. I’ll help you think through that.";
const MISSING_CONTEXT_REPLY = "I need more dashboard data before I can answer that clearly.";

function makeMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function getLocalReply(question, context = {}) {
  const text = String(question || "").toLowerCase();

  if (text.includes("money") || text.includes("left") || text.includes("balance")) {
    const amount = formatMoney(context.totalMoneyLeft);
    return amount ? `You currently have ${amount} available across your dashboard context.` : MISSING_CONTEXT_REPLY;
  }

  if (text.includes("spend") || text.includes("spent") || text.includes("expense")) {
    const amount = formatMoney(context.totalExpensesThisMonth);
    return amount ? `You have spent ${amount} this month so far.` : MISSING_CONTEXT_REPLY;
  }

  if (text.includes("emergency")) {
    if (context.emergencyFund?.summary) return context.emergencyFund.summary;
    const saved = formatMoney(context.emergencyFund?.saved);
    const target = formatMoney(context.emergencyFund?.target);
    if (saved && target) return `Your emergency fund is at ${saved} out of ${target}.`;
    if (saved) return `Your emergency fund currently has ${saved}.`;
    return MISSING_CONTEXT_REPLY;
  }

  if (text.includes("watch") || text.includes("careful") || text.includes("today")) {
    const spent = formatMoney(context.totalExpensesThisMonth);
    const left = formatMoney(context.totalMoneyLeft);
    if (spent && left) return `Today, watch impulse spending. You have ${left} left and ${spent} spent this month.`;
    if (left) return `Today, protect your remaining ${left}. Pause before non-essential spending.`;
    return MISSING_CONTEXT_REPLY;
  }

  if (text.includes("wallet")) {
    const wallets = Array.isArray(context.wallets) ? context.wallets : [];
    if (!wallets.length) return MISSING_CONTEXT_REPLY;
    return `I can see ${wallets.length} wallet${wallets.length === 1 ? "" : "s"}: ${wallets
      .slice(0, 3)
      .map((wallet) => `${wallet.name || "Wallet"} ${formatMoney(wallet.balance) || ""}`.trim())
      .join(", ")}.`;
  }

  if (text.includes("saving") || text.includes("goal")) {
    if (context.savings?.summary) return context.savings.summary;
    const saved = formatMoney(context.savings?.saved);
    const target = formatMoney(context.savings?.target);
    if (saved && target) return `Your savings progress is ${saved} out of ${target}.`;
    return MISSING_CONTEXT_REPLY;
  }

  if (text.includes("budget")) {
    if (context.budget?.summary) return context.budget.summary;
    const allocated = formatMoney(context.budget?.allocated);
    const spent = formatMoney(context.budget?.spent);
    if (allocated && spent) return `Your current budget context shows ${spent} spent out of ${allocated} allocated.`;
    return MISSING_CONTEXT_REPLY;
  }

  return FALLBACK_REPLY;
}

export default function ClaraAssistantPanel({ open, onClose, context }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(() => [makeMessage("clara", INITIAL_MESSAGE)]);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus?.(), 120);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [open, messages]);

  const sendDraft = () => {
    const text = draft.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      makeMessage("user", text),
      makeMessage("clara", getLocalReply(text, context)),
    ]);
    setDraft("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendDraft();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendDraft();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close CLARA assistant overlay" />

      <section className="relative z-[1] flex h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-[30px] border border-cyan-200/10 bg-[#06111f] text-white shadow-2xl sm:h-[680px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#081827] px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-white">CLARA</h2>
            <p className="text-xs font-medium text-cyan-100/70">Ask before you act</p>
          </div>

          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/75 active:scale-95" aria-label="Close CLARA assistant">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-[22px] px-4 py-3 text-sm leading-6 ${isUser ? "rounded-br-md bg-cyan-300 text-slate-950" : "rounded-bl-md border border-white/10 bg-white/10 text-white/90"}`}>
                  {message.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/10 bg-[#06111f] px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
          <div className="flex items-end gap-2 rounded-[24px] border border-white/10 bg-white/10 p-2">
            <textarea ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} rows={1} placeholder="Ask CLARA before you act…" className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/35" aria-label="Ask CLARA before you act" />

            <button type="submit" disabled={!draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Send message">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
