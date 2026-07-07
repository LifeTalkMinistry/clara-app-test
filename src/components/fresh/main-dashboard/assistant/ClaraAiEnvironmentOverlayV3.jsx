import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import useClaraBuyCheckFlow from "./useClaraBuyCheckFlow.js";
import BuyCheckDecisionCard from "./buy-check/BuyCheckDecisionCard.jsx";

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const money = (value = 0) => `₱${Number(value || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

function placeholderFor(step) {
  if (step === "price") return "Enter the price, e.g. ₱3,500";
  if (step === "reason") return "Why do you want to buy it?";
  if (step === "confirm") return "Choose Yes or No";
  if (step === "diagnosis") return "CLARA is checking your context";
  if (step === "complete") return "Review your Buy Check result";
  return "Type the item you want to buy";
}

function DecisionSavePanel({ state, flow }) {
  const decision = state?.finalDecision;
  if (!decision || !["explain", "resolved"].includes(decision.phase)) return null;
  if (decision.phase === "resolved") {
    return (
      <section className="rounded-[26px] border border-emerald-200/20 bg-slate-950/90 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/75">DECISION SAVED</p>
        <h3 className="mt-2 text-[19px] font-black text-white">{decision.result?.title}</h3>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-100/85">{decision.result?.message}</p>
      </section>
    );
  }
  const buying = decision.choice === "buy";
  return (
    <section className="rounded-[26px] border border-cyan-100/20 bg-slate-950/90 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/65">{buying ? "LOG PURCHASE" : "SAVE DECISION"}</p>
      <h3 className="mt-2 text-[19px] font-black text-white">{buying ? `Continue with ${state.item}` : `Wait on ${state.item}`}</h3>
      <p className="mt-2 text-[12px] font-semibold text-slate-200/80">CLARA prepared the note. Editing it is optional.</p>
      <textarea rows={3} value={decision.explanation || ""} onChange={(event) => flow.setDecisionExplanation?.(event.target.value)} className="mt-3 w-full resize-none rounded-[18px] border border-white/14 bg-slate-900/95 px-4 py-3 text-[13px] font-semibold text-white outline-none" />
      {buying ? (
        <select value={decision.walletId || ""} onChange={(event) => flow.setDecisionWallet?.(event.target.value)} className="mt-3 w-full rounded-[18px] border border-white/14 bg-slate-900/95 px-4 py-3 text-[13px] font-bold text-white outline-none">
          <option value="">Choose a wallet</option>
          {(state.walletOptions || []).map((wallet) => <option key={wallet.id || wallet.name} value={wallet.id} disabled={!wallet.enough}>{wallet.name} — {money(wallet.balance)}</option>)}
        </select>
      ) : null}
      {decision.error ? <p className="mt-3 text-[11px] font-black text-rose-200/90">{decision.error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={flow.submitFinalDecision} disabled={decision.busy} className="min-h-11 rounded-full bg-cyan-300 px-4 text-[12px] font-black text-slate-950">{decision.busy ? "Saving..." : buying ? "Log expense" : "Save decision"}</button>
        <button type="button" onClick={flow.cancelFinalDecision} className="min-h-11 rounded-full border border-white/15 bg-slate-800/95 px-4 text-[12px] font-black text-white">Back</button>
      </div>
    </section>
  );
}

export default function ClaraAiEnvironmentOverlayV3({ isActive = false, messages = [], claraAssistantContext = {}, buyCheckState = null, onSubmitBuyCheckAnswer, onConfirmBuyCheck, onEditBuyCheck, onCheckAnother, onClose, layoutVariant = "default" }) {
  const [draft, setDraft] = useState("");
  const previousActive = useRef(false);
  const inputRef = useRef(null);
  const preview = layoutVariant === "guide-preview";
  const ownedFlow = useClaraBuyCheckFlow({ assistantContext: claraAssistantContext });

  useEffect(() => {
    if (preview) return;
    if (isActive && !previousActive.current) ownedFlow.startSession(`pause-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (!isActive && previousActive.current) ownedFlow.clearSession();
    previousActive.current = isActive;
  }, [isActive, ownedFlow.clearSession, ownedFlow.startSession, preview]);

  const state = preview ? buyCheckState || {} : ownedFlow.state || {};
  const visibleMessages = useMemo(() => (preview ? messages : ownedFlow.messages || []).filter(Boolean), [messages, ownedFlow.messages, preview]);
  const step = state.step || "item";
  const busy = Boolean(state.busy || state.finalDecision?.busy);
  const locked = ["confirm", "diagnosis", "complete"].includes(step);

  useEffect(() => {
    if (!isActive || locked || busy) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus?.());
    return () => cancelAnimationFrame(frame);
  }, [busy, isActive, locked, step]);

  if (!isActive) return null;

  const submit = (event) => {
    event.preventDefault();
    const answer = draft.trim();
    if (!answer || locked || busy) return;
    (preview ? onSubmitBuyCheckAnswer : ownedFlow.submitAnswer)?.(answer);
    setDraft("");
  };
  const runAction = (action) => {
    if (action === "edit_amount") return (preview ? onEditBuyCheck : ownedFlow.editAmount)?.();
    if (preview) return;
    if (action === "buy") ownedFlow.chooseFinalDecision?.("buy");
    if (action === "not_buy") ownedFlow.chooseFinalDecision?.("not_buy");
  };
  const confirm = preview ? onConfirmBuyCheck : ownedFlow.confirm;
  const edit = preview ? onEditBuyCheck : ownedFlow.editReason;
  const another = preview ? onCheckAnother : ownedFlow.checkAnother;

  return (
    <div className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/94 px-2 pb-4 pt-5 text-white" data-clara-ai-brain-version="buy-check-context-v2-one-card" data-clara-buy-check-react-owner="true">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-slate-900/90" aria-label="Close CLARA AI"><X className="h-4 w-4" /></button>
      <main className="min-h-0 flex-1 overflow-y-auto px-2 pb-24 pt-12">
        {!visibleMessages.length ? (
          <section className="rounded-[30px] border border-cyan-100/20 bg-white/[0.05] px-6 py-8 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/55">BUY CHECK</p>
            <h2 className="mt-5 text-[21px] font-black text-white">What do you want to buy?</h2>
            <p className="mt-2 text-[12px] font-semibold text-slate-300/75">CLARA will scan your financial context before money leaves.</p>
          </section>
        ) : (
          <div className="space-y-3">
            {visibleMessages.map((message, index) => {
              const user = message.role === "user";
              return <div key={message.id || index} className={`flex ${user ? "justify-end" : "justify-start"}`}><div className={`max-w-[90%] rounded-[22px] px-4 py-3 text-[13px] font-semibold leading-6 ${user ? "bg-emerald-300 text-slate-950" : "border border-white/10 bg-white/[0.07] text-white/90"}`}>{clean(message.text || message.content)}</div></div>;
            })}
            {step === "complete" && state.finalDecision?.phase === "choose" ? <BuyCheckDecisionCard diagnosis={state.diagnosis} onAction={runAction} /> : null}
            <DecisionSavePanel state={state} flow={ownedFlow} />
          </div>
        )}
      </main>
      {step === "confirm" ? (
        <div className="grid grid-cols-2 gap-2.5 pb-2">
          <button type="button" onClick={confirm} disabled={busy} className="min-h-11 rounded-full bg-cyan-300 text-[12px] font-black text-slate-950">Yes</button>
          <button type="button" onClick={edit} disabled={busy} className="min-h-11 rounded-full border border-white/15 bg-slate-900 text-[12px] font-black text-white">No</button>
        </div>
      ) : null}
      {step === "complete" && state.finalDecision?.phase === "resolved" ? (
        <div className="grid grid-cols-2 gap-2.5 pb-2">
          <button type="button" onClick={another} className="min-h-11 rounded-full bg-cyan-300 text-[12px] font-black text-slate-950">Check another</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-white/15 bg-slate-900 text-[12px] font-black text-white">Done</button>
        </div>
      ) : null}
      <form onSubmit={submit} className="rounded-[26px] border border-white/14 bg-slate-950/95 p-2.5">
        <div className="flex items-center gap-2 rounded-[20px] border border-white/12 bg-slate-900/95 px-3 py-2">
          <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={locked || busy} className="min-w-0 flex-1 bg-transparent py-2 text-[14px] text-white outline-none" placeholder={placeholderFor(step)} inputMode={step === "price" ? "decimal" : "text"} />
          <button type="submit" disabled={!draft.trim() || locked || busy} className="grid h-11 w-11 place-items-center rounded-full bg-cyan-300 text-slate-950 disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
        </div>
      </form>
    </div>
  );
}
