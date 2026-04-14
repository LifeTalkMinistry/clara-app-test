import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CreditCard,
  KeyRound,
  LogOut,
  Mail,
  Moon,
  Save,
  Settings2,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const PLAN_STYLES = {
  free: "bg-white/10 text-white border-white/10",
  basic: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  transformation: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  elite: "bg-yellow-500/15 text-yellow-300 border-yellow-400/20",
  admin: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20",
};

const ROLE_STYLES = {
  admin: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  student: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  free_user: "bg-white/10 text-slate-200 border-white/10",
  user: "bg-white/10 text-slate-200 border-white/10",
  paid_user: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
};

const SECTION_META = {
  account: {
    label: "Account",
    icon: User,
    subtitle: "Identity, plan, and account overview.",
  },
  notifications: {
    label: "Notifications",
    icon: Bell,
    subtitle: "Control reminders and product communication.",
  },
  privacy: {
    label: "Privacy",
    icon: Shield,
    subtitle: "Manage visibility, analytics, and session privacy.",
  },
  security: {
    label: "Security",
    icon: KeyRound,
    subtitle: "Authentication and account protection.",
  },
  preferences: {
    label: "App Preferences",
    icon: Settings2,
    subtitle: "Display and in-app experience preferences.",
  },
  billing: {
    label: "Billing",
    icon: CreditCard,
    subtitle: "Plan and subscription access.",
  },
};

const SECTION_ORDER = [
  "account",
  "notifications",
  "privacy",
  "security",
  "preferences",
  "billing",
];

function normalizeRole(profile) {
  return String(profile?.role || "user").trim().toLowerCase();
}

function normalizePlan(profile, role) {
  if (role === "admin") return "admin";
  return String(profile?.plan || "free").trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return "Not available";
  try {
    return new Date(value).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
}

function getSettingsStorageKey(userId) {
  return `clara_settings_${userId || "guest"}`;
}

function readStoredSettings(userId) {
  const defaults = {
    notifications: {
      dailyReminders: true,
      productUpdates: true,
      coachingAlerts: true,
    },
    privacy: {
      analyticsSharing: true,
      showCommunityProfile: true,
      privateMode: false,
    },
    preferences: {
      compactMode: false,
      reduceMotion: false,
      appearance: "system",
    },
  };

  if (!userId) return defaults;

  try {
    const raw = localStorage.getItem(getSettingsStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};

    return {
      notifications: {
        ...defaults.notifications,
        ...(parsed.notifications || {}),
      },
      privacy: {
        ...defaults.privacy,
        ...(parsed.privacy || {}),
      },
      preferences: {
        ...defaults.preferences,
        ...(parsed.preferences || {}),
      },
    };
  } catch (error) {
    console.error("Failed to read settings:", error);
    return defaults;
  }
}

function saveStoredSettings(userId, nextValue) {
  if (!userId) return;

  try {
    localStorage.setItem(
      getSettingsStorageKey(userId),
      JSON.stringify(nextValue)
    );
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020817] text-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />
        <p className="mt-3 text-sm text-slate-400">Loading settings...</p>
      </div>
    </div>
  );
}

