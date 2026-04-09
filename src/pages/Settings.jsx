import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CreditCard,
  Globe,
  HelpCircle,
  Lock,
  Moon,
  Palette,
  Save,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const SETTINGS_SECTIONS = [
  {
    key: "account",
    label: "Account",
    icon: User,
    description: "Profile and member details",
  },
  {
    key: "preferences",
    label: "Preferences",
    icon: Palette,
    description: "App look and experience",
  },
  {
    key: "financial",
    label: "Financial Setup",
    icon: Wallet,
    description: "Budget and money preferences",
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Alerts and reminders",
  },
  {
    key: "privacy",
    label: "Privacy & Security",
    icon: Shield,
    description: "Protection and visibility",
  },
  {
    key: "support",
    label: "Support",
    icon: HelpCircle,
    description: "Help and CLARA info",
  },
];

const DEFAULT_FORM = {
  displayName: "Max",
  email: "",
  language: "English",
  timezone: "Asia/Manila",
  theme: "dark",
  accent: "green",
  landingPage: "dashboard",
  compactMode: false,
  animations: true,
  currency: "PHP (₱)",
  budgetingMethod: "50/30/20",
  weekStart: "Monday",
  defaultWallet: "",
  savingsTarget: "20",
  emergencyFundGoal: "3 months of expenses",
  taskReminders: true,
  moduleReminders: true,
  coachingReminders: true,
  emailNotifications: false,
  inAppNotifications: true,
  hideBalances: false,
  twoFactorReady: false,
};

const tabButtonBase =
  "w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200";
const fieldClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-yellow-400/50 focus:bg-white/10";
const cardClass =
  "rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.25)]";

function SettingsRow({
  title,
  description,
  right,
  danger = false,
  onClick,
  clickable = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-4 text-left transition ${
        danger
          ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      } ${clickable ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="min-w-0">
        <div
          className={`text-sm font-semibold ${
            danger ? "text-red-300" : "text-white"
          }`}
        >
          {title}
        </div>
        {description ? (
          <div className="mt-1 text-xs leading-relaxed text-white/55">
            {description}
          </div>
        ) : null}
      </div>
      <div className="shrink-0">{right}</div>
    </button>
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${
        checked ? "bg-lime-400" : "bg-white/15"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-white/55">{subtitle}</p>
      ) : null}
    </div>
  );
}

const dbToForm = (row, fallbackEmail = "") => ({
  displayName: row?.display_name ?? DEFAULT_FORM.displayName,
  email: fallbackEmail,
  language: row?.language ?? DEFAULT_FORM.language,
  timezone: row?.timezone ?? DEFAULT_FORM.timezone,
  theme: row?.theme ?? DEFAULT_FORM.theme,
  accent: row?.accent ?? DEFAULT_FORM.accent,
  landingPage: row?.landing_page ?? DEFAULT_FORM.landingPage,
  compactMode: row?.compact_mode ?? DEFAULT_FORM.compactMode,
  animations: row?.animations ?? DEFAULT_FORM.animations,
  currency: row?.currency ?? DEFAULT_FORM.currency,
  budgetingMethod: row?.budgeting_method ?? DEFAULT_FORM.budgetingMethod,
  weekStart: row?.week_start ?? DEFAULT_FORM.weekStart,
  defaultWallet: row?.default_wallet ?? DEFAULT_FORM.defaultWallet,
  savingsTarget: row?.savings_target ?? DEFAULT_FORM.savingsTarget,
  emergencyFundGoal:
    row?.emergency_fund_goal ?? DEFAULT_FORM.emergencyFundGoal,
  taskReminders: row?.task_reminders ?? DEFAULT_FORM.taskReminders,
  moduleReminders: row?.module_reminders ?? DEFAULT_FORM.moduleReminders,
  coachingReminders: row?.coaching_reminders ?? DEFAULT_FORM.coachingReminders,
  emailNotifications:
    row?.email_notifications ?? DEFAULT_FORM.emailNotifications,
  inAppNotifications:
    row?.in_app_notifications ?? DEFAULT_FORM.inAppNotifications,
  hideBalances: row?.hide_balances ?? DEFAULT_FORM.hideBalances,
  twoFactorReady: row?.two_factor_ready ?? DEFAULT_FORM.twoFactorReady,
});

