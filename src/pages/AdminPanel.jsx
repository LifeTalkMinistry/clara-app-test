import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  KeyRound,
  MessageCircle,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useUserRole from "@/hooks/useUserRole";
import {
  createAdminAccessCode,
  fetchAdminAccessCodes,
  fetchAdminOverview,
  fetchAdminSettings,
  fetchAdminSupportMessages,
  fetchAdminUsers,
  updateAdminAccessCode,
  updateAdminSettings,
  updateAdminSupportMessage,
  updateAdminUser,
} from "@/lib/admin-backend-client";

const USER_STATUSES = ["active", "pending", "inactive"];
const USER_PLANS = ["free", "committed"];
const CODE_STATUSES = ["available", "assigned", "revoked", "expired"];
const SUPPORT_STATUSES = ["open", "read", "resolved"];

function StatCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-white/[0.045] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value ?? 0}</p>
    </div>
  );
}

function SmallSelect({ value, options, onChange, disabled = false }) {
  return (
    <select
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="h-10 min-w-0 rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs font-bold text-white outline-none disabled:opacity-45"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const [nextOverview, nextUsers, nextCodes, nextSupport, nextSettings] =
        await Promise.all([
          fetchAdminOverview(),
          fetchAdminUsers(),
          fetchAdminAccessCodes(),
          fetchAdminSupportMessages(),
          fetchAdminSettings(),
        ]);
      setOverview(nextOverview || null);
      setUsers(Array.isArray(nextUsers) ? nextUsers : []);
      setCodes(Array.isArray(nextCodes) ? nextCodes : []);
      setSupportMessages(Array.isArray(nextSupport) ? nextSupport : []);
      setSettings(nextSettings || null);
    } catch (loadError) {
      setError(loadError?.message || "Unable to load CLARA admin controls.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }
    loadAdminData();
  }, [isAdmin, loadAdminData, navigate, roleLoading]);

  const subscriptionValue = useMemo(() => {
    const cents = Number(overview?.subscription_value_cents || 0);
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(Math.max(cents, 0) / 100);
  }, [overview?.subscription_value_cents]);

  const openSupportCount = useMemo(
    () => supportMessages.filter((message) => message.status !== "resolved").length,
    [supportMessages]
  );

  const patchUserLocal = (id, patch) => {
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, ...patch } : user))
    );
  };

  const saveUser = async (user) => {
    const key = `user:${user.id}`;
    setBusyKey(key);
    setNotice("");
    setError("");
    try {
      const saved = await updateAdminUser(user.id, {
        status: user.status,
        plan: user.plan,
      });
      patchUserLocal(user.id, saved || {});
      setNotice(`${user.name || user.email} updated.`);
      const nextOverview = await fetchAdminOverview();
      setOverview(nextOverview || null);
    } catch (saveError) {
      setError(saveError?.message || "Unable to update this user.");
      await loadAdminData();
    } finally {
      setBusyKey("");
    }
  };

  const patchCodeLocal = (id, patch) => {
    setCodes((current) =>
      current.map((code) => (code.id === id ? { ...code, ...patch } : code))
    );
  };

  const saveCode = async (code) => {
    const key = `code:${code.id}`;
    setBusyKey(key);
    setNotice("");
    setError("");
    try {
      const saved = await updateAdminAccessCode(code.id, {
        status: code.status,
      });
      patchCodeLocal(code.id, saved || {});
      setNotice(`${code.code} updated.`);
      const nextOverview = await fetchAdminOverview();
      setOverview(nextOverview || null);
    } catch (saveError) {
      setError(saveError?.message || "Unable to update this access code.");
      await loadAdminData();
    } finally {
      setBusyKey("");
    }
  };

  const generateCode = async () => {
    setBusyKey("new-code");
    setNotice("");
    setError("");
    try {
      const created = await createAdminAccessCode({ status: "available" });
      setCodes((current) => [created, ...current].filter(Boolean));
      setNotice(`New access code created: ${created?.code || "ready"}`);
      const nextOverview = await fetchAdminOverview();
      setOverview(nextOverview || null);
    } catch (createError) {
      setError(createError?.message || "Unable to create an access code.");
    } finally {
      setBusyKey("");
    }
  };

  const updateSupportStatus = async (message, status) => {
    const key = `support:${message.id}`;
    setBusyKey(key);
    setNotice("");
    setError("");
    try {
      const saved = await updateAdminSupportMessage(message.id, status);
      setSupportMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, ...(saved || {}), status } : item
        )
      );
      setNotice("Support message updated.");
    } catch (saveError) {
      setError(saveError?.message || "Unable to update this support message.");
    } finally {
      setBusyKey("");
    }
  };

  const savePlatformMode = async () => {
    setBusyKey("platform-settings");
    setNotice("");
    setError("");
    try {
      const saved = await updateAdminSettings({
        dashboardMode: settings?.dashboard_mode || "live",
        backendApiAddress: settings?.backend_api_address || "",
      });
      setSettings(saved || settings);
      setNotice("Platform settings updated.");
    } catch (saveError) {
      setError(saveError?.message || "Unable to update platform settings.");
    } finally {
      setBusyKey("");
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020817] px-5 text-white">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-bold text-white/65">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading admin controls...
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-md px-4 pb-24 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-white/70"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/55">
              CLARA Control Center
            </p>
            <h1 className="mt-1 text-lg font-black">Admin Panel</h1>
          </div>
          <button
            type="button"
            onClick={loadAdminData}
            aria-label="Refresh admin panel"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-white/70"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-xs font-bold text-emerald-100">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-xs font-bold leading-5 text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="mt-5 grid grid-cols-2 gap-3">
          <StatCard label="Users" value={overview?.total_users} />
          <StatCard label="Active users" value={overview?.active_users} />
          <StatCard label="Available codes" value={overview?.available_codes} />
          <StatCard label="Open support" value={openSupportCount} />
          <StatCard label="Subscription value" value={subscriptionValue} />
        </section>

        <section className="mt-5 rounded-[28px] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_38%),rgba(255,255,255,0.035)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-100">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black">Support inbox</h2>
              <p className="mt-1 text-[11px] text-white/42">
                Messages sent from CLARA Settings appear here.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {supportMessages.length ? (
              supportMessages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-2xl border border-white/10 bg-black/15 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">
                        {message.sender_name || "CLARA User"}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-white/40">
                        {message.sender_email}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/55">
                      {message.status}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-black text-emerald-100/85">
                    {message.topic}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-white/62">
                    {message.content}
                  </p>
                  <p className="mt-3 text-[10px] text-white/30">
                    {message.created_at
                      ? new Date(message.created_at).toLocaleString()
                      : ""}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {SUPPORT_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busyKey === `support:${message.id}`}
                        onClick={() => updateSupportStatus(message, status)}
                        className={`rounded-xl border px-2 py-2 text-[10px] font-black uppercase transition disabled:opacity-45 ${
                          message.status === status
                            ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100"
                            : "border-white/10 bg-white/[0.04] text-white/45"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-5 text-center text-xs text-white/40">
                No support messages yet.
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-white/12 bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black">Users & membership</h2>
              <p className="mt-1 text-[11px] text-white/42">
                Change account status or CLARA plan.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl border border-white/10 bg-black/15 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {user.name || "CLARA User"}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-white/40">
                    {user.email}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/45">
                    {user.role}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                  <SmallSelect
                    value={user.status}
                    options={USER_STATUSES}
                    onChange={(status) => patchUserLocal(user.id, { status })}
                    disabled={busyKey === `user:${user.id}`}
                  />
                  <SmallSelect
                    value={user.plan}
                    options={USER_PLANS}
                    onChange={(plan) => patchUserLocal(user.id, { plan })}
                    disabled={busyKey === `user:${user.id}`}
                  />
                  <button
                    type="button"
                    onClick={() => saveUser(user)}
                    disabled={busyKey === `user:${user.id}`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 disabled:opacity-45"
                    aria-label={`Save ${user.name || user.email}`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-white/12 bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-100">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-black">Access codes</h2>
                <p className="mt-1 text-[11px] text-white/42">
                  Generate and manage CLARA codes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={generateCode}
              disabled={busyKey === "new-code"}
              className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-black text-emerald-100 disabled:opacity-45"
            >
              {busyKey === "new-code" ? "Creating..." : "Generate"}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {codes.map((code) => (
              <div
                key={code.id}
                className="grid grid-cols-[1fr_120px_40px] items-center gap-2 rounded-2xl border border-white/10 bg-black/15 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-black text-white/85">
                    {code.code}
                  </p>
                  <p className="mt-1 truncate text-[10px] text-white/35">
                    {code.assigned_user_name || "Not assigned"}
                  </p>
                </div>
                <SmallSelect
                  value={code.status}
                  options={CODE_STATUSES}
                  onChange={(status) => patchCodeLocal(code.id, { status })}
                  disabled={busyKey === `code:${code.id}`}
                />
                <button
                  type="button"
                  onClick={() => saveCode(code)}
                  disabled={busyKey === `code:${code.id}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-emerald-100 disabled:opacity-45"
                  aria-label={`Save access code ${code.code}`}
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-white/12 bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-300/10 text-violet-100">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black">Platform mode</h2>
              <p className="mt-1 text-[11px] text-white/42">
                Control whether the CLARA dashboard is live or in maintenance.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <SmallSelect
              value={settings?.dashboard_mode || "live"}
              options={["live", "maintenance"]}
              onChange={(dashboard_mode) =>
                setSettings((current) => ({ ...(current || {}), dashboard_mode }))
              }
              disabled={busyKey === "platform-settings"}
            />
            <button
              type="button"
              onClick={savePlatformMode}
              disabled={busyKey === "platform-settings"}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-slate-950 disabled:opacity-45"
            >
              <ShieldCheck className="h-4 w-4" />
              {busyKey === "platform-settings" ? "Saving..." : "Save mode"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
