import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock3,
  Gem,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import {
  normalizePlanKey,
  PLAN_LABELS,
  sanitizePlanRow,
} from "@/lib/plan-config";
import {
  getGooglePlayProductId,
  launchGooglePlayPurchase,
  persistGooglePlayPurchase,
  waitForGooglePlayEntitlement,
} from "@/lib/google-play-billing";
import { canOfferPlan, getClaraProductByPlan } from "@/lib/clara-entitlements";

const CANONICAL_PLAN_KEYS = {
  PRO: "clara_pro_tools_monthly_99",
  PROGRAM: "clara_program_599",
  COACHING: "clara_coaching_1299",
};

const SUPPORTED_ENROLLMENT_PLAN_KEYS = new Set([
  CANONICAL_PLAN_KEYS.PRO,
  CANONICAL_PLAN_KEYS.PROGRAM,
  CANONICAL_PLAN_KEYS.COACHING,
]);

const LEGACY_PLAN_KEY_MAP = {
  entry: CANONICAL_PLAN_KEYS.PRO,
  pro: CANONICAL_PLAN_KEYS.PRO,
  pro_tools: CANONICAL_PLAN_KEYS.PRO,
  protools: CANONICAL_PLAN_KEYS.PRO,
  clara_entry: CANONICAL_PLAN_KEYS.PRO,
  clara_pro_tools: CANONICAL_PLAN_KEYS.PRO,
  clara_pro_tools_monthly: CANONICAL_PLAN_KEYS.PRO,
  clara_pro_tools_monthly_99: CANONICAL_PLAN_KEYS.PRO,

  core: CANONICAL_PLAN_KEYS.PROGRAM,
  program: CANONICAL_PLAN_KEYS.PROGRAM,
  clara_core: CANONICAL_PLAN_KEYS.PROGRAM,
  clara_program: CANONICAL_PLAN_KEYS.PROGRAM,
  clara_program_599: CANONICAL_PLAN_KEYS.PROGRAM,

  coach: CANONICAL_PLAN_KEYS.COACHING,
  coaching: CANONICAL_PLAN_KEYS.COACHING,
  clara_coach: CANONICAL_PLAN_KEYS.COACHING,
  clara_coaching: CANONICAL_PLAN_KEYS.COACHING,
  clara_coaching_1299: CANONICAL_PLAN_KEYS.COACHING,
};

const PLAN_UI_META = {
  [CANONICAL_PLAN_KEYS.PRO]: {
    label: "PRO Tools",
    eyebrow: "Monthly Subscription",
    badge: "PRO Access",
    statement: "Unlock CLARA's PRO tools through Google Play Billing.",
    points: [
      "Full financial tools",
      "Budgets, analytics, savings goals, referrals",
      "Does not include the 30-day program",
      "Renews monthly through Google Play",
    ],
    accent: "from-cyan-400/22 via-sky-400/10 to-transparent",
    border: "border-cyan-400/20",
    button: "Subscribe to PRO",
    successTitle: "PRO Tools unlocked",
    successBody: "Your PRO tools are active while your subscription is active.",
    successCta: "Open Dashboard",
    icon: Star,
  },
  [CANONICAL_PLAN_KEYS.PROGRAM]: {
    label: "CLARA Program",
    eyebrow: "One-Time Program",
    badge: "Most popular",
    statement:
      "Unlock the 30-day CLARA Program with PRO during the program and continuation access after completion.",
    points: [
      "30-day CLARA Program",
      "Includes PRO access during the program",
      "Your +1 month continuation PRO starts after program completion",
      "One-time Google Play purchase",
    ],
    accent: "from-emerald-400/22 via-teal-400/10 to-transparent",
    border: "border-emerald-400/20",
    button: "Unlock Program",
    successTitle: "CLARA Program unlocked",
    successBody:
      "Your 30-day program is available. Start the challenge when you are ready.",
    successCta: "Open Program",
    icon: Target,
  },
  [CANONICAL_PLAN_KEYS.COACHING]: {
    label: "CLARA Coaching",
    eyebrow: "Personal Guidance",
    badge: "Premium support",
    statement:
      "Unlock the 30-day CLARA Program, two coaching sessions, and two months of continuation PRO after completion.",
    points: [
      "30-day CLARA Program",
      "Includes PRO access during the program",
      "Your +2 months continuation PRO starts after program completion",
      "Includes 2 coaching session credits",
    ],
    accent: "from-amber-400/22 via-orange-400/10 to-transparent",
    border: "border-amber-400/20",
    button: "Unlock with Google Play",
    successTitle: "CLARA Coaching unlocked",
    successBody:
      "Your guided system and 2 coaching credits are active. Start the challenge when you are ready.",
    successCta: "View Coaching Journey",
    icon: Gem,
  },
};

const SUCCESS_STATUSES = new Set(["approved", "active"]);
const PENDING_STATUSES = new Set([
  "pending",
  "under_review",
  "payment_pending",
  "google_play_pending",
  "google_play_processing",
  "purchase_pending",
  "purchase_processing",
]);

const BILLING_WARN_STATES = new Set(["diagnostic", "error"]);
const BILLING_CHECKING_STATES = new Set(["idle", "checking"]);

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePlanUiKey(value) {
  const key = normalizeKey(value);
  return LEGACY_PLAN_KEY_MAP[key] || key;
}

function isSupportedEnrollmentPlanKey(value) {
  return SUPPORTED_ENROLLMENT_PLAN_KEYS.has(normalizePlanUiKey(value));
}

function formatPeso(value) {
  const num = Number(value || 0);
  return `PHP ${num.toLocaleString("en-PH")}`;
}

