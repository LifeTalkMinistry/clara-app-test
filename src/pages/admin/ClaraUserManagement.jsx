import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, Link2, RefreshCcw, Search, ShieldAlert, UserRoundCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  addAdminUserNote,
  fetchAdminUser,
  fetchAdminUsers,
  fetchLegacyIosAccessRecords,
  linkLegacyIosAccessRecord,
  revokeAdminUserSessions,
  setAdminTemporaryPassword,
  softDeleteAdminUser,
  updateAdminAccountStatus,
  updateAdminMembership,
  updateAdminUserProfile,
} from "@/lib/account-api-client";

const EMPTY_FILTERS = {
  search: "",
  platform: "",
  plan: "",
  subscriptionStatus: "",
  accountStatus: "",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ children, tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200/15 bg-amber-300/10 text-amber-100"
      : tone === "danger"
        ? "border-rose-200/15 bg-rose-300/10 text-rose-100"
        : "border-cyan-200/15 bg-cyan-300/10 text-cyan-100";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${toneClass}`}>
      {children}
    </span>
  );
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-200/35";

export default function ClaraUserManagement() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [legacyRecords, setLegacyRecords] = useState([]);
  const [legacyLinks, setLegacyLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: "", email: "" });
  const [membershipForm, setMembershipForm] = useState({
    plan: "free",
    subscriptionStatus: "active",
    source: "free",
    startedAt: "",
    currentPeriodEnd: "",
    cancelAtPeriodEnd: false,
  });
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const activeFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
    [filters]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchAdminUsers(activeFilters);
      setUsers(payload.users || []);
      setTotal(payload.total || 0);
      if (selectedId && !(payload.users || []).some((user) => user.id === selectedId)) {
        setSelectedId(null);
        setSelected(null);
      }
    } catch (error) {
      toast.error(error?.message || "Unable to load CLARA users.");
    } finally {
      setLoading(false);
    }
  }, [activeFilters, selectedId]);

  const loadSelected = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const payload = await fetchAdminUser(userId);
      setSelected(payload);
      setProfileForm({
        displayName: payload.user?.displayName || "",
        email: payload.user?.email || "",
      });
      setMembershipForm({
        plan: payload.membership?.plan || "free",
        subscriptionStatus: payload.membership?.subscriptionStatus || "active",
        source: payload.membership?.source || "free",
        startedAt: toLocalDateTime(payload.membership?.startedAt),
        currentPeriodEnd: toLocalDateTime(payload.membership?.currentPeriodEnd),
        cancelAtPeriodEnd: Boolean(payload.membership?.cancelAtPeriodEnd),
      });
    } catch (error) {
      toast.error(error?.message || "Unable to load this account.");
    }
  }, []);

  const loadLegacy = useCallback(async () => {
    try {
      const payload = await fetchLegacyIosAccessRecords();
      setLegacyRecords(payload.records || []);
    } catch {
      setLegacyRecords([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, filters.search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.platform, filters.plan, filters.subscriptionStatus, filters.accountStatus, loadUsers]);

  useEffect(() => {
    loadLegacy();
  }, [loadLegacy]);

  const selectUser = (userId) => {
    setSelectedId(userId);
    loadSelected(userId);
  };

  const perform = async (callback, successMessage) => {
    if (!selectedId || saving) return;
    setSaving(true);
    try {
      await callback();
      toast.success(successMessage);
      await Promise.all([loadUsers(), loadSelected(selectedId)]);
    } catch (error) {
      toast.error(error?.message || "The account could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const linkLegacyRecord = async (recordId) => {
    const userId = legacyLinks[recordId];
    if (!userId || saving) return;
    setSaving(true);
    try {
      await linkLegacyIosAccessRecord(recordId, userId);
      toast.success("Legacy iOS record linked to the CLARA account.");
      await loadLegacy();
    } catch (error) {
      toast.error(error?.message || "The legacy record could not be linked.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen px-4 pb-12 pt-[calc(env(safe-area-inset-top)+1rem)] text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">Protected Developer UI</p>
              <h1 className="text-2xl font-black">CLARA User Management</h1>
              <p className="mt-1 text-xs font-semibold text-white/45">{total} registered accounts across iPhone, Android, and web</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => Promise.all([loadUsers(), loadLegacy()])}
            disabled={loading}
            className="flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-200/15 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <section className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.045] p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(130px,0.45fr))]">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3">
              <Search className="h-4 w-4 text-white/40" />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search name or email"
                className="min-h-11 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/30"
              />
            </div>
            <select value={filters.platform} onChange={(event) => setFilters((current) => ({ ...current, platform: event.target.value }))} className={inputClass}>
              <option value="">All platforms</option>
              <option value="ios_pwa">iOS PWA</option>
              <option value="android">Android</option>
              <option value="web">Web</option>
            </select>
            <select value={filters.plan} onChange={(event) => setFilters((current) => ({ ...current, plan: event.target.value }))} className={inputClass}>
              <option value="">All plans</option>
              <option value="free">Free</option>
              <option value="beta">Beta</option>
              <option value="committed">Committed</option>
            </select>
            <select value={filters.subscriptionStatus} onChange={(event) => setFilters((current) => ({ ...current, subscriptionStatus: event.target.value }))} className={inputClass}>
              <option value="">All subscriptions</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
              <option value="refunded">Refunded</option>
            </select>
            <select value={filters.accountStatus} onChange={(event) => setFilters((current) => ({ ...current, accountStatus: event.target.value }))} className={inputClass}>
              <option value="">All account states</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Disabled</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-black/20">
            <div className="grid grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr] gap-3 border-b border-white/8 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
              <span>Account</span><span>Platform</span><span>Plan</span><span>Status</span>
            </div>
            <div className="max-h-[68vh] overflow-y-auto">
              {loading ? <p className="p-6 text-sm font-semibold text-white/50">Loading accounts...</p> : null}
              {!loading && users.length === 0 ? <p className="p-6 text-sm font-semibold text-white/50">No accounts match these filters.</p> : null}
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user.id)}
                  className={`grid w-full grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr] gap-3 border-b border-white/6 px-4 py-4 text-left transition hover:bg-white/[0.05] ${selectedId === user.id ? "bg-cyan-300/[0.08]" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-white">{user.displayName}</span>
                    <span className="mt-1 block truncate text-xs font-semibold text-white/42">{user.email}</span>
                    <span className="mt-1 block truncate text-[10px] text-white/25">{user.id}</span>
                    {user.mustChangePassword ? <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.1em] text-amber-200">Password change required</span> : null}
                  </span>
                  <span className="text-xs font-bold text-white/65">{user.signupPlatform}</span>
                  <span className="text-xs font-bold text-white/65">{user.plan}</span>
                  <span className="text-xs font-bold text-white/65">{user.accountStatus}<br />{user.subscriptionStatus}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[26px] border border-white/10 bg-white/[0.045] p-4">
            {!selected ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <UserRoundCog className="h-10 w-10 text-cyan-100/40" />
                <p className="mt-4 text-sm font-black">Select an account</p>
                <p className="mt-2 max-w-xs text-xs font-semibold leading-5 text-white/42">Choose a user to edit identity, subscription, access status, password, sessions, and notes.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-black">{selected.user.displayName}</p>
                  <p className="text-xs font-semibold text-white/42">Created {formatDate(selected.user.createdAt)}</p>
                  <p className="mt-1 break-all text-[10px] text-white/28">Account ID: {selected.user.id}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusPill>{selected.user.signupPlatform}</StatusPill>
                    <StatusPill tone={selected.user.accountStatus === "active" ? "default" : "danger"}>{selected.user.accountStatus}</StatusPill>
                    <StatusPill tone={selected.user.mustChangePassword ? "warning" : "default"}>
                      {selected.user.mustChangePassword ? "Must change password" : "Private password set"}
                    </StatusPill>
                    {selected.membership?.cancelAtPeriodEnd ? <StatusPill tone="warning">Cancels at period end</StatusPill> : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Display name"><input className={inputClass} value={profileForm.displayName} onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))} /></Field>
                  <Field label="Email"><input className={inputClass} type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} /></Field>
                </div>
                <button type="button" disabled={saving} onClick={() => perform(() => updateAdminUserProfile(selectedId, profileForm), "Profile updated.")} className="min-h-11 w-full rounded-xl bg-cyan-200 px-4 text-sm font-black text-slate-950 disabled:opacity-50">Save Profile</button>

                <div className="h-px bg-white/8" />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Account status">
                    <select className={inputClass} value={selected.user.accountStatus} onChange={(event) => perform(() => updateAdminAccountStatus(selectedId, event.target.value), "Account status updated.")}>
                      <option value="active">Active / Restore</option>
                      <option value="suspended">Suspended</option>
                      <option value="disabled">Disabled</option>
                      <option value="deleted" disabled>Deleted</option>
                    </select>
                  </Field>
                  <Field label="Plan"><select className={inputClass} value={membershipForm.plan} onChange={(event) => setMembershipForm((current) => ({ ...current, plan: event.target.value }))}><option value="free">Free</option><option value="beta">Beta</option><option value="committed">Committed</option></select></Field>
                  <Field label="Subscription status"><select className={inputClass} value={membershipForm.subscriptionStatus} onChange={(event) => setMembershipForm((current) => ({ ...current, subscriptionStatus: event.target.value }))}><option value="active">Active</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option><option value="suspended">Suspended</option><option value="refunded">Refunded</option></select></Field>
                  <Field label="Source"><select className={inputClass} value={membershipForm.source} onChange={(event) => setMembershipForm((current) => ({ ...current, source: event.target.value }))}><option value="free">Free</option><option value="manual">Manual</option><option value="beta">Beta</option><option value="android">Android</option><option value="ios">iOS</option><option value="web">Web</option></select></Field>
                  <Field label="Subscription start"><input className={inputClass} type="datetime-local" value={membershipForm.startedAt} onChange={(event) => setMembershipForm((current) => ({ ...current, startedAt: event.target.value }))} /></Field>
                  <Field label="Current-period end"><input className={inputClass} type="datetime-local" value={membershipForm.currentPeriodEnd} onChange={(event) => setMembershipForm((current) => ({ ...current, currentPeriodEnd: event.target.value }))} /></Field>
                  <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 text-xs font-bold text-white/65"><input type="checkbox" checked={membershipForm.cancelAtPeriodEnd} onChange={(event) => setMembershipForm((current) => ({ ...current, cancelAtPeriodEnd: event.target.checked }))} />Cancel at period end</label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => perform(
                      () => updateAdminMembership(selectedId, {
                        ...membershipForm,
                        startedAt: membershipForm.startedAt ? new Date(membershipForm.startedAt).toISOString() : null,
                        currentPeriodEnd: membershipForm.currentPeriodEnd ? new Date(membershipForm.currentPeriodEnd).toISOString() : null,
                      }),
                      "Membership updated."
                    )}
                    className="min-h-11 rounded-xl bg-emerald-300 px-4 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    Save Membership
                  </button>
                  <button type="button" disabled={saving} onClick={() => perform(() => updateAdminMembership(selectedId, { cancelImmediately: true }), "Subscription cancelled immediately.")} className="min-h-11 rounded-xl border border-amber-200/18 bg-amber-400/10 px-4 text-sm font-black text-amber-100 disabled:opacity-50">Cancel Immediately</button>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/15 p-3 text-xs font-semibold leading-5 text-white/50">
                  <p>Source: {selected.membership?.source || "free"}</p>
                  <p>Started: {formatDate(selected.membership?.startedAt)}</p>
                  <p>Period end: {formatDate(selected.membership?.currentPeriodEnd)}</p>
                  <p>Cancelled: {formatDate(selected.membership?.cancelledAt)}</p>
                </div>

                <div className="h-px bg-white/8" />

                <Field label="Temporary password">
                  <div className="flex gap-2"><input className={inputClass} value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} placeholder="Strong temporary password" /><button type="button" disabled={saving || !temporaryPassword} onClick={() => perform(async () => { await setAdminTemporaryPassword(selectedId, temporaryPassword); setTemporaryPassword(""); }, "Temporary password set and sessions revoked.")} className="shrink-0 rounded-xl border border-cyan-200/15 bg-cyan-300/10 px-3 text-cyan-50"><KeyRound className="h-4 w-4" /></button></div>
                </Field>
                <button type="button" disabled={saving} onClick={() => perform(() => revokeAdminUserSessions(selectedId), "All active sessions revoked.")} className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/75 disabled:opacity-50">Revoke All Sessions</button>

                <Field label="Administrator note">
                  <textarea className={`${inputClass} min-h-24 py-3`} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Internal account note only" />
                </Field>
                <button type="button" disabled={saving || !adminNote.trim()} onClick={() => perform(async () => { await addAdminUserNote(selectedId, adminNote.trim()); setAdminNote(""); }, "Administrator note added.")} className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/75 disabled:opacity-50">Add Note</button>

                {selected.notes?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">Administrator notes</p>
                    {selected.notes.map((note) => (
                      <div key={note.id} className="rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5">
                        <p className="text-xs font-semibold leading-5 text-white/70">{note.note}</p>
                        <p className="mt-1 text-[10px] text-white/30">{formatDate(note.created_at)} · {note.admin_identifier}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={saving || selected.user.accountStatus === "deleted"}
                  onClick={() => {
                    if (!window.confirm("Soft-delete this CLARA account and revoke all sessions? Local financial data on the user’s device will not be erased.")) return;
                    perform(() => softDeleteAdminUser(selectedId), "Account soft-deleted.");
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200/15 bg-rose-500/10 px-4 text-sm font-black text-rose-100 disabled:opacity-50"
                >
                  <ShieldAlert className="h-4 w-4" /> Soft-delete Account
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="mt-5 rounded-[26px] border border-amber-200/12 bg-amber-400/[0.06] p-4">
          <h2 className="text-sm font-black text-amber-100">Legacy iOS Access</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-amber-100/55">The old code system is deprecated and no longer gates new users. Import activated historical records into the migration table before linking them to new CLARA accounts.</p>
          <p className="mt-3 text-xs font-bold text-amber-100/70">Imported legacy records: {legacyRecords.length}</p>
          {legacyRecords.length ? (
            <div className="mt-3 space-y-2">
              {legacyRecords.map((record) => (
                <div key={record.id} className="grid gap-3 rounded-2xl border border-amber-100/10 bg-black/15 p-3 md:grid-cols-[1fr_minmax(220px,0.8fr)_auto] md:items-center">
                  <div>
                    <p className="text-sm font-black text-amber-50">{record.activated_name || record.legacy_code_label || "Legacy iOS user"}</p>
                    <p className="mt-1 text-xs font-semibold text-amber-100/45">{record.activated_email || "No email recorded"}</p>
                    <p className="mt-1 text-[10px] text-amber-100/30">Activated {formatDate(record.activated_at)}</p>
                  </div>
                  {record.linked_user_id ? (
                    <StatusPill>Linked to {record.linked_user_id}</StatusPill>
                  ) : (
                    <select
                      className={inputClass}
                      value={legacyLinks[record.id] || ""}
                      onChange={(event) => setLegacyLinks((current) => ({ ...current, [record.id]: event.target.value }))}
                    >
                      <option value="">Choose CLARA account</option>
                      {users.map((user) => <option key={user.id} value={user.id}>{user.displayName} — {user.email}</option>)}
                    </select>
                  )}
                  <button
                    type="button"
                    disabled={saving || Boolean(record.linked_user_id) || !legacyLinks[record.id]}
                    onClick={() => linkLegacyRecord(record.id)}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-100/15 bg-amber-300/10 px-3 text-xs font-black text-amber-50 disabled:opacity-45"
                  >
                    <Link2 className="h-4 w-4" /> Link
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
