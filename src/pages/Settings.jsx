import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Bell, ChevronRight, CreditCard, KeyRound, LogOut, Mail, Mic, Moon, Save, Settings2, Shield, Sparkles, Trash2, User } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { PLAN_BADGE_STYLES, PLAN_LABELS, normalizePlanKey } from "@/lib/plan-config";
import NotificationSettingsPanel from "@/components/notifications/NotificationSettingsPanel";
import { CLARA_VOICE_OPTIONS, readClaraSettings, saveClaraSettings } from "@/lib/clara-settings";

const ROLE_STYLES = {
  admin: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  student: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  free_user: "bg-white/10 text-slate-200 border-white/10",
  user: "bg-white/10 text-slate-200 border-white/10",
  paid_user: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
};

const SECTION_META = {
  account: { label: "Account", icon: User, subtitle: "Identity, plan, and account overview." },
  notifications: { label: "Notifications", icon: Bell, subtitle: "Control reminders and product communication." },
  privacy: { label: "Privacy", icon: Shield, subtitle: "Manage visibility, analytics, and session privacy." },
  security: { label: "Security", icon: KeyRound, subtitle: "Authentication and account protection." },
  preferences: { label: "App Preferences", icon: Settings2, subtitle: "Display and in-app experience preferences." },
  billing: { label: "Billing", icon: CreditCard, subtitle: "Plan and subscription access." },
};

const SECTION_ORDER = ["account", "notifications", "privacy", "security", "preferences", "billing"];

function normalizeRole(profile) {
  return String(profile?.role || "user").trim().toLowerCase();
}

function normalizePlan(profile, role) {
  if (role === "admin") return "admin";
  return normalizePlanKey(profile?.plan || "free");
}

function formatDate(value) {
  if (!value) return "Not available";
  try {
    return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "Not available";
  }
}

function getLoginRedirectUrl() {
  const base = import.meta.env.BASE_URL || "/clara-app-test/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${window.location.origin}${normalizedBase}#/login`;
}

function LoadingState() {
  return (
    <div className="theme-page-shell min-h-screen flex items-center justify-center text-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />
        <p className="mt-3 text-sm text-slate-400">Loading settings...</p>
      </div>
    </div>
  );
}

