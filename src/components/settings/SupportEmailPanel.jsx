import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, LifeBuoy, Mail, Send } from "lucide-react";

const SUPPORT_EMAIL = "claraprogram2026@gmail.com";
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 1500;

const SUPPORT_TOPICS = [
  "Billing / enrollment",
  "Account access",
  "Technical problem",
  "App feature",
  "Feedback / suggestion",
  "Other concern",
];

function safeValue(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "Not available";
}

function copyWithTextareaFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function SupportEmailPanel({
  profile,
  authUser,
  userId,
  email,
  planLabel,
  enrollmentStatus,
}) {
  const [supportTopic, setSupportTopic] = useState(SUPPORT_TOPICS[0]);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportError, setSupportError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [openingEmail, setOpeningEmail] = useState(false);
  const copyStatusTimerRef = useRef(null);
  const openingTimerRef = useRef(null);

  useEffect(() => () => {
    if (copyStatusTimerRef.current) window.clearTimeout(copyStatusTimerRef.current);
    if (openingTimerRef.current) window.clearTimeout(openingTimerRef.current);
  }, []);

  const buildPreparedEmail = useCallback(() => {
    const cleanMessage = supportMessage.trim();

    if (cleanMessage.length < MIN_MESSAGE_LENGTH) {
      setSupportError("Please briefly describe what you need help with.");
      return null;
    }

    const emailPrefix = String(email || "").split("@")[0].trim();
    const senderName = safeValue(
      profile?.full_name ||
        authUser?.user_metadata?.full_name ||
        emailPrefix ||
        "CLARA User"
    );
    const submittedAt = new Intl.DateTimeFormat("en-PH", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    }).format(new Date());
    const subject = `CLARA Support | ${supportTopic} | ${senderName}`;
    const body = [
      "Hello CLARA Support,",
      "",
      cleanMessage,
      "",
      "CLARA account information",
      `Name: ${senderName}`,
      `Login email: ${safeValue(email)}`,
      `User ID: ${safeValue(userId)}`,
      `Plan: ${safeValue(planLabel)}`,
      `Enrollment status: ${safeValue(enrollmentStatus)}`,
      `Topic: ${safeValue(supportTopic)}`,
      `Submitted: ${safeValue(submittedAt)}`,
    ].join("\r\n");

    setSupportError("");
    return { subject, body };
  }, [authUser, email, enrollmentStatus, planLabel, profile, supportMessage, supportTopic, userId]);

  const handleOpenSupportEmail = useCallback((event) => {
    event.preventDefault();
    if (openingEmail) return;

    const preparedEmail = buildPreparedEmail();
    if (!preparedEmail) return;

    const mailtoUrl =
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(preparedEmail.subject)}` +
      `&body=${encodeURIComponent(preparedEmail.body)}`;

    setOpeningEmail(true);
    window.location.href = mailtoUrl;

    openingTimerRef.current = window.setTimeout(() => {
      setOpeningEmail(false);
      openingTimerRef.current = null;
    }, 1200);
  }, [buildPreparedEmail, openingEmail]);

  const handleCopySupportMessage = useCallback(async () => {
    const preparedEmail = buildPreparedEmail();
    if (!preparedEmail) return;

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(preparedEmail.body);
      } else if (!copyWithTextareaFallback(preparedEmail.body)) {
        throw new Error("Clipboard copy was not available.");
      }

      setCopyStatus("Support message copied.");
      if (copyStatusTimerRef.current) window.clearTimeout(copyStatusTimerRef.current);
      copyStatusTimerRef.current = window.setTimeout(() => {
        setCopyStatus("");
        copyStatusTimerRef.current = null;
      }, 2200);
    } catch (copyError) {
      console.error("Support message copy failed:", copyError);
      setCopyStatus("");
      setSupportError("Unable to copy the support message on this device. Please use the support email below.");
    }
  }, [buildPreparedEmail]);

  const messageIsEmpty = supportMessage.trim().length === 0;

  return (
    <div className="space-y-4">
      <div className="theme-soft-card rounded-[24px] border border-white/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
            <LifeBuoy size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">Help &amp; support</h3>
            <p className="mt-1 text-sm leading-relaxed text-white/60">
              Write your concern here, then continue in your email app to review and send it to CLARA Support.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleOpenSupportEmail} className="theme-soft-card rounded-[24px] border border-white/10 p-4">
        <div>
          <label htmlFor="support-topic" className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
            Topic
          </label>
          <select
            id="support-topic"
            value={supportTopic}
            onChange={(event) => {
              setSupportTopic(event.target.value);
              setSupportError("");
              setCopyStatus("");
            }}
            className="mt-2 min-h-11 w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-300/10"
          >
            {SUPPORT_TOPICS.map((topic) => (
              <option key={topic} value={topic} className="bg-slate-950 text-white">
                {topic}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="support-message" className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
              Message
            </label>
            <span className="text-[11px] text-white/35">
              {supportMessage.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
          <textarea
            id="support-message"
            value={supportMessage}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={6}
            placeholder="Briefly describe what you need help with..."
            onChange={(event) => {
              setSupportMessage(event.target.value);
              setSupportError("");
              setCopyStatus("");
            }}
            className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-300/10"
          />
        </div>

        {supportError ? (
          <p role="alert" className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-200">
            {supportError}
          </p>
        ) : null}

        {copyStatus ? (
          <p role="status" className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {copyStatus}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={messageIsEmpty || openingEmail}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-[0_14px_32px_rgba(6,182,212,0.18)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send size={16} />
          {openingEmail ? "Opening email app..." : "Continue in email app"}
        </button>

        <button
          type="button"
          onClick={handleCopySupportMessage}
          disabled={messageIsEmpty}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Copy size={16} />
          Copy support message
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-white/45">
          Your email app will open with CLARA Support, your message, and your account details already filled in. Review the email, then tap Send.
        </p>
      </form>

      <div className="theme-soft-card rounded-[24px] border border-white/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/70">
            <Mail size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Support email</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-1 block break-all text-sm font-semibold text-emerald-200 underline decoration-emerald-300/35 underline-offset-4"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