function normalizeFeatures(features) {
  if (Array.isArray(features)) {
    return features.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof features === "string") {
    return features
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getPlanCandidates(value) {
  const raw = normalizeText(value);
  const normalized = normalizePlanUiKey(value);
  const normalizedRaw = normalizeKey(raw);
  return Array.from(
    new Set([normalized, raw, normalizedRaw].filter(Boolean))
  );
}

function normalizePlanRecord(row) {
  const normalizedRow = sanitizePlanRow(row);
  const rawSource =
    normalizedRow.plan_key || normalizedRow.key || normalizedRow.name;
  const normalizedRawKey = normalizePlanKey(rawSource);
  const key = normalizePlanUiKey(normalizedRawKey || rawSource);
  const ui = PLAN_UI_META[key] || null;

  const productMeta =
    getClaraProductByPlan(key) ||
    getClaraProductByPlan(normalizedRawKey) ||
    getClaraProductByPlan(rawSource);

  const productId =
    getGooglePlayProductId(key) ||
    getGooglePlayProductId(normalizedRawKey) ||
    getGooglePlayProductId(rawSource) ||
    "";

  return {
    id: normalizedRow?.id ?? null,
    key,
    rawKey: normalizedRawKey || normalizeKey(rawSource),
    name:
      ui?.label ||
      PLAN_LABELS[key] ||
      PLAN_LABELS[normalizedRawKey] ||
      normalizeText(normalizedRow?.name) ||
      key.toUpperCase(),
    price: Number(productMeta?.price ?? normalizedRow?.price ?? 0),
    badge: ui?.badge || (normalizedRow?.popular ? "Most Popular" : "Plan"),
    eyebrow: ui?.eyebrow || "Unlock CLARA",
    statement: ui?.statement || normalizeText(normalizedRow?.description),
    description: normalizeText(normalizedRow?.description),
    benefits: normalizeFeatures(normalizedRow?.features),
    ctaLabel:
      normalizeText(normalizedRow?.cta_label) ||
      ui?.button ||
      "Buy with Google Play",
    active: !!normalizedRow?.active,
    popular: !!normalizedRow?.popular || ui?.badge === "Most popular",
    sortOrder: Number(normalizedRow?.sort_order ?? 9999),
    accent: ui?.accent || "from-white/10 to-transparent",
    border: ui?.border || "border-white/10",
    successTitle: ui?.successTitle || "Plan unlocked",
    successBody:
      ui?.successBody ||
      "Your purchase is complete and your CLARA access is ready.",
    successCta: ui?.successCta || "Open CLARA",
    productId,
    productMeta,
    icon: ui?.icon || Sparkles,
    displayBenefits:
      normalizeFeatures(normalizedRow?.features).length > 0
        ? normalizeFeatures(normalizedRow?.features)
        : ui?.points || [],
  };
}

function getPlanKeyFromEnrollment(enrollment, searchParams) {
  const candidates = [
    enrollment?.plan,
    enrollment?.plan_key,
    enrollment?.tier,
    enrollment?.selected_plan,
    searchParams.get("plan"),
  ];

  for (const item of candidates) {
    const normalized = normalizePlanUiKey(item);
    if (normalized) return normalized;
  }

  return "";
}

function getSupportedPlanKeyFromEnrollment(enrollment) {
  const candidates = [
    enrollment?.plan,
    enrollment?.plan_key,
    enrollment?.tier,
    enrollment?.selected_plan,
  ];

  for (const item of candidates) {
    const normalized = normalizePlanUiKey(item);
    if (isSupportedEnrollmentPlanKey(normalized)) {
      return normalized;
    }
  }

  return "";
}

function getSuccessDestination(planKey) {
  const normalized = normalizePlanUiKey(planKey);
  if (normalized === CANONICAL_PLAN_KEYS.PRO) return "/dashboard";
  if (
    normalized === CANONICAL_PLAN_KEYS.PROGRAM ||
    normalized === CANONICAL_PLAN_KEYS.COACHING
  ) {
    return "/tasks";
  }
  return "/tasks";
}

function formatDebugError(error) {
  const rawMessage = String(error?.message || "").trim();
  const code = String(
    error?.code || error?.responseCode || error?.status || error?.name || ""
  ).trim();
  const details = String(
    error?.details || error?.debugMessage || error?.reason || ""
  ).trim();

  const lines = [];

  if (rawMessage) lines.push(rawMessage);
  if (code && !rawMessage.toLowerCase().includes(code.toLowerCase())) {
    lines.push(`Code: ${code}`);
  }
  if (details && !rawMessage.toLowerCase().includes(details.toLowerCase())) {
    lines.push(`Details: ${details}`);
  }

  return lines.join(" • ");
}

function isAlreadyOwnedError(error) {
  const code = String(error?.responseCode || error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.debugMessage || error?.details || "").toLowerCase();

  return (
    code === "ITEM_ALREADY_OWNED" ||
    message.includes("already own") ||
    details.includes("already own")
  );
}

function getFriendlyPurchaseError(error) {
  const message = String(error?.message || "").trim();
  const lower = message.toLowerCase();
  const debug = formatDebugError(error);

  if (!message) {
    return "Could not complete purchase right now. No error details were returned.";
  }

  if (
    lower.includes("cancel") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    return "Purchase cancelled.";
  }

  if (lower.includes("product") && lower.includes("not found")) {
    return `Google Play product not found. Check that the product ID is correct and active in Play Console. ${debug}`;
  }

  if (lower.includes("offer") && lower.includes("not found")) {
    return `No Google Play offer was found for this product. ${debug}`;
  }

  if (lower.includes("billing") && lower.includes("unavailable")) {
    return `Google Play Billing returned unavailable. Real error: ${debug}`;
  }

  if (lower.includes("billing is not available")) {
    return `Google Play Billing returned unavailable. Real error: ${debug}`;
  }

  if (lower.includes("not available on this device")) {
    return `Google Play purchase is not ready on this device yet. Review the billing diagnostics below. Real error: ${debug}`;
  }

  if (lower.includes("store not found")) {
    return `The purchase plugin store was not found inside the app build. Real error: ${debug}`;
  }

  if (lower.includes("cdvpurchase")) {
    return `The purchase plugin bridge is missing in this build. Real error: ${debug}`;
  }

  if (lower.includes("already own")) {
    return "This account already owns this item.";
  }

  return `Google Play purchase failed: ${debug}`;
}

function normalizeBillingResponseCode(code) {
  if (typeof code === "string") {
    const upper = code.toUpperCase().trim();

    if (
      upper === "OK" ||
      upper === "USER_CANCELED" ||
      upper === "SERVICE_UNAVAILABLE" ||
      upper === "BILLING_UNAVAILABLE" ||
      upper === "ITEM_UNAVAILABLE" ||
      upper === "DEVELOPER_ERROR" ||
      upper === "ERROR" ||
      upper === "ITEM_ALREADY_OWNED" ||
      upper === "ITEM_NOT_OWNED" ||
      upper === "SERVICE_DISCONNECTED" ||
      upper === "FEATURE_NOT_SUPPORTED" ||
      upper === "SERVICE_TIMEOUT" ||
      upper === "NETWORK_ERROR"
    ) {
      return upper;
    }

    return "UNKNOWN";
  }

  switch (Number(code)) {
    case 0:
      return "OK";
    case 1:
      return "USER_CANCELED";
    case 2:
      return "SERVICE_UNAVAILABLE";
    case 3:
      return "BILLING_UNAVAILABLE";
    case 4:
      return "ITEM_UNAVAILABLE";
    case 5:
      return "DEVELOPER_ERROR";
    case 6:
      return "ERROR";
    case 7:
      return "ITEM_ALREADY_OWNED";
    case 8:
      return "ITEM_NOT_OWNED";
    case 12:
      return "NETWORK_ERROR";
    case -1:
      return "SERVICE_DISCONNECTED";
    case -2:
      return "FEATURE_NOT_SUPPORTED";
    case -3:
      return "SERVICE_TIMEOUT";
    default:
      return "UNKNOWN";
  }
}

function getBillingStatusLabel(code) {
  switch (code) {
    case "OK":
      return "READY";
    case "SERVICE_UNAVAILABLE":
      return "SERVICE UNAVAILABLE";
    case "BILLING_UNAVAILABLE":
      return "BILLING UNAVAILABLE";
    case "ITEM_UNAVAILABLE":
      return "PRODUCT UNAVAILABLE";
    case "DEVELOPER_ERROR":
      return "CONFIG ISSUE";
    case "SERVICE_DISCONNECTED":
      return "DISCONNECTED";
    case "FEATURE_NOT_SUPPORTED":
      return "NOT SUPPORTED";
    case "NETWORK_ERROR":
      return "NETWORK ERROR";
    case "SERVICE_TIMEOUT":
      return "TIMEOUT";
    case "ERROR":
      return "ERROR";
    case "USER_CANCELED":
      return "CANCELLED";
    case "ITEM_ALREADY_OWNED":
      return "OWNED";
    default:
      return "NEEDS ATTENTION";
  }
}

function formatBool(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Unknown";
}

function getBillingBridge() {
  if (typeof window === "undefined") return null;
  return window?.ClaraBilling || window?.Capacitor?.Plugins?.ClaraBilling || null;
}

async function probeGooglePlayBilling({ productId }) {
  const bridge = getBillingBridge();

  if (!bridge || typeof bridge.connect !== "function") {
    return {
      state: "diagnostic",
      ready: false,
      connectCode: "UNKNOWN",
      productCode: "UNKNOWN",
      message:
        "Billing bridge is not wired in this build yet. The app can still render, but Google Play purchase readiness cannot be fully checked from the page.",
      debugMessage:
        "ClaraBilling.connect() was not found on window.ClaraBilling or window.Capacitor.Plugins.ClaraBilling.",
      possibleCauses: [
        "billing service unavailable on this build/device",
        "purchase plugin bridge missing in this build",
        "Capacitor billing plugin not registered correctly",
      ],
      diagnostics: {
        hasBridge: false,
        canConnect: false,
        packageName: "Unknown",
        storeAccountEmail: "Unknown",
        isPlayStoreInstalled: null,
        isGooglePlayServicesAvailable: null,
        isAppFromPlay: null,
        foundProductIds: [],
        missingProductIds: productId ? [productId] : [],
      },
    };
  }

  try {
    const connection = await bridge.connect();
    const connectCode = normalizeBillingResponseCode(connection?.responseCode);

    if (connectCode !== "OK") {
      return {
        state: "diagnostic",
        ready: false,
        connectCode,
        productCode: "UNKNOWN",
        message: "Google Play purchases are not fully ready yet on this device.",
        debugMessage:
          connection?.debugMessage ||
          connection?.details ||
          connection?.message ||
          "Billing connection did not return OK.",
        possibleCauses: buildBillingPossibleCauses({
          connectCode,
          productCode: "UNKNOWN",
          diagnostics: connection,
          missingProductIds: productId ? [productId] : [],
        }),
        diagnostics: {
          hasBridge: true,
          canConnect: true,
          packageName: connection?.packageName || "Unknown",
          storeAccountEmail: connection?.storeAccountEmail || "Unknown",
          isPlayStoreInstalled: connection?.isPlayStoreInstalled ?? null,
          isGooglePlayServicesAvailable:
            connection?.isGooglePlayServicesAvailable ?? null,
          isAppFromPlay: connection?.isAppFromPlay ?? null,
          foundProductIds: [],
          missingProductIds: productId ? [productId] : [],
          rawConnection: connection,
        },
      };
    }

    if (!productId || typeof bridge.queryProducts !== "function") {
      return {
        state: "ready",
        ready: true,
        connectCode,
        productCode: "OK",
        message: "Google Play purchases look ready on this device.",
        debugMessage:
          connection?.debugMessage ||
          "Billing connection completed successfully.",
        possibleCauses: [],
        diagnostics: {
          hasBridge: true,
          canConnect: true,
          packageName: connection?.packageName || "Unknown",
          storeAccountEmail: connection?.storeAccountEmail || "Unknown",
          isPlayStoreInstalled: connection?.isPlayStoreInstalled ?? null,
          isGooglePlayServicesAvailable:
            connection?.isGooglePlayServicesAvailable ?? null,
          isAppFromPlay: connection?.isAppFromPlay ?? null,
          foundProductIds: productId ? [productId] : [],
          missingProductIds: [],
          rawConnection: connection,
        },
      };
    }

    const productResult = await bridge.queryProducts({ productIds: [productId] });
    const productCode = normalizeBillingResponseCode(productResult?.responseCode);
    const foundProductIds = Array.isArray(productResult?.foundProductIds)
      ? productResult.foundProductIds
      : [];
    const missingProductIds = Array.isArray(productResult?.missingProductIds)
      ? productResult.missingProductIds
      : foundProductIds.includes(productId)
        ? []
        : [productId];

    const ready =
      productCode === "OK" &&
      (missingProductIds.length === 0 ||
        foundProductIds.includes(productId) ||
        productResult?.ok === true);

    if (ready) {
      return {
        state: "ready",
        ready: true,
        connectCode,
        productCode,
        message: "Google Play purchases look ready on this device.",
        debugMessage:
          productResult?.debugMessage ||
          connection?.debugMessage ||
          "Billing connection and product lookup completed successfully.",
        possibleCauses: [],
        diagnostics: {
          hasBridge: true,
          canConnect: true,
          packageName: connection?.packageName || "Unknown",
          storeAccountEmail: connection?.storeAccountEmail || "Unknown",
          isPlayStoreInstalled: connection?.isPlayStoreInstalled ?? null,
          isGooglePlayServicesAvailable:
            connection?.isGooglePlayServicesAvailable ?? null,
          isAppFromPlay: connection?.isAppFromPlay ?? null,
          foundProductIds,
          missingProductIds: [],
          rawConnection: connection,
          rawProductResult: productResult,
        },
      };
    }

    return {
      state: "diagnostic",
      ready: false,
      connectCode,
      productCode,
      message:
        "Google Play billing connected, but purchase readiness still needs attention.",
      debugMessage:
        productResult?.debugMessage ||
        connection?.debugMessage ||
        "Product readiness did not return fully ready.",
      possibleCauses: buildBillingPossibleCauses({
        connectCode,
        productCode,
        diagnostics: connection,
        missingProductIds,
      }),
      diagnostics: {
        hasBridge: true,
        canConnect: true,
        packageName: connection?.packageName || "Unknown",
        storeAccountEmail: connection?.storeAccountEmail || "Unknown",
        isPlayStoreInstalled: connection?.isPlayStoreInstalled ?? null,
        isGooglePlayServicesAvailable:
          connection?.isGooglePlayServicesAvailable ?? null,
        isAppFromPlay: connection?.isAppFromPlay ?? null,
        foundProductIds,
        missingProductIds,
        rawConnection: connection,
        rawProductResult: productResult,
      },
    };
  } catch (error) {
    return {
      state: "error",
      ready: false,
      connectCode: normalizeBillingResponseCode(
        error?.responseCode || error?.code
      ),
      productCode: "UNKNOWN",
      message: "The billing diagnostic check ran into an unexpected error.",
      debugMessage: formatDebugError(error),
      possibleCauses: buildBillingPossibleCauses({
        connectCode: normalizeBillingResponseCode(
          error?.responseCode || error?.code
        ),
        productCode: "UNKNOWN",
        diagnostics: {},
        missingProductIds: productId ? [productId] : [],
      }),
      diagnostics: {
        hasBridge: true,
        canConnect: true,
        packageName: "Unknown",
        storeAccountEmail: "Unknown",
        isPlayStoreInstalled: null,
        isGooglePlayServicesAvailable: null,
        isAppFromPlay: null,
        foundProductIds: [],
        missingProductIds: productId ? [productId] : [],
      },
    };
  }
}

function buildBillingPossibleCauses({
  connectCode,
  productCode,
  diagnostics,
  missingProductIds = [],
}) {
  const causes = new Set();

  if (diagnostics?.isAppFromPlay === false) {
    causes.add("app not installed from Play test track");
  }

  if (diagnostics?.isPlayStoreInstalled === false) {
    causes.add("Play Store is not available on this device");
  }

  if (diagnostics?.isGooglePlayServicesAvailable === false) {
    causes.add("Google Play Services is unavailable or outdated");
  }

  if (
    connectCode === "BILLING_UNAVAILABLE" ||
    connectCode === "SERVICE_UNAVAILABLE" ||
    connectCode === "SERVICE_DISCONNECTED" ||
    connectCode === "FEATURE_NOT_SUPPORTED" ||
    connectCode === "UNKNOWN" ||
    connectCode === "ERROR"
  ) {
    causes.add("tester account not opted in");
    causes.add("tester account not listed in License Testing");
    causes.add("wrong Google account on the device");
    causes.add("Play Store cache/data outdated");
    causes.add("billing service unavailable on this build/device");
  }

  if (
    productCode === "ITEM_UNAVAILABLE" ||
    (Array.isArray(missingProductIds) && missingProductIds.length > 0)
  ) {
    causes.add("product may not be active for this testing setup");
  }

  if (connectCode === "DEVELOPER_ERROR") {
    causes.add("billing configuration mismatch in app or Play Console");
  }

  return Array.from(causes);
}

function SelectionCard({ plan, selected, onSelect }) {
  const Icon = plan.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(plan.key)}
      className={`w-full rounded-[28px] border p-5 text-left transition-all duration-200 ${
        selected
          ? `${plan.border} bg-white/[0.08] shadow-[0_18px_36px_rgba(0,0,0,0.22)]`
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
            <Icon className="h-3.5 w-3.5" />
            {plan.eyebrow}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {plan.badge}
            </span>
          </div>

          <p className="mt-3 text-sm leading-7 text-white/72">{plan.statement}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
            {plan.productMeta?.productType === "subscription" ? "Monthly" : "One-time"}
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {formatPeso(plan.price)}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {plan.displayBenefits.slice(0, 3).map((item, index) => (
          <div
            key={`${plan.key}-${index}`}
            className="flex items-start gap-2 text-sm text-white/75"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function BillingDiagnosticCard({
  billingMonitor,
  billingDebugOpen,
  setBillingDebugOpen,
  onRefresh,
  refreshing,
  productId,
}) {
  const state = billingMonitor?.state || "idle";
  const connectCode = billingMonitor?.connectCode || "UNKNOWN";
  const productCode = billingMonitor?.productCode || "UNKNOWN";

  const badgeClasses =
    state === "ready"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : state === "checking"
        ? "border-sky-400/20 bg-sky-500/10 text-sky-200"
        : "border-amber-400/20 bg-amber-500/10 text-amber-200";

  const headline =
    state === "ready"
      ? "Google Play purchases look ready on this device."
      : state === "checking"
        ? "Checking Google Play billing readiness..."
        : state === "error"
          ? "Billing diagnostic check hit an unexpected error."
          : "Google Play purchases are not fully ready yet on this device.";

  const body =
    state === "ready"
      ? "The app was able to check billing without relying on install-source assumptions. You can continue with the purchase flow."
      : state === "checking"
        ? "Connecting to Google Play and checking billing availability."
        : billingMonitor?.message ||
          "This does not automatically mean the app is broken. It usually points to a tester, account, track, cache, or device readiness issue.";

  return (
    <div className="mb-5 rounded-[30px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
            <ShieldCheck className="h-3.5 w-3.5" />
            Billing Diagnostic
          </div>

          <h3 className="mt-4 text-xl font-semibold text-white">{headline}</h3>
          <p className="mt-2 text-sm leading-7 text-white/72">{body}</p>
        </div>

        <div
          className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeClasses}`}
        >
          {state === "ready"
            ? "Ready"
            : state === "checking"
              ? "Checking"
              : getBillingStatusLabel(connectCode)}
        </div>
      </div>

      {BILLING_WARN_STATES.has(state) &&
      Array.isArray(billingMonitor?.possibleCauses) &&
      billingMonitor.possibleCauses.length > 0 ? (
        <div className="mt-5 rounded-[24px] border border-amber-400/15 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
              Possible causes
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {billingMonitor.possibleCauses.map((cause, index) => (
              <div
                key={`${cause}-${index}`}
                className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/75"
              >
                {cause}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="h-11 rounded-2xl"
        >
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Re-checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-check billing
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => setBillingDebugOpen((prev) => !prev)}
          className="h-11 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          {billingDebugOpen ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Hide debug
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Show debug
            </>
          )}
        </Button>
      </div>

      {billingDebugOpen ? (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-white/65" />
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
              Developer status block
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DebugRow label="Monitor state" value={state} />
            <DebugRow label="Connect code" value={`${connectCode}`} />
            <DebugRow label="Product code" value={`${productCode}`} />
            <DebugRow label="Product ID" value={productId || "—"} />
            <DebugRow
              label="Package name"
              value={billingMonitor?.diagnostics?.packageName || "Unknown"}
            />
            <DebugRow
              label="Store account"
              value={billingMonitor?.diagnostics?.storeAccountEmail || "Unknown"}
            />
            <DebugRow
              label="Play Store installed"
              value={formatBool(
                billingMonitor?.diagnostics?.isPlayStoreInstalled
              )}
            />
            <DebugRow
              label="Play Services available"
              value={formatBool(
                billingMonitor?.diagnostics?.isGooglePlayServicesAvailable
              )}
            />
            <DebugRow
              label="Installed from Play"
              value={formatBool(billingMonitor?.diagnostics?.isAppFromPlay)}
            />
            <DebugRow
              label="Found product IDs"
              value={
                billingMonitor?.diagnostics?.foundProductIds?.length
                  ? billingMonitor.diagnostics.foundProductIds.join(", ")
                  : "—"
              }
            />
            <DebugRow
              label="Missing product IDs"
              value={
                billingMonitor?.diagnostics?.missingProductIds?.length
                  ? billingMonitor.diagnostics.missingProductIds.join(", ")
                  : "—"
              }
            />
            <DebugRow
              label="Debug details"
              value={billingMonitor?.debugMessage || "—"}
              wide
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DebugRow({ label, value, wide = false }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-3 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-white/80">{value}</p>
    </div>
  );
}

export default function Enroll() {
  const { user, refreshUser } = useUserRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshingAccess, setRefreshingAccess] = useState(false);
  const [plans, setPlans] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [purchaseState, setPurchaseState] = useState("idle");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [activePurchasePlan, setActivePurchasePlan] = useState("");
  const [pageError, setPageError] = useState("");
  const [debugError, setDebugError] = useState("");

  const [billingMonitor, setBillingMonitor] = useState({
    state: "idle",
    ready: false,
    connectCode: "UNKNOWN",
    productCode: "UNKNOWN",
    message: "",
    debugMessage: "",
    possibleCauses: [],
    diagnostics: {
      hasBridge: false,
      canConnect: false,
      packageName: "Unknown",
      storeAccountEmail: "Unknown",
      isPlayStoreInstalled: null,
      isGooglePlayServicesAvailable: null,
      isAppFromPlay: null,
      foundProductIds: [],
      missingProductIds: [],
    },
  });
  const [billingRefreshing, setBillingRefreshing] = useState(false);
  const [billingDebugOpen, setBillingDebugOpen] = useState(false);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    const normalized = (data || [])
      .map(normalizePlanRecord)
      .filter((plan) => plan.active && plan.productId && PLAN_UI_META[plan.key])
      .filter((plan) => {
        const candidates = getPlanCandidates(plan.rawKey || plan.key);
        return candidates.some((candidate) =>
          canOfferPlan(user?.profile || user, candidate)
        );
      });

    setPlans(normalized);
    return normalized;
  }, [user]);

  const fetchEnrollmentForUserId = useCallback(async (userId) => {
    const normalizedUserId = normalizeText(userId);

    if (!normalizedUserId) {
      setEnrollment(null);
      return null;
    }

    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", normalizedUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    setEnrollment(data || null);
    return data || null;
  }, []);

  const fetchEnrollment = useCallback(() => {
    return fetchEnrollmentForUserId(user?.id);
  }, [fetchEnrollmentForUserId, user?.id]);

  const getAuthenticatedUser = useCallback(async () => {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!authUser?.id) {
      throw new Error("User not authenticated.");
    }

    return authUser;
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError("");
    setDebugError("");

    try {
      await Promise.all([fetchPlans(), fetchEnrollment()]);
    } catch (error) {
      console.error("Failed to load Google Play purchase flow:", error);
      const debug = formatDebugError(error);
      setPageError("Could not load plans right now.");
      setDebugError(debug);
      toast.error("Could not load plans right now.");
    } finally {
      setLoading(false);
    }
  }, [fetchEnrollment, fetchPlans, user?.id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const currentStatus = normalizeKey(enrollment?.status);

  const enrollmentPlanKey = useMemo(
    () => getPlanKeyFromEnrollment(enrollment, searchParams),
    [enrollment, searchParams]
  );

  const supportedEnrollmentPlanKey = useMemo(
    () => getSupportedPlanKeyFromEnrollment(enrollment),
    [enrollment]
  );

  const hasCurrentSupportedEnrollment = useMemo(() => {
    return Boolean(supportedEnrollmentPlanKey);
  }, [supportedEnrollmentPlanKey]);

  const shouldShowEnrollmentBanner = useMemo(() => {
    return hasCurrentSupportedEnrollment && !(purchaseState === "success");
  }, [hasCurrentSupportedEnrollment, purchaseState]);

  const shouldShowPendingEnrollmentBanner = useMemo(() => {
    return shouldShowEnrollmentBanner && PENDING_STATUSES.has(currentStatus);
  }, [shouldShowEnrollmentBanner, currentStatus]);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
  }, [plans]);

  const requestedPlanKey = normalizePlanUiKey(searchParams.get("plan"));
  const selectedPlanKey = requestedPlanKey || supportedEnrollmentPlanKey;
  const view = searchParams.get("view") || (selectedPlanKey ? "detail" : "select");

  const selectedPlan = useMemo(() => {
    return (
      sortedPlans.find((plan) => normalizePlanUiKey(plan.key) === selectedPlanKey) ||
      null
    );
  }, [selectedPlanKey, sortedPlans]);

  const unlockedPlan = useMemo(() => {
    if (!SUCCESS_STATUSES.has(currentStatus) || !hasCurrentSupportedEnrollment) {
      return null;
    }

    return (
      sortedPlans.find(
        (plan) =>
          normalizePlanUiKey(plan.key) ===
          normalizePlanUiKey(supportedEnrollmentPlanKey)
      ) || selectedPlan
    );
  }, [
    currentStatus,
    hasCurrentSupportedEnrollment,
    selectedPlan,
    sortedPlans,
    supportedEnrollmentPlanKey,
  ]);

  const activePurchasePlanMeta = useMemo(() => {
    return (
      sortedPlans.find(
        (plan) => normalizePlanUiKey(plan.key) === normalizePlanUiKey(activePurchasePlan)
      ) || null
    );
  }, [activePurchasePlan, sortedPlans]);

  const purchaseStatusMeta = useMemo(() => {
    if (purchaseState === "processing") {
      return {
        title: "Opening Google Play",
        body: "Confirm your purchase in Google Play to continue.",
      };
    }

    if (purchaseState === "verifying") {
      return {
        title: "Unlocking your access",
        body: "Your purchase was received. We are syncing your entitlement now.",
      };
    }

    if (purchaseState === "pending") {
      return {
        title: "Purchase received",
        body: "Google Play ownership is confirmed. Your access is still syncing in the background.",
      };
    }

    return null;
  }, [purchaseState]);

  const showSuccess = purchaseState === "success" || Boolean(unlockedPlan);
  const showProcessing = Boolean(purchaseStatusMeta);
  const purchaseBusy =
    purchaseState === "processing" ||
    purchaseState === "verifying" ||
    purchaseState === "pending";

  const shouldShowBillingCard =
    view === "detail" && selectedPlan && !showSuccess && !showProcessing;

  const runBillingProbe = useCallback(
    async (plan) => {
      const targetPlan = plan || selectedPlan;

      if (!targetPlan?.productId) {
        setBillingMonitor({
          state: "diagnostic",
          ready: false,
          connectCode: "UNKNOWN",
          productCode: "UNKNOWN",
          message: "No Google Play product ID was found for this plan yet.",
          debugMessage:
            "selectedPlan.productId is missing. Check getGooglePlayProductId(planKey).",
          possibleCauses: [
            "billing configuration mismatch in app or Play Console",
            "product may not be active for this testing setup",
          ],
          diagnostics: {
            hasBridge: false,
            canConnect: false,
            packageName: "Unknown",
            storeAccountEmail: "Unknown",
            isPlayStoreInstalled: null,
            isGooglePlayServicesAvailable: null,
            isAppFromPlay: null,
            foundProductIds: [],
            missingProductIds: [],
          },
        });
        return null;
      }

      setBillingRefreshing(true);
      setBillingMonitor((prev) => ({
        ...prev,
        state: "checking",
        message: "Checking Google Play billing readiness...",
      }));

      try {
        const result = await probeGooglePlayBilling({
          productId: targetPlan.productId,
        });

        setBillingMonitor(result);
        return result;
      } finally {
        setBillingRefreshing(false);
      }
    },
    [selectedPlan]
  );

  useEffect(() => {
    if (!shouldShowBillingCard) return;
    runBillingProbe(selectedPlan);
  }, [shouldShowBillingCard, selectedPlan, runBillingProbe]);

  function updateSearch(nextPlan, nextView = "detail") {
    const next = new URLSearchParams(searchParams);

    if (nextPlan) next.set("plan", normalizePlanUiKey(nextPlan));
    else next.delete("plan");

    if (nextView) next.set("view", nextView);
    else next.delete("view");

    setSearchParams(next, { replace: true });
  }

  function handlePlanSelect(planKey) {
    if (purchaseBusy) return;
    updateSearch(planKey, "detail");
    setPageError("");
    setDebugError("");
  }

  async function handleRefreshAccess() {
    try {
      setRefreshingAccess(true);
      setDebugError("");

      const authUser = await getAuthenticatedUser();

      await fetchEnrollmentForUserId(authUser.id);
      await refreshUser?.();

      toast.success("Access refreshed");
    } catch (error) {
      console.error("Failed to refresh access:", error);
      const debug = formatDebugError(error);
      setDebugError(debug);
      toast.error("Could not refresh access right now.");
    } finally {
      setRefreshingAccess(false);
    }
  }

  async function activateGooglePlayPurchase({
    planKey,
    productId,
    purchaseToken,
    orderId,
  }) {
    const { data, error } = await supabase.functions.invoke("verify-google-play-purchase", {
      body: {
        plan_key: planKey,
        product_id: productId,
        purchase_token: purchaseToken || null,
        order_id: orderId || null,
      },
    });

    if (error) {
      throw new Error(error.message || "Supabase activation function failed.");
    }

    return data;
  }

  async function finalizeOwnedOrPurchasedPlan({
    plan,
    authUser,
    purchaseToken = "",
    orderId = "",
    bridgePayload = null,
  }) {
    const userId = authUser?.id || user?.id;

    if (!userId) {
      throw new Error("Missing authenticated user during purchase finalization.");
    }

    const planKey = plan.key;
    const productId = plan.productId;

    await persistGooglePlayPurchase({
      supabase,
      userId,
      planKey,
      productId,
      purchaseToken,
      orderId,
      bridgePayload,
    });

    let activationResult = null;

    try {
      activationResult = await activateGooglePlayPurchase({
        userId,
        planKey,
        productId,
        purchaseToken,
        orderId,
      });
    } catch (activationError) {
      console.warn(
        "verify-google-play function did not complete cleanly:",
        activationError
      );
    }

    try {
      await supabase.auth.refreshSession();
    } catch (sessionError) {
      console.warn("Session refresh after purchase did not complete cleanly:", sessionError);
    }

    const latestEnrollmentAfterPersist = await fetchEnrollmentForUserId(userId);
    await refreshUser?.();

    const activationStatus = normalizeKey(
      activationResult?.status ||
        activationResult?.enrollment?.status ||
        activationResult?.data?.status
    );

    const persistedStatus = normalizeKey(latestEnrollmentAfterPersist?.status);
    const persistedPlanKey = getSupportedPlanKeyFromEnrollment(
      latestEnrollmentAfterPersist
    );

    if (
      persistedPlanKey &&
      (SUCCESS_STATUSES.has(activationStatus) ||
        SUCCESS_STATUSES.has(persistedStatus))
    ) {
      setPurchaseState("success");
      setPurchaseMessage(plan.successBody);
      toast.success(`${plan.name} unlocked`);
      return true;
    }

    const entitlement = await waitForGooglePlayEntitlement({
      supabase,
      userId,
      expectedPlanKey: planKey,
    });

    try {
      await supabase.auth.refreshSession();
    } catch (sessionError) {
      console.warn("Session refresh after entitlement wait did not complete cleanly:", sessionError);
    }

    const latestEnrollmentAfterWait = await fetchEnrollmentForUserId(userId);
    await refreshUser?.();

    const entitlementStatus = normalizeKey(entitlement?.status);
    const latestEnrollmentStatus = normalizeKey(
      latestEnrollmentAfterWait?.status
    );
    const latestEnrollmentPlanKey = getSupportedPlanKeyFromEnrollment(
      latestEnrollmentAfterWait
    );

    if (
      latestEnrollmentPlanKey &&
      (SUCCESS_STATUSES.has(entitlementStatus) ||
        SUCCESS_STATUSES.has(latestEnrollmentStatus))
    ) {
      setPurchaseState("success");
      setPurchaseMessage(plan.successBody);
      toast.success(`${plan.name} unlocked`);
      return true;
    }

    setPurchaseState("pending");
    setPurchaseMessage(
      "Your Google Play ownership is confirmed. Access is still syncing and should unlock shortly."
    );
    toast.message("Ownership confirmed. Syncing access...");
    return false;
  }

  async function handlePurchase(plan) {
    if (!plan || purchaseBusy) return;

    try {
      setPageError("");
      setDebugError("");
      setPurchaseMessage("");
      setActivePurchasePlan(plan.key);

      const authUser = await getAuthenticatedUser();

      const billingResult = await runBillingProbe(plan);

      if (!billingResult?.ready) {
        setPageError(
          "Google Play billing is not fully ready yet. Review the diagnostic block below before trying again."
        );
        setDebugError(
          billingResult?.debugMessage || "Billing readiness check failed."
        );
        setActivePurchasePlan("");
        setPurchaseState("idle");
        return;
      }

      setPurchaseState("processing");

      let purchase = null;

      try {
        purchase = await launchGooglePlayPurchase({
          productId: plan.productId,
          planKey: plan.key,
          userId: authUser.id,
          userEmail: authUser.email || user?.email || "",
        });
      } catch (error) {
        if (isAlreadyOwnedError(error)) {
          setPurchaseState("verifying");
          setPurchaseMessage(
            "This Google account already owns this item. Restoring your access now."
          );

          await finalizeOwnedOrPurchasedPlan({
            plan,
            authUser,
            purchaseToken: "",
            orderId: "",
            bridgePayload: {
              restoredFromOwnedState: true,
              responseCode:
                error?.responseCode || error?.code || "ITEM_ALREADY_OWNED",
              message: error?.message || "Already owned",
              debugMessage: error?.debugMessage || error?.details || "",
            },
          });

          return;
        }

        throw error;
      }

      if (purchase?.cancelled) {
        setPurchaseState("idle");
        setActivePurchasePlan("");
        setPurchaseMessage("");
        toast.message("Purchase cancelled");
        return;
      }

      if (!purchase?.ok) {
        throw new Error("Google Play did not confirm the purchase.");
      }

      setPurchaseState("verifying");

      await finalizeOwnedOrPurchasedPlan({
        plan,
        authUser,
        purchaseToken: purchase.purchaseToken,
        orderId: purchase.orderId,
        bridgePayload: purchase.raw,
      });
    } catch (error) {
      console.error("Google Play purchase failed:", error);

      const friendlyMessage = getFriendlyPurchaseError(error);
      const debug = formatDebugError(error);

      if (friendlyMessage === "Purchase cancelled.") {
        setPurchaseState("idle");
        setActivePurchasePlan("");
        setPurchaseMessage("");
        toast.message("Purchase cancelled");
        return;
      }

      setPurchaseState("idle");
      setActivePurchasePlan("");
      setPurchaseMessage("");
      setPageError(friendlyMessage);
      setDebugError(debug);
      toast.error("Google Play purchase failed");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-xl">
            <p className="text-sm text-white/70">Loading plans...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,0.42),_rgba(2,6,23,1))]" />

      <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (view === "detail" && !showProcessing && !showSuccess) {
                updateSearch("", "select");
                return;
              }
              navigate(-1);
            }}
            className="h-10 rounded-2xl border border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
            disabled={purchaseBusy}
          >
            {view === "detail" && !showProcessing && !showSuccess ? (
              <ChevronLeft className="mr-2 h-4 w-4" />
            ) : (
              <ArrowLeft className="mr-2 h-4 w-4" />
            )}
            {view === "detail" && !showProcessing && !showSuccess
              ? "Plans"
              : "Back"}
          </Button>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60">
            Google Play Unlock
          </div>
        </div>

        {pageError ? (
          <div className="mb-4 rounded-[28px] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200 backdrop-blur-xl">
            {pageError}
          </div>
        ) : null}

        {debugError ? (
          <div className="mb-6 rounded-[28px] border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-6 text-amber-100 backdrop-blur-xl break-words">
            <span className="font-semibold uppercase tracking-[0.16em] text-amber-200/80">
              Debug details
            </span>
            <div className="mt-2">{debugError}</div>
          </div>
        ) : null}

        {!showSuccess && !showProcessing && (
          <div className="mb-6 rounded-[30px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                  CLARA Plans
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Choose your next level with less friction
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                  Pick PRO Tools, CLARA Program, or CLARA Coaching, review one focused
                  plan page, and unlock through Google Play without the old proof-upload
                  flow.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                      Purchase flow
                    </p>
                    <p className="text-sm font-semibold text-white">
                      Google Play unlock
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSuccess ? (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-[32px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(8,16,31,0.98)_0%,rgba(9,34,46,0.96)_52%,rgba(16,73,58,0.9)_100%)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/15 text-emerald-200">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                Purchase complete
              </p>

              <h2 className="mt-2 text-center text-3xl font-semibold text-white">
                {(unlockedPlan || selectedPlan)?.successTitle || "Access unlocked"}
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-white/75">
                {purchaseMessage ||
                  (unlockedPlan || selectedPlan)?.successBody ||
                  "Your CLARA access is ready."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {((unlockedPlan || selectedPlan)?.displayBenefits || [])
                  .slice(0, 3)
                  .map((item, index) => (
                    <div
                      key={`success-benefit-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/78"
                    >
                      {item}
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 flex-1 rounded-2xl"
                onClick={() =>
                  navigate(
                    getSuccessDestination((unlockedPlan || selectedPlan)?.key)
                  )
                }
              >
                {(unlockedPlan || selectedPlan)?.successCta || "Open CLARA"}
              </Button>

              <Button
                variant="outline"
                className="h-12 flex-1 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        ) : showProcessing ? (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/10">
                {purchaseState === "pending" ? (
                  <Clock3 className="h-6 w-6 text-amber-300" />
                ) : purchaseState === "verifying" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
                ) : (
                  <Zap className="h-6 w-6 text-emerald-300" />
                )}
              </div>

              <h2 className="mt-5 text-center text-2xl font-semibold text-white">
                {purchaseStatusMeta?.title}
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-white/72">
                {purchaseMessage || purchaseStatusMeta?.body}
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Selected plan
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {activePurchasePlanMeta?.name || "CLARA plan"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 flex-1 rounded-2xl"
                onClick={handleRefreshAccess}
                disabled={refreshingAccess}
              >
                {refreshingAccess ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  "Refresh access"
                )}
              </Button>

              <Button
                variant="outline"
                className="h-12 flex-1 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => navigate("/dashboard")}
              >
                Return to dashboard
              </Button>
            </div>
          </div>
        ) : view === "detail" && selectedPlan ? (
          <div className="mx-auto max-w-3xl">
            <BillingDiagnosticCard
              billingMonitor={billingMonitor}
              billingDebugOpen={billingDebugOpen}
              setBillingDebugOpen={setBillingDebugOpen}
              onRefresh={() => runBillingProbe(selectedPlan)}
              refreshing={billingRefreshing}
              productId={selectedPlan.productId}
            />

            <div
              className={`rounded-[32px] border ${selectedPlan.border} bg-white/[0.04] shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-2xl`}
            >
              <div
                className={`rounded-t-[32px] bg-gradient-to-br ${selectedPlan.accent} p-6`}
              >
                {(() => {
                  const SelectedIcon = selectedPlan.icon;
                  return (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
                      <SelectedIcon className="h-3.5 w-3.5" />
                      {selectedPlan.eyebrow}
                    </div>
                  );
                })()}

                <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-3xl font-semibold text-white">
                        {selectedPlan.name}
                      </h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        {selectedPlan.badge}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-7 text-white/74">
                      {selectedPlan.statement}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                      {selectedPlan.productMeta?.productType === "subscription"
                        ? "Monthly subscription"
                        : "One-time unlock"}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {formatPeso(selectedPlan.price)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    What's included
                  </p>
                  <div className="mt-4 space-y-3">
                    {selectedPlan.displayBenefits.map((item, index) => (
                      <div
                        key={`benefit-${index}`}
                        className="flex items-start gap-3 text-sm text-white/78"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                      Purchase method
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      Google Play Billing
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/68">
                      {selectedPlan.productMeta?.productType === "subscription"
                        ? "Monthly subscription handled through Google Play. No proof upload. No manual review form."
                        : "Fast one-time unlock handled through Google Play. No proof upload. No manual review form."}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                      After purchase
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      Immediate guided handoff
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/68">
                      Once entitlement sync completes, CLARA will route you to the
                      right next step for this plan.
                    </p>
                  </div>
                </div>

                {BILLING_CHECKING_STATES.has(billingMonitor.state) ? (
                  <div className="rounded-[24px] border border-sky-400/15 bg-sky-500/5 p-4 text-sm text-sky-100">
                    Checking billing readiness for this plan...
                  </div>
                ) : null}

                {BILLING_WARN_STATES.has(billingMonitor.state) ? (
                  <div className="rounded-[24px] border border-amber-400/15 bg-amber-500/5 p-4 text-sm leading-7 text-amber-100">
                    Google Play billing is not fully ready yet. This is now treated as a
                    diagnostic state instead of a hard-coded install-source failure.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="sticky bottom-4 mt-5 rounded-[28px] border border-white/10 bg-[#07111d]/92 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Selected plan
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {selectedPlan.name} • {formatPeso(selectedPlan.price)}
                  </p>
                </div>

                <Button
                  className="h-12 rounded-2xl px-5"
                  onClick={() => handlePurchase(selectedPlan)}
                  disabled={purchaseBusy || billingRefreshing}
                >
                  {purchaseBusy &&
                  normalizePlanUiKey(activePurchasePlan) ===
                    normalizePlanUiKey(selectedPlan.key) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : billingRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {selectedPlan.ctaLabel}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {shouldShowEnrollmentBanner && !showSuccess ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                    {shouldShowPendingEnrollmentBanner ? (
                      <Clock3 className="h-5 w-5 text-amber-300" />
                    ) : SUCCESS_STATUSES.has(currentStatus) ? (
                      <BadgeCheck className="h-5 w-5 text-emerald-300" />
                    ) : (
                      <Lock className="h-5 w-5 text-white/60" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {shouldShowPendingEnrollmentBanner
                        ? "Purchase sync is still in progress"
                        : "Previous enrollment found"}
                    </p>

                    <p className="mt-2 text-sm leading-7 text-white/68">
                      {shouldShowPendingEnrollmentBanner
                        ? "If a recent Google Play purchase is still syncing, you can refresh access below or choose a plan to review again."
                        : "Your account has an existing enrollment record for a current CLARA plan. You can still review the available plans and continue with the cleaner Google Play unlock flow."}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              {sortedPlans.map((plan) => (
                <SelectionCard
                  key={plan.id || plan.key}
                  plan={plan}
                  selected={normalizePlanUiKey(plan.key) === selectedPlanKey}
                  onSelect={handlePlanSelect}
                />
              ))}
            </div>

            {sortedPlans.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 backdrop-blur-xl">
                No Google Play plans are active yet. Activate PRO Tools, CLARA Program,
                or CLARA Coaching from admin first.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}