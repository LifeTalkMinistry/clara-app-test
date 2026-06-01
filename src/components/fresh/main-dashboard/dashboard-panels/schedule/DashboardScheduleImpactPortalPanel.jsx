import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useUserRole from "@/hooks/useUserRole";
import { askGeminiForScheduleImpact } from "@/lib/ai-command/schedule-impact-service";
import OriginalDashboardSchedulePanel from "./DashboardSchedulePanel.jsx";

const STORAGE_PREFIX = "clara_schedule_events_v2";
const SCHEDULE_DESCRIPTION_PLACEHOLDER = "Describe this schedule so CLARA can refine it and plan possible spending.";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanMoney(value) {
  return String(value || "").replace(/[^0-9.]/g, "");
}

function moneyNumber(value) {
  const amount = Number(cleanMoney(value));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function formatPeso(value) {
  return `₱${Math.max(0, Math.round(Number(value || 0))).toLocaleString()}`;
}

function getStorageKey(user) {
  return `${STORAGE_PREFIX}_${user?.id || user?.email || "guest"}`;
}

function readStoredEvents(user) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(user));
    const legacy = window.localStorage.getItem("clara_lifeos_schedule_events_v1");
    const parsed = raw ? JSON.parse(raw) : legacy ? JSON.parse(legacy) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredEvent(user, event) {
  if (typeof window === "undefined") return;
  const current = readStoredEvents(user).filter((item) => item?.id && item?.title && item?.date);
  window.localStorage.setItem(getStorageKey(user), JSON.stringify([...current, event]));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getNativeValueSetter(element) {
  if (!element) return null;
  const prototype = Object.getPrototypeOf(element);
  return Object.getOwnPropertyDescriptor(prototype, "value")?.set || null;
}

function updateControlledField(element, value) {
  if (!element) return;
  const setter = getNativeValueSetter(element);
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function titleCase(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildLocalRefinedDescription(form = {}) {
  const source = `${form.title || ""} ${form.type || ""} ${form.note || ""}`.toLowerCase();
  const note = cleanText(form.note);

  if (/dentist|dental|tooth|teeth|ngipin|oral|cleaning|extraction|root canal|braces|pasta|bunot/i.test(source)) {
    return "Dental appointment that may include treatment, coverage checks, out-of-pocket costs, after-care, and transportation.";
  }
  if (/date|girlfriend|boyfriend|partner|relationship|jowa|crush|romantic/i.test(source)) {
    return "Relationship schedule that may involve transportation, food, a small gift, activity fees, or extra stops.";
  }
  if (/church|ministry|simbahan|service|fellowship|offering/i.test(source)) {
    return "Church-related schedule that may involve transportation, food, contribution, or extra stops.";
  }
  if (/doctor|checkup|clinic|hospital|medical|consultation|laboratory|lab|medicine|meds|prescription|hmo|insurance/i.test(source)) {
    return "Health appointment that may involve coverage, consultation, medicine, transportation, or follow-up costs.";
  }
  if (/birthday|celebration|party|fiesta/i.test(source)) {
    return "Celebration schedule that may involve gifts, food, contribution, delivery, or transportation.";
  }
  if (/work|office|meeting|shift|coworker|workmate/i.test(source)) {
    return "Work-related schedule that may involve transportation, meals, coffee, or small work extras.";
  }

  return note || `${cleanText(form.title) || "This schedule"} may affect your spending plan.`;
}

function readForm(root) {
  const dialog = root?.querySelector?.('[role="dialog"]');
  const titleInput = dialog?.querySelector('input[placeholder="Schedule title"]');
  const noteInput = dialog?.querySelector("textarea");
  const typeInput = dialog?.querySelector("select");
  const dateInput = dialog?.querySelector('input[type="date"]');
  const timeInput = dialog?.querySelector('input[type="time"]');
  const amountInput = dialog?.querySelector('input[placeholder="AI will calculate"]');
  const title = cleanText(titleInput?.value);
  const note = cleanText(noteInput?.value);
  const type = cleanText(typeInput?.value) || "Personal";

  return {
    title: title || titleCase(note || type || "Personal schedule"),
    note,
    type,
    date: dateInput?.value || "",
    time: timeInput?.value || "",
    amount: amountInput?.value || "",
    elements: { titleInput, noteInput, typeInput, dateInput, timeInput, amountInput },
  };
}

function hasAny(source, words) {
  return words.some((word) => source.includes(word));
}

function addUnique(items, name) {
  const clean = cleanText(name);
  if (!clean) return items;
  if (items.some((item) => item.name.toLowerCase() === clean.toLowerCase())) return items;
  return [...items, { id: makeId(), name: clean, amount: "" }];
}

function buildLocalPlanItems(form = {}) {
  const source = `${form.title || ""} ${form.type || ""} ${form.note || ""}`.toLowerCase();
  let items = [];

  const isDate = hasAny(source, ["date", "girlfriend", "boyfriend", "partner", "relationship", "jowa", "crush", "romantic"]);
  const isDental = /(dentist|dental|tooth|teeth|ngipin|oral|cleaning|extraction|root canal|braces|pasta|bunot)/i.test(source);
  const isMedical = isDental || /(doctor|checkup|clinic|hospital|medical|consultation|laboratory|lab|medicine|meds|prescription|hmo|insurance|therapy|x-ray|xray)/i.test(source);
  const isChurch = hasAny(source, ["church", "ministry", "simbahan", "service", "fellowship", "offering"]);
  const isBill = form.type === "Bill" || hasAny(source, ["bill", "payment", "due", "installment", "subscription"]);
  const isBirthday = hasAny(source, ["birthday", "celebration", "party", "fiesta"]);
  const isLicense = hasAny(source, ["license", "licence", "renewal", "renew"]);
  const isWork = form.type === "Work" || hasAny(source, ["work", "office", "meeting", "shift", "coworker", "workmate"]);
  const isOuting = hasAny(source, ["outing", "trip", "beach", "resort", "hangout", "gala", "lakad", "mall", "movie"]);

  if (isDate) {
    items = addUnique(items, "Transportation");
    items = addUnique(items, "Food or drinks");
    items = addUnique(items, "Gift or small surprise");
    items = addUnique(items, "Date activity / reservation");
    items = addUnique(items, "Extra stop");
    items = addUnique(items, "Emergency buffer");
    return items;
  }

  if (isDental) {
    items = addUnique(items, "Dental procedure or consultation");
    items = addUnique(items, "Out-of-pocket balance after insurance/HMO");
    items = addUnique(items, "Medicine or after-care");
    items = addUnique(items, "Transportation");
    items = addUnique(items, "Emergency buffer");
    return items;
  }

  if (isMedical) {
    items = addUnique(items, "Consultation or procedure fee");
    items = addUnique(items, "Out-of-pocket balance after insurance/HMO");
    items = addUnique(items, "Medicine, lab, or follow-up cost");
    items = addUnique(items, "Transportation");
    items = addUnique(items, "Emergency buffer");
    return items;
  }

  if (isLicense) {
    items = addUnique(items, "Renewal or government fee");
    items = addUnique(items, "Requirements / photocopy / photo");
    items = addUnique(items, "Transportation or parking");
    items = addUnique(items, "Extra processing buffer");
    return items;
  }

  if (isBill) {
    items = addUnique(items, "Main payment");
    items = addUnique(items, "Transfer or convenience fee");
    items = addUnique(items, "Transportation / cash-in cost");
    items = addUnique(items, "Emergency buffer");
    return items;
  }

  if (isBirthday) {
    items = addUnique(items, "Gift or contribution");
    items = addUnique(items, "Food or cake");
    items = addUnique(items, "Transportation / delivery");
    items = addUnique(items, "Emergency buffer");
    return items;
  }

  if (isChurch) {
    items = addUnique(items, "Transportation");
    items = addUnique(items, "Food or drinks");
    items = addUnique(items, "Offering or group contribution");
    items = addUnique(items, "Extra stop");
    items = addUnique(items, "Emergency buffer");
    return items;
  }

  if (isWork) {
    items = addUnique(items, "Transportation");
    items = addUnique(items, "Meal, snack, or coffee");
    items = addUnique(items, "Work-related extra");
    items = addUnique(items, "Emergency buffer");
    return items;
  }

  if (isOuting) {
    items = addUnique(items, "Transportation");
    items = addUnique(items, "Food and drinks");
    items = addUnique(items, "Entrance or activity fee");
    items = addUnique(items, "Shared contribution");
    items = addUnique(items, "Emergency buffer");
    return items;
  }

  items = addUnique(items, "Transportation");
  items = addUnique(items, "Food or drinks");
  items = addUnique(items, "Fee or shared expense");
  items = addUnique(items, "Extra stop");
  items = addUnique(items, "Emergency buffer");
  return items;
}

function sanitizeAiItems(names = [], form = {}) {
  const source = `${form.title || ""} ${form.type || ""} ${form.note || ""}`.toLowerCase();
  const isChurch = hasAny(source, ["church", "ministry", "simbahan", "service", "fellowship", "offering"]);
  const isDate = hasAny(source, ["date", "girlfriend", "boyfriend", "partner", "relationship", "jowa", "crush", "romantic"]);
  const local = buildLocalPlanItems(form);
  const blocked = [
    !isChurch ? /church|ministry|simbahan|offering/i : null,
    isDate ? /group contribution|church|ministry|offering/i : null,
  ].filter(Boolean);

  const fromAi = (Array.isArray(names) ? names : [])
    .map((name) => cleanText(name))
    .filter(Boolean)
    .filter((name) => !blocked.some((pattern) => pattern.test(name)))
    .slice(0, 7)
    .map((name) => ({ id: makeId(), name, amount: "" }));

  if (!fromAi.length) return local;

  let merged = fromAi;
  for (const localItem of local) {
    if (merged.length >= 7) break;
    merged = addUnique(merged, localItem.name);
  }

  return merged;
}

function getAiNames(ai = {}) {
  const spendingAreas = Array.isArray(ai?.spending_areas) ? ai.spending_areas : [];
  const pathAreas = Array.isArray(ai?.expense_path)
    ? ai.expense_path.flatMap((category) => (Array.isArray(category?.sub_items) ? category.sub_items.map((item) => item?.label) : []))
    : [];
  return [...spendingAreas, ...pathAreas].map(cleanText).filter(Boolean);
}

function getAiRefinedDescription(ai = {}, fallback = "") {
  return cleanText(
    ai?.schedule_updates?.description ||
    ai?.suggested_description ||
    ai?.description ||
    fallback
  );
}

function isTopAgendaPreviewNode(node) {
  return Boolean(node?.closest?.("button"));
}

function suppressLegacyImpactPlannerLabels(root = typeof document !== "undefined" ? document : null) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("p, span, div").forEach((node) => {
    const text = cleanText(node.textContent).toLowerCase();
    if (text !== "clara impact planner") return;
    node.remove();
  });
}

function suppressRedundantMoneyImpactLabels(root = typeof document !== "undefined" ? document : null) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("p, span, div").forEach((node) => {
    if (node.childElementCount > 0) return;
    if (!isTopAgendaPreviewNode(node)) return;
    if (cleanText(node.textContent) !== "MONEY IMPACT") return;
    node.remove();
  });
}

function rewriteMoneyImpactMessages(root = typeof document !== "undefined" ? document : null) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll("p, span, div").forEach((node) => {
    if (node.childElementCount > 0) return;
    if (!isTopAgendaPreviewNode(node)) return;

    const text = cleanText(node.textContent);
    const isImpactSentence =
      /\bis scheduled on\b/i.test(text) && /\boptional spending\b/i.test(text);
    const isRewrittenLongImpact =
      /^Estimated impact:\s*around\s*₱/i.test(text) && /\boptional spending\b/i.test(text);

    if (!isImpactSentence && !isRewrittenLongImpact) return;

    const amountMatch = text.match(/(?:Around|around)\s*₱\s*([0-9,]+(?:\.\d+)?)/i) || text.match(/₱\s*([0-9,]+(?:\.\d+)?)/i);
    const amount = amountMatch?.[1]?.trim();

    node.textContent = amount
      ? `Estimated impact: ${formatPeso(Number(cleanMoney(amount)))}`
      : "Estimated impact: review before optional spending.";
  });
}

