import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Eye,
  EyeOff,
  Play,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { requestClaraPasswordReset } from "@/lib/password-reset-client";
import {
  fetchPublicLanding,
  uploadPublicLandingVideo,
} from "@/lib/public-landing-client";
import ClaraLogo from "@/components/ClaraLogo";

const CLARA_FACEBOOK_URL =
  "https://www.facebook.com/profile.php?id=61590352695488";

const MODE_COPY = {
  login: {
    subtitle: "Access your CLARA account",
    button: "Log in",
    secondaryLead: "New to CLARA?",
    secondaryAction: "Create account",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start your journey to financial clarity",
    button: "Create account",
    secondaryLead: "Already have an account?",
    secondaryAction: "Log in",
  },
  forgot: {
    title: "Reset your password",
    subtitle:
      "Enter the email connected to your CLARA account and we'll send you a secure reset link.",
    button: "Send reset email",
    secondaryLead: "Remembered your password?",
    secondaryAction: "Back to login",
  },
};

function friendlyError(error) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (error?.code === "VAULT_ACCOUNT_CONFLICT") {
    return "This local vault is already linked to another CLARA account.";
  }
  if (error?.code === "ACCOUNT_CREATED_LOCAL_ACTIVATION_FAILED") {
    return "Your account was created, but its local vault could not open. Log in again to continue.";
  }
  if (error?.code === "ACCOUNT_VAULT_DIRECTORY_CONFLICT") {
    return "CLARA found conflicting local account data and blocked access to protect your records.";
  }
  if (error?.code === "NETWORK_ERROR" || normalized.includes("account server")) {
    return "CLARA could not reach the account server. Check your connection and try again.";
  }
  if (error?.status === 401 || normalized.includes("invalid email or password")) {
    return "Invalid email or password.";
  }
  if (error?.status === 409 || normalized.includes("already registered")) {
    return "This email is already registered. Try logging in instead.";
  }
  if (error?.status === 429) {
    return "Too many requests. Please wait a little while before trying again.";
  }
  if (normalized.includes("at least 8 characters")) {
    return "Password must contain at least 8 characters.";
  }
  if (normalized.includes("origin is not allowed")) {
    return "This CLARA installation is not yet approved by the account server.";
  }

  return message || "CLARA could not complete the request.";
}

