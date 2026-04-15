import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Shield,
  CreditCard,
  CalendarDays,
  Camera,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { PLAN_BADGE_STYLES, PLAN_LABELS, normalizePlanKey } from "@/lib/plan-config";

const ROLE_STYLES = {
  admin: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  student: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  free_user: "bg-white/10 text-slate-200 border-white/10",
  user: "bg-white/10 text-slate-200 border-white/10",
};

function normalizeRole(profile) {
  return (profile?.role || "user").toString().toLowerCase();
}

function normalizePlan(profile, role) {
  if (role === "admin") return "admin";
  return normalizePlanKey(profile?.plan || "free");
}

function getInitials(name, email) {
  const source = name?.trim() || email?.trim() || "U";
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

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

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />
          <p className="mt-3 text-sm text-slate-400">Loading account...</p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{label}</p>
          {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Account() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    display_name: "",
    phone: "",
  });

  const [initialForm, setInitialForm] = useState({
    full_name: "",
    display_name: "",
    phone: "",
  });

  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        if (!mounted) return;
        setAuthUser(user);

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!mounted) return;

        const safeProfile = data || {};
        setProfile(safeProfile);

        const nextForm = {
          full_name:
            safeProfile.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          display_name:
            safeProfile.display_name ||
            safeProfile.nickname ||
            "",
          phone:
            safeProfile.phone ||
            safeProfile.mobile_number ||
            safeProfile.contact_number ||
            "",
        };

        setForm(nextForm);
        setInitialForm(nextForm);
      } catch (err) {
        console.error("Failed to load account:", err);
        if (mounted) setError("Failed to load account details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAccount();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const role = useMemo(() => normalizeRole(profile), [profile]);
  const plan = useMemo(() => normalizePlan(profile, role), [profile, role]);

  const email = profile?.email || authUser?.email || "";
  const avatarUrl = profile?.avatar_url || "";
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
    plan === "admin"
      ? "Admin"
      : PLAN_LABELS[plan] || "Free";

  const dirty =
    form.full_name !== initialForm.full_name ||
    form.display_name !== initialForm.display_name ||
    form.phone !== initialForm.phone;

  const onChange = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (success) setSuccess("");
  };

  const handleSave = async () => {
    try {
      if (!authUser?.id) return;

      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        id: authUser.id,
        full_name: form.full_name.trim(),
        display_name: form.display_name.trim(),
        phone: form.phone.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (updateError) throw updateError;

      const mergedProfile = {
        ...(profile || {}),
        ...payload,
      };

      setProfile(mergedProfile);
      setInitialForm({
        full_name: form.full_name,
        display_name: form.display_name,
        phone: form.phone,
      });
      setSuccess("Profile updated successfully.");
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError("Unable to save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-md px-4 pb-32 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-icon"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-xs tracking-[0.3em] text-emerald-300/70">
              CONTROL CENTER
            </p>
            <h1 className="text-lg font-bold">Edit Profile</h1>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`save-chip ${
              !dirty || saving
                ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                : "border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
            }`}
          >
            <Save size={15} />
          </button>
        </div>

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        {dirty && !success ? (
          <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            You have unsaved changes.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[28px] border border-emerald-400/10 bg-[#04111f]">
          <div className="bg-gradient-to-r from-[#0b3b2e] via-[#0f8f5a] to-[#0ea5e9] px-6 py-6">
            <div className="flex gap-4">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="avatar object-cover"
                  />
                ) : (
                  <div className="avatar">
                    {getInitials(form.full_name || form.display_name, email)}
                  </div>
                )}

                <button
                  type="button"
                  className="camera-badge"
                  onClick={() =>
                    alert("Avatar upload can be added next once your storage flow is ready.")
                  }
                >
                  <Camera size={14} />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-bold">
                  {form.display_name?.trim() ||
                    form.full_name?.trim() ||
                    email.split("@")[0] ||
                    "User"}
                </h2>
                <p className="truncate text-sm text-white/75">{email}</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`badge ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>
                    {roleLabel}
                  </span>
                  <span className={`badge ${PLAN_BADGE_STYLES[plan] || PLAN_BADGE_STYLES.free}`}>
                    {planLabel} Plan
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4">
            <div className="info-card">
              <Mail size={16} />
              <span className="truncate">{email || "No email available"}</span>
            </div>

            <div className="info-card">
              <CalendarDays size={16} />
              <span>Joined {formatDate(joinedAt)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="section-title">Personal Information</p>
            <div className="mt-3 space-y-3">
              <Field
                icon={User}
                label="Full Name"
                hint="Your real name shown on your account"
              >
                <input
                  type="text"
                  value={form.full_name}
                  onChange={onChange("full_name")}
                  placeholder="Enter your full name"
                  className="input"
                />
              </Field>

              <Field
                icon={User}
                label="Display Name"
                hint="Optional name shown more casually in the app"
              >
                <input
                  type="text"
                  value={form.display_name}
                  onChange={onChange("display_name")}
                  placeholder="Enter your display name"
                  className="input"
                />
              </Field>

              <Field
                icon={Phone}
                label="Phone Number"
                hint="Optional contact number"
              >
                <input
                  type="tel"
                  value={form.phone}
                  onChange={onChange("phone")}
                  placeholder="e.g. 09123456789"
                  className="input"
                />
              </Field>

              <Field
                icon={Mail}
                label="Email Address"
                hint="Managed by your login account"
              >
                <input
                  type="email"
                  value={email}
                  disabled
                  className="input input-disabled"
                />
              </Field>
            </div>
          </div>

          <div>
            <p className="section-title">Account Identity</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="identity-card">
                <div className="identity-label">
                  <Shield size={16} />
                  <span>Role</span>
                </div>
                <span className={`badge ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>
                  {roleLabel}
                </span>
              </div>

              <div className="identity-card">
                <div className="identity-label">
                  <CreditCard size={16} />
                  <span>Current Plan</span>
                </div>
                <span className={`badge ${PLAN_BADGE_STYLES[plan] || PLAN_BADGE_STYLES.free}`}>
                  {planLabel} Plan
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky-save-wrap">
        <div className="mx-auto max-w-md px-4 pb-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`save-button ${
              !dirty || saving
                ? "cursor-not-allowed opacity-60"
                : "hover:brightness-110 active:scale-[0.99]"
            }`}
          >
            <Save size={18} />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      <style>{`
        .btn-icon {
          height: 44px;
          width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .save-chip {
          height: 44px;
          width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          border: 1px solid;
          transition: 0.2s ease;
        }

        .avatar {
          height: 84px;
          width: 84px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.12);
          font-size: 26px;
          font-weight: 700;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .camera-badge {
          position: absolute;
          right: -4px;
          bottom: -4px;
          height: 32px;
          width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          color: white;
          border: 3px solid #04111f;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid;
          white-space: nowrap;
        }

        .info-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          min-width: 0;
        }

        .section-title {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(110, 231, 183, 0.75);
          padding-left: 2px;
        }

        .input {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 8, 23, 0.65);
          color: white;
          padding: 14px 15px;
          outline: none;
          transition: 0.2s ease;
        }

        .input::placeholder {
          color: rgba(148, 163, 184, 0.7);
        }

        .input:focus {
          border-color: rgba(16, 185, 129, 0.45);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }

        .input-disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .identity-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          padding: 16px;
        }

        .identity-label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          font-weight: 600;
        }

        .sticky-save-wrap {
          position: sticky;
          bottom: 0;
          z-index: 30;
          background: linear-gradient(to top, rgba(2, 8, 23, 0.98), rgba(2, 8, 23, 0.82), transparent);
          padding-top: 20px;
        }

        .save-button {
          width: 100%;
          height: 56px;
          border: none;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #0f8f5a, #06b6d4);
          box-shadow: 0 16px 40px rgba(6, 182, 212, 0.18);
          transition: 0.2s ease;
        }
      `}</style>
    </div>
  );
}
