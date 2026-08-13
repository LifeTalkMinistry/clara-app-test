import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Loader2, RotateCcw, ShieldAlert, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  fetchAdminPhaseZeroTracker,
  updateAdminPhaseZeroTracker,
} from "@/lib/admin-backend-client";

const STORAGE_KEY = "clara_admin_phase_zero_tracker_v1";

const STATUS_OPTIONS = [
  { key: "not_started", label: "Not Started" },
  { key: "in_progress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "ready", label: "Ready" },
  { key: "later", label: "Later" },
];

const STATUS_STYLES = {
  not_started: "border-white/10 bg-white/[0.04] text-white/55",
  in_progress: "border-amber-300/20 bg-amber-400/10 text-amber-100",
  blocked: "border-rose-300/25 bg-rose-500/12 text-rose-100",
  ready: "border-emerald-300/25 bg-emerald-400/12 text-emerald-100",
  later: "border-violet-300/20 bg-violet-400/10 text-violet-100",
};

const PHASE_ZERO_CATEGORIES = [
  {
    key: "accounts",
    label: "A. Account & Access",
    tasks: [
      ["P0-A01", "Create account", "in_progress"],
      ["P0-A02", "Login", "in_progress"],
      ["P0-A03", "Logout", "in_progress"],
      ["P0-A04", "Forgot password", "in_progress"],
      ["P0-A05", "Reset password", "in_progress"],
      ["P0-A06", "Session restoration", "in_progress"],
      ["P0-A07", "Offline authentication fallback", "in_progress"],
      ["P0-A08", "Account ↔ local vault isolation", "in_progress"],
      ["P0-A09", "Onboarding / activation", "in_progress"],
      ["P0-A10", "Data export", "in_progress"],
    ],
  },
  {
    key: "financial",
    label: "B. Financial Core",
    tasks: [
      ["P0-F01", "Income Hub", "in_progress"],
      ["P0-F02", "Wallet Hub", "in_progress"],
      ["P0-F03", "Wallet transfers", "in_progress"],
      ["P0-F04", "Wallet deletion / archive integrity", "in_progress"],
      ["P0-F05", "Budget Hub", "in_progress"],
      ["P0-F06", "Transaction Hub / expenses", "in_progress"],
      ["P0-F07", "Money Left", "in_progress"],
      ["P0-F08", "Emergency Fund", "in_progress"],
      ["P0-F09", "Savings Goals", "in_progress"],
      ["P0-F10", "Debt / Obligations", "in_progress"],
      ["P0-F11", "Ask Before You Spend", "in_progress"],
      ["P0-F12", "Analytics", "in_progress"],
      ["P0-F13", "AI Financial Guidance", "in_progress"],
      ["P0-F14", "One universal free-core access authority", "ready"],
    ],
  },
  {
    key: "accountability",
    label: "C. Accountability Engine",
    tasks: [
      ["P0-AC01", "Daily Money Tip", "in_progress"],
      ["P0-AC02", "Daily check-in", "in_progress"],
      ["P0-AC03", "Daily streak", "in_progress"],
      ["P0-AC04", "30-Day streak completion", "in_progress"],
      ["P0-AC05", "Challenge Hub", "in_progress"],
      ["P0-AC06", "Backend-authoritative challenge progress", "blocked"],
      ["P0-AC07", "Achievements / badges", "in_progress"],
      ["P0-AC08", "Schedule", "in_progress"],
      ["P0-AC09", "Reminders / notifications", "in_progress"],
    ],
  },
  {
    key: "community",
    label: "D. Community",
    tasks: [
      ["P0-C01", "Community Feed", "in_progress"],
      ["P0-C02", "Create posts", "in_progress"],
      ["P0-C03", "Photos / videos / files", "in_progress"],
      ["P0-C04", "Comments", "in_progress"],
      ["P0-C05", "Reactions", "in_progress"],
      ["P0-C06", "Edit / delete own post", "in_progress"],
      ["P0-C07", "Profiles / People discovery", "in_progress"],
      ["P0-C08", "My Circle", "in_progress"],
      ["P0-C09", "Circle invitations", "in_progress"],
      ["P0-C10", "Circle activity / check-ins", "in_progress"],
      ["P0-C11", "Private messages", "in_progress"],
      ["P0-C12", "Notifications", "in_progress"],
      ["P0-C13", "Report Post / Comment / User", "blocked"],
      ["P0-C14", "Block User", "blocked"],
      ["P0-C15", "Free-user Community access alignment", "blocked"],
    ],
  },
  {
    key: "learning",
    label: "E. Learning, Guidance & Support",
    tasks: [
      ["P0-L01", "Learning Hub", "in_progress"],
      ["P0-L02", "CLARA Guide Mode", "in_progress"],
      ["P0-L03", "Learning Modules", "in_progress"],
      ["P0-L04", "Welcome / orientation", "in_progress"],
      ["P0-L05", "Coaching scheduling", "in_progress"],
      ["P0-L06", "Support CLARA", "in_progress"],
      ["P0-L07", "News", "later"],
      ["P0-L08", "Referrals", "later"],
    ],
  },
  {
    key: "ux",
    label: "F. Navigation / UX / Device Experience",
    tasks: [
      ["P0-UX01", "Unified top navigation", "in_progress"],
      ["P0-UX02", "Home integration", "in_progress"],
      ["P0-UX03", "Responsive layouts", "in_progress"],
      ["P0-UX04", "Android production experience", "in_progress"],
      ["P0-UX05", "iPhone PWA production experience", "in_progress"],
      ["P0-UX06", "Empty states", "in_progress"],
      ["P0-UX07", "Loading / error feedback consistency", "in_progress"],
      ["P0-UX08", "Accessibility", "in_progress"],
      ["P0-UX09", "Performance", "in_progress"],
    ],
  },
  {
    key: "security",
    label: "G. Security & Privacy",
    tasks: [
      ["P0-S01", "Android signing-key security / rotation", "blocked"],
      ["P0-S02", "Production environment secret review", "in_progress"],
      ["P0-S03", "Backend authorization", "in_progress"],
      ["P0-S04", "Financial data isolation", "in_progress"],
      ["P0-S05", "Community privacy authorization", "in_progress"],
      ["P0-S06", "Media upload server security", "in_progress"],
      ["P0-S07", "Admin-route protection", "in_progress"],
      ["P0-S08", "Data deletion / retention lifecycle", "in_progress"],
    ],
  },
  {
    key: "operations",
    label: "H. Production / Operations",
    tasks: [
      ["P0-O01", "Automated regression testing", "ready"],
      ["P0-O02", "Production deployment", "in_progress"],
      ["P0-O03", "Backend availability handling", "in_progress"],
      ["P0-O04", "Automated database backup verified", "blocked"],
      ["P0-O05", "Database restore test passed", "blocked"],
      ["P0-O06", "Rollback procedure", "in_progress"],
      ["P0-O07", "Centralized error monitoring", "in_progress"],
      ["P0-O08", "Incident playbook", "blocked"],
      ["P0-O09", "Admin troubleshooting readiness", "in_progress"],
    ],
  },
];

function buildBaselineStatuses() {
  return PHASE_ZERO_CATEGORIES.reduce((acc, category) => {
    category.tasks.forEach(([id, , status]) => {
      acc[id] = status;
    });
    return acc;
  }, {});
}

function readLocalStatuses() {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalStatuses(statuses) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // Backend persistence remains authoritative when storage is unavailable.
  }
}

function StatusSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={`h-9 w-[118px] shrink-0 rounded-xl border px-2 text-[10px] font-black outline-none transition disabled:opacity-50 ${STATUS_STYLES[value] || STATUS_STYLES.not_started}`}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.key} value={option.key} className="bg-[#07131f] text-white">
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default function AdminPhaseZeroTracker() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");
  const baseline = useMemo(() => buildBaselineStatuses(), []);
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState(() => ({ ...baseline, ...readLocalStatuses() }));
  const [expanded, setExpanded] = useState(() => new Set(["financial", "security", "operations"]));
  const [savingId, setSavingId] = useState("");
  const [syncState, setSyncState] = useState("loading");

  const syncFromBackend = useCallback(async () => {
    if (!isAdminPath) return;
    const local = readLocalStatuses();
    try {
      setSyncState("loading");
      const payload = await fetchAdminPhaseZeroTracker();
      const remote = payload?.statuses && typeof payload.statuses === "object" ? payload.statuses : {};
      if (Object.keys(remote).length > 0) {
        const next = { ...baseline, ...remote };
        setStatuses(next);
        writeLocalStatuses(next);
      } else if (Object.keys(local).length > 0) {
        const next = { ...baseline, ...local };
        setStatuses(next);
        await updateAdminPhaseZeroTracker(next);
      } else {
        setStatuses(baseline);
      }
      setSyncState("synced");
    } catch {
      setStatuses({ ...baseline, ...local });
      setSyncState("local");
    }
  }, [baseline, isAdminPath]);

  useEffect(() => {
    if (!isAdminPath) return;
    void syncFromBackend();
  }, [isAdminPath, syncFromBackend]);

  const flatTasks = useMemo(
    () => PHASE_ZERO_CATEGORIES.flatMap((category) => category.tasks.map(([id, label, initialStatus]) => ({ id, label, initialStatus, category: category.key }))),
    []
  );

  const requiredTasks = useMemo(
    () => flatTasks.filter((task) => statuses[task.id] !== "later"),
    [flatTasks, statuses]
  );
  const readyCount = requiredTasks.filter((task) => statuses[task.id] === "ready").length;
  const blockedCount = requiredTasks.filter((task) => statuses[task.id] === "blocked").length;
  const progress = requiredTasks.length ? Math.round((readyCount / requiredTasks.length) * 100) : 0;

  const saveStatuses = async (next, taskId = "") => {
    setStatuses(next);
    writeLocalStatuses(next);
    setSavingId(taskId);
    try {
      await updateAdminPhaseZeroTracker(next);
      setSyncState("synced");
    } catch {
      setSyncState("local");
    } finally {
      setSavingId("");
    }
  };

  const changeStatus = (taskId, status) => {
    const next = { ...statuses, [taskId]: status };
    void saveStatuses(next, taskId);
  };

  const resetBaseline = () => {
    if (!window.confirm("Reset every Phase 0 item to the original audit status?")) return;
    const next = { ...baseline };
    void saveStatuses(next, "reset");
  };

  const toggleCategory = (key) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!isAdminPath) return null;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+18px)] left-4 z-[2147482500] flex items-center gap-2 rounded-2xl border border-cyan-200/25 bg-[linear-gradient(135deg,rgba(7,32,48,.98),rgba(14,20,55,.98))] px-3.5 py-3 text-left text-white shadow-[0_18px_50px_rgba(0,0,0,.48),0_0_28px_rgba(34,211,238,.12)] backdrop-blur-xl"
          aria-label="Open Phase 0 production tracker"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/55">Phase 0</span>
            <span className="mt-0.5 block text-xs font-black">{progress}% ready · {blockedCount} blocked</span>
          </span>
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[2147482600] bg-[#020817] text-white">
          <div className="flex h-[100dvh] flex-col">
            <header className="shrink-0 border-b border-white/10 bg-[#04101f]/96 px-4 pb-4 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl">
              <div className="mx-auto flex w-full max-w-4xl items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/55">CLARA Production Roadmap</p>
                  <h1 className="mt-1 text-xl font-black tracking-[-0.03em]">Phase 0 — Production Foundation</h1>
                  <p className="mt-1 text-[11px] font-semibold text-white/42">Finish, secure, connect, and verify the CLARA we already built.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/65"
                  aria-label="Close Phase 0 tracker"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+34px)] pt-4">
              <div className="mx-auto w-full max-w-4xl space-y-4">
                <section className="rounded-[26px] border border-cyan-200/12 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.10),transparent_42%),rgba(255,255,255,.035)] p-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Ready</p>
                      <p className="mt-1 text-xl font-black text-emerald-200">{readyCount}/{requiredTasks.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Blocked</p>
                      <p className="mt-1 text-xl font-black text-rose-200">{blockedCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Progress</p>
                      <p className="mt-1 text-xl font-black text-cyan-100">{progress}%</p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#34d399)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-white/40">
                      {syncState === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : syncState === "synced" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />}
                      {syncState === "loading" ? "Checking backend..." : syncState === "synced" ? "Saved to CLARA backend" : "Saved on this device · backend sync pending"}
                    </div>
                    <button type="button" onClick={resetBaseline} disabled={savingId === "reset"} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black text-white/50 disabled:opacity-40">
                      {savingId === "reset" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Reset audit baseline
                    </button>
                  </div>

                  <p className="mt-3 rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.05] px-3 py-2.5 text-[10px] font-bold leading-5 text-emerald-100/70">
                    Phase gate: no critical blockers + all core user journeys verified on real devices + backend/data recovery proven.
                  </p>
                </section>

                {PHASE_ZERO_CATEGORIES.map((category) => {
                  const isExpanded = expanded.has(category.key);
                  const categoryReady = category.tasks.filter(([id]) => statuses[id] === "ready").length;
                  const categoryBlocked = category.tasks.filter(([id]) => statuses[id] === "blocked").length;
                  return (
                    <section key={category.key} className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.028]">
                      <button type="button" onClick={() => toggleCategory(category.key)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
                        <div className="min-w-0 flex-1">
                          <h2 className="text-sm font-black text-white/90">{category.label}</h2>
                          <p className="mt-1 text-[10px] font-bold text-white/34">{categoryReady}/{category.tasks.length} ready{categoryBlocked ? ` · ${categoryBlocked} blocked` : ""}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-white/[0.07]">
                          {category.tasks.map(([id, label]) => {
                            const value = statuses[id] || "not_started";
                            return (
                              <div key={id} className="flex items-center gap-3 border-b border-white/[0.055] px-4 py-3 last:border-b-0">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/38">{id}</p>
                                  <p className="mt-1 text-xs font-bold leading-5 text-white/75">{label}</p>
                                </div>
                                <div className="relative">
                                  {savingId === id ? <Loader2 className="absolute -left-5 top-2.5 h-3.5 w-3.5 animate-spin text-cyan-100/45" /> : null}
                                  <StatusSelect value={value} onChange={(status) => changeStatus(id, status)} disabled={Boolean(savingId && savingId !== id)} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </main>
          </div>
        </div>
      ) : null}
    </>
  );
}
