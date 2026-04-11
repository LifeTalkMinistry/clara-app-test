import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          setMessage(
            "Account created. Please check your email to confirm your account."
          );
          setMode("login");
          setPassword("");
          return;
        }

        navigate("/", { replace: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        navigate("/", { replace: true });
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
            {loading
              ? "Please wait..."
              : mode === "signup"
              ? "Create account"
              : "Login"}
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