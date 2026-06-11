import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, X } from "lucide-react";
import {
  getWalletProvider,
  WALLET_PROVIDERS,
} from "@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry";

const POPULAR_PROVIDER_KEYS = ["custom", "gcash", "maya_wallet", "cash", "bdo"];
const OTHER_PROVIDER_GROUP_KEY = "other_banks_and_wallets";
const STEPS = {
  choose_wallet: ["Where will your money live?", "Choose the wallet, bank, or money container you want to track."],
  custom_name: ["Name your custom wallet", "Give this wallet a name you’ll recognize later."],
  money_setup: ["Does this wallet already have money?", "Connect it to Income Hub, enter a starting balance, or skip for now."],
  review: ["Review wallet", "Make sure everything looks right before saving."],
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fallbackMoney = (value) =>
  `₱${toNumber(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ProviderAvatar({ provider, small = false }) {
  return (
    <span
      className={`${small ? "h-9 w-9 text-[10px]" : "h-12 w-12 text-[11px]"} flex shrink-0 items-center justify-center rounded-full border border-white/12 font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]`}
      style={{ background: provider?.iconBg || "#334155", color: provider?.iconTextColor || "#fff" }}
    >
      {provider?.iconText || "₱"}
    </span>
  );
}

function ProviderButton({ provider, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 items-center gap-3 rounded-[22px] border p-3 text-left transition active:scale-[0.985] ${selected ? "border-emerald-300/55 bg-emerald-400/14" : "border-white/[0.09] bg-white/[0.04] hover:bg-white/[0.065]"}`}
    >
      <ProviderAvatar provider={provider} small />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white/92">{provider.label}</p>
        <p className="truncate text-[10px] font-semibold text-white/42">{provider.categoryLabel || provider.walletType}</p>
      </div>
      {selected ? <Check className="h-5 w-5 shrink-0 text-emerald-300" /> : null}
    </button>
  );
}