function FieldShell({ label, hint, children }) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-white/88">{label}</span>
        {hint ? <span className="text-[11px] text-white/38">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function TrialRequestModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/72 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(48px,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="relative max-h-[calc(100dvh-32px)] w-full max-w-sm overflow-y-auto rounded-[28px] border border-white/12 bg-[#090d20] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.68)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clara-trial-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Close trial information"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
          15-Day CLARA Trial
        </p>
        <h2 id="clara-trial-title" className="mt-2 pr-10 text-2xl font-bold leading-tight">
          Your trial starts with a real CLARA introduction.
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/62">
          We’ll take you to the official CLARA Facebook page. Send us a message and the CLARA team will provide your trial access code and help you get started.
        </p>

        <a
          href={CLARA_FACEBOOK_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-semibold text-[#020617] shadow-[0_18px_42px_rgba(59,130,246,0.28)] transition active:scale-[0.985]"
        >
          Continue to CLARA Facebook
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 h-11 w-full rounded-xl text-sm font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white/78"
        >
          Not now
        </button>
      </section>
    </div>
  );
}

function FirstGlance({
  onLogin,
  onSignup,
  onStartTrial,
  isAdmin,
  landingContent,
  landingLoading,
  videoUploading,
  videoMessage,
  onUploadVideo,
}) {
  const fileInputRef = useRef(null);
  const videoSrc = landingContent?.demo_video_url
    ? `${landingContent.demo_video_url}?v=${encodeURIComponent(
        landingContent.demo_video_updated_at || "current"
      )}`
    : null;

  return (
    <div
      className="clara-public-landing-page relative h-[100dvh] min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#050716] text-white [-webkit-overflow-scrolling:touch]"
      data-clara-public-landing
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#050716_0%,#070a1f_52%,#02030b_100%)]" />
        <div className="absolute left-1/2 top-[-8rem] h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-[22rem] w-[22rem] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      <main className="clara-public-landing-main relative mx-auto flex w-full max-w-md flex-col px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-center justify-between gap-4 py-2">
          <button
            type="button"
            onClick={onLogin}
            className="text-sm font-semibold text-white/64 transition hover:text-white"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={onSignup}
            className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/88 transition hover:bg-white/10"
          >
            Sign up
          </button>
        </header>

        <section className="flex flex-col py-6 text-center sm:py-8">
          <div className="mx-auto flex flex-col items-center justify-center">
            <ClaraLogo variant="icon" theme="dark" className="scale-[0.82] sm:scale-[0.9]" />
            <p
              className="-mt-3 font-heading text-2xl font-bold leading-none tracking-[0.16em] sm:-mt-2"
              aria-label="CLARA"
            >
              <span className="text-[#4d8cff]">CL</span>
              <span className="text-[#ffd42f]">A</span>
              <span className="text-[#ff4d55]">RA</span>
            </p>
            <p className="mt-2 text-[13px] font-medium tracking-[0.08em] text-white/55">
              Personal Money Coach
            </p>
          </div>

          <h1 className="mx-auto mt-6 max-w-[20rem] text-[1.82rem] font-bold leading-[1.1] tracking-[-0.035em] text-white sm:mt-9 sm:text-[2.2rem]">
            Could ₱99 a month help you keep <span className="whitespace-nowrap">₱3,000–₱5,000</span> more of your money?
          </h1>
          <p className="mt-3 text-[15px] font-medium text-white/62 sm:mt-4 sm:text-base">
            Watch the video and see how.
          </p>

          <div
            className="relative mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(12,18,38,0.78),rgba(5,8,22,0.92))] shadow-[0_24px_70px_rgba(0,0,0,0.42)] sm:mt-8"
            data-clara-demo-video
          >
            {videoSrc ? (
              <video
                key={videoSrc}
                className="aspect-video w-full bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                src={videoSrc}
              >
                Your browser does not support this CLARA video.
              </video>
            ) : (
              <div className="relative flex aspect-video items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(59,130,246,0.22),transparent_50%),linear-gradient(135deg,rgba(34,211,238,0.07),rgba(139,92,246,0.08))]" />
                <div className="relative flex flex-col items-center gap-3">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                    <Play className="ml-1 h-6 w-6 fill-white text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">CLARA Demo Video</p>
                    <p className="mt-1 text-xs text-white/42">
                      {landingLoading ? "Loading video..." : "Creator walkthrough will play here."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isAdmin ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) onUploadVideo(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={videoUploading}
                  className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur-md transition hover:bg-black/75 disabled:cursor-wait disabled:opacity-55"
                  aria-label="Upload CLARA public demo video"
                  title="Upload public demo video"
                >
                  <Upload className={`h-4 w-4 ${videoUploading ? "animate-pulse" : ""}`} />
                </button>
              </>
            ) : null}
          </div>

          {isAdmin && videoMessage ? (
            <p className="mt-2 text-xs font-medium text-cyan-200/80">{videoMessage}</p>
          ) : null}

          <button
            type="button"
            onClick={onStartTrial}
            className="group mt-6 inline-flex min-h-14 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-5 py-3.5 text-[15px] font-bold text-[#020617] shadow-[0_18px_48px_rgba(59,130,246,0.3)] transition active:scale-[0.985] sm:mt-8"
          >
            Start your 15-Day Trial
            <ArrowRight className="h-[18px] w-[18px] transition group-hover:translate-x-0.5" />
          </button>
          <p className="mt-3 text-xs leading-5 text-white/38">
            Trial access is personally activated through the official CLARA page.
          </p>
        </section>

        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">
          Ask before you spend.
        </p>
      </main>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const requestedMode = new URLSearchParams(location.search).get("mode");
  const initialMode =
    requestedMode === "landing"
      ? "landing"
      : requestedMode === "signup"
        ? "signup"
        : requestedMode === "login" || location.state?.from
          ? "login"
          : "landing";

  const [mode, setMode] = useState(initialMode);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [landingContent, setLandingContent] = useState({ has_video: false });
  const [landingLoading, setLandingLoading] = useState(true);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoMessage, setVideoMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const loading = submitting || authLoading;
  const destination = location.state?.from?.pathname || "/dashboard";
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  useEffect(() => {
    let active = true;
    setLandingLoading(true);
    fetchPublicLanding()
      .then((payload) => {
        if (active) setLandingContent(payload);
      })
      .catch(() => {
        if (active) setLandingContent({ has_video: false });
      })
      .finally(() => {
        if (active) setLandingLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePublicVideoUpload = async (file) => {
    if (!isAdmin || videoUploading) return;
    setVideoUploading(true);
    setVideoMessage("Publishing video...");
    try {
      const payload = await uploadPublicLandingVideo(file);
      setLandingContent(payload);
      setVideoMessage("Published for everyone.");
    } catch (error) {
      setVideoMessage(error?.message || "CLARA could not publish this video.");
    } finally {
      setVideoUploading(false);
    }
  };

  const validate = () => {
    if (mode === "signup" && !fullName.trim()) return "Your name is required.";
    if (!email.trim()) return "Email is required.";
    if (mode === "forgot") return null;
    if (!password) return "Password is required.";
    if (mode === "signup" && password.length < 8) {
      return "Password must contain at least 8 characters.";
    }
    if (mode === "signup" && password !== confirmPassword) {
      return "The passwords do not match.";
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setSuccess(false);
      setMessage(validationError);
      return;
    }

    setSubmitting(true);
    setMessage("");
    setSuccess(false);

    try {
      if (mode === "signup") {
        await signUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
        });
        navigate("/beta-welcome", { replace: true });
      } else if (mode === "forgot") {
        const result = await requestClaraPasswordReset({ email: email.trim() });
        setSuccess(true);
        setMessage(
          result?.message ||
            "If an account exists for this email, we've sent password reset instructions."
        );
      } else {
        await signIn({ email: email.trim(), password });
        navigate(destination, { replace: true });
      }
    } catch (error) {
      console.error("[CLARA Login] authentication failed", error);
      setSuccess(false);
      setMessage(friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (nextMode) => {
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    setMessage("");
    setSuccess(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const handleForgotPassword = () => {
    switchMode("forgot");
  };

  const inputClass =
    "h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:border-white/7 disabled:bg-white/[0.035] disabled:text-white/34 disabled:placeholder:text-white/18";

  if (mode === "landing") {
    return (
      <>
        <FirstGlance
          onLogin={() => switchMode("login")}
          onSignup={() => switchMode("signup")}
          onStartTrial={() => setTrialModalOpen(true)}
          isAdmin={isAdmin}
          landingContent={landingContent}
          landingLoading={landingLoading}
          videoUploading={videoUploading}
          videoMessage={videoMessage}
          onUploadVideo={handlePublicVideoUpload}
        />
        {trialModalOpen ? (
          <TrialRequestModal onClose={() => setTrialModalOpen(false)} />
        ) : null}
      </>
    );
  }

  const copy = MODE_COPY[mode];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050716] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#050716_0%,#070a1f_46%,#02030b_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.11)_0%,transparent_34%),linear-gradient(225deg,rgba(139,92,246,0.12)_0%,transparent_36%)]" />
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(59,130,246,0.15)_0%,transparent_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(0deg,rgba(0,0,0,0.74)_0%,transparent_100%)]" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => switchMode("landing")}
          disabled={loading}
          className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium text-white/42 transition hover:bg-white/[0.05] hover:text-white/72 disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to CLARA
        </button>

        <div className="mb-4 flex justify-center">
          <ClaraLogo variant="icon" theme="dark" />
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,18,38,0.72)_0%,rgba(5,8,22,0.62)_100%)] shadow-[0_25px_80px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.08)_0%,transparent_44%),linear-gradient(225deg,rgba(167,139,250,0.08)_0%,transparent_44%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />

          <div className="p-5 sm:p-6">
            <div className="overflow-hidden">
              <div key={mode} className="animate-[fadeIn_.28s_ease] transition-all duration-300">
                {copy.title ? (
                  <h1 className="text-[1.9rem] font-bold leading-tight text-white">{copy.title}</h1>
                ) : null}
                <p className={`text-sm leading-relaxed text-white/58 ${copy.title ? "mt-1.5" : ""}`}>
                  {copy.subtitle}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              {mode === "signup" ? (
                <FieldShell label="Name">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    disabled={loading}
                    className={inputClass}
                  />
                </FieldShell>
              ) : null}

              <FieldShell label="Email address">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  disabled={loading}
                  className={inputClass}
                />
              </FieldShell>

              {mode !== "forgot" ? (
                <FieldShell
                  label="Password"
                  hint={mode === "signup" ? "Minimum 8 characters" : null}
                >
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        mode === "signup" ? "Create a password" : "Enter your password"
                      }
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      disabled={loading}
                      className={`${inputClass} pr-14`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      disabled={loading}
                      className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/48 transition hover:bg-white/8 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/35 disabled:cursor-not-allowed disabled:text-white/22 disabled:hover:bg-transparent"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </FieldShell>
              ) : null}

              {mode === "signup" ? (
                <FieldShell label="Confirm password">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter the password again"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    className={inputClass}
                  />
                </FieldShell>
              ) : null}

              {mode === "login" ? (
                <div className="-mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="rounded-md px-1 py-1 text-[12px] text-white/42 transition hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:text-white/24"
                  >
                    Forgot password?
                  </button>
                </div>
              ) : null}

              {message ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                    success
                      ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
                      : "border-red-400/20 bg-red-500/10 text-red-200"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="group mt-1 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-semibold text-[#020617] shadow-[0_18px_42px_rgba(59,130,246,0.32)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_52px_rgba(139,92,246,0.34)] active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none disabled:opacity-70"
              >
                <span>{loading ? "Processing..." : copy.button}</span>
                {!loading ? (
                  <ArrowRight className="h-[17px] w-[17px] transition group-hover:translate-x-0.5" />
                ) : null}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-white/55">
              <span>{copy.secondaryLead}</span>{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                disabled={loading}
                className="font-semibold text-cyan-300 transition hover:text-violet-200 disabled:cursor-not-allowed disabled:text-white/30"
              >
                {copy.secondaryAction}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
