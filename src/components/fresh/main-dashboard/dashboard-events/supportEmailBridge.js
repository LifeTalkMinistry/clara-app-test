import { supabase } from "@/lib/supabaseClient";

const SUPPORT_EMAIL = "claraprogram2026@gmail.com";
const SUPPORT_PLACEHOLDER = "Briefly describe what you need help with...";
const OLD_SUBTITLE = "Send a support message directly to CLARA admins.";
const NEW_SUBTITLE =
  "Write your concern here, then continue in your email app to review and send it to CLARA Support.";
const OLD_HELPER =
  "All admin accounts will receive this in Messages. You’ll be moved to the Message tab after sending.";
const NEW_HELPER =
  "Your email app will open with CLARA Support, your message, and your account details already filled in. Review the email, then tap Send.";
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 1500;
const INSTALL_KEY = "__claraPreparedSupportEmailInstalled";

let cachedUser = null;
let openingEmailUntil = 0;

function safeValue(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "Not available";
}

function formatLabel(value) {
  const normalized = String(value ?? "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();

  if (!normalized) return "Not available";
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

function resolveSupportRoot(element) {
  if (!element) return null;
  const textarea = element.matches?.(`textarea[placeholder="${SUPPORT_PLACEHOLDER}"]`)
    ? element
    : element
        .closest?.("div")
        ?.querySelector?.(`textarea[placeholder="${SUPPORT_PLACEHOLDER}"]`);

  return textarea?.closest?.(".space-y-4") || textarea?.parentElement?.parentElement || null;
}

function findSupportTextarea(root = document) {
  return root.querySelector?.(`textarea[placeholder="${SUPPORT_PLACEHOLDER}"]`) || null;
}

function findSupportTopic(root) {
  return root?.querySelector?.("select") || null;
}

function findPrimaryButton(root) {
  return Array.from(root?.querySelectorAll?.("button") || []).find((button) => {
    const label = button.textContent?.trim() || "";
    return (
      label === "Send CLARA support message" ||
      label === "Sending to CLARA support..." ||
      label === "Continue in email app" ||
      label === "Opening email app..."
    );
  });
}

function ensureStatusElement(root, primaryButton) {
  let status = root?.querySelector?.("[data-clara-support-email-status]");
  if (status) return status;

  status = document.createElement("p");
  status.dataset.claraSupportEmailStatus = "true";
  status.setAttribute("role", "status");
  status.style.display = "none";
  primaryButton?.parentElement?.insertBefore(status, primaryButton);
  return status;
}

function showStatus(root, type, message) {
  const primaryButton = findPrimaryButton(root);
  const status = ensureStatusElement(root, primaryButton);
  if (!status) return;

  status.textContent = message;
  status.style.display = "block";
  status.className =
    type === "error"
      ? "mt-3 rounded-2xl border border-rose-300/20 bg-rose-500/12 px-4 py-3 text-xs font-semibold leading-5 text-rose-100"
      : "mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-xs font-semibold leading-5 text-emerald-100";
}

function clearStatus(root) {
  const status = root?.querySelector?.("[data-clara-support-email-status]");
  if (!status) return;
  status.textContent = "";
  status.style.display = "none";
}

function resolveSenderDetails() {
  const user = cachedUser || {};
  const email = user?.email || "";
  const emailPrefix = String(email).split("@")[0].trim();
  const metadata = user?.user_metadata || {};
  const appMetadata = user?.app_metadata || {};

  const name = safeValue(
    metadata.full_name || metadata.name || metadata.display_name || metadata.nickname || emailPrefix || "CLARA User"
  );
  const plan = formatLabel(
    metadata.plan_label || metadata.plan_key || metadata.plan || appMetadata.plan || appMetadata.plan_key
  );
  const enrollmentStatus = formatLabel(
    metadata.enrollment_status ||
      metadata.subscription_status ||
      metadata.activation_status ||
      metadata.status ||
      appMetadata.enrollment_status ||
      appMetadata.status
  );

  return {
    name,
    email: safeValue(email),
    userId: safeValue(user?.id),
    plan,
    enrollmentStatus,
  };
}

function buildPreparedEmail(root) {
  const textarea = findSupportTextarea(root);
  const topicSelect = findSupportTopic(root);
  const cleanMessage = textarea?.value?.trim() || "";

  if (cleanMessage.length < MIN_MESSAGE_LENGTH) {
    showStatus(root, "error", "Please briefly describe what you need help with.");
    return null;
  }

  const topic = safeValue(topicSelect?.value || "Other concern");
  const sender = resolveSenderDetails();
  const submittedAt = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date());
  const subject = `CLARA Support | ${topic} | ${sender.name}`;
  const body = [
    "Hello CLARA Support,",
    "",
    cleanMessage,
    "",
    "CLARA account information",
    `Name: ${sender.name}`,
    `Login email: ${sender.email}`,
    `User ID: ${sender.userId}`,
    `Plan: ${sender.plan}`,
    `Enrollment status: ${sender.enrollmentStatus}`,
    `Topic: ${topic}`,
    `Submitted: ${safeValue(submittedAt)}`,
  ].join("\r\n");

  clearStatus(root);
  return { subject, body };
}

function copyWithTextareaFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyPreparedMessage(root) {
  const prepared = buildPreparedEmail(root);
  if (!prepared) return;

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(prepared.body);
    } else if (!copyWithTextareaFallback(prepared.body)) {
      throw new Error("Clipboard copy is unavailable.");
    }

    showStatus(root, "success", "Support message copied.");
  } catch (error) {
    console.error("Support message copy failed:", error);
    showStatus(
      root,
      "error",
      "Unable to copy the support message on this device. Please use the support email below."
    );
  }
}