export default function GuidedWalletCreationModal({
  open,
  onClose,
  onSave,
  loading = false,
  financeForm = {},
  setFinanceForm,
  incomeSources = [],
  incomeSourcesLoading = false,
  formatMoney = fallbackMoney,
  getIncomeSourceBalance = () => 0,
}) {
  const [step, setStep] = useState("choose_wallet");
  const [activeGroupKey, setActiveGroupKey] = useState("");
  const [search, setSearch] = useState("");
  const [moneyMode, setMoneyMode] = useState(financeForm.startingBalanceMode || "skip");

  useEffect(() => {
    if (!open) return;
    setStep("choose_wallet");
    setActiveGroupKey("");
    setSearch("");
    setMoneyMode(financeForm.startingBalanceMode || "skip");
  }, [open]);

  const selectedProvider = useMemo(() => getWalletProvider(financeForm.type || "cash", financeForm.type || "cash"), [financeForm.type]);
  const selectedIncomeSource = useMemo(
    () => incomeSources.find((source) => String(source.id) === String(financeForm.incomeSourceId || "")) || null,
    [financeForm.incomeSourceId, incomeSources]
  );
  const popularProviders = useMemo(() => POPULAR_PROVIDER_KEYS.map((key) => WALLET_PROVIDERS.find((provider) => provider.key === key)).filter(Boolean), []);
  const otherProviders = useMemo(
    () => WALLET_PROVIDERS.filter((provider) => !POPULAR_PROVIDER_KEYS.includes(provider.key)).sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""))),
    []
  );
  const filteredProviders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return WALLET_PROVIDERS.filter((provider) =>
      [provider.label, provider.defaultWalletName, provider.categoryLabel, provider.walletType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    ).slice(0, 8);
  }, [search]);

  if (!open) return null;

  const updateForm = (patch) => setFinanceForm?.((prev) => ({ ...prev, ...patch }));
  const amount = String(financeForm.amount ?? financeForm.startingBalance ?? "0");
  const amountNumber = toNumber(amount);
  const walletName = String(financeForm.name || "").trim();
  const isCustom = selectedProvider?.key === "custom" || financeForm.type === "custom";
  const totalSteps = isCustom ? 4 : 3;
  const stepIndex = isCustom
    ? { choose_wallet: 1, custom_name: 2, money_setup: 3, review: 4 }[step] || 1
    : { choose_wallet: 1, money_setup: 2, review: 3 }[step] || 1;
  const activeGroup = activeGroupKey === OTHER_PROVIDER_GROUP_KEY ? {
    key: OTHER_PROVIDER_GROUP_KEY,
    label: "Other Banks / Wallets",
    description: "All remaining banks, e-wallets, and money containers.",
    providers: otherProviders,
  } : null;
  const [title, subtitle] = STEPS[step] || STEPS.choose_wallet;

  const selectProvider = (provider) => {
    const custom = provider.key === "custom";
    updateForm({
      type: provider.key,
      customWalletType: custom ? "custom" : "",
      name: custom ? "" : provider.defaultWalletName || provider.label || "Wallet",
      amount: "0",
      startingBalance: "0",
      startingBalanceMode: "skip",
    });
    setMoneyMode("skip");
    setSearch("");
    setActiveGroupKey("");
    setStep(custom ? "custom_name" : "money_setup");
  };

  const setMode = (mode) => {
    setMoneyMode(mode);
    updateForm({
      startingBalanceMode: mode,
      amount: mode === "skip" ? "0" : financeForm.amount || "",
      startingBalance: mode === "skip" ? "0" : financeForm.startingBalance || financeForm.amount || "",
    });
  };

  const updateAmount = (nextAmount) => updateForm({ amount: nextAmount, startingBalance: nextAmount });
  const goBack = () => {
    if (step === "custom_name") setStep("choose_wallet");
    if (step === "money_setup") setStep(isCustom ? "custom_name" : "choose_wallet");
    if (step === "review") setStep("money_setup");
  };

  const canMoneyContinue =
    moneyMode === "skip" ||
    (moneyMode === "manual_balance" && amount !== "" && Number.isFinite(amountNumber) && amountNumber >= 0) ||
    (moneyMode === "income_hub" && incomeSources.length > 0 && Boolean(financeForm.incomeSourceId) && amountNumber > 0);
  const disabled =
    loading ||
    incomeSourcesLoading ||
    (step === "custom_name" && !walletName) ||
    (step === "money_setup" && !canMoneyContinue) ||
    (step === "review" && (!walletName || !canMoneyContinue));
  const startingMoneyText = moneyMode === "income_hub"
    ? `${formatMoney(amountNumber)} from ${selectedIncomeSource?.name || "Income Hub"}`
    : moneyMode === "manual_balance"
      ? formatMoney(amountNumber)
      : "₱0 starting balance";

  const primary = () => {
    if (step === "custom_name") return walletName ? setStep("money_setup") : null;
    if (step === "money_setup") return canMoneyContinue ? setStep("review") : null;
    if (step === "review") return onSave?.();
  };

  return (
    <div className="fixed inset-0 z-[120] flex min-h-[100svh] items-start justify-center overflow-hidden bg-slate-950/75 px-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0 backdrop-blur-[16px]">
      <div className="relative z-[200] flex max-h-[calc(100svh-1rem)] w-full max-w-[430px] overflow-hidden rounded-[38px] border border-cyan-100/[0.16] bg-[linear-gradient(140deg,rgba(5,28,48,0.99),rgba(7,16,44,0.995)_48%,rgba(34,15,73,0.995))] text-white shadow-[0_32px_100px_rgba(0,0,0,0.68)]">
        <div className="flex max-h-[calc(100svh-1rem)] min-h-0 w-full flex-col overflow-hidden">
          <div className="shrink-0 border-b border-white/[0.07] bg-white/[0.035] px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full border border-emerald-200/18 bg-emerald-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/78">Step {stepIndex} of {totalSteps}</span>
                  <div className="flex gap-1">{Array.from({ length: totalSteps }).map((_, index) => <span key={index} className={`h-1.5 w-5 rounded-full ${index + 1 <= stepIndex ? "bg-emerald-300" : "bg-white/14"}`} />)}</div>
                </div>
                <h3 className="max-w-[310px] text-[30px] font-black leading-[0.98] tracking-[-0.055em]">{title}</h3>
                <p className="mt-3 max-w-[305px] text-[13px] font-semibold leading-5 text-cyan-50/64">{subtitle}</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-white/15 bg-white/[0.07] p-3 text-white/72" aria-label="Close modal"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-5 py-4">
            {step === "choose_wallet" ? (
              <div className="space-y-3">
                <input value={search} onChange={(event) => { setSearch(event.target.value); setActiveGroupKey(""); }} placeholder="Search wallet, bank, or e-wallet" className="min-h-[48px] w-full rounded-[22px] border border-white/[0.12] bg-white/[0.055] px-4 text-sm font-semibold outline-none placeholder:text-white/34" />
                {search.trim() ? (
                  <div className="grid gap-2">{filteredProviders.length ? filteredProviders.map((provider) => <ProviderButton key={provider.key} provider={provider} selected={selectedProvider.key === provider.key} onClick={() => selectProvider(provider)} />) : <p className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-white/55">No match. Try Custom Wallet.</p>}</div>
                ) : activeGroup ? (
                  <div className="space-y-3">
                    <button type="button" onClick={() => setActiveGroupKey("")} className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/68">← Popular</button>
                    <div className="rounded-[24px] border border-white/[0.09] bg-white/[0.035] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em]">{activeGroup.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-white/46">Alphabetical list. Swipe sideways to choose one.</p>
                      <div className="mt-3 flex snap-x gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {activeGroup.providers.map((provider) => <div key={provider.key} className="w-[205px] shrink-0 snap-start"><ProviderButton provider={provider} selected={selectedProvider.key === provider.key} onClick={() => selectProvider(provider)} /></div>)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">Popular</p>
                    <div className="grid gap-2">{popularProviders.map((provider) => <ProviderButton key={provider.key} provider={provider} selected={selectedProvider.key === provider.key} onClick={() => selectProvider(provider)} />)}</div>
                    <div className="grid gap-2 pt-1">
                      <button type="button" onClick={() => setActiveGroupKey(OTHER_PROVIDER_GROUP_KEY)} className="flex items-center justify-between gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-left">
                        <div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-[0.15em]">Other Banks / Wallets</p><p className="truncate text-[10px] font-semibold text-white/42">Alphabetical list of other banks and money apps.</p></div>
                        <div className="flex shrink-0 items-center gap-2"><span className="rounded-full border border-white/14 bg-white/[0.045] px-2.5 py-1 text-[10px] font-bold text-white/68">{otherProviders.length}</span><ChevronRight className="h-4 w-4 text-white/48" /></div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {step === "custom_name" ? (
              <div className="space-y-4">
                <div className="rounded-[26px] border border-emerald-300/20 bg-emerald-400/[0.08] p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/70">Selected</p><div className="mt-3 flex items-center gap-3"><ProviderAvatar provider={selectedProvider} /><div><p className="text-lg font-black">Custom Wallet</p><p className="text-xs font-semibold text-white/48">Other Wallets</p></div></div></div>
                <label className="block"><span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-white/58">Wallet name</span><input value={financeForm.name || ""} onChange={(event) => updateForm({ name: event.target.value })} placeholder="e.g. Cash Box, Payroll, Emergency Wallet" className="min-h-[58px] w-full rounded-[24px] border border-white/[0.12] bg-white/[0.055] px-4 text-base font-semibold outline-none placeholder:text-white/34" /><span className="mt-2 block text-[11px] font-semibold text-white/48">Example: Cash Box, Payroll, Emergency Wallet, Partner Wallet</span></label>
              </div>
            ) : null}

            {step === "money_setup" ? (
              <div className="space-y-3">
                <div className="rounded-[26px] border border-white/[0.10] bg-white/[0.04] p-3"><div className="flex items-center gap-3"><ProviderAvatar provider={selectedProvider} small /><div className="min-w-0"><p className="truncate text-base font-black">{walletName || selectedProvider.defaultWalletName || selectedProvider.label}</p><p className="text-[11px] font-semibold text-white/46">{selectedProvider.categoryLabel || "Wallet"}</p></div></div></div>
                {[["income_hub", "Add from Income Hub", "Use money from your recorded income."], ["manual_balance", "Set starting balance", "Enter the current money inside this wallet."], ["skip", "Skip for now", "Create this wallet with ₱0 balance."]].map(([mode, label, description]) => <button key={mode} type="button" onClick={() => setMode(mode)} className={`w-full rounded-[22px] border p-3 text-left ${moneyMode === mode ? "border-emerald-300/50 bg-emerald-400/[0.12]" : "border-white/[0.09] bg-white/[0.035]"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{label}</p><p className="mt-1 text-[11px] font-semibold leading-4 text-white/48">{description}</p></div>{moneyMode === mode ? <Check className="h-5 w-5 shrink-0 text-emerald-300" /> : null}</div></button>)}
                {moneyMode === "income_hub" ? <div className="grid gap-2 rounded-[22px] border border-cyan-300/14 bg-cyan-400/[0.06] p-3"><select value={financeForm.incomeSourceId || ""} disabled={!incomeSources.length || incomeSourcesLoading || loading} onChange={(event) => updateForm({ incomeSourceId: event.target.value })} className="min-h-[46px] w-full rounded-[18px] border border-white/[0.12] bg-[#08152f] px-3 text-sm font-semibold outline-none">{incomeSources.length ? incomeSources.map((source) => <option key={source.id} value={String(source.id)}>{source.name} • {formatMoney(getIncomeSourceBalance(source))}</option>) : <option value="">No income sources yet</option>}</select><input type="number" min="0" step="0.01" value={amount} onChange={(event) => updateAmount(event.target.value)} placeholder="Amount from Income Hub" className="min-h-[46px] w-full rounded-[18px] border border-white/[0.12] bg-white/[0.055] px-3 text-sm font-semibold outline-none placeholder:text-white/34" /></div> : null}
                {moneyMode === "manual_balance" ? <div className="rounded-[22px] border border-white/[0.09] bg-white/[0.035] p-3"><input type="number" min="0" step="0.01" value={amount} onChange={(event) => updateAmount(event.target.value)} placeholder="Starting balance" className="min-h-[50px] w-full rounded-[18px] border border-white/[0.12] bg-white/[0.055] px-3 text-sm font-semibold outline-none placeholder:text-white/34" /></div> : null}
              </div>
            ) : null}

            {step === "review" ? <div className="space-y-3"><div className="rounded-[28px] border border-emerald-300/22 bg-emerald-400/[0.10] p-4"><div className="flex items-center gap-3"><ProviderAvatar provider={selectedProvider} /><div className="min-w-0"><p className="truncate text-xl font-black">{walletName}</p><p className="text-xs font-semibold text-white/50">Ready to add to your Money Map</p></div></div></div>{[["Wallet name", walletName, () => setStep(isCustom ? "custom_name" : "choose_wallet")], ["Wallet type", selectedProvider.categoryLabel || selectedProvider.walletType || "Wallet", () => setStep("choose_wallet")], ["Starting money", startingMoneyText, () => setStep("money_setup")]].map(([label, value, edit]) => <div key={label} className="flex items-center justify-between gap-3 rounded-[22px] border border-white/[0.09] bg-white/[0.04] p-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{label}</p><p className="mt-1 truncate text-sm font-black text-white/88">{value}</p></div><button type="button" onClick={edit} className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/72">Edit</button></div>)}</div> : null}
          </div>

          <div className="shrink-0 border-t border-white/[0.06] bg-[#050c1c]/80 px-5 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl">
            {step === "choose_wallet" ? <p className="text-center text-[11px] font-semibold text-white/46">Choose a wallet identity to continue.</p> : <div className="grid grid-cols-[0.8fr_1.2fr] gap-3"><button type="button" onClick={goBack} className="rounded-[22px] border border-white/12 bg-white/[0.055] px-4 py-4 text-sm font-black text-white/72">Back</button><button type="button" onClick={primary} disabled={disabled} className="rounded-[22px] bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-600 px-4 py-4 text-sm font-black text-white shadow-[0_18px_48px_rgba(16,185,129,0.26)] disabled:cursor-not-allowed disabled:border disabled:border-white/15 disabled:bg-none disabled:bg-white/[0.09] disabled:text-white/55 disabled:shadow-none">{step === "review" ? (loading ? "Saving..." : "Save Wallet") : "Continue →"}</button></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
