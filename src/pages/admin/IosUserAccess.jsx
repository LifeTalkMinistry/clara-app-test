import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  Power,
  RefreshCcw,
  ShieldOff,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  clearHiddenAdminSession,
  fetchIosAccessCodes,
  updateIosAccessCode,
} from "@/lib/ios-access-client";

const STATUS_STYLES = {
  Available: "border-cyan-200/20 bg-cyan-300/10 text-cyan-100",
  Active: "border-emerald-200/20 bg-emerald-300/10 text-emerald-100",
  Disabled: "border-slate-200/15 bg-white/[0.07] text-white/60",
  Revoked: "border-rose-200/20 bg-rose-400/10 text-rose-100",
  Expired: "border-amber-200/20 bg-amber-300/10 text-amber-100",
};

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function remainingLabel(row) {
  if (!row?.expiresAt) return "Not activated";
  if (row.status === "Expired") return "Expired";
  if (row.status === "Disabled" || row.status === "Revoked") return "Access stopped";
  if (Number(row.remainingHours) <= 72) {
    return `${Math.max(0, Number(row.remainingHours) || 0)} hours left`;
  }
  return `${Math.max(0, Number(row.remainingDays) || 0)} days left`;
}

function errorMessage(error) {
  if (error?.code === "unauthorized") return "Admin authorization expired. Open the hidden admin area again.";
  if (error?.code === "invalid_extension") return "Choose a valid future expiration date.";
  return error?.message || "The update could not be completed.";
}

