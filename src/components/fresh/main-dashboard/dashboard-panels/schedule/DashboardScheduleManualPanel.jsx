import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import OriginalDashboardSchedulePanel from "./DashboardSchedulePanel.jsx";

const CLARA_SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";
const DOUBLE_TAP_DELAY_MS = 380;
const TYPE_OPTIONS = ["Event", "Appointment", "Reminder", "Work", "Family", "Personal", "Other"];

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function cleanMoney(value) {
  return String(value || "").replace(/[^0-9.]/g, "");
}

function moneyNumber(value) {
  const parsed = Number(cleanMoney(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatPeso(value) {
  return `₱${Math.round(Number(value || 0)).toLocaleString("en-PH")}`;
}

function emptyForm(date = toDateKey(new Date())) {
  return {
    title: "",
    date,
    time: "",
    type: "Event",
    affectsMoney: false,
    direction: "out",
    amountKnown: true,
    amount: "",
    note: "",
  };
}

const MANUAL_SCHEDULE_CSS = `
  .clara-manual-schedule [role="dialog"] input,
  .clara-manual-schedule [role="dialog"] textarea,
  .clara-manual-schedule [role="dialog"] select {
    color-scheme: dark;
  }
`;

function SegmentButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-black transition ${
        active
          ? "border-[#4a83ff]/55 bg-[#1769ff]/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"
          : "border-white/9 bg-white/[.025] text-white/42 hover:text-white/64"
      }`}
    >
      {children}
    </button>
  );
}

function ManualScheduleSheet({ form, setForm, error, onClose, onSave }) {
  const amount = moneyNumber(form.amount);
  const impactPrefix = form.direction === "in" ? "+" : "−";
  const impactLabel = form.direction === "in" ? "Money in" : "Money out";

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add schedule"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/66 px-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md sm:items-center sm:px-5"
      onClick={onClose}
    >
      <section
        className="max-h-[88svh] w-full max-w-[520px] overflow-y-auto rounded-[30px] border border-[#3678ff]/30 bg-[radial-gradient(circle_at_top_left,rgba(23,105,255,.15),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(229,57,69,.09),transparent_34%),linear-gradient(155deg,#071326,#0a1430_54%,#171238)] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,.62),inset_0_1px_0_rgba(255,255,255,.06)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#f5c84b]">Schedule</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-.035em] text-white">Add schedule</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/42">You decide the details. CLARA only records what you enter.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] text-white/58"
            aria-label="Close add schedule"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="mt-5 space-y-3.5">
          <input
            autoFocus
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Schedule title"
            className="w-full rounded-2xl border border-white/10 bg-[#09182f]/94 px-4 py-3.5 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-[#4a83ff]/55"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              className="min-w-0 rounded-2xl border border-white/10 bg-[#09182f]/94 px-3.5 py-3.5 text-sm font-bold text-white outline-none focus:border-[#4a83ff]/55"
            />
            <input
              type="time"
              value={form.time}
              onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              className="min-w-0 rounded-2xl border border-white/10 bg-[#09182f]/94 px-3.5 py-3.5 text-sm font-bold text-white outline-none focus:border-[#4a83ff]/55"
            />
          </div>

          <select
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-[#09182f]/94 px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-[#4a83ff]/55"
          >
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <div className="rounded-[22px] border border-white/8 bg-white/[.025] p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-white/86">Does this affect your money?</p>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-white/34">CLARA will never guess an amount.</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <SegmentButton
                active={!form.affectsMoney}
                onClick={() => setForm((current) => ({ ...current, affectsMoney: false, amount: "" }))}
              >
                No
              </SegmentButton>
              <SegmentButton
                active={form.affectsMoney}
                onClick={() => setForm((current) => ({ ...current, affectsMoney: true }))}
              >
                Yes
              </SegmentButton>
            </div>
          </div>

          {form.affectsMoney ? (
            <div className="space-y-3 rounded-[22px] border border-[#e53945]/16 bg-[#e53945]/[.035] p-3.5">
              <div className="flex gap-2">
                <SegmentButton
                  active={form.direction === "out"}
                  onClick={() => setForm((current) => ({ ...current, direction: "out" }))}
                >
                  Money out
                </SegmentButton>
                <SegmentButton
                  active={form.direction === "in"}
                  onClick={() => setForm((current) => ({ ...current, direction: "in" }))}
                >
                  Money in
                </SegmentButton>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-black uppercase tracking-[.15em] text-white/38">Amount</label>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({
                    ...current,
                    amountKnown: !current.amountKnown,
                    amount: current.amountKnown ? "" : current.amount,
                  }))}
                  className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-[10px] font-black text-white/48"
                >
                  {form.amountKnown ? "Not sure yet" : "Enter amount"}
                </button>
              </div>

              {form.amountKnown ? (
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-white/44">₱</span>
                  <input
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: cleanMoney(event.target.value) }))}
                    placeholder="0"
                    className="w-full rounded-2xl border border-white/10 bg-[#09182f]/94 py-3.5 pl-9 pr-4 text-sm font-black text-white outline-none placeholder:text-white/22 focus:border-[#4a83ff]/55"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-[#f5c84b]/16 bg-[#f5c84b]/[.045] px-4 py-3 text-xs font-bold leading-5 text-[#ffe9a6]/70">
                  Amount pending — it will stay unknown until you enter it manually.
                </div>
              )}

              <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[.15em] text-white/32">Planned impact</p>
                <p className="mt-1 text-base font-black text-white/88">
                  {form.amountKnown && amount > 0 ? `${impactLabel}: ${impactPrefix}${formatPeso(amount)}` : `${impactLabel}: amount pending`}
                </p>
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[.15em] text-white/34">Notes · optional</label>
            <textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Add a note for yourself..."
              rows={2}
              className="w-full resize-none rounded-2xl border border-white/10 bg-[#09182f]/94 px-4 py-3 text-sm font-semibold leading-5 text-white outline-none placeholder:text-white/26 focus:border-[#4a83ff]/55"
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-[#e53945]/20 bg-[#e53945]/[.055] px-3 py-2 text-xs font-bold text-red-100/78">{error}</p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl border border-[#4a83ff]/46 bg-[linear-gradient(135deg,rgba(23,105,255,.34),rgba(33,74,174,.28))] px-4 py-3.5 text-sm font-black text-white shadow-[0_10px_28px_rgba(23,105,255,.12),inset_0_1px_0_rgba(255,255,255,.07)]"
          >
            Save schedule
          </button>
        </form>
      </section>
    </div>
  );
}

export default function DashboardScheduleManualPanel() {
  const rootRef = useRef(null);
  const selectedDateRef = useRef(toDateKey(new Date()));
  const lastDateTapRef = useRef({ date: "", time: 0 });
  const [form, setForm] = useState(() => emptyForm(selectedDateRef.current));
  const [manualOpen, setManualOpen] = useState(false);
  const [error, setError] = useState("");

  const openManual = useCallback((date = selectedDateRef.current) => {
    selectedDateRef.current = date || selectedDateRef.current;
    setForm(emptyForm(selectedDateRef.current));
    setError("");
    setManualOpen(true);
  }, []);

  const closeManual = useCallback(() => {
    setManualOpen(false);
    setError("");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const handleClickCapture = (event) => {
      const button = event.target?.closest?.("button");
      if (!button || !root.contains(button)) return;

      const ariaLabel = String(button.getAttribute("aria-label") || "");

      if (ariaLabel === "Add schedule") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        openManual(selectedDateRef.current);
        return;
      }

      const dateMatch = ariaLabel.match(/^Select (\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return;

      const date = dateMatch[1];
      const now = Date.now();
      const previous = lastDateTapRef.current;
      selectedDateRef.current = date;

      if (previous.date === date && now - previous.time <= DOUBLE_TAP_DELAY_MS) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        lastDateTapRef.current = { date: "", time: 0 };
        openManual(date);
        return;
      }

      lastDateTapRef.current = { date, time: now };
    };

    root.addEventListener("click", handleClickCapture, true);
    return () => root.removeEventListener("click", handleClickCapture, true);
  }, [openManual]);

  const saveManual = (event) => {
    event.preventDefault();

    const title = form.title.trim();
    const date = form.date || selectedDateRef.current;
    const amount = moneyNumber(form.amount);

    if (!title) {
      setError("Add a schedule title first.");
      return;
    }

    if (!date) {
      setError("Choose a date for this schedule.");
      return;
    }

    if (form.affectsMoney && form.amountKnown && amount <= 0) {
      setError("Enter the amount, or choose “Not sure yet”.");
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const amountValue = form.affectsMoney && form.amountKnown ? cleanMoney(form.amount) : "";
    const impactBreakdown = form.affectsMoney
      ? [
          {
            label: form.direction === "in" ? "Money in" : "Money out",
            amount: form.amountKnown ? amount : 0,
            direction: form.direction,
            scheduleType: form.type,
            pendingAmount: !form.amountKnown,
            source: "manual",
          },
        ]
      : [];

    window.dispatchEvent(
      new CustomEvent(CLARA_SCHEDULE_CREATE_EVENT, {
        detail: {
          id,
          title,
          date,
          time: form.time,
          type: form.type,
          amount: amountValue,
          note: form.note.trim(),
          impactBreakdown,
        },
      })
    );

    selectedDateRef.current = date;
    closeManual();
  };

  return (
    <div ref={rootRef} className="contents clara-manual-schedule">
      <style>{MANUAL_SCHEDULE_CSS}</style>
      <OriginalDashboardSchedulePanel />
      {manualOpen && typeof document !== "undefined"
        ? createPortal(
            <ManualScheduleSheet
              form={form}
              setForm={setForm}
              error={error}
              onClose={closeManual}
              onSave={saveManual}
            />,
            document.body
          )
        : null}
    </div>
  );
}
