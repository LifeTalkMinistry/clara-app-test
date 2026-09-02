import { useMemo, useRef, useState } from "react";
import { ArrowUp, Shield, WalletCards } from "lucide-react";
import ClaraChatHeader from "./ClaraChatHeader";
import useClaraConversationReveal from "./useClaraConversationReveal";
import useFinancialData from "@/hooks/useFinancialData";

const TARGET_OPTIONS = [
  { months: 3, label: "Basic Safety" },
  { months: 6, label: "Strong Stability" },
  { months: 12, label: "Full Protection" },
];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function firstNameFromUser(user = {}) {
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
  return email.includes("@") ? email.split("@")[0] : "there";
}

function firstValue(source, keys = [], fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function getWalletId(wallet = {}) {
  return String(
    wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.local_id || wallet?.uuid || ""
  ).trim();
}

function getWalletName(wallet = {}) {
  return clean(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "Wallet") || "Wallet";
}

function getWalletBalance(wallet = {}) {
  return toNumber(
    wallet?.balance ??
      wallet?.derived_balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.amount ??
      0
  );
}

function getWalletProtectedAmount(wallet = {}) {
  return toNumber(
    wallet?.emergencyProtectedAmount ??
      wallet?.emergency_protected_amount ??
      wallet?.protectedEmergencyAmount ??
      wallet?.protected_emergency_amount ??
      0
  );
}

function getWalletSpendable(wallet = {}) {
  const explicit =
    wallet?.spendableBalance ??
    wallet?.spendable_balance ??
    wallet?.walletSpendableBalance ??
    wallet?.wallet_spendable_balance;
  if (explicit !== undefined && explicit !== null && explicit !== "") return toNumber(explicit);
  const balance = getWalletBalance(wallet);
  return Math.max(balance - Math.min(getWalletProtectedAmount(wallet), balance), 0);
}

function isActiveWallet(wallet) {
  return Boolean(
    wallet &&
      getWalletId(wallet) &&
      !wallet?.is_archived &&
      !wallet?.deletedAt &&
      !wallet?.deleted_at &&
      !wallet?.isEmergencyReserveWallet &&
      !wallet?.protected_reserve
  );
}

function getEmergencyMonthlyExpense(emergencyFund) {
  return toNumber(
    firstValue(
      emergencyFund,
      ["survivalExpense", "survival_expense", "monthlyExpense", "monthly_expense", "monthly_survival_expense"],
      0
    )
  );
}

function getEmergencyTargetMonths(emergencyFund) {
  const value = toNumber(firstValue(emergencyFund, ["targetMonths", "target_months", "months_target"], 3));
  return TARGET_OPTIONS.some((option) => option.months === value) ? value : 3;
}

function getEmergencyStorageWalletId(emergencyFund) {
  return String(
    firstValue(
      emergencyFund,
      [
        "storageWalletId",
        "storage_wallet_id",
        "linkedWalletId",
        "linked_wallet_id",
        "reserveWalletId",
        "reserve_wallet_id",
        "sourceWalletId",
        "source_wallet_id",
        "walletId",
        "wallet_id",
      ],
      ""
    ) || ""
  ).trim();
}

function Bubble({ role = "assistant", children, elementRef = null }) {
  const user = role === "user";
  return (
    <div ref={elementRef} data-clara-conversation-role={role} className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[13px] font-semibold leading-5 shadow-[0_12px_28px_rgba(0,0,0,.2)] ${
          user
            ? "rounded-tr-[7px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white"
            : "rounded-tl-[7px] border border-blue-200/12 bg-[#0a1933]/94 text-slate-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Composer({ value, onChange, onSubmit, placeholder, inputMode = "text" }) {
  return (
    <form
      data-clara-buy-check-react-form="true"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,.28)]"
    >
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/55"
      />
      <button
        type="submit"
        disabled={!clean(value)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1769ff] text-white disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}

function ReplyButton({ children, onClick, secondary = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[17px] border px-3.5 py-2.5 text-left text-[12px] font-black leading-4 transition active:scale-[.985] ${
        secondary
          ? "border-white/10 bg-white/[.035] text-white/82"
          : "border-blue-300/22 bg-[#0b2144]/92 text-white shadow-[0_8px_20px_rgba(0,0,0,.16)]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value, accent = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[14px] border px-3 py-2.5 ${
        accent
          ? "border-[#FFD84A]/24 bg-[linear-gradient(135deg,rgba(255,216,74,0.08),rgba(8,40,90,0.62))]"
          : "border-blue-300/[0.08] bg-[#08285A]/45"
      }`}
    >
      <span className={`text-[11px] font-semibold ${accent ? "text-[#FFD84A]/72" : "text-blue-100/48"}`}>
        {label}
      </span>
      <span className={`text-sm font-black ${accent ? "text-[#FFE36E]" : "text-white/95"}`}>{value}</span>
    </div>
  );
}

export default function ClaraEmergencyFundOverlay({
  isActive = false,
  claraAssistantContext = {},
  resumeState = null,
  onOpenWalletChat,
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const viewportRef = useRef(null);
  const latestAssistantRef = useRef(null);
  const actionRef = useRef(null);
  const finance = useFinancialData(user);
  const emergencyFund = finance?.emergencyFund || claraAssistantContext?.emergencyFund || null;
  const sourceWallets = Array.isArray(finance?.wallets)
    ? finance.wallets
    : Array.isArray(claraAssistantContext?.wallets)
      ? claraAssistantContext.wallets
      : [];

  const safeWallets = useMemo(
    () =>
      sourceWallets
        .filter(isActiveWallet)
        .map((wallet) => ({
          ...wallet,
          id: getWalletId(wallet),
          name: getWalletName(wallet),
          spendable: getWalletSpendable(wallet),
        })),
    [sourceWallets]
  );

  const storedMonthly = getEmergencyMonthlyExpense(emergencyFund);
  const storedTargetMonths = getEmergencyTargetMonths(emergencyFund);
  const storedWalletId = getEmergencyStorageWalletId(emergencyFund);
  const greeting = `Emergency Fund is open, ${firstName}. Let’s set up your protection.`;
  const firstQuestion =
    "How much do you need every month to survive?\nInclude rent, food, bills, transport, debt minimums, and essentials only.";

  const initialMessages = Array.isArray(resumeState?.messages) && resumeState.messages.length
    ? resumeState.messages
    : [
        { role: "assistant", text: greeting },
        { role: "assistant", text: firstQuestion },
      ];

  const [phase, setPhase] = useState(resumeState?.phase || "monthly");
  const [messages, setMessages] = useState(initialMessages);
  const [monthlyInput, setMonthlyInput] = useState(
    resumeState?.monthlySurvivalCost || (storedMonthly > 0 ? String(storedMonthly) : "")
  );
  const [monthlySurvivalCost, setMonthlySurvivalCost] = useState(
    toNumber(resumeState?.monthlySurvivalCost || storedMonthly)
  );
  const [selectedWalletId, setSelectedWalletId] = useState(
    String(resumeState?.selectedWalletId || storedWalletId || "")
  );
  const [targetMonths, setTargetMonths] = useState(
    toNumber(resumeState?.targetMonths || storedTargetMonths || 3) || 3
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const selectedWallet = safeWallets.find((wallet) => wallet.id === selectedWalletId) || null;
  const targetAmount = monthlySurvivalCost * targetMonths;

  const appendExchange = (userText, assistantText) => {
    setMessages((current) => [
      ...current,
      ...(userText ? [{ role: "user", text: userText }] : []),
      ...(assistantText ? [{ role: "assistant", text: assistantText }] : []),
    ]);
  };

  const latestAssistantIndex = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "assistant") return index;
    }
    return -1;
  }, [messages]);

  const revealKey = isActive && !saving && latestAssistantIndex >= 0
    ? `${phase}:${messages.length}:${saved ? "saved" : "active"}`
    : null;

  useClaraConversationReveal({
    viewportRef,
    assistantRef: latestAssistantRef,
    actionRef,
    revealKey,
    enabled: Boolean(revealKey),
    requireAction: true,
  });

  if (!isActive) return null;

  const submitMonthly = () => {
    const amount = toNumber(monthlyInput);
    if (amount <= 0) {
      setError("Enter a monthly survival cost greater than ₱0.");
      return;
    }
    setMonthlySurvivalCost(amount);
    setError("");
    appendExchange(
      fmt(amount),
      "Where should CLARA protect this emergency fund?\nChoose the wallet where your emergency money will be tracked and protected."
    );
    setPhase("wallet");
  };

  const chooseWallet = (wallet) => {
    setSelectedWalletId(wallet.id);
    setError("");
    appendExchange(
      `${wallet.name} · Available ${fmt(wallet.spendable)}`,
      "How many months do you want to protect first?\nStart with a realistic safety goal. You can grow it later."
    );
    setPhase("months");
  };

  const createWallet = () => {
    if (typeof onOpenWalletChat !== "function") {
      setError("Create a wallet first, then return to Emergency Fund setup.");
      return;
    }

    onOpenWalletChat({
      resumeState: {
        phase: "wallet",
        messages,
        monthlySurvivalCost,
        selectedWalletId,
        targetMonths,
      },
    });
  };

  const chooseMonths = (option) => {
    setTargetMonths(option.months);
    setError("");
    appendExchange(
      `${option.months} months · ${option.label}`,
      "Review your protection setup.\nSaving this only defines your Emergency Fund. Adding money stays separate."
    );
    setPhase("review");
  };

  const saveSetup = async () => {
    if (monthlySurvivalCost <= 0) {
      setPhase("monthly");
      setError("Enter a monthly survival cost greater than ₱0.");
      return;
    }
    if (!selectedWallet) {
      setPhase("wallet");
      setError("Choose the wallet where CLARA should protect this fund.");
      return;
    }
    if (!TARGET_OPTIONS.some((option) => option.months === targetMonths)) {
      setPhase("months");
      setError("Choose a valid protection goal.");
      return;
    }
    if (typeof finance?.updateEmergencyFund !== "function") {
      setError("Emergency Fund saving is not available yet.");
      return;
    }

    const now = new Date().toISOString();
    const nextTarget = monthlySurvivalCost * targetMonths;
    const walletName = selectedWallet.name;

    setSaving(true);
    setError("");

    try {
      await finance.updateEmergencyFund({
        ...(emergencyFund || {}),
        survivalExpense: monthlySurvivalCost,
        survival_expense: monthlySurvivalCost,
        monthlyExpense: monthlySurvivalCost,
        monthly_expense: monthlySurvivalCost,
        monthly_survival_expense: monthlySurvivalCost,
        targetAmount: nextTarget,
        target_amount: nextTarget,
        target: nextTarget,
        targetMonths,
        target_months: targetMonths,
        months_target: targetMonths,
        linkedWalletId: selectedWallet.id,
        linked_wallet_id: selectedWallet.id,
        reserveWalletId: selectedWallet.id,
        reserve_wallet_id: selectedWallet.id,
        storageWalletId: selectedWallet.id,
        storage_wallet_id: selectedWallet.id,
        sourceWalletId: selectedWallet.id,
        source_wallet_id: selectedWallet.id,
        linkedWalletName: walletName,
        linked_wallet_name: walletName,
        reserveWalletName: walletName,
        reserve_wallet_name: walletName,
        storageWalletName: walletName,
        storage_wallet_name: walletName,
        sourceWalletName: walletName,
        source_wallet_name: walletName,
        resetAt: null,
        reset_at: null,
        updatedAt: now,
        updated_at: now,
      });
      await finance.refreshData?.();
      setSaved(true);
      appendExchange(
        "Save setup",
        `Done. Your Emergency Fund is set for ${targetMonths} months of protection with a ${fmt(nextTarget)} target. Adding money remains a separate action.`
      );
      setPhase("saved");
    } catch (nextError) {
      console.error("Unable to save Emergency Fund from chat:", nextError);
      setError("CLARA could not save this setup yet. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-emergency-fund-chat="true"
      data-clara-pause-overlay="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,.10),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <ClaraChatHeader
        title="Emergency Fund"
        tagline="Protect · Prepare · Build security"
        onClose={onClose}
        closeDisabled={saving}
      />

      <main
        ref={viewportRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-clara-ai-message-viewport="true"
      >
        <div className="flex min-h-full flex-col gap-3" data-clara-ai-message-stack="true">
          {messages.map((message, index) => (
            <Bubble
              key={`${message.role}-${index}-${message.text}`}
              role={message.role}
              elementRef={index === latestAssistantIndex ? latestAssistantRef : null}
            >
              {message.text}
            </Bubble>
          ))}

          <div ref={actionRef} data-clara-conversation-action-region="true" className="contents">
            {phase === "monthly" ? (
              <div className="mt-auto pt-3">
                <Composer
                  value={monthlyInput}
                  onChange={(value) => {
                    setMonthlyInput(String(value).replace(/[^0-9.]/g, ""));
                    setError("");
                  }}
                  onSubmit={submitMonthly}
                  placeholder="₱ monthly essentials"
                  inputMode="decimal"
                />
              </div>
            ) : null}

            {phase === "wallet" ? (
              <div className="flex flex-col gap-2 pt-1">
                {safeWallets.length ? (
                  safeWallets.map((wallet) => (
                    <ReplyButton key={wallet.id} onClick={() => chooseWallet(wallet)}>
                      <span className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-blue-300/15 bg-blue-400/[.07] text-[#FFD84A]">
                          <WalletCards className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{wallet.name}</span>
                          <span className="mt-0.5 block text-[10px] font-semibold text-blue-100/45">
                            Available: {fmt(wallet.spendable)}
                          </span>
                        </span>
                      </span>
                    </ReplyButton>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-blue-300/12 bg-[#07172f]/85 p-3.5">
                    <p className="text-[12px] font-bold text-white/78">You need a wallet before CLARA can protect an Emergency Fund.</p>
                    <button
                      type="button"
                      onClick={createWallet}
                      className="mt-3 w-full rounded-[16px] border border-blue-300/28 bg-[linear-gradient(100deg,#0C4EAE,#0867FF_58%,#126EDB)] px-4 py-3 text-sm font-black text-white"
                    >
                      Create wallet now
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {phase === "months" ? (
              <div className="flex flex-col gap-2 pt-1">
                {TARGET_OPTIONS.map((option) => (
                  <ReplyButton key={option.months} onClick={() => chooseMonths(option)}>
                    <span className="flex items-center justify-between gap-3">
                      <span>{option.label}</span>
                      <span className="text-[#FFD84A]">{option.months} months</span>
                    </span>
                  </ReplyButton>
                ))}
              </div>
            ) : null}

            {phase === "review" ? (
              <div className="mt-1 rounded-[22px] border border-blue-300/12 bg-[#06162f]/88 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,.20)]">
                <div className="mb-3 flex items-center gap-2 text-white/90">
                  <Shield className="h-4 w-4 text-[#FFD84A]" />
                  <span className="text-[12px] font-black">Setup summary</span>
                </div>
                <div className="space-y-2">
                  <SummaryRow label="Monthly survival cost" value={fmt(monthlySurvivalCost)} />
                  <SummaryRow label="Storage wallet" value={selectedWallet?.name || "Not selected"} />
                  <SummaryRow label="Protection goal" value={`${targetMonths} months`} />
                  <SummaryRow label="Target amount" value={fmt(targetAmount)} accent />
                </div>
                <button
                  type="button"
                  onClick={saveSetup}
                  disabled={saving}
                  className="mt-3.5 w-full rounded-[17px] border border-[#FFD84A]/24 bg-[linear-gradient(135deg,rgba(8,103,255,.78),rgba(12,78,174,.86))] px-4 py-3 text-[13px] font-black text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Emergency Fund setup"}
                </button>
              </div>
            ) : null}

            {phase === "saved" && saved ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <div className="rounded-[20px] border border-cyan-200/14 bg-cyan-200/[.045] p-4 text-center">
                  <Shield className="mx-auto h-6 w-6 text-[#8ffff8]" />
                  <p className="mt-2 text-[13px] font-black text-white">Emergency Fund ready</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-white/48">
                    {targetMonths} months · {fmt(targetAmount)} target · {selectedWallet?.name}
                  </p>
                </div>
                <ReplyButton onClick={onClose} className="text-center">
                  Done
                </ReplyButton>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-[16px] border border-red-300/15 bg-red-500/[.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