function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [locked]);
}

function PlanPossibleSpendingSheet({ session, onClose, onChangeItems, onSaveWithImpact, onSaveWithoutImpact }) {
  const total = useMemo(
    () => (session?.items || []).reduce((sum, item) => sum + moneyNumber(item.amount), 0),
    [session?.items]
  );

  useEffect(() => {
    suppressLegacyImpactPlannerLabels();
    suppressRedundantMoneyImpactLabels();
    rewriteMoneyImpactMessages();
    if (typeof MutationObserver === "undefined" || typeof document === "undefined") return undefined;
    const observer = new MutationObserver(() => {
      suppressLegacyImpactPlannerLabels();
      suppressRedundantMoneyImpactLabels();
      rewriteMoneyImpactMessages();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  if (!session) return null;

  if (session.isPreparing) {
    return (
      <Portal>
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100000] flex justify-center bg-[#020617] text-white">
          <div className="relative flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden border-x border-cyan-200/18 bg-[#050b1f] px-5 shadow-[0_0_100px_rgba(34,211,238,.12),inset_0_1px_0_rgba(255,255,255,.06)]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-300/[0.075] blur-3xl" />
            <div className="pointer-events-none absolute -left-20 top-1/3 h-48 w-48 rounded-full bg-fuchsia-400/[0.055] blur-3xl" />
            <button type="button" onClick={onClose} className="absolute right-5 top-[calc(env(safe-area-inset-top)+1.15rem)] z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-[#101936] text-white/70 active:scale-95" aria-label="Close planner">×</button>

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-200/22 bg-[#0b1630] shadow-[0_0_34px_rgba(34,211,238,.12),inset_0_1px_0_rgba(255,255,255,.06)]">
                <div className="h-8 w-8 animate-pulse rounded-full border border-cyan-200/40 bg-cyan-300/15 shadow-[0_0_28px_rgba(34,211,238,.22)]" />
              </div>
              <h2 className="mt-3 max-w-[300px] text-2xl font-black leading-tight text-white">CLARA is mapping possible spending…</h2>
              {session.form?.title ? <p className="mt-5 rounded-full border border-white/10 bg-[#101936] px-4 py-2 text-xs font-black text-white/58">{session.form.title}</p> : null}
            </div>
          </div>
        </div>
      </Portal>
    );
  }

  const refinedDescription = cleanText(session.refinedDescription || session.form.note || buildLocalRefinedDescription(session.form));
  const descriptionLabel = session.source === "ai" ? "AI refined description" : "Schedule description";

  const updateItem = (id, patch) => {
    onChangeItems(session.items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id) => {
    const next = session.items.filter((item) => item.id !== id);
    onChangeItems(next.length ? next : [{ id: makeId(), name: "Possible spending", amount: "" }]);
  };

  const addItem = () => {
    onChangeItems([...session.items, { id: makeId(), name: "", amount: "" }]);
  };

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[100000] flex justify-center bg-[#020617] text-white"
      >
        <div
          className="isolate flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden border-x border-cyan-200/18 bg-[#050b1f] shadow-[0_0_100px_rgba(34,211,238,.12),inset_0_1px_0_rgba(255,255,255,.06)]"
        >
          <div className="relative shrink-0 border-b border-white/12 bg-[#050b1f] px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1.15rem)]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-300/[0.065] blur-3xl" />
            <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-fuchsia-400/[0.055] blur-3xl" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black leading-tight text-white">Plan possible spending</h2>
                <p className="mt-1 truncate text-xs font-bold text-white/54">{session.form.title}</p>
              </div>
              <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-[#101936] text-white/70 active:scale-95" aria-label="Close planner">×</button>
            </div>

            <div className="relative z-10 mt-4 rounded-[22px] border border-cyan-200/16 bg-[#0b1128] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_12px_28px_rgba(0,0,0,.24)]">
              <span className="rounded-full border border-cyan-200/18 bg-[#0d2336] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-50/70">{descriptionLabel}</span>
              <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-white/62">{refinedDescription}</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#050b1f] px-4 py-4">
            {session.items.map((item, index) => (
              <div key={item.id} className="rounded-[24px] border border-white/12 bg-[#0b1128] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_10px_26px_rgba(0,0,0,0.22)]">
                <div className="flex items-center gap-2">
                  <input
                    value={item.name}
                    onChange={(event) => updateItem(item.id, { name: event.target.value })}
                    placeholder={`Expense ${index + 1}`}
                    className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-[#101936] px-4 py-3 text-sm font-black text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-[#101936] text-white/48 active:scale-95"
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-white/42">Amount</span>
                  <div className="flex items-center rounded-2xl border border-white/12 bg-[#070d20] px-4 py-3 focus-within:border-cyan-300/40">
                    <span className="mr-2 text-sm font-black text-cyan-100/62">₱</span>
                    <input
                      inputMode="decimal"
                      value={item.amount}
                      onChange={(event) => updateItem(item.id, { amount: cleanMoney(event.target.value) })}
                      placeholder="0"
                      className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none placeholder:text-white/28"
                    />
                  </div>
                </label>
              </div>
            ))}

            <button type="button" onClick={addItem} className="w-full rounded-2xl border border-cyan-300/22 bg-[#0d2336] px-4 py-3 text-sm font-black text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.07)] active:scale-[0.99]">
              + Add item
            </button>
          </div>

          <div className="shrink-0 border-t border-white/12 bg-[#050b1f] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-18px_38px_rgba(0,0,0,.35)]">
            <div className="mb-3 flex items-center justify-between gap-4 rounded-2xl border border-white/12 bg-[#0b1128] px-4 py-3">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-white/46">Total estimated impact</span>
              <span className="text-lg font-black text-white">{formatPeso(total)}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => onSaveWithImpact(total)} className="rounded-2xl border border-cyan-300/28 bg-[#0d2336] px-4 py-3 text-sm font-black text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.09)] active:scale-[0.99]">
                Save with impact
              </button>
              <button type="button" onClick={onSaveWithoutImpact} className="rounded-2xl border border-white/12 bg-[#101936] px-4 py-3 text-sm font-black text-white/58 active:scale-[0.99]">
                Save without impact
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function hideRefineButtons(root) {
  if (!root) return;

  root.querySelectorAll("button").forEach((button) => {
    const label = cleanText(button.textContent).toLowerCase();
    if (!label.includes("refine with clara")) return;
    button.style.display = "none";
    button.setAttribute("aria-hidden", "true");
    button.setAttribute("tabindex", "-1");
  });

  root.querySelectorAll("textarea").forEach((textarea) => {
    const placeholder = cleanText(textarea.getAttribute("placeholder"));
    const isScheduleDescriptionBox =
      placeholder.includes("describe only the event") ||
      placeholder.includes("church outing") ||
      placeholder.includes("youth group");

    if (!isScheduleDescriptionBox) return;
    textarea.setAttribute("placeholder", SCHEDULE_DESCRIPTION_PLACEHOLDER);
  });

  suppressLegacyImpactPlannerLabels(root);
  suppressRedundantMoneyImpactLabels(root);
  rewriteMoneyImpactMessages(root);
}

export default function DashboardScheduleImpactPortalPanel() {
  const { user } = useUserRole() || {};
  const rootRef = useRef(null);
  const [panelKey, setPanelKey] = useState(0);
  const [planner, setPlanner] = useState(null);

  useBodyScrollLock(Boolean(planner));

  const startPlanner = async (form) => {
    const preparedForm = {
      ...form,
      title: cleanText(form.title) || titleCase(form.note || form.type || "Personal schedule"),
      note: cleanText(form.note),
      type: cleanText(form.type) || "Personal",
    };
    const localRefinedDescription = buildLocalRefinedDescription(preparedForm);
    const localItems = buildLocalPlanItems(preparedForm);

    setPlanner({
      form: preparedForm,
      refinedDescription: "",
      items: [],
      isPreparing: true,
      source: "preparing",
    });

    try {
      const ai = await askGeminiForScheduleImpact({
        form: preparedForm,
        messages: [],
        stage: "spending_area_preview",
        activeCategory: "",
        activeSubItem: "",
        expensePath: [],
        total: 0,
        latestUserReply: "Refine this schedule description and generate editable possible spending items only.",
      });
      const aiItems = sanitizeAiItems(getAiNames(ai), preparedForm);
      const aiRefinedDescription = getAiRefinedDescription(ai, localRefinedDescription);
      setPlanner((current) => current ? {
        ...current,
        form: { ...preparedForm, note: aiRefinedDescription },
        refinedDescription: aiRefinedDescription,
        items: aiItems,
        isPreparing: false,
        source: "ai",
      } : current);
    } catch (error) {
      console.warn("[CLARA Schedule] Spending planner AI unavailable, using local starter list:", error);
      setPlanner((current) => current ? {
        ...current,
        form: { ...preparedForm, note: localRefinedDescription },
        refinedDescription: localRefinedDescription,
        items: localItems,
        isPreparing: false,
        source: "local",
      } : current);
    }
  };

  const closePlanner = () => setPlanner(null);

  const savePlanner = (amountValue = "") => {
    if (!planner?.form?.title) return;
    const cleanImpact = cleanMoney(amountValue);
    writeStoredEvent(user, {
      id: makeId(),
      title: cleanText(planner.form.title),
      date: planner.form.date || new Date().toISOString().slice(0, 10),
      time: planner.form.time || "",
      type: planner.form.type || "Personal",
      amount: cleanImpact,
      note: cleanText(planner.refinedDescription || planner.form.note),
    });

    if (planner.form.elements?.amountInput) updateControlledField(planner.form.elements.amountInput, cleanImpact ? `₱${cleanImpact}` : "");
    setPlanner(null);
    setPanelKey((key) => key + 1);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof MutationObserver === "undefined") return undefined;
    hideRefineButtons(root);
    suppressLegacyImpactPlannerLabels();
    suppressRedundantMoneyImpactLabels();
    rewriteMoneyImpactMessages();
    const observer = new MutationObserver(() => {
      hideRefineButtons(root);
      suppressLegacyImpactPlannerLabels();
      suppressRedundantMoneyImpactLabels();
      rewriteMoneyImpactMessages();
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [panelKey]);

  useEffect(() => {
    const onClick = (event) => {
      const root = rootRef.current;
      const button = event.target?.closest?.("button");
      if (!root || !button || !root.contains(button)) return;
      const label = cleanText(button.textContent).toLowerCase();

      if (label.includes("refine with clara")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        return;
      }

      if (!label.includes("calculate money impact")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      const form = readForm(root);
      if (!cleanText(form.title) && !cleanText(form.note)) return;
      startPlanner(form);
    };

    const onSubmit = (event) => {
      const root = rootRef.current;
      if (!root || !root.contains(event.target)) return;
      const submitterText = cleanText(event.submitter?.textContent).toLowerCase();
      if (!submitterText.includes("calculate money impact")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      const form = readForm(root);
      if (!cleanText(form.title) && !cleanText(form.note)) return;
      startPlanner(form);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [planner, panelKey, user?.id, user?.email]);

  return (
    <div ref={rootRef} className="contents">
      <OriginalDashboardSchedulePanel key={panelKey} />
      <PlanPossibleSpendingSheet
        session={planner}
        onClose={closePlanner}
        onChangeItems={(items) => setPlanner((current) => current ? { ...current, items } : current)}
        onSaveWithImpact={(total) => savePlanner(String(Math.round(total || 0)))}
        onSaveWithoutImpact={() => savePlanner("")}
      />
    </div>
  );
}
