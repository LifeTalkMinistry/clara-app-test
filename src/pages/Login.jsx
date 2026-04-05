import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, refreshProfile } = useAuth();

  const [mode, setMode] = useState("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const friendlyError = (error) => {
    const msg = error?.message?.toLowerCase() || "";

    if (msg.includes("email rate limit exceeded")) {
      return "Too many attempts. Please wait a few minutes.";
    }
    if (msg.includes("invalid login credentials")) {
      return "Invalid email or password.";
    }
    if (msg.includes("user already registered")) {
      return "This email is already registered.";
    }
    if (msg.includes("password should be at least")) {
      return error.message;
    }

    return error?.message || "Something went wrong.";
  };

  const goNext = async (authUser) => {
    const profile = await refreshProfile(authUser?.id);

    if (!profile || !profile.has_completed_onboarding) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const data = await signUp({
          email,
          password,
          fullName,
        });

        const authUser = data?.user;

        if (!authUser) {
          throw new Error("Signup failed. Try again.");
        }

        if (!data?.session) {
          setMessage("Account created. Please check your email to confirm your account before logging in.");
          setMode("login");
          setPassword("");
          setLoading(false);
          return;
        }

        await goNext(authUser);
      } else {
        const data = await signIn({
          email,
          password,
        });

        await goNext(data?.user);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <h1 className="text-3xl font-bold mb-6">
          {mode === "signup" ? "Sign Up" : "Login"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-60 px-4 py-3 font-semibold"
          >
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>

        {message && (
          <div className="mt-4 text-sm text-red-400">
            {message}
          </div>
        )}

        <div className="mt-5 text-sm text-white/70">
          {mode === "signup" ? (
            <button
              type="button"
              onClick={() => {
                if (loading) return;
                setMode("login");
                setMessage("");
              }}
              className="underline"
            >
              Already have an account? Login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (loading) return;
                setMode("signup");
                setMessage("");
              }}
              className="underline"
            >
              Don’t have an account? Sign up
            </button>
          )}
        </div>
      </div>
    </div>
  );
}