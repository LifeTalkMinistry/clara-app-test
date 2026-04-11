import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!email.trim()) return "Email is required.";
    if (!password.trim()) return "Password is required.";

    if (mode === "signup") {
      if (!fullName.trim()) return "Full name is required.";
      if (password.length < 6)
        return "Password must be at least 6 characters.";
    }

    return null;
  };

  const friendlyError = (error) => {
    const msg = error?.message?.toLowerCase() || "";

    if (msg.includes("invalid login credentials")) {
      return "Invalid email or password.";
    }
    if (msg.includes("user already registered")) {
      return "This email is already registered.";
    }
    if (msg.includes("rate limit")) {
      return "Too many attempts. Please wait.";
    }

    return error?.message || "Something went wrong.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      if (mode === "signup") {
        const data = await signUp({
          email,
          password,
          fullName,
        });

        if (!data?.session) {
          setSuccess(true);
          setMessage("Check your email to confirm your account.");
          setMode("login");
          return;
        }

        navigate("/onboarding");
      } else {
        await signIn({ email, password });
        navigate("/");
      }
    } catch (error) {
      console.error(error);
      setMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        
        {/* TITLE */}
        <h1 className="text-3xl font-bold mb-6">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {mode === "signup" && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-green-500"
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-green-500"
          />

          {/* PASSWORD */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 pr-12 outline-none focus:border-green-500"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-60 px-4 py-3 font-semibold transition"
          >
            {loading
              ? "Processing..."
              : mode === "signup"
              ? "Create account"
              : "Login"}
          </button>
        </form>

        {/* MESSAGE */}
        {message && (
          <div
            className={`mt-4 text-sm ${
              success ? "text-green-400" : "text-red-400"
            }`}
          >
            {message}
          </div>
        )}

        {/* SWITCH */}
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