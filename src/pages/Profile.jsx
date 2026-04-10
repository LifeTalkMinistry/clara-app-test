import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Bell,
  KeyRound,
  CreditCard,
  Gift,
  Settings,
  LogOut,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const PLAN_STYLES = {
  free: "bg-white/10 text-white border-white/10",
  basic: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  transformation: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  elite: "bg-yellow-500/15 text-yellow-300 border-yellow-400/20",
  admin: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20",
};

const ROLE_STYLES = {
  admin: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  student: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  free_user: "bg-white/10 text-slate-200 border-white/10",
  user: "bg-white/10 text-slate-200 border-white/10",
};

function formatDate(value) {
  if (!value) return "Not available";
  try {
    return new Date(value).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
}

function getInitials(name, email) {
  const source = name?.trim() || email?.trim() || "U";
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function normalizePlan(profile, role) {
  if (role === "admin") return "admin";
  return (
    profile?.plan_key ||
    profile?.plan ||
    profile?.subscription_tier ||
    profile?.tier ||
    "free"
  )
    .toString()
    .toLowerCase();
}

function normalizeRole(profile) {
  return (
    profile?.role ||
    profile?.user_role ||
    profile?.account_role ||
    "user"
  )
    .toString()
    .toLowerCase();
}

function ActionRow({ icon: Icon, title, subtitle, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition active:scale-[0.99] ${
        danger
          ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
            danger
              ? "border-red-500/20 bg-red-500/10 text-red-300"
              : "border-white/10 bg-white/5 text-white"
          }`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${danger ? "text-red-300" : "text-white"}`}>
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
          ) : null}
        </div>

        {!danger && <ChevronRight size={18} className="text-slate-500" />}
      </div>
    </button>
  );
}

export default function Profile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          navigate("/login");
          return;
        }

        if (!mounted) return;
        setAuthUser(user);

        const possibleTables = ["profiles", "users", "user_profiles"];
        let foundProfile = null;

        for (const table of possibleTables) {
          const { data, error: tableError } = await supabase
            .from(table)
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (!tableError && data) {
            foundProfile = data;
            break;
          }
        }

        if (!mounted) return;
        setProfile(foundProfile || null);
      } catch (err) {
        console.error("Profile load error:", err);
        if (mounted) setError(err.message || "Failed to load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const role = useMemo(() => normalizeRole(profile), [profile]);
  const plan = useMemo(() => normalizePlan(profile, role), [profile, role]);

  const displayName =
    profile?.full_name ||
    profile?.name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split("@")[0] ||
    "User";

  const email = profile?.email || authUser?.email || "No email";
  const avatarUrl =
    profile?.avatar_url ||
    profile?.photo_url ||
    authUser?.user_metadata?.avatar_url;
  const joinedAt = profile?.created_at || authUser?.created_at;

  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "student"
        ? "Student"
        : role === "free_user"
          ? "Free User"
          : "User";

  const planLabel =
    plan === "transformation"
      ? "Transformation"
      : plan === "elite"
        ? "Elite"
        : plan === "basic"
          ? "Basic"
          : plan === "admin"
            ? "Admin"
            : "Free";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
              Control Center
            </p>
            <h1 className="text-lg font-bold">Profile</h1>
          </div>

          <button
            onClick={() => navigate("/settings")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
          >
            <Settings size={18} />
          </button>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-emerald-400/10 bg-[#04111f] shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <div className="bg-gradient-to-r from-[#0b3b2e] via-[#0f8f5a] to-[#0ea5e9] p-5">
            <div className="flex items-start gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-20 w-20 rounded-2xl border border-white/20 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-bold text-white shadow-lg">
                  {getInitials(displayName, email)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
                  My Account
                </p>
                <h2 className="truncate text-2xl font-bold">{displayName}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      ROLE_STYLES[role] || ROLE_STYLES.user
                    }`}
                  >
                    {roleLabel}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      PLAN_STYLES[plan] || PLAN_STYLES.free
                    }`}
                  >
                    {planLabel} Plan
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-300">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Email
                    </p>
                    <p className="truncate font-medium text-white">{email}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-300">
                    <CalendarDays size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Member Since
                    </p>
                    <p className="font-medium text-white">{formatDate(joinedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Account Actions
          </p>

          <ActionRow
            icon={User}
            title="Edit Profile"
            subtitle="Update your personal details later"
            onClick={() => navigate("/settings")}
          />

          <ActionRow
            icon={KeyRound}
            title="Change Password"
            subtitle="Manage account security"
            onClick={() => navigate("/settings")}
          />

          <ActionRow
            icon={Bell}
            title="Notifications"
            subtitle="Control alerts and reminders"
            onClick={() => navigate("/notifications")}
          />

          <ActionRow
            icon={CreditCard}
            title="Plan & Billing"
            subtitle={`Current plan: ${planLabel}`}
            onClick={() => navigate("/settings")}
          />

          <ActionRow
            icon={Gift}
            title="Referral Code"
            subtitle="Invite others and grow the mission"
            onClick={() => navigate("/referrals")}
          />
        </div>

        {role === "admin" && (
          <div className="mt-5 space-y-3">
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Admin Tools
            </p>

            <ActionRow
              icon={Shield}
              title="Admin Panel"
              subtitle="Manage students, modules, and system controls"
              onClick={() => navigate("/admin")}
            />
          </div>
        )}

        <div className="mt-5 space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Session
          </p>

          <ActionRow
            icon={LogOut}
            title="Log Out"
            subtitle="Sign out from your account"
            onClick={handleLogout}
            danger
          />
        </div>

        {loading && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Loading profile...
          </div>
        )}
      </div>
    </div>
  );
}