function SectionButton({ sectionKey, active, onClick }) {
  const meta = SECTION_META[sectionKey];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => onClick(sectionKey)}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-emerald-400/25 bg-emerald-500/12 text-white"
          : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/70"
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{meta.label}</p>
        <p className="text-xs text-white/50">{meta.subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-white/30" />
    </button>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#04111f]">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/70">
              Settings
            </p>
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/70">
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
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-white/15"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { section } = useParams();

  const normalizedSection = SECTION_META[section] ? section : "account";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSending, setPasswordSending] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [settingsState, setSettingsState] = useState(() =>
    readStoredSettings(null)
  );
  const [initialSettingsState, setInitialSettingsState] = useState(() =>
    readStoredSettings(null)
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (section && !SECTION_META[section]) {
      navigate("/settings/account", { replace: true });
    }
  }, [section, navigate]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          navigate("/login");
          return;
        }

        if (!mounted) return;

        setUserId(user.id);
        setAuthUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!mounted) return;

        const safeProfile = profileData || {};
        const stored = readStoredSettings(user.id);

        setProfile(safeProfile);
        setSettingsState(stored);
        setInitialSettingsState(stored);
      } catch (e) {
        console.error("Settings load error:", e);
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

  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "student"
      ? "Student"
      : role === "paid_user"
      ? "Paid User"
      : role === "free_user"
      ? "Free User"
      : "User";

  const planLabel =
    plan === "admin"
      ? "Admin"
      : plan === "transformation"
      ? "Transformation"
      : plan === "elite"
      ? "Elite"
      : plan === "basic"
      ? "Basic"
      : "Free";

  const email = profile?.email || authUser?.email || "";
  const joinedAt = profile?.created_at || authUser?.created_at;
  const enrollmentStatus = String(
    profile?.enrollment_status || profile?.status || "free"
  )
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const dirty = useMemo(() => {
    if (normalizedSection === "notifications") {
      return (
        JSON.stringify(settingsState.notifications) !==
        JSON.stringify(initialSettingsState.notifications)
      );
    }

    if (normalizedSection === "privacy") {
      return (
        JSON.stringify(settingsState.privacy) !==
        JSON.stringify(initialSettingsState.privacy)
      );
    }

    if (normalizedSection === "preferences") {
      return (
        JSON.stringify(settingsState.preferences) !==
        JSON.stringify(initialSettingsState.preferences)
      );
    }

    return false;
  }, [initialSettingsState, normalizedSection, settingsState]);

  const handleSectionChange = (nextSection) => {
    navigate(`/settings/${nextSection}`);
  };

  const updateNestedSetting = (group, key, value) => {
    setSettingsState((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: value,
      },
    }));
    if (message) setMessage("");
    if (error) setError("");
  };

  const handleSave = () => {
    if (!userId) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      saveStoredSettings(userId, settingsState);
      setInitialSettingsState(settingsState);
      setMessage("Settings updated successfully.");
    } catch (saveError) {
      console.error("Settings save error:", saveError);
      setError("Unable to save your settings right now.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) return;

    try {
      setPasswordSending(true);
      setError("");
      setMessage("");

      const base = import.meta.env.BASE_URL || "/";
      const normalizedBase = base.endsWith("/") ? base : `${base}/`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}${normalizedBase}#/login`,
        }
      );

      if (resetError) throw resetError;

      setMessage("Password reset email sent. Check your inbox to continue.");
    } catch (resetError) {
      console.error("Password reset error:", resetError);
      setError("Failed to send password reset email.");
    } finally {
      setPasswordSending(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  const activeMeta = SECTION_META[normalizedSection];

  return (
    <div className="min-h-screen bg-[#020817] text-white px-4 pt-4 pb-32">
      <div className="mx-auto max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="btn">
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">
              Control Center
            </p>
            <h1 className="mt-1 text-lg font-bold">Settings</h1>
          </div>

          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`saveBtn ${!dirty || saving ? "saveBtnDisabled" : ""}`}
          >
            <Save size={16} />
          </button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        <div className="mb-4 rounded-[28px] border border-emerald-400/10 bg-[#04111f] overflow-hidden">
          <div className="bg-gradient-to-r from-[#0b3b2e] via-[#0f8f5a] to-[#0ea5e9] px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">
                  Account
                </p>
                <h2 className="mt-1 truncate text-2xl font-bold">
                  {profile?.full_name || email.split("@")[0] || "CLARA User"}
                </h2>
                <p className="mt-1 truncate text-sm text-white/75">{email}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`badge ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>
                  {roleLabel}
                </span>
                <span className={`badge ${PLAN_STYLES[plan] || PLAN_STYLES.free}`}>
                  {planLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4">
            {SECTION_ORDER.map((sectionKey) => (
              <SectionButton
                key={sectionKey}
                sectionKey={sectionKey}
                active={normalizedSection === sectionKey}
                onClick={handleSectionChange}
              />
            ))}
          </div>
        </div>

        <Panel title={activeMeta.label} subtitle={activeMeta.subtitle}>
          {normalizedSection === "account" && (
            <div className="space-y-3">
              <InfoRow
                icon={Mail}
                label="Email Address"
                value={email || "Not available"}
                hint="Managed by your authenticated account."
              />
              <InfoRow
                icon={User}
                label="Profile Details"
                value={profile?.full_name || "No name saved yet"}
                hint="Personal details live in your dedicated Profile screen."
                action={
                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
                  >
                    Open Profile
                  </button>
                }
              />
              <InfoRow
                icon={CreditCard}
                label="Plan & Access"
                value={`${planLabel} • ${enrollmentStatus}`}
                hint={`Member since ${formatDate(joinedAt)}.`}
              />
            </div>
          )}

          {normalizedSection === "notifications" && (
            <div className="space-y-3">
              <ToggleRow
                label="Daily reminders"
                description="Receive your regular CLARA reminder and day-start prompt."
                checked={settingsState.notifications.dailyReminders}
                onChange={() =>
                  updateNestedSetting(
                    "notifications",
                    "dailyReminders",
                    !settingsState.notifications.dailyReminders
                  )
                }
              />
              <ToggleRow
                label="Coaching alerts"
                description="Get updates for coaching-related activity and important progress prompts."
                checked={settingsState.notifications.coachingAlerts}
                onChange={() =>
                  updateNestedSetting(
                    "notifications",
                    "coachingAlerts",
                    !settingsState.notifications.coachingAlerts
                  )
                }
              />
              <ToggleRow
                label="Product updates"
                description="Hear about meaningful feature updates and CLARA announcements."
                checked={settingsState.notifications.productUpdates}
                onChange={() =>
                  updateNestedSetting(
                    "notifications",
                    "productUpdates",
                    !settingsState.notifications.productUpdates
                  )
                }
              />
            </div>
          )}

          {normalizedSection === "privacy" && (
            <div className="space-y-3">
              <ToggleRow
                label="Analytics sharing"
                description="Allow anonymous product analytics to help improve CLARA."
                checked={settingsState.privacy.analyticsSharing}
                onChange={() =>
                  updateNestedSetting(
                    "privacy",
                    "analyticsSharing",
                    !settingsState.privacy.analyticsSharing
                  )
                }
              />
              <ToggleRow
                label="Community visibility"
                description="Show your profile presence in community-facing experiences where applicable."
                checked={settingsState.privacy.showCommunityProfile}
                onChange={() =>
                  updateNestedSetting(
                    "privacy",
                    "showCommunityProfile",
                    !settingsState.privacy.showCommunityProfile
                  )
                }
              />
              <ToggleRow
                label="Private mode"
                description="Reduce public-facing presence and keep the experience more low-profile."
                checked={settingsState.privacy.privateMode}
                onChange={() =>
                  updateNestedSetting(
                    "privacy",
                    "privateMode",
                    !settingsState.privacy.privateMode
                  )
                }
              />
            </div>
          )}

          {normalizedSection === "security" && (
            <div className="space-y-3">
              <InfoRow
                icon={KeyRound}
                label="Password Reset"
                value="Send a secure password reset email to your login address."
                hint="Best for updating credentials without leaving the app flow."
                action={
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={passwordSending}
                    className="rounded-xl border border-emerald-400/20 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    {passwordSending ? "Sending..." : "Send Reset"}
                  </button>
                }
              />
              <InfoRow
                icon={LogOut}
                label="Current Session"
                value="Sign out of this device when you are done."
                hint="Useful on shared or borrowed devices."
                action={
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate("/login");
                    }}
                    className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/15"
                  >
                    Log Out
                  </button>
                }
              />
            </div>
          )}

          {normalizedSection === "preferences" && (
            <div className="space-y-3">
              <ToggleRow
                label="Compact mode"
                description="Tighten spacing slightly for a denser dashboard view."
                checked={settingsState.preferences.compactMode}
                onChange={() =>
                  updateNestedSetting(
                    "preferences",
                    "compactMode",
                    !settingsState.preferences.compactMode
                  )
                }
              />
              <ToggleRow
                label="Reduce motion"
                description="Minimize animation intensity across the app."
                checked={settingsState.preferences.reduceMotion}
                onChange={() =>
                  updateNestedSetting(
                    "preferences",
                    "reduceMotion",
                    !settingsState.preferences.reduceMotion
                  )
                }
              />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/70">
                    <Moon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Appearance</p>
                    <p className="text-xs text-white/55">
                      Choose how CLARA should follow your device appearance.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["system", "dark", "light"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        updateNestedSetting("preferences", "appearance", option)
                      }
                      className={`rounded-2xl border px-3 py-3 text-xs font-semibold capitalize transition ${
                        settingsState.preferences.appearance === option
                          ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-300"
                          : "border-white/10 bg-black/20 text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {normalizedSection === "billing" && (
            <div className="space-y-3">
              <InfoRow
                icon={CreditCard}
                label="Current Plan"
                value={planLabel}
                hint="Billing and access are tied to your CLARA enrollment status."
              />
              <InfoRow
                icon={Sparkles}
                label="Enrollment Status"
                value={enrollmentStatus}
                hint="Use the enrollment flow to upgrade or re-enter the program."
                action={
                  <button
                    type="button"
                    onClick={() => navigate("/enroll")}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
                  >
                    Manage Plan
                  </button>
                }
              />
            </div>
          )}
        </Panel>
      </div>

      <div className="saveWrap">
        <div className="mx-auto max-w-md">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`saveMain ${!dirty || saving ? "saveMainDisabled" : ""}`}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <style>{`
        .btn {
          height: 44px;
          width: 44px;
          border-radius: 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .saveBtn {
          height: 44px;
          width: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg,#10b981,#06b6d4);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
        }

        .saveBtnDisabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid;
          white-space: nowrap;
        }

        .alert {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 14px;
        }

        .alert.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.22);
          color: #fca5a5;
        }

        .alert.success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.22);
          color: #86efac;
        }

        .saveWrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 16px;
          background: linear-gradient(to top,#020817,transparent);
        }

        .saveMain {
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          background: linear-gradient(135deg,#10b981,#06b6d4);
          font-weight: bold;
          color: white;
          border: none;
        }

        .saveMainDisabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
