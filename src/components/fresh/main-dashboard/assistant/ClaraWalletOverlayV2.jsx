import { useEffect, useMemo, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { addMoney, addWallet } from "@/lib/financeRepository";
import {
  getWalletId,
  getWalletMoneySemantics,
  getWalletName,
  isActiveWalletForMoneySemantics,
} from "@/lib/clara-wallet-money-semantics";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function money(value = 0) {
  const parsed = Number(value);
  return `₱${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getFirstName(user = {}) {
  const raw = clean(
    user?.firstName ||
      user?.first_name ||
      user?.displayName ||
      user?.display_name ||
      user?.name ||
      user?.fullName ||
      user?.full_name ||
      ""
  );
  if (raw) return raw.split(" ")[0];
  const email = clean(user?.email);
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

function getLocalUserId(user = {}) {
  return clean(user?.id || user?.email || "local-user") || "local-user";
}

function dispatchWalletRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("clara-finance-updated"));
  window.dispatchEvent(new Event("clara-wallets-updated"));
  window.dispatchEvent(new Event("clara:finance-data-updated"));
}

function Bubble({ role = "assistant", children }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[13px] font-semibold leading-[1.55] shadow-[0_10px_24px_rgba(0,0,0,0.16)] ${
          isUser
            ? "rounded-br-[7px] bg-[#1769ff] text-white"
            : "rounded-bl-[7px] border border-blue-200/12 bg-[#07142b]/92 text-slate-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ChoiceButton({ children, onClick, secondary = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative z-10 min-h-12 touch-manipulation rounded-[17px] border px-4 py-3 text-left text-[12.5px] font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${
        secondary
          ? "border-blue-100/12 bg-white/[0.035] text-slate-200"
          : "border-cyan-200/18 bg-[linear-gradient(135deg,rgba(23,105,255,0.22),rgba(43,225,216,0.10))] text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Composer({ value, onChange, onSubmit, placeholder, inputMode = "text", disabled = false }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="relative z-10 flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,0.28)]"
    >
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/62 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !String(value ?? "").trim()}
        className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-full bg-[#1769ff] text-white shadow-[0_8px_22px_rgba(23,105,255,0.34)] transition active:scale-95 disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}

function activityLabel(transaction = {}) {
  const type = clean(transaction?.type || transaction?.source_type || "activity").toLowerCase();
  if (["income", "deposit", "add_funds", "add_money", "cash_in", "credit"].includes(type)) return "Money in";
  if (["expense", "withdrawal", "debit"].includes(type)) return "Money out";
  if (type === "transfer_in") return "Transfer in";
  if (type === "transfer_out") return "Transfer out";
  return clean(transaction?.category || transaction?.tag || transaction?.type || "Wallet activity");
}

function activityDirection(transaction = {}) {
  const type = clean(transaction?.type || transaction?.source_type || "").toLowerCase();
  return ["income", "deposit", "add_funds", "add_money", "cash_in", "credit", "transfer_in"].includes(type)
    ? "+"
    : ["expense", "withdrawal", "debit", "transfer_out"].includes(type)
      ? "−"
      : "";
}

function activityTime(transaction = {}) {
  const raw = transaction?.created_at || transaction?.createdAt || transaction?.date || transaction?.updated_at;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export default function ClaraWalletOverlayV2({
  isActive = false,
  onClose,
  onWalletReady,
  entryContext = null,
  claraAssistantContext = null,
}) {
  const [phase, setPhase] = useState("menu");
  const [walletNameInput, setWalletNameInput] = useState("");
  const [startingBalanceInput, setStartingBalanceInput] = useState("");
  const [fundAmountInput, setFundAmountInput] = useState("");
  const [draftWalletName, setDraftWalletName] = useState("");
  const [draftStartingBalance, setDraftStartingBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const user = claraAssistantContext?.user || {};
  const firstName = getFirstName(user);
  const allWallets = Array.isArray(claraAssistantContext?.wallets) ? claraAssistantContext.wallets : [];
  const savingsGoals = Array.isArray(claraAssistantContext?.savingsGoals) ? claraAssistantContext.savingsGoals : [];
  const emergencyFund = claraAssistantContext?.emergencyFund || null;
  const intent = clean(entryContext?.intent).toLowerCase();

  const wallets = useMemo(
    () =>
      allWallets
        .filter(isActiveWalletForMoneySemantics)
        .map((wallet) => ({
          wallet,
          id: getWalletId(wallet),
          name: getWalletName(wallet) || "Wallet",
          ...getWalletMoneySemantics({ wallet, emergencyFund, savingsGoals, wallets: allWallets }),
        })),
    [allWallets, emergencyFund, savingsGoals]
  );

  const selectedFundingWallet = useMemo(
    () => wallets.find((entry) => String(entry.id) === String(entryContext?.walletId || "")) || null,
    [entryContext?.walletId, wallets]
  );

  const walletNameById = useMemo(
    () => new Map(wallets.map((entry) => [String(entry.id), entry.name])),
    [wallets]
  );

  const recentActivity = useMemo(() => {
    const rows = Array.isArray(claraAssistantContext?.walletTransactions)
      ? claraAssistantContext.walletTransactions
      : [];
    return rows
      .filter((row) => !row?.deletedAt && !row?.deleted_at)
      .sort((left, right) => {
        const leftTime = new Date(left?.created_at || left?.createdAt || left?.date || 0).getTime() || 0;
        const rightTime = new Date(right?.created_at || right?.createdAt || right?.date || 0).getTime() || 0;
        return rightTime - leftTime;
      })
      .slice(0, 8)
      .map((row) => ({
        id: String(row?.id || `${row?.wallet_id || "wallet"}-${row?.created_at || row?.createdAt || Math.random()}`),
        label: activityLabel(row),
        direction: activityDirection(row),
        amount: Math.abs(Number(row?.amount) || 0),
        walletName: walletNameById.get(String(row?.wallet_id || row?.walletId || "")) || clean(row?.wallet_name || row?.walletName || "Wallet"),
        time: activityTime(row),
      }));
  }, [claraAssistantContext?.walletTransactions, walletNameById]);

  const totals = useMemo(
    () => wallets.reduce(
      (result, entry) => ({
        current: result.current + entry.currentBalance,
        protected: result.protected + entry.totalProtectedAmount,
        spendable: result.spendable + entry.spendableBalance,
      }),
      { current: 0, protected: 0, spendable: 0 }
    ),
    [wallets]
  );

  useEffect(() => {
    if (!isActive) return;
    setBusy(false);
    setError("");
    setWalletNameInput("");
    setStartingBalanceInput("");
    setFundAmountInput("");
    setDraftWalletName("");
    setDraftStartingBalance(0);
    if (intent === "create") setPhase("create_name");
    else if (intent === "fund") setPhase("fund");
    else setPhase("menu");
  }, [isActive, intent, entryContext?.walletId]);

  if (!isActive) return null;

  const closeWallet = () => {
    setPhase("menu");
    onClose?.();
  };

  const submitWalletName = () => {
    const name = clean(walletNameInput);
    if (!name) return;
    setDraftWalletName(name);
    setWalletNameInput("");
    setError("");
    setPhase("create_balance");
  };

  const submitStartingBalance = () => {
    const amount = Number(String(startingBalanceInput || "0").replace(/[₱,\s]/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter the amount currently inside this wallet, or 0.");
      return;
    }
    setDraftStartingBalance(amount);
    setError("");
    setPhase("create_confirm");
  };

  const createWalletInChat = async () => {
    if (busy || !draftWalletName) return;
    setBusy(true);
    setError("");
    try {
      const localUserId = getLocalUserId(user);
      const now = new Date().toISOString();
      const created = await addWallet(localUserId, {
        name: draftWalletName,
        type: "custom",
        balance: draftStartingBalance,
        current_balance: draftStartingBalance,
        starting_balance: draftStartingBalance,
        source: "wallet_chat",
        created_at: now,
        updated_at: now,
      });
      dispatchWalletRefresh();
      setPhase("created");
      if (typeof window !== "undefined") {
        window.setTimeout(() => onWalletReady?.({ wallet: created, action: "created" }), 260);
      } else {
        onWalletReady?.({ wallet: created, action: "created" });
      }
    } catch (nextError) {
      setError(clean(nextError?.message || "CLARA couldn’t create that wallet yet."));
      setBusy(false);
    }
  };

  const fundWalletInChat = async () => {
    if (busy || !selectedFundingWallet?.id) return;
    const amount = Number(String(fundAmountInput || "").replace(/[₱,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const localUserId = getLocalUserId(user);
      await addMoney(localUserId, {
        wallet_id: selectedFundingWallet.id,
        walletId: selectedFundingWallet.id,
        type: "add_money",
        amount,
        source: "Wallet chat funding",
        notes: entryContext?.item ? `Needed to continue Log Expense: ${entryContext.item}` : "Wallet chat funding",
        created_at: new Date().toISOString(),
      });
      dispatchWalletRefresh();
      setPhase("funded");
      if (typeof window !== "undefined") {
        window.setTimeout(() => onWalletReady?.({ wallet: selectedFundingWallet.wallet, action: "funded" }), 260);
      } else {
        onWalletReady?.({ wallet: selectedFundingWallet.wallet, action: "funded" });
      }
    } catch (nextError) {
      setError(clean(nextError?.message || "CLARA couldn’t add that money yet."));
      setBusy(false);
    }
  };

  const openingCopy = intent === "create"
    ? `Got it, ${firstName}. We’ll create the wallet right here in Wallet chat—no Financial Dashboard needed.`
    : intent === "fund"
      ? `Got it, ${firstName}. We’ll add money right here in Wallet chat, then return to Log Expense.`
      : wallets.length
        ? `Wallet is open, ${firstName}. I can see ${wallets.length} active wallet${wallets.length === 1 ? "" : "s"}. What would you like to check?`
        : `Wallet is open, ${firstName}. I can’t find an active wallet yet.`;

  return (
    <div
      className="fixed inset-0 z-[400] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-layout-variant="wallet"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-wallet-chat="true"
      data-clara-wallet-chat-intent={intent || "menu"}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_56%,rgba(7,31,38,0.96))] px-4 py-3.5 pr-14 shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#8ffff8]/78">CLARA CHAT</p>
        <h1 className="mt-1 text-[17px] font-black tracking-[-0.025em] text-white">Wallet</h1>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">Current · Protected · Spendable</p>
        <button
          type="button"
          onClick={closeWallet}
          className="absolute right-3 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 touch-manipulation place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 transition active:scale-95"
          aria-label="Close Wallet"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-h-full flex-col gap-3">
          <Bubble>{openingCopy}</Bubble>

          {phase === "create_name" ? (
            <>
              <Bubble>What should I call this wallet?</Bubble>
              <div className="mt-auto pt-3">
                <Composer value={walletNameInput} onChange={setWalletNameInput} onSubmit={submitWalletName} placeholder="Wallet name" disabled={busy} />
              </div>
            </>
          ) : null}

          {phase === "create_balance" ? (
            <>
              <Bubble role="user">{draftWalletName}</Bubble>
              <Bubble>How much money is currently inside {draftWalletName}? Enter 0 if it’s empty.</Bubble>
              <div className="mt-auto pt-3">
                <Composer value={startingBalanceInput} onChange={setStartingBalanceInput} onSubmit={submitStartingBalance} placeholder="Current balance" inputMode="decimal" disabled={busy} />
              </div>
            </>
          ) : null}

          {phase === "create_confirm" ? (
            <>
              <Bubble role="user">{money(draftStartingBalance)}</Bubble>
              <Bubble>Create {draftWalletName} with {money(draftStartingBalance)} recorded inside it?</Bubble>
              <div className="grid grid-cols-2 gap-2.5">
                <ChoiceButton onClick={createWalletInChat} disabled={busy}>{busy ? "Creating..." : "Create wallet"}</ChoiceButton>
                <ChoiceButton onClick={() => setPhase("create_balance")} disabled={busy} secondary>Back</ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "created" ? (
            <Bubble>{draftWalletName} is ready. I’m taking you back to Log Expense now.</Bubble>
          ) : null}

          {phase === "fund" ? (
            selectedFundingWallet ? (
              <>
                <Bubble>{selectedFundingWallet.name} currently has {money(selectedFundingWallet.currentBalance)} recorded and {money(selectedFundingWallet.spendableBalance)} spendable. How much do you want to add?</Bubble>
                <div className="mt-auto pt-3">
                  <Composer value={fundAmountInput} onChange={setFundAmountInput} onSubmit={fundWalletInChat} placeholder="Amount to add" inputMode="decimal" disabled={busy} />
                </div>
              </>
            ) : (
              <>
                <Bubble>I can’t find that wallet anymore. Choose another wallet or create one.</Bubble>
                <ChoiceButton onClick={() => setPhase("menu")} secondary>Back to Wallet</ChoiceButton>
              </>
            )
          ) : null}

          {phase === "funded" ? (
            <Bubble>Money added. I’m taking you back to Log Expense now.</Bubble>
          ) : null}

          {phase === "menu" ? (
            wallets.length ? (
              <div className="mt-1 grid gap-2.5">
                <ChoiceButton onClick={() => setPhase("balances")}>Check my balances</ChoiceButton>
                <ChoiceButton onClick={() => setPhase("activity")}>Show recent activity</ChoiceButton>
                <ChoiceButton onClick={() => setPhase("protected")}>Explain protected money</ChoiceButton>
                <ChoiceButton onClick={closeWallet} secondary>Done</ChoiceButton>
              </div>
            ) : (
              <div className="mt-1 grid gap-2.5">
                <Bubble>You don’t have an active wallet yet. We can create one here without leaving CLARA chat.</Bubble>
                <ChoiceButton onClick={() => setPhase("create_name")}>Create a wallet</ChoiceButton>
                <ChoiceButton onClick={closeWallet} secondary>Done</ChoiceButton>
              </div>
            )
          ) : null}

          {phase === "balances" ? (
            <>
              <Bubble>Across your active wallets, CLARA has {money(totals.current)} recorded. {money(totals.protected)} is protected, leaving {money(totals.spendable)} spendable.</Bubble>
              <section className="grid gap-2.5">
                {wallets.map((entry) => (
                  <article key={entry.id} className="rounded-[21px] border border-blue-200/12 bg-[#07142b]/88 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-[13px] font-black text-white">{entry.name}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/40">Recorded balance</p></div>
                      <p className="shrink-0 text-[14px] font-black text-white">{money(entry.currentBalance)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-[14px] border border-white/7 bg-white/[0.025] px-3 py-2.5"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-blue-100/38">Protected</p><p className="mt-1 text-[12px] font-black text-amber-100/88">{money(entry.totalProtectedAmount)}</p></div>
                      <div className="rounded-[14px] border border-cyan-200/10 bg-cyan-200/[0.035] px-3 py-2.5"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100/48">Spendable</p><p className="mt-1 text-[12px] font-black text-[#8ffff8]">{money(entry.spendableBalance)}</p></div>
                    </div>
                  </article>
                ))}
              </section>
              <div className="grid grid-cols-2 gap-2.5"><ChoiceButton onClick={() => setPhase("menu")} secondary>Back</ChoiceButton><ChoiceButton onClick={closeWallet}>Done</ChoiceButton></div>
            </>
          ) : null}

          {phase === "activity" ? (
            <>
              <Bubble>{recentActivity.length ? "Here’s the most recent Wallet activity CLARA has recorded." : "I don’t see recent Wallet activity to show yet."}</Bubble>
              {recentActivity.length ? (
                <section className="overflow-hidden rounded-[21px] border border-blue-200/12 bg-[#07142b]/88">
                  {recentActivity.map((entry, index) => (
                    <div key={entry.id} className={`flex items-center justify-between gap-3 px-3.5 py-3 ${index ? "border-t border-white/7" : ""}`}>
                      <div className="min-w-0"><p className="truncate text-[12px] font-black text-white/92">{entry.label}</p><p className="mt-0.5 truncate text-[10px] font-semibold text-slate-300/48">{entry.walletName}{entry.time ? ` · ${entry.time}` : ""}</p></div>
                      <p className="shrink-0 text-[12px] font-black text-[#8ffff8]/86">{entry.direction}{money(entry.amount)}</p>
                    </div>
                  ))}
                </section>
              ) : null}
              <div className="grid grid-cols-2 gap-2.5"><ChoiceButton onClick={() => setPhase("menu")} secondary>Back</ChoiceButton><ChoiceButton onClick={closeWallet}>Done</ChoiceButton></div>
            </>
          ) : null}

          {phase === "protected" ? (
            <>
              <Bubble>Protected money is still physically inside a wallet, but CLARA treats it as already assigned to your Emergency Fund or Savings Goals. That’s why I separate the recorded balance from what is actually spendable.</Bubble>
              <Bubble>Right now, {money(totals.protected)} across your active wallets is protected. I won’t count that amount as free spending money.</Bubble>
              <div className="grid grid-cols-2 gap-2.5"><ChoiceButton onClick={() => setPhase("menu")} secondary>Back</ChoiceButton><ChoiceButton onClick={closeWallet}>Done</ChoiceButton></div>
            </>
          ) : null}

          {error ? <p className="rounded-[16px] border border-red-300/15 bg-red-500/[0.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88" aria-live="polite">{error}</p> : null}
        </div>
      </main>
    </div>
  );
}
