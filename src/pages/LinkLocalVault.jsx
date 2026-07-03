import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  CLARA_ACCOUNT_LINKING_ENABLED,
  CLARA_AUTH_ENABLED,
} from "@/config/claraFeatureFlags";
import { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";
import { linkLocalVaultToAccount } from "@/lib/accountLinking/linkLocalVaultToAccount";

export default function LinkLocalVault() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const enabled = CLARA_AUTH_ENABLED && CLARA_ACCOUNT_LINKING_ENABLED;

  const submit = async (event) => {
    event.preventDefault();
    if (!enabled || loading) return;
    if (!email.trim() || !password.trim()) {
      setNotice({ type: "error", text: "Email and password are required." });
      return;
    }

    setLoading(true);
    setNotice(null);
    const expectedVaultId = ensureActiveLocalVaultId();

    try {
      const data =
        mode === "signup"
          ? await signUp({ email, password, fullName: "" })
          : await signIn({ email, password });

      const accountUser = data?.user || data?.session?.user;
      if (!accountUser?.id) {
        setNotice({
          type: "success",
          text: "Confirm your email, then return here and sign in to finish linking.",
        });
        setMode("login");
        return;
      }

      await linkLocalVaultToAccount({
        expectedVaultId,
        accountUserId: accountUser.id,
        accountEmail: accountUser.email || email,
      });

      setNotice({ type: "success", text: "Your existing CLARA data is now linked." });
      window.setTimeout(() => navigate("/dashboard", { replace: true }), 700);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error?.code === "VAULT_ACCOUNT_CONFLICT"
            ? "This device data is already linked to another account."
            : error?.message || "Linking failed. Your local data remains safe.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050716] px-4 py-8 text-white">
      <section className="mx-auto max-w-md rounded-[28px] border border-white/12 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black">Protect & link my data</h1>
            <p className="mt-1 text-sm leading-6 text-white/55">
              Connect the CLARA records stored on this device to your account.
            </p>
          </div>
        </div>

        {!enabled ? (
          <p className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            Account linking is temporarily unavailable. Your current data remains safe on this device.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["login", "Sign in"],
                ["signup", "Create account"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${
                    mode === value ? "bg-white/12 text-white" : "text-white/45"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm outline-none"
            />
            {notice ? (
              <p
                className={`rounded-2xl p-3 text-sm ${
                  notice.type === "success"
                    ? "bg-emerald-400/10 text-emerald-100"
                    : "bg-red-500/10 text-red-200"
                }`}
              >
                {notice.text}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-emerald-400 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              {loading ? "Connecting..." : mode === "signup" ? "Create and link" : "Sign in and link"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate("/dashboard", { replace: true })}
          className="mt-4 w-full text-xs font-bold text-white/45"
        >
          Continue using CLARA locally
        </button>
      </section>
    </main>
  );
}