function LauncherCard({ sectionKey, onOpen }) {
  const meta = SECTION_META[sectionKey];
  const Icon = meta.icon;
  return (
    <button type="button" onClick={() => onOpen(sectionKey)} className="launcher-card theme-panel-card">
      <div className="launcher-icon">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold text-white">{meta.label}</p>
        <p className="mt-1 text-xs text-white/50">{meta.subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-white/30" />
    </button>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <div className="theme-panel-card rounded-[28px]">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--theme-accent)]">Settings</p>
            <h2 className="mt-1 text-xl font-bold text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/60">{subtitle}</p>
          </div>
          {action}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, hint, action }) {
  return (
    <div className="theme-soft-card rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="theme-soft-card flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/70">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-sm text-white/80">{value}</p>
          {hint ? <p className="mt-1 text-xs text-white/45">{hint}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="theme-soft-card flex items-start justify-between gap-4 rounded-2xl p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{description}</p>
      </div>
      <button type="button" onClick={onChange} className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-emerald-500" : "bg-white/15"}`} aria-pressed={checked}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { section } = useParams();
  const [searchParams] = useSearchParams();

  const normalizedSection = SECTION_META[section] ? section : "account";
  const viewParam = searchParams.get("view");
  const detailSection = normalizedSection === "account" && SECTION_META[viewParam]
    ? viewParam
    : normalizedSection !== "account"
    ? normalizedSection
    : null;
  const isLauncherView = detailSection === null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSending, setPasswordSending] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [settingsState, setSettingsState] = useState(() => readClaraSettings(null));
  const [initialSettingsState, setInitialSettingsState] = useState(() => readClaraSettings(null));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteRequesting, setDeleteRequesting] = useState(false);
  const deletionRequestUrl =
    import.meta.env.VITE_ACCOUNT_DELETION_URL ||
    "https://lifetalkministry.github.io/clara-app-test/#/account-deletion";

  useEffect(() => {
    if (section && !SECTION_META[section]) {
      navigate("/settings/account", { replace: true });
    }
  }, [section, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [detailSection]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          navigate("/login");
          return;
        }
        if (!mounted) return;
        setUserId(user.id);
        setAuthUser(user);
        const { data: profileData, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (profileError) throw profileError;
        if (!mounted) return;
        const safeProfile = profileData || {};
        const stored = readClaraSettings(user.id);
        setProfile(safeProfile);
        setSettingsState(stored);
        setInitialSettingsState(stored);
      } catch (loadError) {
        console.error("Settings load error:", loadError);
        if (mounted) setError("Failed to load settings.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const role = useMemo(() => normalizeRole(profile), [profile]);
  const plan = useMemo(() => normalizePlan(profile, role), [profile, role]);
  const roleLabel = role === "admin" ? "Admin" : role === "student" ? "Student" : role === "paid_user" ? "Paid User" : role === "free_user" ? "Free User" : "User";
  const planLabel = plan === "admin" ? "Admin" : PLAN_LABELS[plan] || "Free";
  const email = profile?.email || authUser?.email || "";
  const joinedAt = profile?.created_at || authUser?.created_at;
  const enrollmentStatus = String(profile?.enrollment_status || profile?.status || "free").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

  const dirty = useMemo(() => {
    if (detailSection === "privacy") {
      return JSON.stringify(settingsState.privacy) !== JSON.stringify(initialSettingsState.privacy);
    }
    if (detailSection === "preferences") {
      return (
        JSON.stringify(settingsState.preferences) !== JSON.stringify(initialSettingsState.preferences) ||
        JSON.stringify(settingsState.ai) !== JSON.stringify(initialSettingsState.ai)
      );
    }
    return false;
  }, [detailSection, initialSettingsState, settingsState]);

  const activeMeta = detailSection ? SECTION_META[detailSection] : null;

  const openSection = useCallback((nextSection) => {
    setMessage("");
    setError("");
    if (nextSection === "account") {
      navigate("/settings/account?view=account");
      return;
    }
    navigate(`/settings/${nextSection}`);
  }, [navigate]);

  const handleBack = useCallback(() => {
    setMessage("");
    setError("");
    if (detailSection) {
      navigate("/settings/account");
      return;
    }
    navigate(-1);
  }, [detailSection, navigate]);

  const updateNestedSetting = useCallback((group, key, value) => {
    setSettingsState((prev) => ({
      ...prev,
      [group]: { ...prev[group], [key]: value },
    }));
    setMessage("");
    setError("");
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId || !detailSection || !dirty) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      saveClaraSettings(userId, settingsState);
      setInitialSettingsState(settingsState);
      setMessage("Settings updated successfully.");
    } catch (saveError) {
      console.error("Settings save error:", saveError);
      setError("Unable to save your settings right now.");
    } finally {
      setSaving(false);
    }
  }, [detailSection, dirty, settingsState, userId]);

  const handlePasswordReset = useCallback(async () => {
    if (!email) return;
    try {
      setPasswordSending(true);
      setError("");
      setMessage("");
      const base = import.meta.env.BASE_URL || "/";
      const normalizedBase = base.endsWith("/") ? base : `${base}/`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${normalizedBase}#/login`,
      });
      if (resetError) throw resetError;
      setMessage("Password reset email sent. Check your inbox to continue.");
    } catch (resetError) {
      console.error("Password reset error:", resetError);
      setError("Failed to send password reset email.");
    } finally {
      setPasswordSending(false);
    }
  }, [email]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (logoutError) {
      console.error("Settings logout error:", logoutError);
    } finally {
      window.location.replace(getLoginRedirectUrl());
    }
  }, []);

  const handleDeleteAccountRequest = useCallback(async () => {
    if (!userId || !email) return;

    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setMessage("Tap Request deletion again to confirm.");
      return;
    }

    try {
      setDeleteRequesting(true);
      setError("");
      setMessage("");

      const { error: requestError } = await supabase.from("account_deletion_requests").insert([
        {
          user_id: userId,
          email,
          status: "requested",
          requested_from: "in_app",
        },
      ]);

      if (requestError) throw requestError;

      await supabase
        .from("profiles")
        .update({
          account_deletion_requested_at: new Date().toISOString(),
          account_deletion_status: "requested",
        })
        .eq("id", userId);

      setMessage("Account deletion request submitted. CLARA support will process the associated data deletion.");
      setDeleteConfirm(false);
    } catch (deleteError) {
      console.error("Account deletion request error:", deleteError);
      setError("Unable to submit deletion request right now.");
    } finally {
      setDeleteRequesting(false);
    }
  }, [deleteConfirm, email, userId]);

  if (loading) return <LoadingState />;

  return (
    <div className="theme-page-shell min-h-screen text-white px-4 pt-4 pb-32">
      <div className="mx-auto max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <button onClick={handleBack} className="btn">
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">Control Center</p>
            <h1 className="mt-1 text-lg font-bold">{isLauncherView ? "Settings" : activeMeta.label}</h1>
          </div>

          {detailSection ? (
            <button onClick={handleSave} disabled={!dirty || saving} className={`saveBtn ${!dirty || saving ? "saveBtnDisabled" : ""}`}>
              <Save size={16} />
            </button>
          ) : (
            <div className="spacer" />
          )}
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        {isLauncherView ? (
          <>
            <div className="theme-panel-card mb-4 overflow-hidden rounded-[28px]">
              <div className="px-5 py-5" style={{ background: "var(--theme-gradient-hero)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">Account</p>
                    <h2 className="mt-1 truncate text-2xl font-bold">{profile?.full_name || email.split("@")[0] || "CLARA User"}</h2>
                    <p className="mt-1 truncate text-sm text-white/75">{email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`badge ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>{roleLabel}</span>
                    <span className={`badge ${PLAN_BADGE_STYLES[plan] || PLAN_BADGE_STYLES.free}`}>{planLabel}</span>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-white/65">Open a focused settings area to manage your account, privacy, notifications, security, preferences, and billing without losing your place.</p>
              </div>
            </div>

            <div className="space-y-3">
              {SECTION_ORDER.map((sectionKey) => (
                <LauncherCard key={sectionKey} sectionKey={sectionKey} onOpen={openSection} />
              ))}
            </div>
          </>
        ) : (
          <Panel
            title={activeMeta.label}
            subtitle={activeMeta.subtitle}
            action={detailSection === "privacy" || detailSection === "preferences" ? (
              <button type="button" onClick={handleSave} disabled={!dirty || saving} className={`panelSave ${!dirty || saving ? "panelSaveDisabled" : ""}`}>
                {saving ? "Saving..." : "Save"}
              </button>
            ) : null}
          >
            {detailSection === "account" && (
              <div className="space-y-3">
                <InfoRow icon={Mail} label="Email Address" value={email || "Not available"} hint="Managed by your authenticated account." />
                <InfoRow
                  icon={User}
                  label="Profile Details"
                  value={profile?.full_name || "No name saved yet"}
                  hint="Profile details are managed inside CLARA settings."
                />
                <InfoRow icon={CreditCard} label="Plan & Access" value={`${planLabel} - ${enrollmentStatus}`} hint={`Member since ${formatDate(joinedAt)}.`} />
              </div>
            )}

            {detailSection === "notifications" && (
              <NotificationSettingsPanel userId={userId} />
            )}

            {detailSection === "privacy" && (
              <div className="space-y-3">
                <ToggleRow label="Analytics sharing" description="Allow anonymous product analytics to help improve CLARA." checked={settingsState.privacy.analyticsSharing} onChange={() => updateNestedSetting("privacy", "analyticsSharing", !settingsState.privacy.analyticsSharing)} />
                <ToggleRow label="Community visibility" description="Show your profile presence in community-facing experiences where applicable." checked={settingsState.privacy.showCommunityProfile} onChange={() => updateNestedSetting("privacy", "showCommunityProfile", !settingsState.privacy.showCommunityProfile)} />
                <ToggleRow label="Private mode" description="Reduce public-facing presence and keep the experience more low-profile." checked={settingsState.privacy.privateMode} onChange={() => updateNestedSetting("privacy", "privateMode", !settingsState.privacy.privateMode)} />
              </div>
            )}

            {detailSection === "security" && (
              <div className="space-y-3">
                <InfoRow
                  icon={KeyRound}
                  label="Password Reset"
                  value="Send a secure password reset email to your login address."
                  hint="Best for updating credentials without leaving the app flow."
                  action={<button type="button" onClick={handlePasswordReset} disabled={passwordSending} className="inlineAction inlineActionPrimary">{passwordSending ? "Sending..." : "Send Reset"}</button>}
                />
                <InfoRow
                  icon={LogOut}
                  label="Current Session"
                  value="Sign out of this device when you are done."
                  hint="Useful on shared or borrowed devices."
                  action={<button type="button" onClick={handleLogout} className="inlineAction inlineActionDanger">Log Out</button>}
                />
                <InfoRow
                  icon={Trash2}
                  label="Delete Account"
                  value="Request deletion of your CLARA account and associated app data."
                  hint="You can also use the web deletion request link required for Google Play listing support."
                  action={<button type="button" onClick={handleDeleteAccountRequest} disabled={deleteRequesting} className="inlineAction inlineActionDanger">{deleteRequesting ? "Requesting..." : deleteConfirm ? "Confirm" : "Request"}</button>}
                />
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                    <div>
                      <p className="text-sm font-semibold text-white">Web deletion request</p>
                      <a className="mt-1 block break-all text-xs text-amber-100 underline" href={deletionRequestUrl} target="_blank" rel="noreferrer">
                        {deletionRequestUrl}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailSection === "preferences" && (
              <div className="space-y-3">
                <ToggleRow label="Compact mode" description="Tighten spacing slightly for a denser dashboard view." checked={settingsState.preferences.compactMode} onChange={() => updateNestedSetting("preferences", "compactMode", !settingsState.preferences.compactMode)} />
                <ToggleRow label="Reduce motion" description="Minimize animation intensity across the app." checked={settingsState.preferences.reduceMotion} onChange={() => updateNestedSetting("preferences", "reduceMotion", !settingsState.preferences.reduceMotion)} />
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/70">
                      <Moon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Appearance</p>
                      <p className="text-xs text-white/55">Choose how CLARA should follow your device appearance.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["system", "dark", "light"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateNestedSetting("preferences", "appearance", option)}
                        className={`rounded-2xl border px-3 py-3 text-xs font-semibold capitalize transition ${settingsState.preferences.appearance === option ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-300" : "border-white/10 bg-black/20 text-white/70 hover:bg-white/10 hover:text-white"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/70">
                      <Mic size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">CLARA Voice</p>
                      <p className="text-xs text-white/55">Choose the male or female voice CLARA uses for spoken replies.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CLARA_VOICE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateNestedSetting("ai", "voice", option.value)}
                        className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                          settingsState.ai.voice === option.value
                            ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-300"
                            : "border-white/10 bg-black/20 text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {detailSection === "billing" && (
              <div className="space-y-3">
                <InfoRow icon={CreditCard} label="Current Plan" value={planLabel} hint="Billing and access are tied to your CLARA enrollment status." />
                <InfoRow
                  icon={Sparkles}
                  label="Enrollment Status"
                  value={enrollmentStatus}
                  hint="Use the enrollment flow to upgrade or re-enter the program."
                  action={<button type="button" onClick={() => navigate("/enroll")} className="inlineAction">Manage Plan</button>}
                />
              </div>
            )}
          </Panel>
        )}
      </div>

      {detailSection && (detailSection === "notifications" || detailSection === "privacy" || detailSection === "preferences") ? (
        <div className="saveWrap">
          <div className="mx-auto max-w-md">
            <button onClick={handleSave} disabled={!dirty || saving} className={`saveMain ${!dirty || saving ? "saveMainDisabled" : ""}`}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        .btn{height:44px;width:44px;border-radius:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center}
        .spacer{width:44px;height:44px}
        .saveBtn{height:44px;width:44px;border-radius:14px;background:linear-gradient(135deg,#10b981,#06b6d4);color:white;display:flex;align-items:center;justify-content:center;border:none}
        .saveBtnDisabled{opacity:.5;cursor:not-allowed}
        .badge{padding:4px 10px;border-radius:999px;font-size:12px;border:1px solid;white-space:nowrap}
        .alert{margin-bottom:14px;padding:12px 14px;border-radius:14px;font-size:14px}
        .alert.error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.22);color:#fca5a5}
        .alert.success{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.22);color:#86efac}
        .launcher-card{width:100%;display:flex;align-items:center;gap:14px;padding:16px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);transition:transform .18s ease,background-color .18s ease,border-color .18s ease}
        .launcher-card:active{transform:scale(.99)}
        .launcher-icon{width:44px;height:44px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);color:#86efac;flex-shrink:0}
        .inlineAction{border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);padding:10px 12px;font-size:12px;font-weight:600;color:rgba(255,255,255,.88);transition:.18s ease}
        .inlineActionPrimary{border-color:rgba(16,185,129,.2);background:rgba(16,185,129,.12);color:#6ee7b7}
        .inlineActionDanger{border-color:rgba(248,113,113,.2);background:rgba(248,113,113,.1);color:#fca5a5}
        .panelSave{border-radius:12px;border:1px solid rgba(16,185,129,.18);background:rgba(16,185,129,.12);padding:10px 14px;font-size:12px;font-weight:700;color:#86efac}
        .panelSaveDisabled{opacity:.5;cursor:not-allowed}
        .saveWrap{position:fixed;left:0;right:0;bottom:0;padding:16px;background:linear-gradient(to top,#020817,transparent)}
        .saveMain{width:100%;padding:16px;border-radius:16px;background:linear-gradient(135deg,#10b981,#06b6d4);font-weight:bold;color:white;border:none}
        .saveMainDisabled{opacity:.5;cursor:not-allowed}
      `}</style>
    </div>
  );
}
