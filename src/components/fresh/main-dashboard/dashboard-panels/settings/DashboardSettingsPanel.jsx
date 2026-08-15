import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  Bell,
  Check,
  ChevronRight,
  Edit,
  FileText,
  LogOut,
  MessageCircle,
  Rocket,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { signOutFromClaraBackend } from "@/lib/clara-backend-client";
import {
  fetchCanonicalClaraProfile,
  resolveCanonicalDisplayName,
} from "@/lib/canonical-clara-profile";
import { getSupportTier } from "@/lib/clara-support";
import DeviceTransferPanel from "@/components/device-transfer/DeviceTransferPanel";
import NotificationSettingsPanel from "@/components/notifications/NotificationSettingsPanel";
import SupportTierBadge from "@/components/support/SupportTierBadge";
import useClaraSupport from "@/hooks/useClaraSupport";
import {
  applyVisualPerformanceMode,
  readStoredPerformanceMode,
  saveVisualPerformanceMode,
} from "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode";
import {
  formatCompactDate,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";
import { useCommittedMembershipState } from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import appPackage from "../../../../../../package.json";

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

const surfaceClass =
  "rounded-[24px] border border-[#1e4f86]/45 bg-[#07162b] shadow-[0_18px_42px_rgba(0,0,0,0.22)]";
const quietSurfaceClass =
  "rounded-[22px] border border-[#173c68]/45 bg-[#061225]";
const fieldClass =
  "w-full rounded-2xl border border-[#22588f]/45 bg-[#040d1c] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-[#3c8cff]/70 focus:ring-2 focus:ring-[#0867ff]/10";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#4f96ff]/35 bg-[#0867ff] px-4 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(8,103,255,0.18)] transition hover:bg-[#1473ff] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#2b659e]/45 bg-[#0a1b33] px-4 py-3 text-sm font-black text-[#b9d9ff] transition hover:bg-[#0d2342] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

const firstValidNumber = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return 0;
};