function SummaryCard({ label, value, tone = "text-white" }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/[0.045] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

export default function IosUserAccess() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [notes, setNotes] = useState({});
  const [customDates, setCustomDates] = useState({});

  const goBack = useCallback(() => {
    navigate("/dashboard?hiddenAdmin=1", { replace: true });
  }, [navigate]);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchIosAccessCodes();
      const rows = Array.isArray(data.codes) ? data.codes : [];
      setCodes(rows);
      setNotes(
        rows.reduce((accumulator, row) => {
          accumulator[row.id] = row.adminNote || "";
          return accumulator;
        }, {})
      );
    } catch (loadError) {
      setError(errorMessage(loadError));
      if (loadError?.code === "unauthorized") {
        clearHiddenAdminSession();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  const summary = useMemo(() => {
    const count = (status) => codes.filter((row) => row.status === status).length;
    return {
      total: codes.length,
      available: count("Available"),
      active: count("Active"),
      disabled: count("Disabled") + count("Revoked"),
      expired: count("Expired"),
    };
  }, [codes]);

  const runUpdate = useCallback(async (row, operation, payload = {}, confirmation = "") => {
    if (busyId) return;
    if (confirmation && !window.confirm(confirmation)) return;

    setBusyId(row.id);
    setError("");

    try {
      await updateIosAccessCode({
        codeId: row.id,
        operation,
        ...payload,
      });
      await loadCodes();
    } catch (updateError) {
      setError(errorMessage(updateError));
      if (updateError?.code === "unauthorized") {
        clearHiddenAdminSession();
      }
    } finally {
      setBusyId("");
    }
  }, [busyId, loadCodes]);

  const saveNote = (row) =>
    runUpdate(row, "note", { adminNote: notes[row.id] || "" });

  const extendCustom = (row) => {
    const value = customDates[row.id];
    const parsedDate = value ? new Date(value) : null;

    if (!parsedDate || !Number.isFinite(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
      setError("Choose a valid future expiration date first.");
      return;
    }

    runUpdate(row, "extend", { customExpiresAt: parsedDate.toISOString() });
  };

  return (
    <div className="min-h-full px-4 pb-10 pt-4 text-white md:px-6 md:pt-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-4 text-sm font-bold text-white/75 transition hover:bg-white/[0.09] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Hidden Admin
          </button>

          <button
            type="button"
            onClick={loadCodes}
            disabled={loading || Boolean(busyId)}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-200/15 bg-cyan-300/10 px-4 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mt-6 rounded-[30px] border border-cyan-200/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_45%),rgba(7,18,39,0.88)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-200/18 bg-cyan-300/10 text-cyan-100">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/50">
                CLARA Administration
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                iOS User Access
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/55">
                Manage the 20 persistent access codes used by the iPhone Home Screen version of CLARA.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Available" value={summary.available} tone="text-cyan-100" />
          <SummaryCard label="Active" value={summary.active} tone="text-emerald-100" />
          <SummaryCard label="Disabled" value={summary.disabled} tone="text-white/65" />
          <SummaryCard label="Expired" value={summary.expired} tone="text-amber-100" />
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200/18 bg-rose-400/10 px-4 py-3 text-sm font-semibold leading-5 text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 flex min-h-48 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.035]">
            <div className="flex items-center gap-3 text-sm font-semibold text-white/55">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading access codes...
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {codes.map((row) => {
              const isBusy = busyId === row.id;
              const expanded = expandedId === row.id;
              const expiringSoon = row.status === "Active" && Number(row.remainingHours) <= 72;

              return (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-[26px] border border-white/12 bg-white/[0.045] shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4 text-cyan-100/70" />
                          <p className="font-mono text-base font-black tracking-[0.08em] text-white">
                            {row.code}
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${STATUS_STYLES[row.status] || STATUS_STYLES.Disabled}`}>
                            {row.status}
                          </span>
                          {expiringSoon ? (
                            <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
                              Expiring soon
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => runUpdate(row, "toggle", { enabled: !row.enabled })}
                        className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-3.5 text-xs font-black transition disabled:opacity-50 ${
                          row.enabled
                            ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-100"
                            : "border-white/12 bg-white/[0.055] text-white/55"
                        }`}
                      >
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                        {row.enabled ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                        <p className="flex items-center gap-2 font-bold text-white/38">
                          <UserRound className="h-3.5 w-3.5" /> User
                        </p>
                        <p className="mt-1 break-words text-sm font-bold text-white/76">
                          {row.activatedByName || row.activatedByEmail || "Unassigned"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                        <p className="flex items-center gap-2 font-bold text-white/38">
                          <Clock3 className="h-3.5 w-3.5" /> Remaining
                        </p>
                        <p className={`mt-1 text-sm font-bold ${expiringSoon ? "text-amber-100" : "text-white/76"}`}>
                          {remainingLabel(row)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                        <p className="font-bold text-white/38">Activated</p>
                        <p className="mt-1 text-sm font-bold text-white/72">{formatDateTime(row.activatedAt)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                        <p className="font-bold text-white/38">Expires</p>
                        <p className="mt-1 text-sm font-bold text-white/72">{formatDateTime(row.expiresAt)}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? "" : row.id)}
                      className="mt-4 w-full rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3 text-sm font-black text-white/72 transition hover:bg-white/[0.085]"
                    >
                      {expanded ? "Close Management" : "Manage"}
                    </button>
                  </div>

                  {expanded ? (
                    <div className="border-t border-white/10 bg-black/10 p-4 sm:p-5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Extend access</p>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {[7, 15, 30].map((days) => (
                            <button
                              key={days}
                              type="button"
                              disabled={isBusy || !row.activatedAt}
                              onClick={() => runUpdate(row, "extend", { days })}
                              className="rounded-2xl border border-cyan-200/15 bg-cyan-300/8 px-3 py-2.5 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/14 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              +{days} days
                            </button>
                          ))}
                        </div>

                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="datetime-local"
                            value={customDates[row.id] || ""}
                            onChange={(event) => setCustomDates((current) => ({ ...current, [row.id]: event.target.value }))}
                            disabled={isBusy || !row.activatedAt}
                            className="min-h-11 flex-1 rounded-2xl border border-white/12 bg-[#071120] px-3 text-xs font-bold text-white outline-none focus:border-cyan-200/30 disabled:opacity-40"
                          />
                          <button
                            type="button"
                            disabled={isBusy || !row.activatedAt}
                            onClick={() => extendCustom(row)}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-200/15 bg-cyan-300/8 px-4 text-xs font-black text-cyan-100 disabled:opacity-40"
                          >
                            <CalendarClock className="h-4 w-4" /> Custom date
                          </button>
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Admin note</p>
                        <textarea
                          value={notes[row.id] || ""}
                          onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                          disabled={isBusy}
                          placeholder="Optional note about this code"
                          className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-white/12 bg-[#071120] px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-cyan-200/30 disabled:opacity-50"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => saveNote(row)}
                          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-emerald-200/15 bg-emerald-300/10 px-4 text-xs font-black text-emerald-100 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Save note
                        </button>
                      </div>

                      <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => runUpdate(
                            row,
                            "reset",
                            {},
                            `Reset ${row.code}? This will clear the assigned user, activation date, expiration, and revocation history for this code. The code value and admin note will be preserved.`
                          )}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-200/18 bg-amber-300/10 px-4 text-xs font-black text-amber-100 disabled:opacity-50"
                        >
                          <RefreshCcw className="h-4 w-4" /> Reset code
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || row.status === "Revoked"}
                          onClick={() => runUpdate(
                            row,
                            "revoke",
                            {},
                            `Revoke ${row.code}? Access will stop immediately, while activation history remains visible.`
                          )}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200/18 bg-rose-400/10 px-4 text-xs font-black text-rose-100 disabled:opacity-45"
                        >
                          <ShieldOff className="h-4 w-4" /> Revoke access
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
