import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, User, Mail, Phone } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function Settings() {
  const navigate = useNavigate();
  const { section } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  const [initial, setInitial] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          navigate("/login");
          return;
        }

        if (!mounted) return;

        setUserId(user.id);
        setAuthUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const safeProfile = profileData || {};
        if (!mounted) return;

        setProfile(safeProfile);

        const nextForm = {
          full_name:
            safeProfile.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          phone:
            safeProfile.phone ||
            safeProfile.mobile_number ||
            safeProfile.contact_number ||
            "",
          email: safeProfile.email || user.email || "",
        };

        setForm(nextForm);
        setInitial(nextForm);
      } catch (e) {
        console.error("Settings load error:", e);
        if (mounted) setError("Failed to load account details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const role = useMemo(() => normalizeRole(profile), [profile]);
  const plan = useMemo(() => normalizePlan(profile, role), [profile, role]);

  const dirty =
    form.full_name !== initial.full_name ||
    form.phone !== initial.phone;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (message) setMessage("");
    if (error) setError("");
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        id: userId,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email,
        updated_at: new Date().toISOString(),
      };

      const { data, error: saveError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (saveError) throw saveError;

      const mergedProfile = {
        ...(profile || {}),
        ...(data || payload),
      };

      setProfile(mergedProfile);

      const nextInitial = {
        full_name: mergedProfile.full_name || "",
        phone:
          mergedProfile.phone ||
          mergedProfile.mobile_number ||
          mergedProfile.contact_number ||
          "",
        email: mergedProfile.email || authUser?.email || "",
      };

      setForm(nextInitial);
      setInitial(nextInitial);
      setMessage("Profile updated successfully.");
    } catch (e) {
      console.error("Save error:", e);
      setError(
        e?.message?.includes("row-level security")
          ? "Save blocked by Supabase policy. Your profiles table needs an UPDATE policy."
          : "Failed to save changes."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020817] text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white px-4 pt-4 pb-32">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="btn">
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-bold text-lg">
          {section === "account" ? "Edit Profile" : section || "Settings"}
        </h1>

        <button
          onClick={handleSave}
          disabled={!dirty || saving || section !== "account"}
          className={`saveBtn ${!dirty || saving || section !== "account" ? "saveBtnDisabled" : ""}`}
        >
          <Save size={16} />
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="profileCard">
        <h2 className="text-xl font-bold">
          {form.full_name || authUser?.email?.split("@")[0] || "User"}
        </h2>
        <p className="text-sm text-white/70">{form.email}</p>

        <div className="flex gap-2 mt-2 flex-wrap">
          <span className={`badge ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>
            {role === "admin"
              ? "Admin"
              : role === "student"
              ? "Student"
              : role === "free_user"
              ? "Free User"
              : "User"}
          </span>
          <span className={`badge ${PLAN_STYLES[plan] || PLAN_STYLES.free}`}>
            {plan === "admin"
              ? "Admin Plan"
              : plan === "transformation"
              ? "Transformation Plan"
              : plan === "elite"
              ? "Elite Plan"
              : plan === "basic"
              ? "Basic Plan"
              : "Free Plan"}
          </span>
        </div>
      </div>

      {section === "account" && (
        <div className="space-y-4 mt-5">
          <div className="field">
            <User size={16} className="icon" />
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              placeholder="Full Name"
            />
          </div>

          <div className="field">
            <Phone size={16} className="icon" />
            <input
              className="input"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="Phone Number (optional)"
            />
          </div>

          <div className="field">
            <Mail size={16} className="icon" />
            <input
              className="input opacity-60"
              value={form.email}
              readOnly
            />
          </div>

          {dirty ? (
            <p className="text-yellow-400 text-sm">You have unsaved changes</p>
          ) : null}
        </div>
      )}

      {section === "privacy" && (
        <div className="mt-5">
          <button
            className="dangerBtn"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      )}

      <div className="saveWrap">
        <button
          onClick={handleSave}
          disabled={!dirty || saving || section !== "account"}
          className={`saveMain ${!dirty || saving || section !== "account" ? "saveMainDisabled" : ""}`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <style>{`
        .btn {
          height: 44px;
          width: 44px;
          border-radius: 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .saveBtn {
          height: 44px;
          width: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg,#10b981,#06b6d4);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
        }

        .saveBtnDisabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .profileCard {
          padding: 20px;
          border-radius: 20px;
          background: linear-gradient(135deg,#0f8f5a,#06b6d4);
        }

        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid;
          white-space: nowrap;
        }

        .field {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .icon {
          color: rgba(255,255,255,0.75);
          flex-shrink: 0;
        }

        .input {
          flex: 1;
          background: transparent;
          outline: none;
          color: white;
          min-width: 0;
        }

        .input::placeholder {
          color: rgba(255,255,255,0.45);
        }

        .alert {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 14px;
        }

        .alert.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.22);
          color: #fca5a5;
        }

        .alert.success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.22);
          color: #86efac;
        }

        .dangerBtn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          background: rgba(255,0,0,0.1);
          border: 1px solid rgba(255,0,0,0.2);
          color: #ff6b6b;
        }

        .saveWrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 16px;
          background: linear-gradient(to top,#020817,transparent);
        }

        .saveMain {
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          background: linear-gradient(135deg,#10b981,#06b6d4);
          font-weight: bold;
          color: white;
          border: none;
        }

        .saveMainDisabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