const dashboardPanelInitials = (value = "") => {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return "C";

  return cleanValue
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const rowToneClasses = {
  blue: {
    icon: "border-[#2f73bb]/45 bg-[#0867ff]/10 text-[#b8d8ff]",
    badge: "border-[#2f73bb]/40 bg-[#0867ff]/8 text-[#a9cfff]",
  },
  gold: {
    icon: "border-[#a98e32]/45 bg-[#ffd84a]/8 text-[#ffe77d]",
    badge: "border-[#9c8330]/40 bg-[#ffd84a]/7 text-[#ffe681]",
  },
  red: {
    icon: "border-[#9c3346]/40 bg-[#f32645]/7 text-[#ffb8c4]",
    badge: "border-[#8e3041]/35 bg-[#f32645]/6 text-[#ffb3c0]",
  },
};

export default function DashboardSettingsPanelOfficial({
  user,
  isAdmin = false,
  onOpenMessages,
}) {
  const navigate = useNavigate();
  const settingsRootRef = useRef(null);
  const {
    support: supporterStatus,
    record: supportRecord,
    loading: supportLoading,
  } = useClaraSupport(user);
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
  const [supportTopic, setSupportTopic] = useState("Membership / access");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [billingRecord, setBillingRecord] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
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
        if (isMounted) setBillingRecord(data || null);
      } catch (error) {
        console.error("Embedded legacy membership fetch failed:", error);
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
        if (isMounted) setLegalInfoRows(Array.isArray(data) ? data : []);
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

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const canonicalDisplayName = resolveCanonicalDisplayName(canonicalProfile);
  const displayName = canonicalDisplayName || "Your CLARA account";
  const activeSupporterTier = supporterStatus?.active ? supporterStatus.tier : null;
  const supportEmail = "claraprogram2026@gmail.com";

  const openSetting = useCallback((settingKey) => {
    if (!SETTINGS_DETAIL_KEYS.has(settingKey)) return;

    setSettingsNotice(null);
    setActiveAboutInfo(null);
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
      if (adminError) throw adminError;

      const admins = (Array.isArray(adminProfiles) ? adminProfiles : []).filter(
        (admin) => admin?.id && admin.id !== user.id
      );

      if (admins.length === 0) {
        setSettingsNotice({
          type: "error",
          message: "No admin account is available for support messages yet.",
        });
        return;
      }

      const supportContent = `[CLARA Support • ${supportTopic}]\n\n${trimmed}`;
      const senderName = canonicalDisplayName || "CLARA User";
      const payloads = admins.map((admin) => ({
        conversation_id: [String(user.id), String(admin.id)].sort().join("_"),
        sender_id: user.id,
        sender_email: user.email || "",
        sender_name: senderName,
        recipient_id: admin.id,
        recipient_email: admin.email || supportEmail,
        recipient_name: admin?.full_name || admin?.email || "CLARA Admin",
        content: supportContent,
        is_read: false,
      }));

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
        window.setTimeout(() => onOpenMessages(), 350);
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
  }, [canonicalDisplayName, onOpenMessages, supportMessage, supportTopic, user?.email, user?.id]);

  const settingSections = [
    {
      title: "Account",
      tone: "blue",
      rows: [
        { key: "security", title: "Security & privacy", description: "Local records, AI privacy, and safe reset", icon: ShieldCheck, badge: "Safe", tone: "blue", action: () => openSetting("security") },
        { key: "notifications", title: "Notifications", description: "Reminders, alerts, and program updates", icon: Bell, tone: "blue", action: () => openSetting("notifications") },
      ],
    },
    {
      title: "Program",
      tone: "gold",
      rows: [
        {
          key: "plan",
          title: "Membership",
          description: "Your tier, status, and membership benefits",
          icon: WalletCards,
          tone: "gold",
          badgeNode: activeSupporterTier ? <SupportTierBadge tier={activeSupporterTier} compact tone="settings" /> : null,
          action: () => openSetting("plan"),
        },
        { key: "support", title: "Help & support", description: "Message support or report an issue", icon: MessageCircle, badge: "Help", tone: "red", action: () => openSetting("support") },
        { key: "about", title: "About CLARA", description: "Mission, vision, app info, and legal links", icon: FileText, badge: "Info", tone: "blue", action: () => openSetting("about") },
        ...(isAdmin ? [{ key: "admin", title: "Admin Panel", description: "Manage users, access, and CLARA controls", icon: ShieldCheck, badge: "Admin", tone: "gold", action: () => navigate("/admin") }] : []),
      ],
    },
  ];

  const resolveMembershipDate = useCallback((record, keys = []) => {
    const rawValue = keys.map((key) => record?.[key]).find(Boolean);
    return rawValue ? formatCompactDate(rawValue) : "Not recorded";
  }, []);

  const supportTierKey = normalizeLower(supportRecord?.tier);
  const usesLegacyBuilderFallback = Boolean(!supportTierKey && membershipState.isCommittedPlan);
  const selectedMembershipTierKey = supportTierKey || (usesLegacyBuilderFallback ? "builder" : null);
  const selectedMembershipTier = getSupportTier(selectedMembershipTierKey);
  const supportRecordStatus = normalizeLower(supportRecord?.status);
  const membershipStatus = supportTierKey
    ? supportLoading
      ? "loading"
      : supporterStatus?.active
        ? "active"
        : supportRecordStatus || "inactive"
    : usesLegacyBuilderFallback
      ? membershipState.membershipStatus
      : supportLoading
        ? "loading"
        : "free";
  const membershipTierLabel = selectedMembershipTier
    ? selectedMembershipTier.name.replace(/^CLARA\s+/i, "")
    : "Free";
  const membershipPriceLabel = selectedMembershipTier
    ? `₱${selectedMembershipTier.price}/month`
    : "₱0";
  const membershipStatusLabel = membershipStatus === "loading"
    ? "SYNCING"
    : membershipStatus === "active"
      ? "ACTIVE"
      : membershipStatus === "pending"
        ? "PENDING"
        : ["inactive", "expired", "cancelled"].includes(membershipStatus)
          ? "INACTIVE"
          : "FREE";
  const membershipStatusBadgeClass = membershipStatus === "active"
    ? "border-[#b89934]/45 bg-[#ffd84a]/8 text-[#ffe681]"
    : membershipStatus === "pending"
      ? "border-[#b89934]/40 bg-[#ffd84a]/7 text-[#ffe681]"
      : "border-[#315c8c]/45 bg-[#0a1a30] text-[#9fb9d8]";
  const membershipDescription = membershipStatus === "loading"
    ? "Syncing your CLARA membership."
    : membershipStatus === "active"
      ? "Your CLARA membership is active."
      : membershipStatus === "pending"
        ? "Your CLARA membership is awaiting activation."
        : ["inactive", "expired", "cancelled"].includes(membershipStatus)
          ? "Your CLARA membership is currently inactive."
          : "You’re currently on the Free tier.";
  const membershipBenefitsDescription = membershipStatus === "loading"
    ? "Your membership benefits will appear once your status is ready."
    : membershipStatus === "active"
      ? "Your membership benefits are unlocked."
      : membershipStatus === "pending"
        ? "Your membership benefits will unlock once activation is complete."
        : selectedMembershipTier
          ? "Your membership benefits are currently unavailable."
          : "CLARA’s core experience remains available.";
  const membershipDateRecord = supportTierKey ? supportRecord : billingRecord;
  const memberSinceLabel = membershipDateRecord
    ? resolveMembershipDate(membershipDateRecord, [
        "support_start_at",
        "payment_date",
        "current_period_start",
        "billing_start",
        "started_at",
        "approved_at",
        "created_at",
      ])
    : user?.created_at
      ? formatCompactDate(user.created_at)
      : "Not recorded";
  const nextRenewalLabel = membershipStatus === "active" && membershipDateRecord
    ? resolveMembershipDate(membershipDateRecord, [
        "renewal_at",
        "support_expires_at",
        "next_billing_date",
        "next_payment_due",
        "current_period_end",
        "renewal_date",
        "expires_at",
        "valid_until",
        "end_date",
      ])
    : "Not recorded";
  const hasMemberSince = memberSinceLabel !== "Not recorded";
  const hasNextRenewal = nextRenewalLabel !== "Not recorded";
  const shouldShowMembershipDates = hasMemberSince || hasNextRenewal;
  const membershipDetailsLoading = supportLoading || (usesLegacyBuilderFallback && billingLoading);
  const membershipDetailsMessage = selectedMembershipTier && membershipDetailsLoading && !shouldShowMembershipDates
    ? "Membership details are syncing."
    : "";

  const renderNotice = () => {
    if (!settingsNotice) return null;
    const isError = settingsNotice.type === "error";
    return <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${isError ? "border-[#a4384b]/45 bg-[#f32645]/7 text-[#ffc0cb]" : "border-[#2d6dae]/45 bg-[#0867ff]/8 text-[#c5e0ff]"}`}>{settingsNotice.message}</div>;
  };

  const SettingsToggle = ({ enabled }) => (
    <span className={`relative h-7 w-12 shrink-0 rounded-full border transition ${enabled ? "border-[#4f96ff]/60 bg-[#0867ff]" : "border-[#345779]/55 bg-[#0a1728]"}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`} />
    </span>
  );

  const SettingsRow = ({ icon: Icon, title, description, badge, badgeNode, tone = "blue", onClick, isLast }) => {
    const toneClasses = rowToneClasses[tone] || rowToneClasses.blue;
    return (
      <button type="button" onClick={onClick} className={`group flex min-h-[76px] w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#0b203a] active:bg-[#0d2747] ${isLast ? "" : "border-b border-[#173a62]/55"}`}>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${toneClasses.icon}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-[#f7fbff]">{title}</p><p className="mt-1 truncate text-xs text-[#8ea7c4]">{description}</p></div>
        {badgeNode || (badge ? <span className={`max-w-[96px] shrink-0 truncate rounded-full border px-2.5 py-1 text-[10px] font-black ${toneClasses.badge}`}>{badge}</span> : null)}
        <ChevronRight className="h-4 w-4 shrink-0 text-[#5f7896] transition group-hover:translate-x-0.5 group-hover:text-[#9cc9ff]" />
      </button>
    );
  };

  const DetailHeader = ({ title, subtitle }) => (
    <div className="mb-5">
      <button type="button" onClick={closeActiveSetting} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#275f98]/45 bg-[#07182d] px-3 py-2 text-[11px] font-black text-[#9cc9ff] transition hover:bg-[#0a203b]"><ArrowDown className="h-3.5 w-3.5 rotate-90" />Settings</button>
      <div className="mt-5 border-b border-[#1b4f82]/45 pb-4"><h2 className="text-xl font-black tracking-tight text-[#f7fbff]">{title}</h2>{subtitle ? <p className="mt-2 max-w-[34ch] text-xs leading-5 text-[#8ea8c6]">{subtitle}</p> : null}</div>
    </div>
  );

  const renderNotificationsPage = () => <div className="space-y-4"><DetailHeader title="Notifications" subtitle="Control how and when CLARA gets your attention." /><NotificationSettingsPanel userId={user?.id} embedded /></div>;

  const renderPlanPage = () => (
    <div className="space-y-4">
      <DetailHeader title="Membership" subtitle="Your CLARA membership, benefits, and status." />
      <section className={`${surfaceClass} relative overflow-hidden p-5`}>
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#0867ff_0%,#19b5ff_35%,#ffd84a_67%,#f32645_100%)]" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e5c95e]">Current membership</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-2xl font-black tracking-tight text-white">{membershipTierLabel}</h3><p className="mt-1 text-lg font-black text-[#ffe477]">{membershipPriceLabel}</p></div><span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${membershipStatusBadgeClass}`}>{membershipStatusLabel}</span></div>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#b8c8da]">{membershipDescription}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#849ab4]">{membershipBenefitsDescription}</p>
        {shouldShowMembershipDates ? <div className={`mt-5 grid gap-3 border-t border-[#1c466f]/45 pt-4 ${hasMemberSince && hasNextRenewal ? "grid-cols-2" : "grid-cols-1"}`}>{hasMemberSince ? <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6f8aa8]">Member since</p><p className="mt-1 break-words text-sm font-bold text-[#dce9f7]">{memberSinceLabel}</p></div> : null}{hasNextRenewal ? <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6f8aa8]">Next renewal</p><p className="mt-1 break-words text-sm font-bold text-[#dce9f7]">{nextRenewalLabel}</p></div> : null}</div> : membershipDetailsMessage ? <p className="mt-5 rounded-2xl border border-[#1b466f]/40 bg-[#040d1a] px-4 py-3 text-xs leading-5 text-[#8199b5]">{membershipDetailsMessage}</p> : null}
      </section>
      <section className={`${quietSurfaceClass} p-4`}><h3 className="text-sm font-black text-white">Need help with your membership?</h3><p className="mt-2 text-xs leading-5 text-[#849ab4]">CLARA Support can help with your membership, access, or account.</p><button type="button" onClick={() => openSetting("support")} className={`${secondaryButtonClass} mt-4 w-full`}>Contact CLARA Support</button></section>
    </div>
  );

  const renderSecurityPage = () => {
    const protectedDataItems = ["Wallets", "Expenses", "Budgets", "Savings", "Emergency fund", "Transfers", "Transaction history", "AI context"];
    return (
      <div className="space-y-4 pb-6">
        <DetailHeader title="Security & privacy" />
        {renderNotice()}
        <section className={`${surfaceClass} p-5`}>
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#367ec5]/45 bg-[#0867ff]/10 text-[#bddcff]"><ShieldCheck className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="text-base font-black text-white">Your CLARA data stays private</h3><p className="mt-3 text-sm font-semibold leading-6 text-[#a9bbcf]">Your financial data stays on this device by default. Signing in somewhere else will not automatically copy it.</p></div></div>
          <div className="mt-5 space-y-2.5">{["Stays on this device", "No automatic device sync", "You control backup & transfer"].map((item) => <div key={item} className="flex items-center gap-2.5 text-sm font-semibold text-[#b8c9dc]"><Check className="h-4 w-4 shrink-0 text-[#58bfff]" /><span>{item}</span></div>)}</div>
          <button type="button" onClick={() => setIsDataDetailsOpen((current) => !current)} aria-expanded={isDataDetailsOpen} className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-black text-[#8ec7ff] transition hover:text-[#c6e3ff]">View data details<ChevronRight className={`h-4 w-4 transition ${isDataDetailsOpen ? "rotate-90 text-[#ffd84a]" : ""}`} /></button>
          {isDataDetailsOpen ? <div className="mt-1 border-t border-[#1a466f]/45 pt-4"><ul className="space-y-2">{protectedDataItems.map((item) => <li key={item} className="flex items-center gap-2 text-xs font-semibold text-[#8ba0b8]"><Check className="h-3.5 w-3.5 shrink-0 text-[#58bfff]" />{item}</li>)}</ul></div> : null}
        </section>
        <DeviceTransferPanel user={user} profile={canonicalProfile} />
      </div>
    );
  };

  const renderSupportPage = () => (
    <div className="space-y-4">
      <DetailHeader title="Help & support" subtitle="Send a support message directly to CLARA admins." />
      {renderNotice()}
      <div className={`${surfaceClass} relative overflow-hidden p-4`}><div aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-[#f32645]/75" /><label className="block space-y-2"><span className="text-xs font-black uppercase tracking-[0.14em] text-[#8ca4bf]">Topic</span><select value={supportTopic} onChange={(event) => setSupportTopic(event.target.value)} className={fieldClass}><option>Membership / access</option><option>Technical issue</option><option>Account access</option><option>Feature request</option><option>Other concern</option></select></label><label className="mt-4 block space-y-2"><span className="text-xs font-black uppercase tracking-[0.14em] text-[#8ca4bf]">Message</span><textarea value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} placeholder="Briefly describe what you need help with..." className={`${fieldClass} min-h-[120px] resize-none`} disabled={supportSending} /></label><button type="button" onClick={handleSendSupportMessage} disabled={supportSending || !supportMessage.trim()} className={`${primaryButtonClass} mt-4 w-full`}>{supportSending ? "Sending to CLARA support..." : "Send CLARA support message"}</button><p className="mt-3 text-center text-[11px] leading-5 text-[#7e94ad]">All admin accounts will receive this in Messages. You’ll be moved to the Message tab after sending.</p></div>
      {supportSent ? <div className="rounded-[22px] border border-[#2d6dae]/45 bg-[#0867ff]/8 p-4"><p className="text-sm font-black text-[#c5e0ff]">Support message sent</p><p className="mt-1 text-xs leading-5 text-[#8298b2]">Your message was sent to CLARA admin support. Check the Message tab for the conversation.</p></div> : null}
      <div className={`${quietSurfaceClass} p-4`}><p className="text-sm font-black text-white">Support email</p><p className="mt-1 select-all text-sm font-black text-[#ffd84a]">{supportEmail}</p></div>
    </div>
  );

  const renderPerformancePage = () => (
    <div className="space-y-4">
      <DetailHeader title="Performance Mode" subtitle="Keep CLARA premium with a static, smooth, no-glow visual mode for slower phones." />
      {renderNotice()}
      <button type="button" onClick={persistPerformanceToggle} className={`${surfaceClass} flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#091b33]`}><div className="flex min-w-0 flex-1 items-center gap-3"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${localPerformanceMode ? "border-[#4a93e4]/55 bg-[#0867ff]/12 text-[#c3e0ff]" : "border-[#284f78]/50 bg-[#0a182a] text-[#88a5c4]"}`}><Rocket className="h-5 w-5" /></div><div className="min-w-0"><p className="text-sm font-black text-white">Performance Mode</p><p className="mt-1 text-xs leading-5 text-[#8298b2]">Static visuals with no animation, glow, or blur for smoother performance.</p></div></div><SettingsToggle enabled={localPerformanceMode} /></button>
      <div className={`${quietSurfaceClass} p-4`}><p className="text-sm font-bold text-white">Current visual mode: {localPerformanceMode ? "Performance" : "Premium"}</p><p className="mt-1 text-xs leading-5 text-[#7f96b0]">Premium Mode keeps CLARA's full visual experience. Performance Mode keeps the same layout and official colors while reducing motion and expensive effects.</p></div>
    </div>
  );

  const defaultAboutClaraRows = [
    { section_key: "mission", key: "mission", title: "Mission", subtitle: "See CLARA’s purpose and guiding mission.", body: "CLARA’s mission is to normalize budgeting by making it personal, guided, and easier to commit to.\n\nCLARA helps users build healthier financial habits through clear tracking, simple structure, personal accountability, and daily money awareness — so budgeting feels less like pressure and more like self-respect.", sort_order: 1, is_active: true },
    { section_key: "vision", key: "vision", title: "Vision", subtitle: "See the long-term direction of CLARA.", body: "CLARA’s vision is to become a trusted financial habit-building partner for people who want to build discipline, protect their money, and create a healthier relationship with their finances.\n\nCLARA envisions a future where budgeting is no longer seen as punishment or restriction, but as a normal, empowering part of everyday life.", sort_order: 2, is_active: true },
    { section_key: "privacy_policy", key: "privacy_policy", title: "Privacy Policy", subtitle: "See how CLARA protects your personal and financial information.", body: "CLARA respects your privacy and is designed to protect the personal and financial information you provide inside the app.\n\nCLARA may use information such as your email, expenses, budgets, wallet entries, app activity, and financial patterns to provide core features, personalize your experience, and improve guidance.\n\nCLARA does not sell your personal data. Your information is used to support your financial journey, not to exploit it.", sort_order: 3, is_active: true },
    { section_key: "terms_of_use", key: "terms_of_use", title: "Terms of Use", subtitle: "Understand how CLARA should be used responsibly.", body: "CLARA is a personal finance guidance app designed to support awareness, budgeting, and better money decisions.\n\nCLARA’s tools and AI guidance are meant to help users reflect, organize, and decide more clearly. They should not be treated as professional financial, legal, tax, or investment advice.\n\nYou remain responsible for your own financial decisions, spending choices, account activity, and how you use the guidance provided inside the app.", sort_order: 4, is_active: true },
    { section_key: "clara_difference", key: "clara_difference", title: "App Information", subtitle: "See how CLARA goes beyond basic expense tracking.", body: "Most finance tools only show information. CLARA gives users a system.\n\nIt connects wallets, budgets, savings, and spending behavior so users do not only track what happened — they learn how to control what happens next.\n\nCLARA focuses on simplicity, structure, and consistency because real financial progress does not come from knowing more. It comes from doing the right things repeatedly.", sort_order: 5, is_active: true },
  ];

  const informationTitleByKey = { mission: "Mission", vision: "Vision", privacy_policy: "Privacy Policy", terms_of_use: "Terms of Use", clara_difference: "App Information" };
  const normalizeLegalInfoRow = (row, fallback) => ({ section_key: row?.section_key || fallback.section_key, key: row?.section_key || fallback.section_key, title: normalizeString(row?.title || fallback.title), subtitle: normalizeString(row?.subtitle || fallback.subtitle), body: normalizeString(row?.body || fallback.body), sort_order: firstValidNumber(row?.sort_order, fallback.sort_order), is_active: row?.is_active !== false });
  const aboutClaraRows = useMemo(() => defaultAboutClaraRows.map((fallback) => normalizeLegalInfoRow((Array.isArray(legalInfoRows) ? legalInfoRows : []).find((row) => row?.section_key === fallback.section_key), fallback)), [legalInfoRows]);
  const canEditLegalInformation = Boolean(isAdmin);

  const isProfileAdmin = useCallback((profileRecord) => {
    const roleValue = normalizeLower(profileRecord?.role);
    const userTypeValue = normalizeLower(profileRecord?.user_type);
    const accessLevelValue = normalizeLower(profileRecord?.access_level);
    return roleValue === "admin" || userTypeValue === "admin" || accessLevelValue === "admin" || profileRecord?.is_admin === true || profileRecord?.admin === true;
  }, []);

  const verifyLegalInformationAdminAccess = useCallback(async () => {
    if (!user?.id || !canEditLegalInformation) return false;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
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
    setLegalInfoDraftRows((currentRows) => currentRows.map((row) => row.section_key === sectionKey ? { ...row, [field]: value } : row));
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
      if (!verifiedAdmin) throw new Error("Admin permission is required to update Information content.");
      const now = new Date().toISOString();
      const rowsToSave = legalInfoDraftRows.map((row, index) => ({ section_key: row.section_key, title: normalizeString(row.title) || defaultAboutClaraRows[index]?.title || "Untitled", subtitle: normalizeString(row.subtitle), body: normalizeString(row.body), sort_order: index + 1, is_active: true, updated_at: now, updated_by: user?.id || null }));
      const { data, error } = await supabase.from("legal_information_content").upsert(rowsToSave, { onConflict: "section_key" }).select("section_key,title,subtitle,body,sort_order,is_active,updated_at").order("sort_order", { ascending: true });
      if (error) throw error;
      setLegalInfoRows(Array.isArray(data) ? data : rowsToSave);
      setLegalInfoDraftRows([]);
      setLegalInfoEditMode(false);
      setSettingsNotice({ type: "success", message: "Information content updated." });
    } catch (error) {
      console.error("Information content save failed:", error);
      setLegalInfoError(error?.message || "Unable to save Information content right now.");
    } finally {
      setLegalInfoSaving(false);
    }
  }, [canEditLegalInformation, defaultAboutClaraRows, legalInfoDraftRows, legalInfoSaving, user?.id, verifyLegalInformationAdminAccess]);

  const AboutClaraRow = ({ row, isLast }) => {
    const isOpen = activeAboutInfo === row.section_key;
    return <div className={isLast ? "" : "border-b border-[#173a62]/55"}><button type="button" onClick={() => setActiveAboutInfo((current) => current === row.section_key ? null : row.section_key)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-[#0a1d35] active:bg-[#0d2542]" aria-expanded={isOpen}><p className="min-w-0 flex-1 break-words text-sm font-black text-white">{informationTitleByKey[row.section_key] || row.title}</p><ChevronRight className={`h-4 w-4 shrink-0 transition duration-200 ${isOpen ? "rotate-90 text-[#ffd84a]" : "text-[#607b99]"}`} /></button><div className={`grid transition-all duration-200 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="min-h-0 overflow-hidden"><div className="border-t border-[#173a62]/45 bg-[#040d1a] px-4 py-4">{row.body.split(/\n{2,}/).map((paragraph, index) => <p key={`${row.section_key}-${index}`} className={`${index > 0 ? "mt-3" : ""} text-sm leading-6 text-[#a9bbcf]`}>{paragraph}</p>)}</div></div></div></div>;
  };

  const LegalInformationEditField = ({ row, index }) => <div className={`${quietSurfaceClass} p-4`}><div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8da5c0]">{row.title || defaultAboutClaraRows[index]?.title || "Section"}</p><span className="rounded-full border border-[#8b7428]/40 bg-[#ffd84a]/7 px-2.5 py-1 text-[10px] font-black text-[#ffe477]">{index + 1}</span></div><div className="space-y-3"><label className="block space-y-1.5"><span className="text-[11px] font-bold text-[#9db0c6]">Title</span><input type="text" value={row.title} onChange={(event) => updateLegalInformationDraft(row.section_key, "title", event.target.value)} className={fieldClass} placeholder="Section title" /></label><label className="block space-y-1.5"><span className="text-[11px] font-bold text-[#9db0c6]">Subtitle</span><input type="text" value={row.subtitle} onChange={(event) => updateLegalInformationDraft(row.section_key, "subtitle", event.target.value)} className={fieldClass} placeholder="Short row description" /></label><label className="block space-y-1.5"><span className="text-[11px] font-bold text-[#9db0c6]">Body</span><textarea value={row.body} onChange={(event) => updateLegalInformationDraft(row.section_key, "body", event.target.value)} rows={5} className={`${fieldClass} min-h-[118px] resize-y leading-6`} placeholder="Main detail content" /></label></div></div>;

  const renderAboutPage = () => (
    <div className="space-y-5">
      <DetailHeader title="About CLARA" />
      <section className={`${surfaceClass} relative overflow-hidden p-5`}><div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#0867ff_0%,#19b5ff_34%,#ffd84a_55%,#f32645_100%)]" /><p className="text-2xl font-black tracking-tight"><span className="text-[#2f82ff]">CL</span><span className="text-[#ffd84a]">A</span><span className="text-[#f32645]">RA</span></p><p className="mt-1 text-sm font-black text-[#9cc9ff]">Personal Money Coach</p><p className="mt-4 max-w-[28ch] text-sm font-semibold leading-6 text-[#b4c5d8]">Understand your spending.<br />Make better money decisions.</p><p className="mt-5 border-t border-[#1c466f]/45 pt-3 text-[11px] font-semibold text-[#687f9a]">Version {appPackage.version}</p></section>
      <section className="space-y-3"><div className="flex items-center justify-between gap-3 px-1"><h3 className="text-sm font-black text-white">Information</h3>{canEditLegalInformation && !legalInfoEditMode ? <button type="button" onClick={startLegalInformationEdit} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#8e772c]/40 bg-[#ffd84a]/7 px-3 py-2 text-[11px] font-black text-[#ffe477] transition hover:bg-[#ffd84a]/10 active:scale-[0.98]"><Edit className="h-3.5 w-3.5" />Edit</button> : null}</div>
        {legalInfoError ? <div className="rounded-2xl border border-[#a4384b]/45 bg-[#f32645]/7 px-4 py-3 text-xs leading-5 text-[#ffc0cb]">{legalInfoError}</div> : null}
        {legalInfoLoading && !legalInfoEditMode ? <div className="rounded-2xl border border-[#214f7d]/40 bg-[#07162b] px-4 py-3 text-xs text-[#8098b3]">Loading information...</div> : null}
        {legalInfoEditMode ? <div className="space-y-3"><div className="rounded-2xl border border-[#8e772c]/40 bg-[#ffd84a]/7 px-4 py-3"><p className="text-xs font-black text-[#ffe477]">Admin editing mode</p><p className="mt-1 text-[11px] leading-5 text-[#b7a96d]">Edit the Information content below. Changes are saved and shown to all users.</p></div>{legalInfoDraftRows.map((row, index) => <LegalInformationEditField key={row.section_key} row={row} index={index} />)}<div className="sticky bottom-3 z-10 grid grid-cols-2 gap-2 rounded-[22px] border border-[#245783]/55 bg-[#040d1c]/95 p-2 shadow-[0_20px_55px_rgba(0,0,0,0.4)]"><button type="button" onClick={cancelLegalInformationEdit} disabled={legalInfoSaving} className={secondaryButtonClass}>Cancel</button><button type="button" onClick={saveLegalInformationContent} disabled={legalInfoSaving} className={primaryButtonClass}>{legalInfoSaving ? "Saving..." : "Save"}</button></div></div> : <div className={`${quietSurfaceClass} overflow-hidden`}>{aboutClaraRows.map((row, index) => <AboutClaraRow key={row.section_key} row={row} isLast={index === aboutClaraRows.length - 1} />)}</div>}
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

  if (activeSetting) return <div ref={settingsRootRef} className="min-h-full space-y-4 pb-8 text-white">{renderActiveSetting()}</div>;

  return (
    <div ref={settingsRootRef} className="space-y-5 pb-8 text-white">
      {renderNotice()}
      <section className="relative overflow-hidden rounded-[26px] border border-[#245f9e]/50 bg-[linear-gradient(145deg,#071a35_0%,#06142a_62%,#071020_100%)] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.24)]"><div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#0867ff_0%,#19b5ff_35%,#ffd84a_60%,#f32645_100%)]" /><div className="flex items-center gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-[#347bc3]/50 bg-[#0867ff]/12 text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">{dashboardPanelInitials(displayName)}</div><div className="min-w-0 flex-1"><p className="truncate text-base font-black text-[#f7fbff]">{displayName}</p><p className="mt-1 truncate text-xs text-[#8ea7c4]">{user?.email || "CLARA user"}</p></div>{activeSupporterTier ? <SupportTierBadge tier={activeSupporterTier} compact tone="settings" /> : null}</div></section>
      {settingSections.map((section) => <section key={section.title} className="space-y-2"><p className={`px-1 text-[11px] font-black uppercase tracking-[0.2em] ${section.tone === "gold" ? "text-[#cbb655]" : "text-[#6caeff]"}`}>{section.title}</p><div className="overflow-hidden rounded-[24px] border border-[#1d4b7b]/50 bg-[#06142a] shadow-[0_16px_38px_rgba(0,0,0,0.20)]">{section.rows.map((row, index) => <SettingsRow key={row.key} icon={row.icon} title={row.title} description={row.description} badge={row.badge} badgeNode={row.badgeNode} tone={row.tone} onClick={row.action} isLast={index === section.rows.length - 1} />)}</div></section>)}
      <section className="space-y-2 pt-1"><button type="button" onClick={handleLogout} disabled={signingOut} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] border border-[#8f3042]/45 bg-[#210914] px-4 py-4 text-sm font-black text-[#ffc2cc] transition hover:bg-[#2a0b18] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"><LogOut className="h-4 w-4" />{signingOut ? "Logging out..." : "Log out"}</button><p className="px-2 text-center text-[10px] font-semibold leading-4 text-[#71859d]">Your financial records stay on this device. Log in again anytime.</p></section>
    </div>
  );
}
