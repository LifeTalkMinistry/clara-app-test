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

function Bubble({ role = "assistant", children }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[13px] font-semibold leading-5 shadow-[0_12px_28px_rgba(0,0,0,.2)] ${
          isUser
            ? "rounded-tr-[7px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white"
            : "rounded-tl-[7px] border border-blue-200/12 bg-[#0a1933]/94 text-slate-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ReplyButton({ children, onClick, secondary = false, danger = false, disabled = false }) {
  const tone = danger
    ? "border-rose-300/20 bg-rose-400/[0.08] text-rose-100"
    : secondary
      ? "border-white/10 bg-white/[0.035] text-white/88"
      : "border-blue-300/25 bg-[linear-gradient(135deg,rgba(23,105,255,0.96),rgba(13,79,198,0.96))] text-white shadow-[0_12px_30px_rgba(23,105,255,0.22)]";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative z-20 min-h-12 w-full touch-manipulation rounded-[18px] border px-4 text-left text-[13px] font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${tone}`}
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
      className="relative z-20 flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,0.28)]"
    >
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/55 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !clean(value)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1769ff] text-white disabled:opacity-40"
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
  const localUserId = getEffectiveDemoFinanceLocalUserId(
    String(user?.id || user?.email || "local-user")
  );
  const viewportRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [phase, setPhase] = useState("home");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Debt / Obligations is open. What would you like to do?" },
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

  useEffect(() => {
    if (!isActive) return undefined;
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

  const beginAdd = () => {
    setDraft(freshDraft());
    setInput("");
    setError("");
    say("Add obligation", "What should we call this debt or obligation?");
    setPhase("name");
  };

  const beginEdit = (record) => {
    setDraft(draftFromRecord(record));
    setInput(getDebtTitle(record));
    setError("");
    say("Edit", `Let’s update ${getDebtTitle(record)}. What should its name be?`);
    setPhase("name");
  };

  const submitName = () => {
    const title = clean(input);
    if (!title) return;
    setDraft((current) => ({ ...current, title }));
    setInput("");
    say(title, "What type of obligation is this?");
    setPhase("type");
  };

  const chooseType = (value) => {
    const label = DEBT_TYPES.find((item) => item.value === value)?.label || "Other";
    setDraft((current) => ({ ...current, debtType: value }));
    say(label, "Is this a balance you are paying off, or an ongoing monthly obligation?");
    setPhase("mode");
  };

  const chooseMode = (mode) => {
    setDraft((current) => ({ ...current, obligationMode: mode }));
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
      say("Delete", `${title} was removed.`);
      setSelectedId("");
      setPhase("home");
    } catch (err) {
      setError(err?.message || "Unable to delete this obligation.");
    } finally {
      setBusy(false);
    }
  };

  const pressure = summarizeDebtObligations(records, {
    income: Number(claraAssistantContext?.totalIncome) || 0,
  });

  if (!isActive) return null;

  return (
    <div
      data-clara-debt-obligation-chat="true"
      data-clara-ai-layout-variant="debt-obligation"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      className="fixed inset-0 z-[400] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 min-h-[64px] shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_56%,rgba(7,31,38,0.96))] shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
        <h1 className="absolute inset-0 flex items-center justify-center px-[76px] text-center text-[16px] font-black leading-none tracking-[-0.02em] text-white">Debt / Obligations</h1>
        <button
          type="button"
          onClick={onClose}
          className="absolute inset-y-0 right-[6px] z-30 my-auto grid h-9 w-9 touch-manipulation place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 transition active:scale-95"
          aria-label="Close Debt / Obligations"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <main
        ref={viewportRef}
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div data-clara-ai-message-stack="true" className="flex min-h-full flex-col gap-3">
          {messages.map((message, index) => (
            <Bubble key={`${message.role}-${index}`} role={message.role}>{message.text}</Bubble>
          ))}

          {loading && <Bubble>Loading your obligations…</Bubble>}
          {error && <Bubble>{error}</Bubble>}

          {!loading && phase === "home" && (
            <div className="grid gap-2 pt-1">
              <ReplyButton onClick={beginAdd}>Add a new obligation</ReplyButton>
              <ReplyButton onClick={() => setPhase("view")}>View existing obligations</ReplyButton>
              <ReplyButton onClick={() => setPhase("manage")} disabled={!records.length}>Edit or delete an obligation</ReplyButton>
              <ReplyButton onClick={() => setPhase("pressure")} secondary>Review debt pressure</ReplyButton>
            </div>
          )}

          {phase === "view" && (
            <div className="grid gap-2 pt-1">
              {!records.length ? (
                <Bubble>You do not have any active obligations yet.</Bubble>
              ) : records.map((record) => (
                <div key={record.id} className="rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3 text-[12px] font-semibold text-white/86">
                  {summaryText(record)}
                </div>
              ))}
              <ReplyButton secondary onClick={() => backHome("Done")}>Back</ReplyButton>
            </div>
          )}

          {phase === "manage" && (
            <div className="grid gap-2 pt-1">
              {records.map((record) => (
                <ReplyButton key={record.id} onClick={() => { setSelectedId(record.id); setPhase("manage-action"); }}>
                  {summaryText(record)}
                </ReplyButton>
              ))}
              <ReplyButton secondary onClick={() => backHome()}>Back</ReplyButton>
            </div>
          )}

          {phase === "manage-action" && selectedRecord && (
            <div className="grid gap-2 pt-1">
              <Bubble>{summaryText(selectedRecord)}</Bubble>
              <ReplyButton onClick={() => beginEdit(selectedRecord)}>Edit this obligation</ReplyButton>
              <ReplyButton danger onClick={() => setPhase("delete-confirm")}>Delete this obligation</ReplyButton>
              <ReplyButton secondary onClick={() => setPhase("manage")}>Back</ReplyButton>
            </div>
          )}

          {phase === "delete-confirm" && selectedRecord && (
            <div className="grid gap-2 pt-1">
              <Bubble>Delete {getDebtTitle(selectedRecord)}? This removes it from your active Debt / Obligations records.</Bubble>
              <ReplyButton danger disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Yes, delete it"}</ReplyButton>
              <ReplyButton secondary disabled={busy} onClick={() => setPhase("manage-action")}>Cancel</ReplyButton>
            </div>
          )}

          {phase === "pressure" && (
            <div className="grid gap-2 pt-1">
              <Bubble>{records.length ? `You have ${pressure.activeCount} active obligation${pressure.activeCount === 1 ? "" : "s"}. Total remaining balance: ${fmt(pressure.totalDebt)}. Monthly obligation: ${fmt(pressure.monthlyDebt)}. Current debt pressure: ${pressure.debtRatio.toFixed(0)}% (${pressure.riskLevel}).` : "You currently have no active debt or obligations recorded."}</Bubble>
              <ReplyButton secondary onClick={() => backHome("Done")}>Back</ReplyButton>
            </div>
          )}

          {phase === "name" && <Composer value={input} onChange={setInput} onSubmit={submitName} placeholder="Name or lender" disabled={busy} />}

          {phase === "type" && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {DEBT_TYPES.map((item) => <ReplyButton key={item.value} onClick={() => chooseType(item.value)}>{item.label}</ReplyButton>)}
            </div>
          )}

          {phase === "mode" && (
            <div className="grid gap-2 pt-1">
              <ReplyButton onClick={() => chooseMode("balance")}>Balance I’m paying off</ReplyButton>
              <ReplyButton onClick={() => chooseMode("recurring")}>Ongoing monthly obligation</ReplyButton>
            </div>
          )}

          {phase === "balance" && <Composer value={input} onChange={(value) => setInput(cleanMoney(value))} onSubmit={submitBalance} placeholder="Remaining balance" inputMode="decimal" disabled={busy} />}
          {phase === "monthly" && <Composer value={input} onChange={(value) => setInput(cleanMoney(value))} onSubmit={submitMonthly} placeholder="Monthly payment" inputMode="decimal" disabled={busy} />}
          {phase === "interest" && <Composer value={input} onChange={(value) => setInput(cleanMoney(value))} onSubmit={submitInterest} placeholder="Annual interest %" inputMode="decimal" disabled={busy} />}

          {phase === "due" && (
            <div className="grid gap-2 pt-1">
              <Composer value={input} onChange={(value) => setInput(String(value).replace(/[^0-9]/g, "").slice(0, 2))} onSubmit={() => finishDue(false)} placeholder="Due day (1–31)" inputMode="numeric" disabled={busy} />
              <ReplyButton secondary disabled={busy} onClick={() => finishDue(true)}>Skip due day</ReplyButton>
            </div>
          )}

          {phase === "review" && (
            <div className="grid gap-2 pt-1">
              <div className="rounded-[20px] border border-cyan-300/15 bg-cyan-300/[0.05] p-4 text-[12px] font-semibold leading-6 text-white/86">
                <div><span className="text-white/45">Name:</span> {draft.title}</div>
                <div><span className="text-white/45">Type:</span> {DEBT_TYPES.find((item) => item.value === draft.debtType)?.label || draft.debtType}</div>
                <div><span className="text-white/45">Mode:</span> {draft.obligationMode === "recurring" ? "Ongoing monthly" : "Balance payoff"}</div>
                {draft.obligationMode === "balance" && <div><span className="text-white/45">Remaining:</span> {fmt(draft.totalDebt)}</div>}
                <div><span className="text-white/45">Monthly:</span> {fmt(draft.monthlyDebt)}</div>
                {draft.obligationMode === "balance" && <div><span className="text-white/45">Interest:</span> {toDebtNumber(draft.interestRate)}%</div>}
                <div><span className="text-white/45">Due day:</span> {draft.dueDay || "Not set"}</div>
              </div>
              <ReplyButton disabled={busy} onClick={save}>{busy ? "Saving…" : draft.id ? "Save changes" : "Save obligation"}</ReplyButton>
              <ReplyButton secondary disabled={busy} onClick={() => backHome("Cancel")}>Cancel</ReplyButton>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