function openPreparedEmail(root) {
  if (Date.now() < openingEmailUntil) return;
  const prepared = buildPreparedEmail(root);
  if (!prepared) return;

  openingEmailUntil = Date.now() + 1200;
  const mailtoUrl =
    `mailto:${SUPPORT_EMAIL}` +
    `?subject=${encodeURIComponent(prepared.subject)}` +
    `&body=${encodeURIComponent(prepared.body)}`;
  window.location.href = mailtoUrl;
}

function updateButtonState(root) {
  const textarea = findSupportTextarea(root);
  const primaryButton = findPrimaryButton(root);
  const copyButton = root?.querySelector?.('[data-clara-support-email-action="copy"]');
  const empty = !textarea?.value?.trim();

  if (primaryButton) primaryButton.disabled = empty;
  if (copyButton) copyButton.disabled = empty;
}

function enhanceSupportScreen() {
  const textarea = findSupportTextarea(document);
  if (!textarea) return;

  const root = resolveSupportRoot(textarea);
  if (!root) return;

  textarea.maxLength = MAX_MESSAGE_LENGTH;
  if (!textarea.dataset.claraSupportEmailInputBound) {
    textarea.dataset.claraSupportEmailInputBound = "true";
    textarea.addEventListener("input", () => {
      clearStatus(root);
      updateButtonState(root);
    });
  }

  const subtitle = Array.from(root.querySelectorAll("p")).find(
    (paragraph) => paragraph.textContent?.trim() === OLD_SUBTITLE
  );
  if (subtitle) subtitle.textContent = NEW_SUBTITLE;

  const helper = Array.from(root.querySelectorAll("p")).find(
    (paragraph) => paragraph.textContent?.trim() === OLD_HELPER
  );
  if (helper) helper.textContent = NEW_HELPER;

  const primaryButton = findPrimaryButton(root);
  if (primaryButton) {
    primaryButton.dataset.claraSupportEmailAction = "open";
    primaryButton.textContent = "Continue in email app";
  }

  let copyButton = root.querySelector('[data-clara-support-email-action="copy"]');
  if (!copyButton && primaryButton?.parentElement) {
    copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.dataset.claraSupportEmailAction = "copy";
    copyButton.textContent = "Copy support message";
    copyButton.className =
      "mt-2 min-h-11 w-full rounded-2xl border border-white/15 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/75 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45";
    primaryButton.insertAdjacentElement("afterend", copyButton);
  }

  const emailText = Array.from(root.querySelectorAll("p, a")).find(
    (element) => element.textContent?.trim() === SUPPORT_EMAIL
  );
  if (emailText && emailText.tagName !== "A") {
    const emailLink = document.createElement("a");
    emailLink.href = `mailto:${SUPPORT_EMAIL}`;
    emailLink.textContent = SUPPORT_EMAIL;
    emailLink.className = `${emailText.className || ""} block break-all underline decoration-emerald-200/35 underline-offset-4`;
    emailText.replaceWith(emailLink);
  }

  const staleAdminNotice = Array.from(root.querySelectorAll("div, p")).find((element) => {
    const text = element.textContent?.trim() || "";
    return (
      text.startsWith("Unable to find CLARA admin accounts") ||
      text.startsWith("No admin account is available for support messages") ||
      text.startsWith("Support message sent to")
    );
  });
  if (staleAdminNotice) staleAdminNotice.style.display = "none";

  updateButtonState(root);
}

function handleSupportAction(event) {
  const button = event.target?.closest?.("button");
  if (!button) return;

  const label = button.textContent?.trim() || "";
  const action =
    button.dataset.claraSupportEmailAction ||
    (label === "Send CLARA support message" || label === "Sending to CLARA support..."
      ? "open"
      : label === "Copy support message"
        ? "copy"
        : "");
  if (!action) return;

  const root = resolveSupportRoot(button);
  if (!root) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  if (action === "copy") {
    void copyPreparedMessage(root);
    return;
  }

  openPreparedEmail(root);
}

export function installSupportEmailBridge() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  void supabase.auth
    .getSession()
    .then(({ data }) => {
      cachedUser = data?.session?.user || null;
    })
    .catch(() => {
      cachedUser = null;
    });

  supabase.auth.onAuthStateChange((_event, session) => {
    cachedUser = session?.user || null;
  });

  document.addEventListener("click", handleSupportAction, true);
  const observer = new MutationObserver(enhanceSupportScreen);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhanceSupportScreen();
}
