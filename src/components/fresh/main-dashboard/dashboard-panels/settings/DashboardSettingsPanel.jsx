import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  Flag,
  Home,
  ListChecks,
  MessageCircle,
  Palette,
  Plus,
  Rocket,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";
import {
  dashboardPanelCardClass,
  dashboardPanelTextClass,
} from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";
import {
  applyVisualPerformanceMode,
  readStoredPerformanceMode,
  saveVisualPerformanceMode,
} from "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode";
import { persistStoredNotificationSettings } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";
import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import {
  formatCompactDate,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

const dashboardRuntimePrefs = { clear: () => {} };
const dashboardRuntimeNotifications = { clear: () => {} };
const dashboardRuntimeMoneySummaryVisibility = { clear: () => {} };
const dashboardRuntimePerformanceMode = { clear: () => {} };
const dashboardRuntimeProgramPrompts = { clear: () => {} };
const dashboardRuntimeThemes = { clear: () => {} };
const dashboardRuntimeSurvivalExpenses = { clear: () => {} };

export default function DashboardSettingsPanel({
  onBack,
  user,
  plan,
  isPaid,
  isFree,
  isAdmin = false,
  notificationSettings,
  openThemePicker,
  resetThemeToDefault,
  onOpenMessages,
  setNotificationSettings = () => {},
}) {
  const navigate = useNavigate();

  const initialDisplayName =
    user?.full_name ||
    user?.display_name ||
    user?.nickname ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")?.[0] ||
    "";

  const [localNotifications, setLocalNotifications] = useState(() => ({
    dailyReminders: notificationSettings?.dailyReminders !== false,
    productUpdates: notificationSettings?.productUpdates !== false,
    coachingAlerts: notificationSettings?.coachingAlerts !== false,
    budgetAlerts: notificationSettings?.budgetAlerts !== false,
  }));
  const [localPerformanceMode, setLocalPerformanceMode] = useState(() =>
    readStoredPerformanceMode(user?.id || "guest")
  );

  const [activeSetting, setActiveSetting] = useState(null);
  const [activeAboutInfo, setActiveAboutInfo] = useState(null);
  const [legalInfoRows, setLegalInfoRows] = useState([]);
  const [legalInfoDraftRows, setLegalInfoDraftRows] = useState([]);
  const [legalInfoLoading, setLegalInfoLoading] = useState(false);
  const [legalInfoSaving, setLegalInfoSaving] = useState(false);
  const [legalInfoEditMode, setLegalInfoEditMode] = useState(false);
  const [legalInfoError, setLegalInfoError] = useState("");
  const [profileName, setProfileName] = useState(initialDisplayName);
  const [settingsNotice, setSettingsNotice] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [supportTopic, setSupportTopic] = useState("Billing / enrollment");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [billingRecord, setBillingRecord] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    setProfileName(initialDisplayName);
  }, [initialDisplayName]);

  useEffect(() => {
    setLocalNotifications({
      dailyReminders: notificationSettings?.dailyReminders !== false,
      productUpdates: notificationSettings?.productUpdates !== false,
      coachingAlerts: notificationSettings?.coachingAlerts !== false,
      budgetAlerts: notificationSettings?.budgetAlerts !== false,
    });
  }, [notificationSettings]);

  useEffect(() => {
    const storedPerformanceMode = readStoredPerformanceMode(user?.id || "guest");
    setLocalPerformanceMode(storedPerformanceMode);
    applyVisualPerformanceMode(storedPerformanceMode);
  }, [user?.id]);

  useEffect(() => {
    applyVisualPerformanceMode(localPerformanceMode);
  }, [localPerformanceMode]);

  useEffect(() => {
    const syncPerformanceMode = () => {
      setLocalPerformanceMode(readStoredPerformanceMode(user?.id || "guest"));
    };

    window.addEventListener("storage", syncPerformanceMode);
    window.addEventListener("clara:visual-performance-mode-updated", syncPerformanceMode);

    return () => {
      window.removeEventListener("storage", syncPerformanceMode);
      window.removeEventListener("clara:visual-performance-mode-updated", syncPerformanceMode);
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchBillingRecord = async () => {
      if (!user?.id) {
        setBillingRecord(null);
        setBillingLoading(false);
        return;
      }

      setBillingLoading(true);

      try {
        const { data, error } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!isMounted) return;

        setBillingRecord(data || null);
      } catch (error) {
        console.error("Embedded billing fetch failed:", error);
        if (isMounted) setBillingRecord(null);
      } finally {
        if (isMounted) setBillingLoading(false);
      }
    };

    fetchBillingRecord();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchLegalInformationContent = async () => {
      setLegalInfoError("");

      if (!user?.id) {
        setLegalInfoRows([]);
        setLegalInfoLoading(false);
        return;
      }

      setLegalInfoLoading(true);

      try {
        const { data, error } = await supabase
          .from("legal_information_content")
          .select("section_key,title,subtitle,body,sort_order,is_active,updated_at")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        if (!isMounted) return;

        setLegalInfoRows(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Legal information content fetch failed:", error);
        if (isMounted) {
          setLegalInfoRows([]);
          setLegalInfoError("");
        }
      } finally {
        if (isMounted) setLegalInfoLoading(false);
      }
    };

    fetchLegalInformationContent();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const displayName = profileName?.trim() || initialDisplayName || "Your CLARA account";
  const rawCurrentPlan = isPaid ? plan || "Paid" : isFree ? "Free" : plan || "Plan";
  const normalizePlanDisplay = useCallback((value) => {
    const normalized = normalizeLower(value);

    if (["pro", "pro_99", "pro99", "pro tools", "pro_tools"].some((key) => normalized.includes(key))) {
      return "Pro 99";
    }

    if (["core", "core_199", "core199", "core_599"].some((key) => normalized.includes(key))) {
      return "Core 199";
    }

    if (["life os", "life_os", "lifeos", "life-os", "coaching", "coach", "coaching_1299"].some((key) => normalized.includes(key))) {
      return "Life OS 499";
    }

    if (normalized === "free") return "Free";
    if (!normalized || normalized === "paid" || normalized === "plan") return isPaid ? "Paid plan" : "Free";

    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }, [isPaid]);

  const currentPlan = normalizePlanDisplay(rawCurrentPlan);
  const planStatusLabel = isPaid ? "Unlocked" : isFree ? "Limited" : "Active";
  const supportEmail = "claraprogram2026@gmail.com";

  const saveNotificationSettings = useCallback((next) => {
    try {
      const saved = persistStoredNotificationSettings(user?.id || "guest", next);
      setNotificationSettings(saved);
      dispatchClaraEvent("clara-settings-updated", { type: "notifications", notifications: saved });
    } catch (error) {
      console.error("Failed to save embedded settings:", error);
    }
  }, [user?.id]);  const persistNotificationToggle = useCallback((key) => {
    setLocalNotifications((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };

      saveNotificationSettings(next);
      setSettingsNotice({ type: "success", message: "Notification preference updated." });
      return next;
    });
  }, [saveNotificationSettings]);

  const persistPerformanceToggle = useCallback(() => {
    setLocalPerformanceMode((current) => {
      const next = !current;
      saveVisualPerformanceMode(user?.id || "guest", next);
      setSettingsNotice({
        type: "success",
        message: next
          ? "Performance Mode is on. CLARA is now using a static, smoother visual design."
          : "Premium Mode is on. CLARA will use the full premium visual experience.",
      });
      return next;
    });
  }, [user?.id]);

  const handleSaveProfile = useCallback(async () => {
    const nextName = profileName.trim();

    if (!nextName) {
      setSettingsNotice({ type: "error", message: "Please enter a display name." });
      return;
    }

    if (!user?.id) {
      setSettingsNotice({ type: "error", message: "User session is not ready. Please log in again." });
      return;
    }

    setSavingProfile(true);
    setSettingsNotice(null);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email || "",
            full_name: nextName,
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      try {
        await supabase.auth.updateUser({
          data: {
            full_name: nextName,
            name: nextName,
          },
        });
      } catch (metadataError) {
        console.warn("Profile metadata update skipped:", metadataError);
      }

      setSettingsNotice({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      console.error("Profile update failed:", error);
      setSettingsNotice({
        type: "error",
        message: error?.message || "Profile update failed. Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  }, [profileName, user?.email, user?.id]);

  const clearLocalPreferences = useCallback(async () => {
    try {
      dashboardRuntimePrefs.clear();
      dashboardRuntimeNotifications.clear();
      dashboardRuntimeMoneySummaryVisibility.clear();
      dashboardRuntimePerformanceMode.clear();
      dashboardRuntimeProgramPrompts.clear();
      dashboardRuntimeThemes.clear();
      dashboardRuntimeSurvivalExpenses.clear();

      if (typeof resetThemeToDefault === "function") await resetThemeToDefault();

      setSettingsNotice({ type: "success", message: "Local preferences were reset and the theme is back to default. Financial data was not touched." });
    } catch (error) {
      console.error("Local preferences reset failed:", error);
      setSettingsNotice({ type: "error", message: "Unable to reset local preferences." });
    }
  }, [resetThemeToDefault]);  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    setSettingsNotice(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Sign out failed:", error);
      setSettingsNotice({ type: "error", message: "Sign out failed. Please try again." });
      setSigningOut(false);
    }
  }, [navigate]);

  const openSupportMessages = useCallback(() => {
    if (typeof onOpenMessages === "function") {
      onOpenMessages();
      return;
    }

    navigate("/messages");
  }, [navigate, onOpenMessages]);

  const handleSendSupportMessage = useCallback(async () => {
    const trimmed = supportMessage.trim();

    if (!trimmed) {
      setSettingsNotice({ type: "error", message: "Write a short support message first." });
      return;
    }

    if (!user?.id) {
      setSettingsNotice({ type: "error", message: "Your session is not ready. Please log in again." });
      return;
    }

    setSupportSending(true);
    setSettingsNotice(null);

    try {
      const { data: adminProfiles, error: adminError } = await supabase
        .from("profiles")
        .select("id,email,full_name,role")
        .eq("role", "admin");

      if (adminError) {
        console.error("Support admin lookup failed:", adminError);
        throw new Error("Unable to find CLARA admin accounts. Please check the profiles role setup.");
      }

      const admins = (Array.isArray(adminProfiles) ? adminProfiles : [])
        .filter((admin) => admin?.id && admin.id !== user.id);

      if (admins.length === 0) {
        setSettingsNotice({
          type: "error",
          message: "No admin account is available for support messages yet.",
        });
        setSupportSending(false);
        return;
      }

      const supportContent = `[CLARA Support • ${supportTopic}]\n\n${trimmed}`;
      const senderName =
        displayName ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        "CLARA User";

      const payloads = admins.map((admin) => {
        const adminName =
          admin?.full_name ||
          admin?.email ||
          "CLARA Admin";

        return {
          conversation_id: [String(user.id), String(admin.id)].sort().join("_"),
          sender_id: user.id,
          sender_email: user.email || "",
          sender_name: senderName,
          recipient_id: admin.id,
          recipient_email: admin.email || supportEmail,
          recipient_name: adminName,
          content: supportContent,
          is_read: false,
        };
      });

      const { error: messageError } = await supabase
        .from("direct_messages")
        .insert(payloads);

      if (messageError) throw messageError;

      setSupportSent(true);
      setSupportMessage("");
      setSettingsNotice({
        type: "success",
        message: `Support message sent to ${admins.length} admin${admins.length > 1 ? "s" : ""}.`,
      });

      if (typeof onOpenMessages === "function") {
        setTimeout(() => {
          onOpenMessages();
        }, 350);
      }
    } catch (error) {
      console.error("Support message send failed:", error);
      setSettingsNotice({
        type: "error",
        message: error?.message || "Unable to send support message.",
      });
    } finally {
      setSupportSending(false);
    }
  }, [
    displayName,
    onOpenMessages,
    supportEmail,
    supportMessage,
    supportTopic,
    user?.email,
    user?.id,
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
  ]);

  const notificationRows = [
    {
      key: "dailyReminders",
      title: "Daily reminders",
      description: "Budget nudges and daily financial check-ins",
    },
    {
      key: "budgetAlerts",
      title: "Budget alerts",
      description: "Warnings when spending gets close to your budget",
    },
    {
      key: "productUpdates",
      title: "Product updates",
      description: "New CLARA improvements and feature notices",
    },
    {
      key: "coachingAlerts",
      title: "Coaching alerts",
      description: "Program/coaching related prompts",
    },
  ];

  const settingSections = [
    {
      title: "Account",
      rows: [
        {
          key: "profile",
          title: "Profile information",
          description: "Name, email, and account identity",
          icon: Home,
          badge: "Edit",
          action: () => setActiveSetting("profile"),
        },
        {
          key: "security",
          title: "Security & privacy",
          description: "Session status and safe preference reset",
          icon: ShieldCheck,
          badge: "Safe",
          action: () => setActiveSetting("security"),
        },
      ],
    },
    {
      title: "Preferences",
      rows: [
        {
          key: "appearance",
          title: "Theme & appearance",
          description: "Colors, visual style, and dashboard theme",
          icon: Palette,
          badge: "Customize",
          featured: true,
          action: openThemePicker,
        },
        {
          key: "performance",
          title: "Performance Mode",
          description: "Static visuals with no animation, glow, or blur",
          icon: Rocket,
          badge: localPerformanceMode ? "On" : "Off",
          featured: localPerformanceMode,
          action: () => setActiveSetting("performance"),
        },
        {
          key: "notifications",
          title: "Notifications",
          description: "Reminders, alerts, and program updates",
          icon: Bell,
          badge: localNotifications.dailyReminders ? "On" : "Off",
          action: () => setActiveSetting("notifications"),
        },
      ],
    },
    {
      title: "Program",
      rows: [
        {
          key: "plan",
          title: "Plan & billing",
          description: "Enrollment, payment, and access level",
          icon: WalletCards,
          badge: currentPlan,
          action: () => setActiveSetting("plan"),
        },
        {
          key: "support",
          title: "Help & support",
          description: "Message support or report an issue",
          icon: MessageCircle,
          badge: "Help",
          action: () => setActiveSetting("support"),
        },
        {
          key: "about",
          title: "About CLARA",
          description: "Mission, vision, app info, and legal links",
          icon: FileText,
          badge: "Info",
          action: () => setActiveSetting("about"),
        },
        ...(isAdmin
          ? [
              {
                key: "admin",
                title: "Admin Panel",
                description: "Manage users, access, and CLARA controls",
                icon: ShieldCheck,
                badge: "Admin",
                featured: true,
                action: () => navigate("/admin"),
              },
            ]
          : []),
      ],
    },
  ];

  const resolveBillingCycle = useCallback((record) => {
    const rawCycle = normalizeLower(
      record?.billing_cycle ||
        record?.billing_interval ||
        record?.subscription_interval ||
        record?.interval ||
        record?.cycle ||
        record?.renewal_frequency ||
        record?.payment_cycle ||
        ""
    );

    if (!rawCycle) return "Not recorded";
    if (["month", "monthly", "1 month", "per month", "mo"].includes(rawCycle) || rawCycle.includes("monthly")) {
      return "Monthly";
    }
    if (["year", "yearly", "annual", "annually", "12 months"].includes(rawCycle) || rawCycle.includes("annual")) {
      return "Yearly";
    }
    if (rawCycle.includes("one") || rawCycle.includes("lifetime")) {
      return "One-time";
    }

    return rawCycle.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }, []);

  const resolveBillingDate = useCallback((record, keys = []) => {
    const rawValue = keys.map((key) => record?.[key]).find(Boolean);
    return rawValue ? formatCompactDate(rawValue) : "Not recorded";
  }, []);

  const billingCycleLabel = resolveBillingCycle(billingRecord);
  const billingStatusLabel = billingLoading
    ? "Checking..."
    : billingRecord
      ? normalizePlanDisplay(
          billingRecord?.payment_status ||
            billingRecord?.status ||
            billingRecord?.enrollment_status ||
            billingRecord?.subscription_status ||
            "Active"
        )
      : "No record";
  const billingStartLabel = billingRecord
    ? resolveBillingDate(billingRecord, ["current_period_start", "billing_start", "started_at", "approved_at", "created_at"])
    : "Not recorded";
  const nextBillingLabel = billingRecord
    ? resolveBillingDate(billingRecord, ["next_billing_date", "next_payment_due", "current_period_end", "renewal_date", "expires_at", "valid_until", "end_date"])
    : "Not recorded";

  const planOptions = [
    {
      key: "pro_99",
      title: "Pro",
      price: "₱99",
      displayName: "Pro 99",
      description: "Starter upgrade for essential CLARA tools.",
    },
    {
      key: "core_199",
      title: "Core",
      price: "₱199",
      displayName: "Core 199",
      description: "Main financial system access for deeper tracking.",
    },
    {
      key: "life_os_499",
      title: "Life OS",
      price: "₱499",
      displayName: "Life OS 499",
      description: "Full CLARA access with Life OS support.",
    },
  ];

  const renderNotice = () => {
    if (!settingsNotice) return null;

    return (
      <div
        className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          settingsNotice.type === "error"
            ? "border-rose-300/20 bg-rose-500/12 text-rose-100"
            : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
        }`}
      >
        {settingsNotice.message}
      </div>
    );
  };

  const SettingsToggle = ({ enabled }) => (
    <span
      className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
        enabled
          ? "border-emerald-300/25 bg-emerald-400/30"
          : "border-white/15 bg-white/8"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          enabled ? "left-6" : "left-1"
        }`}
      />
    </span>
  );

  const PremiumRow = ({ icon: Icon, title, description, badge, featured, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-[24px] border px-4 py-4 text-left transition ${
        featured
          ? "border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_35%),rgba(16,185,129,0.07)] shadow-[0_16px_40px_rgba(16,185,129,0.08)]"
          : "border-white/15 bg-white/[0.045] hover:bg-white/[0.07]"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
          featured
            ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-100"
            : "border-white/15 bg-white/8 text-white/65 group-hover:text-white"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{title}</p>
        <p className="mt-1 truncate text-xs text-white/45">{description}</p>
      </div>

      {badge ? (
        <span className="max-w-[96px] shrink-0 truncate rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-bold text-white/55">
          {badge}
        </span>
      ) : null}

      <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
    </button>
  );

  const DetailHeader = ({ title, subtitle }) => (
    <div className="mb-4 space-y-4">
      <button
        type="button"
        onClick={() => {
          setActiveSetting(null);
          setActiveAboutInfo(null);
          setSettingsNotice(null);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-[11px] font-bold text-white/70 transition hover:bg-white/12"
      >
        <ArrowDown className="h-3.5 w-3.5 rotate-90" />
        Settings
      </button>

      <div className="rounded-[28px] border border-white/15 bg-white/[0.035] px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
        <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-[30ch] text-xs leading-5 text-white/50">{subtitle}</p> : null}
      </div>
    </div>
  );

  const InfoTile = ({ label, value }) => (
    <div className="rounded-2xl border border-white/15 bg-black/15 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );

  const renderProfilePage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Profile information"
        subtitle="Manage how your CLARA profile appears across the app."
      />

      {renderNotice()}

      <div className="rounded-[30px] border border-white/15 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-white/15 bg-white/10 text-xl font-black text-white">
            {dashboardPanelInitials(displayName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-white">{displayName}</p>
            <p className="truncate text-xs text-white/50">{user?.email || "No email found"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/15 bg-white/[0.045] p-4 backdrop-blur-xl">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Display name</span>
          <input
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-2xl border border-white/15 bg-[#071120] px-4 py-3 text-sm font-semibold text-white caret-emerald-300 outline-none placeholder:text-white/35 focus:border-emerald-300/35"
          />
        </label>

        <div className="mt-4 rounded-2xl border border-white/15 bg-black/15 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">Email</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{user?.email || "No email found"}</p>
          <p className="mt-1 text-[11px] text-white/40">For security, email is read-only inside dashboard settings.</p>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.22)] disabled:opacity-55"
        >
          <Check className="h-4 w-4" />
          {savingProfile ? "Saving..." : "Save profile"}
        </button>
      </div>
    </div>
  );

  const renderNotificationsPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Notifications"
        subtitle="Choose what deserves your attention."
      />

      {renderNotice()}

      <div className="space-y-3">
        {notificationRows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => persistNotificationToggle(row.key)}
            className="flex w-full items-center justify-between gap-3 rounded-[24px] border border-white/15 bg-white/[0.045] px-4 py-4 text-left transition hover:bg-white/[0.07]"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{row.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/45">{row.description}</p>
            </div>

            <SettingsToggle enabled={localNotifications[row.key]} />
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-white/15 bg-white/[0.035] p-4">
        <p className="text-sm font-bold text-white">Delivery behavior</p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          These preferences are saved on this device first. You can later move them to Supabase when you add a shared user settings table.
        </p>
      </div>
    </div>
  );

  const renderPlanPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Plan & billing"
        subtitle="Manage your access, enrollment, and payment flow inside settings."
      />

      <div className="rounded-[30px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_35%),rgba(16,185,129,0.07)] p-5 shadow-[0_18px_50px_rgba(16,185,129,0.10)] backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">Current plan</p>
        <p className="mt-2 text-2xl font-black text-white">{currentPlan}</p>
        <p className="mt-1 text-sm text-white/58">{planStatusLabel} access level</p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px]">
          <InfoTile label="Features" value={isPaid ? "Unlocked" : "Limited"} />
          <InfoTile label="Tier" value={currentPlan} />
          <InfoTile label="Billing cycle" value={billingCycleLabel} />
          <InfoTile label="Next billing" value={nextBillingLabel} />
        </div>
      </div>

      <div className="rounded-[24px] border border-white/15 bg-white/[0.075] p-4">
        <p className="text-sm font-black text-white">Plan details</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["Expense tracking", "Wallets", "Budgets", "Analytics", "Emergency fund", "Messages"].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/15 px-3 py-2"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
              <span className="truncate text-[11px] font-bold text-white/62">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/15 bg-white/[0.035] p-4">
        <p className="text-sm font-black text-white">Simple terms</p>
        <p className="mt-2 text-xs leading-5 text-white/48">
          Access depends on approved enrollment or active payment status. For billing concerns, use Help & support inside Settings.
        </p>
      </div>

      <div className="space-y-3">
        <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
          Available plans
        </p>

        {planOptions.map((option) => {
          const normalizedCurrentPlan = normalizeLower(currentPlan);
          const normalizedRawPlan = normalizeLower(rawCurrentPlan);
          const isLifeOsLegacy =
            option.key === "life_os_499" &&
            ["coaching", "coach", "coaching_1299", "life os", "life_os", "lifeos"].some((key) =>
              normalizedRawPlan.includes(key)
            );

          const isCoreLegacy =
            option.key === "core_199" &&
            ["core", "core_199", "core199", "core_599"].some((key) =>
              normalizedRawPlan.includes(key)
            );

          const isProLegacy =
            option.key === "pro_99" &&
            ["pro", "pro_99", "pro99", "pro_tools"].some((key) =>
              normalizedRawPlan.includes(key)
            );

          const isCurrent =
            normalizedCurrentPlan.includes(normalizeLower(option.displayName)) ||
            normalizedCurrentPlan.includes(normalizeLower(option.title)) ||
            isLifeOsLegacy ||
            isCoreLegacy ||
            isProLegacy;

          return (
            <div
              key={option.key}
              className={`rounded-[24px] border p-4 ${
                isCurrent
                  ? "border-emerald-400/25 bg-emerald-400/10"
                  : "border-white/15 bg-white/[0.045]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{option.title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/45">{option.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">{option.price}</p>
                  {isCurrent ? (
                    <p className="mt-1 text-[10px] font-black text-emerald-200">CURRENT</p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[24px] border border-white/15 bg-white/[0.035] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Billing status</p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Read from your enrollment/payment record when available.
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-black text-white/55">
            {billingStatusLabel}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <InfoTile label="Cycle" value={billingCycleLabel} />
          <InfoTile label="Started" value={billingStartLabel} />
        </div>

        {billingCycleLabel === "Not recorded" ? (
          <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-400/8 px-3 py-2 text-[11px] leading-5 text-amber-100/75">
            Monthly billing will show here once the billing cycle field is saved in the enrollment record.
          </p>
        ) : null}
      </div>
    </div>
  );

  const renderSecurityPage = () => (
    <div className="space-y-4 pb-6">
      <DetailHeader
        title="Security & privacy"
        subtitle="Account session, protected data, and default theme reset."
      />

      {renderNotice()}

      <div className="rounded-[30px] border border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),rgba(255,255,255,0.045)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">Current session</p>
                <p className="mt-1 truncate text-xs text-white/50">
                  {user?.email || "Current user session"}
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-100">
                Secure
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl border border-white/15 bg-black/15 p-3">
                <p className="text-[11px] font-black text-white">Signed in</p>
                <p className="mt-1 text-[10px] text-white/40">Session</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-black/15 p-3">
                <p className="text-[11px] font-black text-white">Protected</p>
                <p className="mt-1 text-[10px] text-white/40">Account</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/15 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <p className="text-sm font-black text-white">Protected app data</p>
        <p className="mt-2 text-xs leading-5 text-white/48">
          Resetting preferences will not touch your financial records.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {["Wallets", "Expenses", "Budgets", "Enrollments"].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/15 px-3 py-3"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
              <span className="truncate text-xs font-bold text-white/68">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[30px] border border-amber-300/15 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_34%),rgba(255,255,255,0.04)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-100">
            <RotateCcw className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Local preference reset</p>
            <p className="mt-1 text-xs leading-5 text-white/48">
              Clears local choices and restores CLARA's default theme on this device.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearLocalPreferences}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-400/15"
        >
          <RotateCcw className="h-4 w-4" />
          Reset preferences and theme
        </button>
      </div>

    </div>
  );

  const renderSupportPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Help & support"
        subtitle="Send a support message directly to CLARA admins."
      />

      {renderNotice()}

      <div className="rounded-[28px] border border-white/15 bg-white/[0.045] p-4 backdrop-blur-xl">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Topic</span>
          <select
            value={supportTopic}
            onChange={(event) => setSupportTopic(event.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-[#071120] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-emerald-300/35"
          >
            <option>Billing / enrollment</option>
            <option>Technical issue</option>
            <option>Account access</option>
            <option>Feature request</option>
            <option>Other concern</option>
          </select>
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Message</span>
          <textarea
            value={supportMessage}
            onChange={(event) => setSupportMessage(event.target.value)}
            placeholder="Briefly describe what you need help with..."
            className="min-h-[120px] w-full resize-none rounded-2xl border border-white/15 bg-[#071120] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-emerald-300/35"
            disabled={supportSending}
          />
        </label>

        <button
          type="button"
          onClick={handleSendSupportMessage}
          disabled={supportSending || !supportMessage.trim()}
          className="mt-4 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.22)] transition hover:scale-[1.01] disabled:opacity-55"
        >
          {supportSending ? "Sending to CLARA support..." : "Send CLARA support message"}
        </button>

        <p className="mt-3 text-center text-[11px] leading-5 text-white/45">
          All admin accounts will receive this in Messages. You’ll be moved to the Message tab after sending.
        </p>
      </div>

      {supportSent ? (
        <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-400/10 p-4">
          <p className="text-sm font-bold text-emerald-100">Support message sent</p>
          <p className="mt-1 text-xs leading-5 text-white/50">
            Your message was sent to CLARA admin support. Check the Message tab for the conversation.
          </p>
        </div>
      ) : null}

      <div className="rounded-[24px] border border-white/15 bg-white/[0.035] p-4">
        <p className="text-sm font-bold text-white">Support email</p>
        <p className="mt-1 select-all text-sm font-black text-emerald-100">{supportEmail}</p>
      </div>
    </div>
  );

  const renderPerformancePage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Performance Mode"
        subtitle="Keep CLARA premium with a static, smooth, no-glow visual mode for slower phones."
      />

      {renderNotice()}

      <button
        type="button"
        onClick={persistPerformanceToggle}
        className={`flex w-full items-center justify-between gap-4 rounded-[30px] border p-5 text-left transition ${
          localPerformanceMode
            ? "border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_36%),rgba(16,185,129,0.08)] shadow-[0_16px_42px_rgba(16,185,129,0.10)]"
            : "border-white/15 bg-white/[0.045] hover:bg-white/[0.07]"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
            localPerformanceMode
              ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100"
              : "border-white/15 bg-white/8 text-white/65"
          }`}>
            <Rocket className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white">Performance Mode</p>
            <p className="mt-1 text-xs leading-5 text-white/50">
              Static visuals with no animation, glow, or blur for smoother performance.
            </p>
          </div>
        </div>

        <SettingsToggle enabled={localPerformanceMode} />
      </button>

      <div className="rounded-[24px] border border-white/15 bg-white/[0.035] p-4">
        <p className="text-sm font-bold text-white">
          Current visual mode: {localPerformanceMode ? "Performance" : "Premium"}
        </p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          Premium Mode keeps CLARA's full glow, blur, shadows, and animations. Performance Mode keeps the same layout and colors, but uses static visuals with no glow, no blur, and no motion.
        </p>
      </div>
    </div>
  );

  const defaultAboutClaraRows = [
    {
      section_key: "mission",
      key: "mission",
      title: "Mission",
      subtitle: "See CLARA’s purpose and guiding mission.",
      body:
        "To help people build financial discipline through simple tracking, guided decisions, and a supportive environment.",
      sort_order: 1,
      is_active: true,
    },
    {
      section_key: "vision",
      key: "vision",
      title: "Vision",
      subtitle: "See the long-term direction of CLARA.",
      body:
        "To make budgeting normal, approachable, and part of everyday life.",
      sort_order: 2,
      is_active: true,
    },
    {
      section_key: "clara_difference",
      key: "clara_difference",
      title: "What makes CLARA different",
      subtitle: "See how CLARA goes beyond basic expense tracking.",
      body:
        "CLARA is not only built to record expenses. It is designed to help users understand behavior, reduce emotional spending, and make better choices before money is spent.\n\nPeople do not change because of information alone. People change because of environment. CLARA is built to become that environment.",
      sort_order: 3,
      is_active: true,
    },
    {
      section_key: "terms_of_use",
      key: "terms_of_use",
      title: "Terms of use",
      subtitle: "Coming inside CLARA settings.",
      body:
        "Terms of use will be available inside CLARA settings.",
      sort_order: 4,
      is_active: true,
    },
    {
      section_key: "privacy_policy",
      key: "privacy_policy",
      title: "Privacy policy",
      subtitle: "Coming inside CLARA settings.",
      body:
        "Privacy policy will be available inside CLARA settings.",
      sort_order: 5,
      is_active: true,
    },
  ];

  const normalizeLegalInfoRow = (row, fallback) => ({
    section_key: row?.section_key || fallback.section_key,
    key: row?.section_key || fallback.section_key,
    title: normalizeString(row?.title || fallback.title),
    subtitle: normalizeString(row?.subtitle || fallback.subtitle),
    body: normalizeString(row?.body || fallback.body),
    sort_order: firstValidNumber(row?.sort_order, fallback.sort_order),
    is_active: row?.is_active !== false,
  });

  const aboutClaraRows = useMemo(() => {
    const savedRows = Array.isArray(legalInfoRows) ? legalInfoRows : [];

    return defaultAboutClaraRows.map((fallback) => {
      const saved = savedRows.find((row) => row?.section_key === fallback.section_key);
      return normalizeLegalInfoRow(saved, fallback);
    });
  }, [legalInfoRows]);

  const canEditLegalInformation = Boolean(isAdmin);

  const isProfileAdmin = useCallback((profileRecord) => {
    const roleValue = normalizeLower(profileRecord?.role);
    const userTypeValue = normalizeLower(profileRecord?.user_type);
    const accessLevelValue = normalizeLower(profileRecord?.access_level);

    return (
      roleValue === "admin" ||
      userTypeValue === "admin" ||
      accessLevelValue === "admin" ||
      profileRecord?.is_admin === true ||
      profileRecord?.admin === true
    );
  }, []);

  const verifyLegalInformationAdminAccess = useCallback(async () => {
    if (!user?.id || !canEditLegalInformation) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    return isProfileAdmin(data);
  }, [canEditLegalInformation, isProfileAdmin, user?.id]);

  const startLegalInformationEdit = useCallback(() => {
    if (!canEditLegalInformation) return;

    setLegalInfoError("");
    setSettingsNotice(null);
    setLegalInfoDraftRows(aboutClaraRows.map((row) => ({ ...row })));
    setLegalInfoEditMode(true);
  }, [aboutClaraRows, canEditLegalInformation]);

  const cancelLegalInformationEdit = useCallback(() => {
    setLegalInfoDraftRows([]);
    setLegalInfoEditMode(false);
    setLegalInfoError("");
  }, []);

  const updateLegalInformationDraft = useCallback((sectionKey, field, value) => {
    setLegalInfoDraftRows((currentRows) =>
      currentRows.map((row) =>
        row.section_key === sectionKey ? { ...row, [field]: value } : row
      )
    );
    setLegalInfoError("");
    setSettingsNotice(null);
  }, []);

  const saveLegalInformationContent = useCallback(async () => {
    if (!canEditLegalInformation || legalInfoSaving) return;

    setLegalInfoSaving(true);
    setLegalInfoError("");
    setSettingsNotice(null);

    try {
      const verifiedAdmin = await verifyLegalInformationAdminAccess();

      if (!verifiedAdmin) {
        throw new Error("Admin permission is required to update Legal & Information content.");
      }

      const now = new Date().toISOString();
      const rowsToSave = legalInfoDraftRows.map((row, index) => ({
        section_key: row.section_key,
        title: normalizeString(row.title) || defaultAboutClaraRows[index]?.title || "Untitled",
        subtitle: normalizeString(row.subtitle),
        body: normalizeString(row.body),
        sort_order: index + 1,
        is_active: true,
        updated_at: now,
        updated_by: user?.id || null,
      }));

      const { data, error } = await supabase
        .from("legal_information_content")
        .upsert(rowsToSave, { onConflict: "section_key" })
        .select("section_key,title,subtitle,body,sort_order,is_active,updated_at")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      setLegalInfoRows(Array.isArray(data) ? data : rowsToSave);
      setLegalInfoDraftRows([]);
      setLegalInfoEditMode(false);
      setSettingsNotice({
        type: "success",
        message: "Legal & Information content updated.",
      });
    } catch (error) {
      console.error("Legal information content save failed:", error);
      setLegalInfoError(error?.message || "Unable to save Legal & Information content right now.");
    } finally {
      setLegalInfoSaving(false);
    }
  }, [
    canEditLegalInformation,
    defaultAboutClaraRows,
    legalInfoDraftRows,
    legalInfoSaving,
    user?.id,
    verifyLegalInformationAdminAccess,
  ]);

  const AboutClaraRow = ({ row }) => {
    const isOpen = activeAboutInfo === row.section_key;

    return (
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.045]">
        <button
          type="button"
          onClick={() => setActiveAboutInfo((current) => (current === row.section_key ? null : row.section_key))}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.065] active:scale-[0.99]"
          aria-expanded={isOpen}
        >
          <div className="min-w-0 flex-1">
            <p className="break-words text-xs font-bold text-white">{row.title}</p>
            <p className="mt-1 break-words text-[11px] leading-5 text-white/42">{row.subtitle}</p>
          </div>

          <ChevronRight
            className={`h-4 w-4 shrink-0 text-white/35 transition duration-200 ${
              isOpen ? "rotate-90 text-emerald-200" : ""
            }`}
          />
        </button>

        <div
          className={`grid transition-all duration-200 ease-out ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-white/15 bg-black/15 px-4 py-4">
              {row.body
                .split(/\n{2,}/)
                .map((paragraph, index) => (
                  <p
                    key={`${row.section_key}-${index}`}
                    className={`${index > 0 ? "mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3 text-emerald-50/85" : "text-white/70"} text-sm leading-6`}
                  >
                    {paragraph}
                  </p>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LegalInformationEditField = ({ row, index }) => (
    <div className="rounded-2xl border border-white/15 bg-white/[0.045] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">
          {row.title || defaultAboutClaraRows[index]?.title || "Section"}
        </p>
        <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-white/45">
          {index + 1}
        </span>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-white/60">Title</span>
          <input
            type="text"
            value={row.title}
            onChange={(event) => updateLegalInformationDraft(row.section_key, "title", event.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/30 focus:bg-white/[0.06]"
            placeholder="Section title"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-white/60">Subtitle</span>
          <input
            type="text"
            value={row.subtitle}
            onChange={(event) => updateLegalInformationDraft(row.section_key, "subtitle", event.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/30 focus:bg-white/[0.06]"
            placeholder="Short row description"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-white/60">Body</span>
          <textarea
            value={row.body}
            onChange={(event) => updateLegalInformationDraft(row.section_key, "body", event.target.value)}
            rows={5}
            className="min-h-[118px] w-full resize-y rounded-2xl border border-white/15 bg-black/20 px-3.5 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/30 focus:bg-white/[0.06]"
            placeholder="Main detail content"
          />
        </label>
      </div>
    </div>
  );

  const renderAboutPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="About CLARA"
        subtitle="Understand CLARA’s purpose, direction, and the principles behind the app."
      />

      <div className="rounded-[30px] border border-white/15 bg-white/[0.045] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <p className="text-2xl font-black text-white">CLARA</p>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Built to help users see where their money goes, understand why they spend, and build better financial discipline one decision at a time.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <InfoTile label="Version" value="v1" />
          <InfoTile label="Experience" value="Mobile" />
        </div>
      </div>

      <div className="rounded-[30px] border border-white/15 bg-white/[0.075] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Legal & information</p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Mission, vision, and build information can be rendered here directly so the user stays inside settings.
            </p>
          </div>

          {canEditLegalInformation && !legalInfoEditMode ? (
            <button
              type="button"
              onClick={startLegalInformationEdit}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-100 transition hover:bg-emerald-400/15 active:scale-[0.98]"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </button>
          ) : null}
        </div>

        {legalInfoError ? (
          <div className="mb-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-xs leading-5 text-rose-100">
            {legalInfoError}
          </div>
        ) : null}

        {legalInfoLoading && !legalInfoEditMode ? (
          <div className="mb-3 rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-xs text-white/45">
            Loading Legal & Information content...
          </div>
        ) : null}

        {legalInfoEditMode ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3">
              <p className="text-xs font-bold text-emerald-50">Admin editing mode</p>
              <p className="mt-1 text-[11px] leading-5 text-emerald-50/65">
                Edit the Legal & Information content below. Changes are saved to Supabase and shown to all users.
              </p>
            </div>

            {legalInfoDraftRows.map((row, index) => (
              <LegalInformationEditField key={row.section_key} row={row} index={index} />
            ))}

            <div className="sticky bottom-3 z-10 grid grid-cols-2 gap-2 rounded-[22px] border border-white/15 bg-[#071120]/92 p-2 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <button
                type="button"
                onClick={cancelLegalInformationEdit}
                disabled={legalInfoSaving}
                className="rounded-2xl border border-white/15 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLegalInformationContent}
                disabled={legalInfoSaving}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-black text-white shadow-[0_12px_34px_rgba(16,185,129,0.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {legalInfoSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {aboutClaraRows.map((row) => (
              <AboutClaraRow key={row.section_key} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderActiveSetting = () => {
    if (activeSetting === "profile") return renderProfilePage();
    if (activeSetting === "notifications") return renderNotificationsPage();
    if (activeSetting === "performance") return renderPerformancePage();
    if (activeSetting === "plan") return renderPlanPage();
    if (activeSetting === "security") return renderSecurityPage();
    if (activeSetting === "support") return renderSupportPage();
    if (activeSetting === "about") return renderAboutPage();
    return null;
  };

  if (activeSetting) {
    return (
      <div className="min-h-full space-y-4 pb-6">
        {renderActiveSetting()}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {renderNotice()}

      <div className="rounded-[30px] border border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_34%),rgba(255,255,255,0.045)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/15 bg-white/10 text-lg font-black text-white">
            {dashboardPanelInitials(displayName)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-white">{displayName}</p>
            <p className="truncate text-xs text-white/50">{user?.email || "CLARA user"}</p>
          </div>

          <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-200">
            {currentPlan}
          </span>
        </div>
      </div>

      {settingSections.map((section) => (
        <section key={section.title} className="space-y-2">
          <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            {section.title}
          </p>

          <div className="space-y-2.5">
            {section.rows.map((row) => (
              <PremiumRow
                key={row.key}
                icon={row.icon}
                title={row.title}
                description={row.description}
                badge={row.badge}
                featured={row.featured}
                onClick={row.action}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-rose-300/20 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_34%),rgba(244,63,94,0.08)] px-4 py-4 text-sm font-black text-rose-100 shadow-[0_14px_40px_rgba(244,63,94,0.08)] transition hover:bg-rose-500/15 disabled:opacity-55"
        >
          <X className="h-4 w-4" />
          {signingOut ? "Signing out..." : "Log out"}
        </button>

        <p className="px-3 text-center text-[10px] font-semibold leading-4 text-white/32">
          You can log back in anytime using your CLARA account.
        </p>
      </div>
    </div>
  );
}

