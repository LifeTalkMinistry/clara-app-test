import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Loader2, X } from "lucide-react";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import {
  deleteDebtObligation,
  getDebtBalance,
  getDebtDueDay,
  getDebtInterestRate,
  getDebtObligations,
  getDebtObligationMode,
  getDebtTitle,
  getMonthlyDebtPayment,
  summarizeDebtObligations,
  toDebtNumber,
  upsertDebtObligation,
} from "@/lib/debtObligationStore";
import { DEBT_TYPES } from "@/components/financial-carousel/cards/debt/logic/useDebtCardLogic";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanMoney(value = "") {
  return String(value || "").replace(/[^0-9.]/g, "");
}

function fmt(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

function ChoiceButton({
  children,
  onClick,
  secondary = false,
  danger = false,
  disabled = false,
  centered = false,
}) {
  const tone = danger
    ? "border-rose-300/18 bg-rose-500/[0.07] text-rose-100"
    : secondary
      ? "border-blue-100/12 bg-white/[0.035] text-slate-200"
      : "border-cyan-200/18 bg-[linear-gradient(135deg,rgba(23,105,255,0.22),rgba(43,225,216,0.10))] text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative z-10 min-h-12 w-full touch-manipulation rounded-[17px] border px-4 py-3 text-[12.5px] font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${
        centered ? "text-center" : "text-left"
      } ${tone}`}
    >
      {children}
    </button>
  );
}

function Composer({ value, onChange, onSubmit, placeholder, inputMode = "text", disabled = false }) {
  return (
    <form
      data-clara-buy-check-react-form="true"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onSubmit?.();
      }}
      className="relative z-10 flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,0.28)]"
    >
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/62 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !clean(value)}
        className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-full bg-[#1769ff] text-white shadow-[0_8px_22px_rgba(23,105,255,0.34)] transition active:scale-95 disabled:opacity-40"
        aria-label="Send"
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
      </button>
    </form>
  );
}

const freshDraft = () => ({
  id: "",
  title: "",
  debtType: "installment",
  obligationMode: "balance",
  totalDebt: "",
  monthlyDebt: "",
  interestRate: "",
  dueDay: "",
});

function draftFromRecord(record = {}) {
  return {
    id: record.id || "",
    title: getDebtTitle(record),
    debtType: record.debtType || record.type || "installment",
    obligationMode: getDebtObligationMode(record),
    totalDebt: String(getDebtBalance(record) || ""),
    monthlyDebt: String(getMonthlyDebtPayment(record) || ""),
    interestRate: String(getDebtInterestRate(record) || ""),
    dueDay: String(getDebtDueDay(record) || ""),
  };
}

function summaryText(record = {}) {
  const mode = getDebtObligationMode(record);
  const parts = [getDebtTitle(record)];
  if (mode === "balance") parts.push(`${fmt(getDebtBalance(record))} remaining`);
  parts.push(`${fmt(getMonthlyDebtPayment(record))}/month`);
  const dueDay = getDebtDueDay(record);
  if (dueDay) parts.push(`due day ${dueDay}`);
  return parts.join(" • ");
}

export default function ClaraDebtObligationOverlay({
  isActive = true,
  claraAssistantContext = {},
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const localUserId = getEffectiveDemoFinanceLocalUserId(
    String(user?.id || user?.email || "local-user")
  );
  const viewportRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [phase, setPhase] = useState("home");
  const [messages, setMessages] = useState(() => [
    { role: "assistant", text: `Debt / Obligations is open, ${firstName}. What would you like to do?` },
  ]);
  const [draft, setDraft] = useState(freshDraft);
  const [input, setInput] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedRecord = useMemo(
    () => records.find((record) => String(record.id) === String(selectedId)) || null,
    [records, selectedId]
  );

  const pressure = useMemo(
    () => summarizeDebtObligations(records, {
      income: Number(claraAssistantContext?.totalIncome) || 0,
    }),
    [records, claraAssistantContext?.totalIncome]
  );

  const pressureText = records.length
    ? `You have ${pressure.activeCount} active obligation${pressure.activeCount === 1 ? "" : "s"}. Total remaining balance: ${fmt(pressure.totalDebt)}. Monthly obligation: ${fmt(pressure.monthlyDebt)}. Current debt pressure: ${pressure.debtRatio.toFixed(0)}% (${pressure.riskLevel}).`
    : "You currently have no active debt or obligations recorded.";

  const reload = async () => {
    setLoading(true);
    try {
      const next = await getDebtObligations(localUserId);
      setRecords(Array.isArray(next) ? next : []);
      setError("");
      return Array.isArray(next) ? next : [];
    } catch (err) {
      setError(err?.message || "Unable to load your obligations.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    setPhase("home");
    setMessages([
      { role: "assistant", text: `Debt / Obligations is open, ${firstName}. What would you like to do?` },
    ]);
    setDraft(freshDraft());
    setInput("");
    setSelectedId("");
    setBusy(false);
    setError("");
  };

  useEffect(() => {
    if (!isActive) return undefined;
    resetConversation();
    void reload();
    return undefined;
  }, [isActive, localUserId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, phase, error, records.length]);

  const say = (userText, assistantText) => {
    setMessages((current) => [
      ...current,
      ...(userText ? [{ role: "user", text: userText }] : []),
      ...(assistantText ? [{ role: "assistant", text: assistantText }] : []),
    ]);
  };

  const backHome = (label = "Back") => {
    setDraft(freshDraft());
    setInput("");
    setSelectedId("");
    setError("");
    say(label, "What would you like to do with Debt / Obligations?");
    setPhase("home");
  };

  const openView = () => {
    setError("");
    say(
      "View obligations",
      records.length
        ? "Here are the active obligations I have recorded for you."
        : "You do not have any active obligations recorded yet."
    );
    setPhase("view");
  };

  const openManage = () => {
    if (!records.length) return;
    setError("");
    say("Edit or delete an obligation", "Choose the obligation you want to manage.");
    setPhase("manage");
  };

  const openPressure = () => {
    setError("");
    say("Review debt pressure", pressureText);
    setPhase("pressure");
  };

  const selectManagedRecord = (record) => {
    setSelectedId(String(record.id));
    setError("");
    say(getDebtTitle(record), `What would you like to do with ${getDebtTitle(record)}?`);
    setPhase("manage-action");
  };

  const beginAdd = () => {
    setDraft(freshDraft());
    setSelectedId("");
    setInput("");
    setError("");
    say("Add an obligation", "What should we call this debt or obligation?");
    setPhase("name");
  };

  const beginEdit = (record) => {
    setDraft(draftFromRecord(record));
    setInput(getDebtTitle(record));
    setError("");
    say("Edit this obligation", `Let’s update ${getDebtTitle(record)}. What should its name be?`);
    setPhase("name");
  };

  const askDelete = () => {
    if (!selectedRecord) return;
    say(
      "Delete this obligation",
      `Delete ${getDebtTitle(selectedRecord)}? This removes it from your active Debt / Obligations records.`
    );
    setPhase("delete-confirm");
  };

  const backToManage = (label = "Back") => {
    setError("");
    say(label, "Choose the obligation you want to manage.");
    setPhase("manage");
  };

  const backToManageAction = (label = "Back") => {
    if (!selectedRecord) {
      backToManage(label);
      return;
    }
    setError("");
    say(label, `What would you like to do with ${getDebtTitle(selectedRecord)}?`);
    setPhase("manage-action");
  };

  const backFromName = () => {
    setError("");
    setInput("");
    if (draft.id && selectedRecord) {
      say("Back", `What would you like to do with ${getDebtTitle(selectedRecord)}?`);
      setPhase("manage-action");
      return;
    }
    backHome();
  };

  const backToName = () => {
    setInput(draft.title || "");
    setError("");
    say("Back", draft.id ? `What should ${draft.title || "this obligation"} be called?` : "What should we call this debt or obligation?");
    setPhase("name");
  };

  const backToType = () => {
    setInput("");
    setError("");
    say("Back", "What type of obligation is this?");
    setPhase("type");
  };

  const backToMode = () => {
    setInput("");
    setError("");
    say("Back", "Is this a balance you are paying off, or an ongoing monthly obligation?");
    setPhase("mode");
  };

  const backToBalance = () => {
    setInput(draft.totalDebt || "");
    setError("");
    say("Back", "How much is the remaining balance?");
    setPhase("balance");
  };

  const backToMonthly = () => {
    setInput(draft.monthlyDebt || "");
    setError("");
    say("Back", "How much do you pay each month?");
    setPhase("monthly");
  };

  const backToInterest = () => {
    setInput(draft.interestRate || "");
    setError("");
    say("Back", "What is the annual interest rate? Enter 0 if there is none.");
    setPhase("interest");
  };

  const backToDue = () => {
    setInput(draft.dueDay || "");
    setError("");
    say("Back", "What day of the month is it due? You can skip this.");
    setPhase("due");
  };

  const submitName = () => {
    const title = clean(input);
    if (!title) return;
    setDraft((current) => ({ ...current, title }));
    setInput("");
    setError("");
    say(title, "What type of obligation is this?");
    setPhase("type");
  };

  const chooseType = (value) => {
    const label = DEBT_TYPES.find((item) => item.value === value)?.label || "Other";
    setDraft((current) => ({ ...current, debtType: value }));
    setError("");
    say(label, "Is this a balance you are paying off, or an ongoing monthly obligation?");
    setPhase("mode");
  };

  const chooseMode = (mode) => {
    setDraft((current) => ({ ...current, obligationMode: mode }));
    setError("");
    if (mode === "recurring") {
      setInput(draft.monthlyDebt || "");
      say("Ongoing monthly obligation", "How much is the monthly payment?");
      setPhase("monthly");
      return;
    }
    setInput(draft.totalDebt || "");
    say("Balance to pay off", "How much is the remaining balance?");
    setPhase("balance");
  };

  const submitBalance = () => {
    const value = toDebtNumber(input);
    if (value <= 0) return setError("Enter a remaining balance greater than zero.");
    setDraft((current) => ({ ...current, totalDebt: String(value) }));
    setInput(draft.monthlyDebt || "");
    setError("");
    say(fmt(value), "How much do you pay each month?");
    setPhase("monthly");
  };

  const submitMonthly = () => {
    const value = toDebtNumber(input);
    if (value <= 0) return setError("Enter a monthly payment greater than zero.");
    setDraft((current) => ({ ...current, monthlyDebt: String(value) }));
    setInput(draft.obligationMode === "balance" ? draft.interestRate || "" : "");
    setError("");
    if (draft.obligationMode === "balance") {
      say(fmt(value), "What is the annual interest rate? Enter 0 if there is none.");
      setPhase("interest");
    } else {
      say(fmt(value), "What day of the month is it due? You can skip this.");
      setPhase("due");
    }
  };

  const submitInterest = () => {
    const value = Math.max(0, toDebtNumber(input));
    setDraft((current) => ({ ...current, interestRate: String(value) }));
    setInput(draft.dueDay || "");
    setError("");
    say(`${value}%`, "What day of the month is it due? You can skip this.");
    setPhase("due");
  };

  const finishDue = (skip = false) => {
    let dueDay = null;
    if (!skip && clean(input)) {
      const parsed = Number(input);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
        setError("Due day must be from 1 to 31.");
        return;
      }
      dueDay = parsed;
    }
    setDraft((current) => ({ ...current, dueDay: dueDay ? String(dueDay) : "" }));
    setInput("");
    setError("");
    say(skip || !dueDay ? "Skip due day" : `Day ${dueDay}`, "Review this obligation before I save it.");
    setPhase("review");
  };

  const save = async () => {
    const payload = {
      id: draft.id || undefined,
      title: draft.title,
      debtType: draft.debtType,
      obligationMode: draft.obligationMode,
      totalDebt: draft.obligationMode === "recurring" ? 0 : toDebtNumber(draft.totalDebt),
      monthlyDebt: toDebtNumber(draft.monthlyDebt),
      interestRate: draft.obligationMode === "recurring" ? 0 : toDebtNumber(draft.interestRate),
      dueDay: draft.dueDay ? Number(draft.dueDay) : null,
      dueDate: "",
      status: "active",
    };
    setBusy(true);
    setError("");
    try {
      await upsertDebtObligation(localUserId, payload);
      const next = await reload();
      const savedRecord = next.find((record) => String(record.id) === String(payload.id || "")) || next[0];
      say("Save", `${payload.title} is saved. ${savedRecord ? summaryText(savedRecord) : ""}`.trim());
      setDraft(freshDraft());
      setInput("");
      setSelectedId("");
      setPhase("home");
    } catch (err) {
      setError(err?.message || "Unable to save this obligation.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selectedRecord?.id) return;
    setBusy(true);
    setError("");
    try {
      const title = getDebtTitle(selectedRecord);
      await deleteDebtObligation(localUserId, selectedRecord.id);
      await reload();
      say("Delete", `${title} was removed. What would you like to do with Debt / Obligations?`);
      setDraft(freshDraft());
      setInput("");
      setSelectedId("");
      setPhase("home");
    } catch (err) {
      setError(err?.message || "Unable to delete this obligation.");
    } finally {
      setBusy(false);
    }
  };

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 z-[400] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-layout-variant="debt-obligation"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-debt-obligation-chat="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 min-h-16 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_56%,rgba(7,31,38,0.96))] px-14 shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
        <h1 className="absolute inset-0 flex items-center justify-center px-16 text-center text-[17px] font-black tracking-[-0.025em] text-white">
          Debt / Obligations
        </h1>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute right-3 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 touch-manipulation place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 transition active:scale-95 disabled:opacity-50"
          aria-label="Close Debt / Obligations"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <main
        ref={viewportRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-clara-ai-message-viewport="true"
      >
        <div className="flex min-h-full flex-col gap-3" data-clara-ai-message-stack="true">
          {messages.map((message, index) => (
            <Bubble key={`${message.role}-${index}-${message.text}`} role={message.role}>
              {message.text}
            </Bubble>
          ))}

          {loading ? <Bubble>Loading your obligations…</Bubble> : null}

          {!loading && phase === "home" ? (
            <div className="mt-1 grid gap-2.5">
              <ChoiceButton onClick={beginAdd}>Add an obligation</ChoiceButton>
              <ChoiceButton onClick={openView}>View obligations</ChoiceButton>
              <ChoiceButton onClick={openManage} disabled={!records.length}>Edit or delete an obligation</ChoiceButton>
              <ChoiceButton onClick={openPressure}>Review debt pressure</ChoiceButton>
              <ChoiceButton onClick={onClose} secondary>Done</ChoiceButton>
            </div>
          ) : null}

          {phase === "view" ? (
            <div className="mt-1 grid gap-2.5">
              {records.map((record) => (
                <div key={record.id} className="rounded-[21px] border border-blue-200/12 bg-[#07142b]/88 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                  <p className="text-[12.5px] font-black leading-5 text-white/92">{getDebtTitle(record)}</p>
                  <p className="mt-1 text-[10.5px] font-semibold leading-5 text-white/48">{summaryText(record)}</p>
                </div>
              ))}
              <ChoiceButton secondary onClick={() => backHome("Back")}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "manage" ? (
            <div className="mt-1 grid gap-2.5">
              {records.map((record) => (
                <ChoiceButton key={record.id} onClick={() => selectManagedRecord(record)}>
                  <span className="block">{getDebtTitle(record)}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-white/48">{summaryText(record)}</span>
                </ChoiceButton>
              ))}
              <ChoiceButton secondary onClick={() => backHome()}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "manage-action" && selectedRecord ? (
            <div className="mt-1 grid gap-2.5">
              <div className="rounded-[21px] border border-blue-200/12 bg-[#07142b]/88 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                <p className="text-[12.5px] font-black leading-5 text-white/92">{getDebtTitle(selectedRecord)}</p>
                <p className="mt-1 text-[10.5px] font-semibold leading-5 text-white/48">{summaryText(selectedRecord)}</p>
              </div>
              <ChoiceButton onClick={() => beginEdit(selectedRecord)}>Edit this obligation</ChoiceButton>
              <ChoiceButton danger onClick={askDelete}>Delete this obligation</ChoiceButton>
              <ChoiceButton secondary onClick={() => backToManage()}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "delete-confirm" && selectedRecord ? (
            <div className="mt-1 grid gap-2.5">
              <ChoiceButton danger disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Yes, delete it"}</ChoiceButton>
              <ChoiceButton secondary disabled={busy} onClick={() => backToManageAction("Cancel")}>Cancel</ChoiceButton>
            </div>
          ) : null}

          {phase === "pressure" ? (
            <div className="mt-1 grid gap-2.5">
              <ChoiceButton secondary onClick={() => backHome("Back")}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "name" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer value={input} onChange={(value) => { setInput(value); setError(""); }} onSubmit={submitName} placeholder="Name or lender" disabled={busy} />
              <ChoiceButton secondary disabled={busy} onClick={backFromName}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "type" ? (
            <div className="mt-1 grid grid-cols-2 gap-2.5">
              {DEBT_TYPES.map((item) => <ChoiceButton key={item.value} onClick={() => chooseType(item.value)}>{item.label}</ChoiceButton>)}
              <div className="col-span-2"><ChoiceButton secondary onClick={backToName}>Back</ChoiceButton></div>
            </div>
          ) : null}

          {phase === "mode" ? (
            <div className="mt-1 grid gap-2.5">
              <ChoiceButton onClick={() => chooseMode("balance")}>Balance I’m paying off</ChoiceButton>
              <ChoiceButton onClick={() => chooseMode("recurring")}>Ongoing monthly obligation</ChoiceButton>
              <ChoiceButton secondary onClick={backToType}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "balance" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer value={input} onChange={(value) => { setInput(cleanMoney(value)); setError(""); }} onSubmit={submitBalance} placeholder="Remaining balance" inputMode="decimal" disabled={busy} />
              <ChoiceButton secondary disabled={busy} onClick={backToMode}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "monthly" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer value={input} onChange={(value) => { setInput(cleanMoney(value)); setError(""); }} onSubmit={submitMonthly} placeholder="Monthly payment" inputMode="decimal" disabled={busy} />
              <ChoiceButton secondary disabled={busy} onClick={draft.obligationMode === "balance" ? backToBalance : backToMode}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "interest" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer value={input} onChange={(value) => { setInput(cleanMoney(value)); setError(""); }} onSubmit={submitInterest} placeholder="Annual interest %" inputMode="decimal" disabled={busy} />
              <ChoiceButton secondary disabled={busy} onClick={backToMonthly}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "due" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer value={input} onChange={(value) => { setInput(String(value).replace(/[^0-9]/g, "").slice(0, 2)); setError(""); }} onSubmit={() => finishDue(false)} placeholder="Due day (1–31)" inputMode="numeric" disabled={busy} />
              <ChoiceButton secondary disabled={busy} onClick={() => finishDue(true)}>Skip due day</ChoiceButton>
              <ChoiceButton secondary disabled={busy} onClick={draft.obligationMode === "balance" ? backToInterest : backToMonthly}>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "review" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <div className="rounded-[21px] border border-blue-200/12 bg-[#07142b]/88 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                <div className="space-y-2 text-[11.5px] font-semibold leading-5 text-white/82">
                  <div><span className="text-white/42">Name:</span> {draft.title}</div>
                  <div><span className="text-white/42">Type:</span> {DEBT_TYPES.find((item) => item.value === draft.debtType)?.label || draft.debtType}</div>
                  <div><span className="text-white/42">Mode:</span> {draft.obligationMode === "recurring" ? "Ongoing monthly" : "Balance payoff"}</div>
                  {draft.obligationMode === "balance" ? <div><span className="text-white/42">Remaining:</span> {fmt(draft.totalDebt)}</div> : null}
                  <div><span className="text-white/42">Monthly:</span> {fmt(draft.monthlyDebt)}</div>
                  {draft.obligationMode === "balance" ? <div><span className="text-white/42">Interest:</span> {toDebtNumber(draft.interestRate)}%</div> : null}
                  <div><span className="text-white/42">Due day:</span> {draft.dueDay || "Not set"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <ChoiceButton disabled={busy} onClick={save}>{busy ? "Saving…" : draft.id ? "Save changes" : "Save obligation"}</ChoiceButton>
                <ChoiceButton secondary disabled={busy} onClick={backToDue}>Back</ChoiceButton>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-[16px] border border-red-300/15 bg-red-500/[0.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88" aria-live="polite">
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
