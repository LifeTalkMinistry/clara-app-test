import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  Bell,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  Edit,
  ExternalLink,
  FileText,
  Flag,
  ListChecks,
  LogOut,
  MessageCircle,
  Palette,
  Plus,
  Rocket,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { signOutFromClaraBackend } from "@/lib/clara-backend-client";
import {
  fetchCanonicalClaraProfile,
  resolveCanonicalDisplayName,
} from "@/lib/canonical-clara-profile";
import { Button } from "@/components/ui/button";
import NotificationSettingsPanel from "@/components/notifications/NotificationSettingsPanel";
import SupportTierBadge from "@/components/support/SupportTierBadge";
import useClaraSupport from "@/hooks/useClaraSupport";
import useNotificationPreferences from "@/hooks/useNotificationPreferences";
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
import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import {
  formatCompactDate,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";
import {
  openCommittedVersionModal,
  useCommittedMembershipState,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import appPackage from "../../../../../../package.json";

const dashboardRuntimePrefs = { clear: () => {} };
const dashboardRuntimeNotifications = { clear: () => {} };
const dashboardRuntimeMoneySummaryVisibility = { clear: () => {} };
const dashboardRuntimePerformanceMode = { clear: () => {} };
const dashboardRuntimeProgramPrompts = { clear: () => {} };
const dashboardRuntimeThemes = { clear: () => {} };
const dashboardRuntimeSurvivalExpenses = { clear: () => {} };
const PANEL_HISTORY_KEY = "__claraDashboardPanel";
const SETTINGS_DETAIL_HISTORY_KEY = "__claraSettingsDetail";
const SETTINGS_DETAIL_KEYS = new Set([
  "security",
  "performance",
  "notifications",
  "plan",
  "support",
  "about",
]);

const firstValidNumber = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return 0;
};

const dashboardPanelInitials = (value = "") => {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "C";

  const words = cleanValue
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

export default function DashboardSettingsPanel({
  onBack,
  user,
  isAdmin = false,
  openThemePicker,
  resetThemeToDefault,
  onOpenMessages,
}) {
  const navigate = useNavigate();
  const settingsRootRef = useRef(null);

  const { support: supporterStatus } = useClaraSupport(user);
  const { preferences: notificationPreferences } =
    useNotificationPreferences(user?.id || "guest");
  const [localPerformanceMode, setLocalPerformanceMode] = useState(() =>
    readStoredPerformanceMode(user?.id || "guest")
  );

  const [activeSetting, setActiveSetting] = useState(() => {
    if (typeof window === "undefined") return null;
    const detailKey = window.history.state?.[SETTINGS_DETAIL_HISTORY_KEY];
    return SETTINGS_DETAIL_KEYS.has(detailKey) ? detailKey : null;
  });
  const [activeAboutInfo, setActiveAboutInfo] = useState(null);
  const [legalInfoRows, setLegalInfoRows] = useState([]);
  const [legalInfoDraftRows, setLegalInfoDraftRows] = useState([]);
  const [legalInfoLoading, setLegalInfoLoading] = useState(false);
  const [legalInfoSaving, setLegalInfoSaving] = useState(false);
  const [legalInfoEditMode, setLegalInfoEditMode] = useState(false);
  const [legalInfoError, setLegalInfoError] = useState("");
  const [canonicalProfile, setCanonicalProfile] = useState(null);
  const [settingsNotice, setSettingsNotice] = useState(null);
  const [supportTopic, setSupportTopic] = useState("Billing / enrollment");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [billingRecord, setBillingRecord] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [isAiPrivacyModalOpen, setIsAiPrivacyModalOpen] = useState(false);
  const [isDataDetailsOpen, setIsDataDetailsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const membershipState = useCommittedMembershipState({ billingRecord });

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
  }, [user?.id, membershipState.billingSyncKey]);

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

  useEffect(() => {
    let mounted = true;
    setCanonicalProfile(null);

    fetchCanonicalClaraProfile()
      .then((profile) => {
        if (mounted) setCanonicalProfile(profile || null);
      })
      .catch((error) => {
        console.warn("Canonical CLARA profile unavailable in Settings:", error);
        if (mounted) setCanonicalProfile(null);
      });

    return () => { mounted = false; };
  }, [user?.id]);

const canonicalDisplayName = resolveCanonicalDisplayName(canonicalProfile);
const displayName = canonicalDisplayName || "Your CLARA account";
const activeSupporterTier = supporterStatus?.active ? supporterStatus.tier : null;
const supportEmail = "claraprogram2026@gmail.com";

  const openSetting = useCallback((settingKey) => {
    if (!SETTINGS_DETAIL_KEYS.has(settingKey)) return;

    setSettingsNotice(null);
    setActiveAboutInfo(null);
    setIsAiPrivacyModalOpen(false);
    setIsDataDetailsOpen(false);

    if (typeof window !== "undefined") {
      const currentState = window.history.state || {};
      if (currentState?.[SETTINGS_DETAIL_HISTORY_KEY] !== settingKey) {
        window.history.pushState(
          {
            ...currentState,
            [PANEL_HISTORY_KEY]: "settings",
            [SETTINGS_DETAIL_HISTORY_KEY]: settingKey,
          },
          "",
          window.location.href
        );
      }
    }

    setActiveSetting(settingKey);
  }, []);

  const closeActiveSetting = useCallback(() => {
    setSettingsNotice(null);
    setActiveAboutInfo(null);
    setIsAiPrivacyModalOpen(false);
    setIsDataDetailsOpen(false);

    if (
      typeof window !== "undefined" &&
      window.history.state?.[SETTINGS_DETAIL_HISTORY_KEY]
    ) {
      window.history.back();
      return;
    }

    setActiveSetting(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleSettingsPopState = (event) => {
      const statePanel = event?.state?.[PANEL_HISTORY_KEY];
      if (statePanel && statePanel !== "settings") return;

      const detailKey = event?.state?.[SETTINGS_DETAIL_HISTORY_KEY];
      setActiveSetting(SETTINGS_DETAIL_KEYS.has(detailKey) ? detailKey : null);
      setActiveAboutInfo(null);
      setSettingsNotice(null);
      setIsAiPrivacyModalOpen(false);
      setIsDataDetailsOpen(false);
    };

    window.addEventListener("popstate", handleSettingsPopState);
    return () => window.removeEventListener("popstate", handleSettingsPopState);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const scrollOwner = settingsRootRef.current?.closest?.(".overflow-y-auto");
      scrollOwner?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeSetting]);

  const openMemoryBoard = useCallback(() => {
    dispatchClaraEvent("clara:open-assistant-memory-board", {
      cabinetName: "Spending Memory",
      source: "settings",
    });
  }, []);

  const handleLogout = useCallback(() => {
    if (signingOut) return;
    setSigningOut(true);
    signOutFromClaraBackend();
    window.setTimeout(() => window.location.reload(), 80);
  }, [signingOut]);

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

      setSettingsNotice({
        type: "success",
        message: "Local preferences were reset and the theme is back to default. Financial data was not touched.",
      });
    } catch (error) {
      console.error("Local preferences reset failed:", error);
      setSettingsNotice({ type: "error", message: "Unable to reset local preferences." });
    }
  }, [resetThemeToDefault]);

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
      const senderName = canonicalDisplayName || "CLARA User";

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
    canonicalDisplayName,
    onOpenMessages,
    supportEmail,
    supportMessage,
    supportTopic,
    user?.email,
    user?.id,
  ]);

  const settingSections = [
    {
      title: "Account",
      rows: [
        {
          key: "security",
          title: "Security & privacy",
          description: "Local records, AI privacy, and safe reset",
          icon: ShieldCheck,
          badge: "Safe",
          action: () => openSetting("security"),
        },
        {
          key: "memory",
          title: "Memory",
          description: "Saved context, patterns, and AI memory",
          icon: BrainCircuit,
          badge: "Review",
          action: openMemoryBoard,
        },
        {
          key: "notifications",
          title: "Notifications",
          description: "Reminders, alerts, and program updates",
          icon: Bell,
          action: () => openSetting("notifications"),
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
          badgeNode: activeSupporterTier ? (
            <SupportTierBadge tier={activeSupporterTier} compact />
          ) : null,
          action: () => openSetting("plan"),
        },
        {
          key: "support",
          title: "Help & support",
          description: "Message support or report an issue",
          icon: MessageCircle,
          badge: "Help",
          action: () => openSetting("support"),
        },
        {
          key: "about",
          title: "About CLARA",
          description: "Mission, vision, app info, and legal links",
          icon: FileText,
          badge: "Info",
          action: () => openSetting("about"),
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

const resolveBillingDate = useCallback((record, keys = []) => {
  const rawValue = keys.map((key) => record?.[key]).find(Boolean);
  return rawValue ? formatCompactDate(rawValue) : "Not recorded";
}, []);

const membershipStatusBadgeClass = {
  active: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
  pending: "border-amber-300/20 bg-amber-400/10 text-amber-100",
  not_committed: "border-white/15 bg-white/7 text-white/55",
  loading: "border-white/15 bg-white/7 text-white/55",
}[membershipState.membershipStatus] || "border-white/15 bg-white/7 text-white/55";

const billingStartLabel = billingRecord
  ? resolveBillingDate(billingRecord, ["current_period_start", "billing_start", "started_at", "approved_at", "created_at"])
  : "Not recorded";

const nextBillingLabel = billingRecord
  ? resolveBillingDate(billingRecord, ["next_billing_date", "next_payment_due", "current_period_end", "renewal_date", "expires_at", "valid_until", "end_date"])
  : "Not recorded";

const hasBillingStart = billingStartLabel !== "Not recorded";
const hasNextBilling = nextBillingLabel !== "Not recorded";
const hasBillingDates = hasBillingStart || hasNextBilling;
const shouldShowBillingDates = membershipState.isActiveCommitted && hasBillingDates;
const billingDetailsMessage =
  membershipState.membershipStatus === "loading"
    ? "Syncing membership…"
    : membershipState.isActiveCommitted
      ? billingLoading || !hasBillingDates
        ? "Billing details are syncing."
        : ""
      : membershipState.isPendingActivation
        ? billingLoading
          ? "Activation details are syncing."
          : "Activation is awaiting confirmation."
        : "No active billing. You will only be charged after starting and activating your commitment.";

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

  const PremiumRow = ({ icon: Icon, title, description, badge, badgeNode, featured, onClick }) => (
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

      {badgeNode || (badge ? (
        <span className="max-w-[96px] shrink-0 truncate rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-bold text-white/55">
          {badge}
        </span>
      ) : null)}

      <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
    </button>
  );

  const DetailHeader = ({ title, subtitle }) => (
    <div className="mb-4 space-y-4">
      <button
        type="button"
        onClick={closeActiveSetting}
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

  const renderNotificationsPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Notifications"
        subtitle="Control how and when CLARA gets your attention."
      />

      <NotificationSettingsPanel userId={user?.id} embedded />
    </div>
  );

const renderPlanPage = () => (
  <div className="space-y-4">
    <DetailHeader title="Plan & Billing" />

    <section className="overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.08),transparent_34%),rgba(255,255,255,0.055)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/65">
          Current membership
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-2xl font-black tracking-tight text-white">
            {membershipState.planLabel}
          </h3>
          <p className="mt-1 text-lg font-black text-emerald-100">
            {membershipState.priceLabel}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${membershipStatusBadgeClass}`}
        >
          {membershipState.statusLabel}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
        {membershipState.description}
      </p>
      <p className="mt-1 text-xs font-semibold leading-5 text-white/45">
        {membershipState.featureDescription}
      </p>

      {shouldShowBillingDates ? (
        <div
          className={`mt-5 grid gap-3 border-t border-white/10 pt-4 ${
            hasBillingStart && hasNextBilling ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {hasBillingStart ? (
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                Started
              </p>
              <p className="mt-1 break-words text-sm font-bold text-white/82">
                {billingStartLabel}
              </p>
            </div>
          ) : null}

          {hasNextBilling ? (
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                Next billing
              </p>
              <p className="mt-1 break-words text-sm font-bold text-white/82">
                {nextBillingLabel}
              </p>
            </div>
          ) : null}
        </div>
      ) : billingDetailsMessage ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs leading-5 text-white/48">
          {billingDetailsMessage}
        </p>
      ) : null}

      {membershipState.membershipStatus === "not_committed" ? (
        <button
          type="button"
          onClick={openCommittedVersionModal}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.22)] transition hover:scale-[1.01]"
        >
          View Committed Version
        </button>
      ) : null}
    </section>

    <section className="rounded-[26px] border border-white/12 bg-white/[0.03] p-4">
      <h3 className="text-sm font-black text-white">Need help with activation or billing?</h3>
      <p className="mt-2 text-xs leading-5 text-white/48">
        Contact CLARA Support and include the email connected to your account so the team can review your membership or billing details.
      </p>

      <button
        type="button"
        onClick={() => openSetting("support")}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/15"
      >
        Contact CLARA Support
      </button>
    </section>
  </div>
);

  const renderSecurityPage = () => {
    const protectedDataItems = [
      "Wallets",
      "Expenses",
      "Budgets",
      "Savings",
      "Emergency fund",
      "Transfers",
      "Transaction history",
      "AI context",
    ];
    const aiPrivacyItems = [
      "CLARA checks available device data first.",
      "Only the context needed for guidance is used.",
      "Your decision history stays personal.",
      "Your spending activity is not published to a public feed.",
    ];
    const closeSecurityOverlays = () => {
      setIsAiPrivacyModalOpen(false);
    };

    return (
      <div className="space-y-4 pb-6">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              closeSecurityOverlays();
              closeActiveSetting();
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-[11px] font-bold text-white/70 transition hover:bg-white/12"
          >
            <ArrowDown className="h-3.5 w-3.5 rotate-90" />
            Settings
          </button>

          <div className="px-1">
            <h2 className="text-xl font-black tracking-tight text-white">Security & privacy</h2>
          </div>
        </div>

        {renderNotice()}

        <section className="rounded-[24px] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.13),transparent_36%),rgba(255,255,255,0.045)] p-5 shadow-[0_16px_42px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-white">Your CLARA data stays private</h3>

              <p className="mt-3 text-sm font-semibold leading-6 text-white/68">
                This device has its own CLARA data. Signing in on another device will not automatically bring your financial records with it.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {["Financial records protected", "Each device starts with its own data", "No automatic device-to-device sync", "You choose when to transfer your data"].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm font-semibold text-white/72">
                <Check className="h-4 w-4 shrink-0 text-emerald-200" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-white/48">
            Your wallets, expenses, budgets, savings, transfers, transaction history, and AI context remain on this device unless you choose to back up or transfer them.
          </p>

          <button
            type="button"
            onClick={() => setIsDataDetailsOpen((current) => !current)}
            aria-expanded={isDataDetailsOpen}
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-emerald-100 transition hover:text-emerald-50"
          >
            View data details
            <ChevronRight
              className={"h-4 w-4 transition " + (isDataDetailsOpen ? "rotate-90 text-emerald-200" : "")}
            />
          </button>

          {isDataDetailsOpen ? (
            <div className="mt-1 border-t border-white/10 pt-4">
              <ul className="space-y-2">
                {protectedDataItems.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs font-semibold text-white/58">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-200/80" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <button
          type="button"
          onClick={() => navigate("/data-export")}
          className="group flex min-h-[72px] w-full items-center gap-3 rounded-[22px] border border-white/15 bg-white/[0.045] px-4 py-3.5 text-left transition hover:bg-white/[0.07]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/18 bg-emerald-400/8 text-emerald-100">
            <Database className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Move & Restore Data</p>
            <p className="mt-1 text-xs leading-5 text-white/46">
              Move your CLARA data to another device or restore a previous backup.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-white/45">
            <span>Open</span>
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-white/65" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsAiPrivacyModalOpen(true)}
          aria-haspopup="dialog"
          className="group flex min-h-[72px] w-full items-center gap-3 rounded-[22px] border border-white/15 bg-white/[0.045] px-4 py-3.5 text-left transition hover:bg-white/[0.07]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-400/8 text-cyan-100">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">AI privacy</p>
            <p className="mt-1 text-xs leading-5 text-white/46">
              CLARA uses only the financial context needed to guide you.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-white/45">
            <span className="hidden sm:inline">Learn more</span>
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-white/65" />
          </div>
        </button>

        {isAiPrivacyModalOpen ? (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-[#020713]/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setIsAiPrivacyModalOpen(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-privacy-title"
              onClick={(event) => event.stopPropagation()}
              className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-white/15 bg-[#081321] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.48)] sm:rounded-[28px]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 id="ai-privacy-title" className="text-lg font-black text-white">
                    How CLARA uses your information
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiPrivacyModalOpen(false)}
                  aria-label="Close AI privacy information"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.055] text-white/60 transition hover:bg-white/[0.09] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {aiPrivacyItems.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" />
                    <p className="text-sm leading-6 text-white/68">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

      </div>
    );
  };

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
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
              localPerformanceMode
                ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100"
                : "border-white/15 bg-white/8 text-white/65"
            }`}
          >
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
        "CLARA’s mission is to normalize budgeting by making it personal, guided, and easier to commit to.\n\nCLARA helps users build healthier financial habits through clear tracking, simple structure, personal accountability, and daily money awareness — so budgeting feels less like pressure and more like self-respect.",
      sort_order: 1,
      is_active: true,
    },
    {
      section_key: "vision",
      key: "vision",
      title: "Vision",
      subtitle: "See the long-term direction of CLARA.",
      body:
        "CLARA’s vision is to become a trusted financial habit-building partner for people who want to build discipline, protect their money, and create a healthier relationship with their finances.\n\nCLARA envisions a future where budgeting is no longer seen as punishment or restriction, but as a normal, empowering part of everyday life.",
      sort_order: 2,
      is_active: true,
    },
    {
      section_key: "privacy_policy",
      key: "privacy_policy",
      title: "Privacy Policy",
      subtitle: "See how CLARA protects your personal and financial information.",
      body:
        "CLARA respects your privacy and is designed to protect the personal and financial information you provide inside the app.\n\nCLARA may use information such as your email, expenses, budgets, wallet entries, app activity, and financial patterns to provide core features, personalize your experience, and improve guidance.\n\nCLARA does not sell your personal data. Your information is used to support your financial journey, not to exploit it.",
      sort_order: 3,
      is_active: true,
    },
    {
      section_key: "terms_of_use",
      key: "terms_of_use",
      title: "Terms of Use",
      subtitle: "Understand how CLARA should be used responsibly.",
      body:
        "CLARA is a personal finance guidance app designed to support awareness, budgeting, and better money decisions.\n\nCLARA’s tools and AI guidance are meant to help users reflect, organize, and decide more clearly. They should not be treated as professional financial, legal, tax, or investment advice.\n\nYou remain responsible for your own financial decisions, spending choices, account activity, and how you use the guidance provided inside the app.",
      sort_order: 4,
      is_active: true,
    },
    {
      section_key: "clara_difference",
      key: "clara_difference",
      title: "App Information",
      subtitle: "See how CLARA goes beyond basic expense tracking.",
      body:
        "Most finance tools only show information. CLARA gives users a system.\n\nIt connects wallets, budgets, savings, and spending behavior so users do not only track what happened — they learn how to control what happens next.\n\nCLARA focuses on simplicity, structure, and consistency because real financial progress does not come from knowing more. It comes from doing the right things repeatedly.",
      sort_order: 5,
      is_active: true,
    },
  ];

  const informationTitleByKey = {
    mission: "Mission",
    vision: "Vision",
    privacy_policy: "Privacy Policy",
    terms_of_use: "Terms of Use",
    clara_difference: "App Information",
  };

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
        throw new Error("Admin permission is required to update Information content.");
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
        message: "Information content updated.",
      });
    } catch (error) {
      console.error("Information content save failed:", error);
      setLegalInfoError(error?.message || "Unable to save Information content right now.");
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

  const AboutClaraRow = ({ row, isLast }) => {
    const isOpen = activeAboutInfo === row.section_key;

    return (
      <div className={isLast ? "" : "border-b border-white/10"}>
        <button
          type="button"
          onClick={() => setActiveAboutInfo((current) => (current === row.section_key ? null : row.section_key))}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.045] active:scale-[0.99]"
          aria-expanded={isOpen}
        >
          <p className="min-w-0 flex-1 break-words text-sm font-bold text-white">
            {informationTitleByKey[row.section_key] || row.title}
          </p>

          <ChevronRight
            className={`h-4 w-4 shrink-0 text-white/35 transition duration-200 ${
              isOpen ? "rotate-90 text-cyan-200" : ""
            }`}
          />
        </button>

        <div
          className={`grid transition-all duration-200 ease-out ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-white/10 bg-black/10 px-4 py-4">
              {row.body
                .split(/\n{2,}/)
                .map((paragraph, index) => (
                  <p
                    key={`${row.section_key}-${index}`}
                    className={`${index > 0 ? "mt-3" : ""} text-sm leading-6 text-white/68`}
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
    <div className="space-y-5">
      <div className="space-y-4">
        <button
          type="button"
          onClick={closeActiveSetting}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-[11px] font-bold text-white/70 transition hover:bg-white/12"
        >
          <ArrowDown className="h-3.5 w-3.5 rotate-90" />
          Settings
        </button>

        <div className="px-1">
          <h2 className="text-xl font-black tracking-tight text-white">About CLARA</h2>
        </div>
      </div>

      <section className="rounded-[26px] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.13),transparent_42%),rgba(255,255,255,0.045)] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <p className="text-2xl font-black tracking-tight text-white">CLARA</p>
        <p className="mt-1 text-sm font-bold text-cyan-100/80">Personal Money Coach</p>

        <p className="mt-4 max-w-[28ch] text-sm font-semibold leading-6 text-white/72">
          Understand your spending.<br />
          Make better money decisions.
        </p>

        <p className="mt-5 border-t border-white/10 pt-3 text-[11px] font-semibold text-white/38">
          Version {appPackage.version}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <h3 className="text-sm font-black text-white">Information</h3>

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
          <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-xs leading-5 text-rose-100">
            {legalInfoError}
          </div>
        ) : null}

        {legalInfoLoading && !legalInfoEditMode ? (
          <div className="rounded-2xl border border-white/12 bg-white/[0.035] px-4 py-3 text-xs text-white/45">
            Loading information...
          </div>
        ) : null}

        {legalInfoEditMode ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3">
              <p className="text-xs font-bold text-emerald-50">Admin editing mode</p>
              <p className="mt-1 text-[11px] leading-5 text-emerald-50/65">
                Edit the Information content below. Changes are saved to Supabase and shown to all users.
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
          <div className="overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.03]">
            {aboutClaraRows.map((row, index) => (
              <AboutClaraRow
                key={row.section_key}
                row={row}
                isLast={index === aboutClaraRows.length - 1}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderActiveSetting = () => {
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
      <div ref={settingsRootRef} className="min-h-full space-y-4 pb-6">
        {renderActiveSetting()}
      </div>
    );
  }

  return (
    <div ref={settingsRootRef} className="space-y-5 pb-6">
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

          {activeSupporterTier ? (
            <SupportTierBadge tier={activeSupporterTier} compact />
          ) : null}
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
                badgeNode={row.badgeNode}
                featured={row.featured}
                onClick={row.action}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[24px] border border-rose-300/25 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_34%),rgba(244,63,94,0.10)] px-4 py-4 text-sm font-black text-rose-100 shadow-[0_14px_40px_rgba(244,63,94,0.10)] transition hover:bg-rose-500/18 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Logging out..." : "Log out"}
        </button>
        <p className="px-2 text-center text-[10px] font-semibold leading-4 text-white/55">
          Your financial records stay on this device. Log in again anytime.
        </p>
      </section>
    </div>
  );
}