const formToDb = (form, userId) => ({
  id: userId,
  display_name: form.displayName?.trim() || "User",
  language: form.language,
  timezone: form.timezone,
  theme: form.theme,
  accent: form.accent,
  landing_page: form.landingPage,
  compact_mode: form.compactMode,
  animations: form.animations,
  currency: form.currency,
  budgeting_method: form.budgetingMethod,
  week_start: form.weekStart,
  default_wallet: form.defaultWallet,
  savings_target: form.savingsTarget,
  emergency_fund_goal: form.emergencyFundGoal,
  task_reminders: form.taskReminders,
  module_reminders: form.moduleReminders,
  coaching_reminders: form.coachingReminders,
  email_notifications: form.emailNotifications,
  in_app_notifications: form.inAppNotifications,
  hide_balances: form.hideBalances,
  two_factor_ready: form.twoFactorReady,
});

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [planLabel, setPlanLabel] = useState("Transformation");
  const [memberSince, setMemberSince] = useState("March 2026");

  const [form, setForm] = useState(DEFAULT_FORM);

  const activeConfig = useMemo(
    () => SETTINGS_SECTIONS.find((section) => section.key === activeTab),
    [activeTab]
  );

  const updateField = (key, value) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const currentUser = session?.user;
        if (!currentUser) {
          navigate("/login", { replace: true });
          return;
        }

        if (!mounted) return;

        setUserId(currentUser.id);
        setForm((prev) => ({
          ...prev,
          email: currentUser.email || "",
          displayName:
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            prev.displayName,
        }));

        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, created_at")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (mounted && profile) {
          if (profile.plan) {
            setPlanLabel(
              String(profile.plan)
                .replaceAll("_", " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())
            );
          }

          if (profile.created_at) {
            const date = new Date(profile.created_at);
            if (!Number.isNaN(date.getTime())) {
              setMemberSince(
                date.toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Manila",
                })
              );
            }
          }
        }

        const { data: settingsRow, error: settingsError } = await supabase
          .from("user_settings")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (settingsError) throw settingsError;

        if (!mounted) return;

        if (settingsRow) {
          setForm(dbToForm(settingsRow, currentUser.email || ""));
        } else {
          const initialPayload = formToDb(
            {
              ...DEFAULT_FORM,
              email: currentUser.email || "",
              displayName:
                currentUser.user_metadata?.full_name ||
                currentUser.user_metadata?.name ||
                DEFAULT_FORM.displayName,
            },
            currentUser.id
          );

          const { error: insertError } = await supabase
            .from("user_settings")
            .insert(initialPayload);

          if (insertError) throw insertError;

          if (!mounted) return;

          setForm(
            dbToForm(initialPayload, currentUser.email || "")
          );
        }
      } catch (error) {
        console.error("Failed to load user settings:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleSave = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      setSaved(false);

      const payload = formToDb(form, userId);

      const { error } = await supabase
        .from("user_settings")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Account"
              subtitle="Manage your personal details and CLARA membership."
            />

            <div className={`${cardClass} p-5`}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-lime-400/20 via-emerald-400/10 to-cyan-400/10 text-2xl font-bold text-yellow-300">
                    {form.displayName?.[0]?.toUpperCase() || "U"}
                  </div>

                  <div>
                    <div className="text-lg font-bold text-white">
                      {form.displayName || "Your Name"}
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      {form.email}
                    </div>
                    <div className="mt-2 inline-flex items-center rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-300">
                      {planLabel} Member
                    </div>
                  </div>
                </div>

                <div className="lg:ml-auto">
                  <button
                    type="button"
                    className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-400/15"
                  >
                    Upload Photo
                  </button>
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-5`}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Display Name
                  </label>
                  <input
                    className={fieldClass}
                    value={form.displayName}
                    onChange={(e) => updateField("displayName", e.target.value)}
                    placeholder="Your display name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Email
                  </label>
                  <input
                    className={`${fieldClass} opacity-80`}
                    value={form.email}
                    readOnly
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Language
                  </label>
                  <select
                    className={fieldClass}
                    value={form.language}
                    onChange={(e) => updateField("language", e.target.value)}
                  >
                    <option className="bg-slate-900">English</option>
                    <option className="bg-slate-900">Taglish</option>
                    <option className="bg-slate-900">Filipino</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Timezone
                  </label>
                  <select
                    className={fieldClass}
                    value={form.timezone}
                    onChange={(e) => updateField("timezone", e.target.value)}
                  >
                    <option className="bg-slate-900" value="Asia/Manila">
                      Asia/Manila (Philippines)
                    </option>
                    <option className="bg-slate-900" value="UTC">
                      UTC
                    </option>
                    <option className="bg-slate-900" value="System">
                      Use Device Timezone
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Plan
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {planLabel}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Member Since
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {memberSince}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Password
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-yellow-300 transition hover:text-yellow-200"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "preferences":
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Preferences"
              subtitle="Customize how CLARA feels and behaves."
            />

            <div className={`${cardClass} p-5`}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Theme Mode
                  </label>
                  <select
                    className={fieldClass}
                    value={form.theme}
                    onChange={(e) => updateField("theme", e.target.value)}
                  >
                    <option className="bg-slate-900" value="dark">
                      Dark
                    </option>
                    <option className="bg-slate-900" value="light">
                      Light
                    </option>
                    <option className="bg-slate-900" value="system">
                      System
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Accent Color
                  </label>
                  <select
                    className={fieldClass}
                    value={form.accent}
                    onChange={(e) => updateField("accent", e.target.value)}
                  >
                    <option className="bg-slate-900" value="green">
                      Green
                    </option>
                    <option className="bg-slate-900" value="gold">
                      Gold
                    </option>
                    <option className="bg-slate-900" value="blue">
                      Blue
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Default Landing Page
                  </label>
                  <select
                    className={fieldClass}
                    value={form.landingPage}
                    onChange={(e) =>
                      updateField("landingPage", e.target.value)
                    }
                  >
                    <option className="bg-slate-900" value="dashboard">
                      Dashboard
                    </option>
                    <option className="bg-slate-900" value="tasks">
                      Tasks
                    </option>
                    <option className="bg-slate-900" value="wallets">
                      Wallets
                    </option>
                    <option className="bg-slate-900" value="analytics">
                      Analytics
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <SettingsRow
                  title="Compact Mode"
                  description="Use tighter spacing for a denser dashboard layout."
                  right={
                    <Toggle
                      checked={form.compactMode}
                      onChange={(value) => updateField("compactMode", value)}
                    />
                  }
                />

                <SettingsRow
                  title="Animations"
                  description="Keep smooth transitions and motion effects enabled."
                  right={
                    <Toggle
                      checked={form.animations}
                      onChange={(value) => updateField("animations", value)}
                    />
                  }
                />
              </div>
            </div>
          </div>
        );

      case "financial":
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Financial Setup"
              subtitle="Set the core rules behind your money tracking experience."
            />

            <div className={`${cardClass} p-5`}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Currency
                  </label>
                  <select
                    className={fieldClass}
                    value={form.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                  >
                    <option className="bg-slate-900">PHP (₱)</option>
                    <option className="bg-slate-900">USD ($)</option>
                    <option className="bg-slate-900">EUR (€)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Budgeting Method
                  </label>
                  <select
                    className={fieldClass}
                    value={form.budgetingMethod}
                    onChange={(e) =>
                      updateField("budgetingMethod", e.target.value)
                    }
                  >
                    <option className="bg-slate-900">50/30/20</option>
                    <option className="bg-slate-900">Zero-Based</option>
                    <option className="bg-slate-900">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Week Start
                  </label>
                  <select
                    className={fieldClass}
                    value={form.weekStart}
                    onChange={(e) => updateField("weekStart", e.target.value)}
                  >
                    <option className="bg-slate-900">Monday</option>
                    <option className="bg-slate-900">Sunday</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Default Wallet
                  </label>
                  <input
                    className={fieldClass}
                    value={form.defaultWallet}
                    onChange={(e) =>
                      updateField("defaultWallet", e.target.value)
                    }
                    placeholder="e.g. GCash"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Savings Target (%)
                  </label>
                  <input
                    className={fieldClass}
                    value={form.savingsTarget}
                    onChange={(e) =>
                      updateField("savingsTarget", e.target.value)
                    }
                    placeholder="20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    Emergency Fund Goal
                  </label>
                  <input
                    className={fieldClass}
                    value={form.emergencyFundGoal}
                    onChange={(e) =>
                      updateField("emergencyFundGoal", e.target.value)
                    }
                    placeholder="3 months of expenses"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Notifications"
              subtitle="Choose which reminders and alerts you want to receive."
            />

            <div className={`${cardClass} p-5 space-y-3`}>
              <SettingsRow
                title="Task Reminders"
                description="Receive reminders for daily challenge tasks."
                right={
                  <Toggle
                    checked={form.taskReminders}
                    onChange={(value) => updateField("taskReminders", value)}
                  />
                }
              />

              <SettingsRow
                title="Module Reminders"
                description="Be notified when modules are available or due."
                right={
                  <Toggle
                    checked={form.moduleReminders}
                    onChange={(value) => updateField("moduleReminders", value)}
                  />
                }
              />

              <SettingsRow
                title="Coaching Reminders"
                description="Get alerts for booked sessions and updates."
                right={
                  <Toggle
                    checked={form.coachingReminders}
                    onChange={(value) =>
                      updateField("coachingReminders", value)
                    }
                  />
                }
              />

              <SettingsRow
                title="Email Notifications"
                description="Send updates to your email address."
                right={
                  <Toggle
                    checked={form.emailNotifications}
                    onChange={(value) =>
                      updateField("emailNotifications", value)
                    }
                  />
                }
              />

              <SettingsRow
                title="In-App Notifications"
                description="Show alerts inside the CLARA app."
                right={
                  <Toggle
                    checked={form.inAppNotifications}
                    onChange={(value) =>
                      updateField("inAppNotifications", value)
                    }
                  />
                }
              />
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Privacy & Security"
              subtitle="Protect your account and control what is visible."
            />

            <div className={`${cardClass} p-5 space-y-3`}>
              <SettingsRow
                title="Hide Balances"
                description="Mask sensitive amounts across the app."
                right={
                  <Toggle
                    checked={form.hideBalances}
                    onChange={(value) => updateField("hideBalances", value)}
                  />
                }
              />

              <SettingsRow
                title="Change Password"
                description="Update your account password."
                right={<ChevronRight className="text-white/40" size={18} />}
                clickable
              />

              <SettingsRow
                title="Logout from All Devices"
                description="End all active sessions except this one."
                right={<ChevronRight className="text-white/40" size={18} />}
                clickable
              />

              <SettingsRow
                title="Export My Data"
                description="Download your personal CLARA data."
                right={<ChevronRight className="text-white/40" size={18} />}
                clickable
              />

              <SettingsRow
                title="Delete Account"
                description="Permanently remove your account and related data."
                danger
                right={<ChevronRight className="text-red-300/70" size={18} />}
                clickable
              />
            </div>
          </div>
        );

      case "support":
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Support"
              subtitle="Get help, contact support, and learn more about CLARA."
            />

            <div className={`${cardClass} p-5 space-y-3`}>
              <SettingsRow
                title="Help Center"
                description="View guides and answers to common questions."
                right={<ChevronRight className="text-white/40" size={18} />}
                clickable
              />

              <SettingsRow
                title="Contact Admin"
                description="Reach out for support or account concerns."
                right={<ChevronRight className="text-white/40" size={18} />}
                clickable
              />

              <SettingsRow
                title="About CLARA"
                description="Learn more about the app and the program."
                right={<ChevronRight className="text-white/40" size={18} />}
                clickable
              />

              <SettingsRow
                title="Terms & Privacy"
                description="Review policies and legal information."
                right={<ChevronRight className="text-white/40" size={18} />}
                clickable
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(62,203,115,0.16),_transparent_28%),linear-gradient(180deg,_#04121c_0%,_#03111d_45%,_#020816_100%)] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-sm text-white/70">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(62,203,115,0.16),_transparent_28%),linear-gradient(180deg,_#04121c_0%,_#03111d_45%,_#020816_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/15 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
                <Lock size={12} />
                Settings
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
                User Settings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
                Manage your account, app preferences, financial setup, and
                privacy controls in one place.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-lime-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:scale-[1.01] hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save size={16} />
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`${cardClass} h-fit p-4`}>
            <div className="mb-4 px-2">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">
                Menu
              </div>
              <div className="mt-2 text-sm text-white/55">
                Choose a settings section.
              </div>
            </div>

            <div className="space-y-2">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeTab === section.key;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveTab(section.key)}
                    className={`${tabButtonBase} ${
                      isActive
                        ? "border-lime-400/25 bg-gradient-to-r from-lime-400/16 to-cyan-400/8 shadow-[0_0_0_1px_rgba(163,230,53,0.08)]"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-xl p-2 ${
                          isActive
                            ? "bg-lime-400/15 text-lime-300"
                            : "bg-white/5 text-white/65"
                        }`}
                      >
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">
                          {section.label}
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-white/45">
                          {section.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-yellow-400/15 bg-yellow-400/8 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-yellow-300">
                <Moon size={16} />
                Quick Tip
              </div>
              <p className="mt-2 text-xs leading-relaxed text-yellow-100/70">
                Start by setting your timezone and financial defaults first so
                your analytics and reminders behave correctly.
              </p>
            </div>
          </aside>

          <main className={`${cardClass} p-5 sm:p-6`}>
            <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-white/10 pb-5">
              <div className="rounded-2xl border border-lime-400/15 bg-lime-400/10 p-3 text-lime-300">
                {activeConfig?.icon ? (
                  React.createElement(activeConfig.icon, { size: 18 })
                ) : (
                  <User size={18} />
                )}
              </div>

              <div>
                <div className="text-lg font-bold text-white">
                  {activeConfig?.label}
                </div>
                <div className="text-sm text-white/50">
                  {activeConfig?.description}
                </div>
              </div>
            </div>

            {renderContent()}
          </main>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={`${cardClass} p-4`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Globe size={16} className="text-cyan-300" />
              Timezone
            </div>
            <div className="mt-2 text-sm text-white/60">{form.timezone}</div>
          </div>

          <div className={`${cardClass} p-4`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <CreditCard size={16} className="text-yellow-300" />
              Plan
            </div>
            <div className="mt-2 text-sm text-white/60">
              {planLabel} Member
            </div>
          </div>

          <div className={`${cardClass} p-4`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Wallet size={16} className="text-lime-300" />
              Default Wallet
            </div>
            <div className="mt-2 text-sm text-white/60">
              {form.defaultWallet || "Not set"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}