import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Baby,
  Brain,
  Briefcase,
  CalendarDays,
  Camera,
  CheckCircle2,
  CreditCard,
  Mail,
  Phone,
  Save,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { PLAN_BADGE_STYLES, PLAN_LABELS, normalizePlanKey } from "@/lib/plan-config";

const ROLE_STYLES = {
  admin: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  student: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  free_user: "bg-white/10 text-slate-200 border-white/10",
  user: "bg-white/10 text-slate-200 border-white/10",
};

const LIFE_STAGE_OPTIONS = [
  {
    value: "young_earner",
    label: "Young Earner",
    headline: "Income is growing, habits are still forming.",
    trend:
      "People in this season often feel the pressure of payday spending, lifestyle upgrades, food delivery, transportation, and delayed emergency fund building.",
    struggles: ["Payday lifestyle inflation", "Convenience spending", "Weak emergency buffer"],
    watch: ["Unplanned spending after payday", "Small repeated purchases", "Savings skipped too often"],
    recommendation:
      "CLARA will prioritize simple budgeting, emergency starter funds, and gentle spending brakes before payday habits become permanent.",
  },
  {
    value: "working_student",
    label: "Working Student",
    headline: "Time, school, and income are competing at the same time.",
    trend:
      "Working students commonly juggle school costs, transportation, food, projects, and unstable part-time income while still trying to stay socially connected.",
    struggles: ["Irregular income", "School-related expenses", "Food and commute pressure"],
    watch: ["Academic month spending spikes", "Part-time income gaps", "Stress spending after deadlines"],
    recommendation:
      "CLARA will focus on cash-flow stability, school expense protection, and realistic savings instead of aggressive targets.",
  },
  {
    value: "single_parent",
    label: "Single Parent",
    headline: "Protection and stability matter more than perfection.",
    trend:
      "Single parents often carry household pressure, child-related expenses, emergency risk, and guilt-based spending while trying to keep life stable.",
    struggles: ["Childcare and school costs", "Emergency vulnerability", "Guilt-based spending"],
    watch: ["Child-related surprise expenses", "Emergency fund weakness", "Overspending to compensate emotionally"],
    recommendation:
      "CLARA will prioritize protection-focused budgeting, emergency readiness, and compassionate spending boundaries.",
  },
  {
    value: "living_with_partner",
    label: "Living With Partner",
    headline: "Shared life needs shared money clarity.",
    trend:
      "People living with a partner often face shared bills, unclear money roles, silent expectations, and conflict around priorities.",
    struggles: ["Unclear bill sharing", "Different spending habits", "Hidden financial pressure"],
    watch: ["Shared expense imbalance", "Unspoken expectations", "Lifestyle drift"],
    recommendation:
      "CLARA will help clarify shared responsibilities, protect individual budgets, and make money conversations easier.",
  },
  {
    value: "breadwinner",
    label: "Breadwinner",
    headline: "Generosity needs a system so it does not become survival pressure.",
    trend:
      "Breadwinners commonly experience family support requests, guilt, emergency dependency, and difficulty separating personal goals from household obligations.",
    struggles: ["Family support pressure", "Difficulty saying no", "Personal savings delay"],
    watch: ["Repeated support requests", "No personal safety fund", "Emotional yes decisions"],
    recommendation:
      "CLARA will focus on boundaries, protected personal savings, and planned family support instead of reactive giving.",
  },
  {
    value: "freelancer",
    label: "Freelancer / Irregular Income",
    headline: "Irregular income needs a calmer operating system.",
    trend:
      "Freelancers and irregular earners often overspend during strong months and feel pressure during low-income gaps.",
    struggles: ["Income unpredictability", "Weak monthly baseline", "Overspending after big payments"],
    watch: ["High-income month splurge", "Low-income month bills", "No tax or buffer planning"],
    recommendation:
      "CLARA will focus on baseline budgeting, income smoothing, emergency reserves, and safer spending decisions during strong months.",
  },
  {
    value: "career_transition",
    label: "Career Transition / Unemployed",
    headline: "The goal is to stretch stability while rebuilding income.",
    trend:
      "People in transition often face uncertainty, reduced spending confidence, and pressure to preserve cash while looking for the next opportunity.",
    struggles: ["Uncertain income", "Survival budgeting", "Confidence pressure"],
    watch: ["Fixed bills", "Emergency fund burn rate", "Avoidable spending leaks"],
    recommendation:
      "CLARA will prioritize survival runway, expense trimming, and low-pressure planning until income becomes stable again.",
  },
  {
    value: "business_owner",
    label: "Business Owner",
    headline: "Personal money and business money need clear separation.",
    trend:
      "Small business owners often mix personal and business cash, underestimate irregular costs, and struggle with reinvestment decisions.",
    struggles: ["Mixed cash flow", "Reinvestment pressure", "Irregular operating costs"],
    watch: ["Personal-business wallet mixing", "Inventory or operating spikes", "Owner pay inconsistency"],
    recommendation:
      "CLARA will help separate wallets, protect owner pay, and make spending decisions based on cash-flow reality.",
  },
];

const RELATIONSHIP_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "in_relationship", label: "In a relationship" },
  { value: "living_with_partner", label: "Living with partner" },
  { value: "married", label: "Married" },
  { value: "separated", label: "Separated" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "full_time", label: "Full-time employed" },
  { value: "part_time", label: "Part-time employed" },
  { value: "student", label: "Student" },
  { value: "working_student", label: "Working student" },
  { value: "freelance", label: "Freelance / contract" },
  { value: "business_owner", label: "Business owner" },
  { value: "unemployed", label: "Currently unemployed" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const CHILDREN_OPTIONS = [
  { value: "0", label: "No children" },
  { value: "1", label: "1 child" },
  { value: "2", label: "2 children" },
  { value: "3_plus", label: "3+ children" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const FINANCIAL_GOALS = [
  { value: "emergency_fund", label: "Emergency fund" },
  { value: "reduce_spending", label: "Reduce spending" },
  { value: "debt_control", label: "Debt control" },
  { value: "support_family", label: "Support family" },
  { value: "budget_discipline", label: "Budget discipline" },
  { value: "save_for_goal", label: "Save for a goal" },
  { value: "control_emotional_spending", label: "Control emotional spending" },
];

const DEFAULT_LIFE_SETUP = {
  life_stage: "young_earner",
  relationship_status: "single",
  children_count: "0",
  employment_status: "full_time",
  goals: ["emergency_fund", "budget_discipline"],
  current_note: "",
};

const LIFE_SETUP_STORAGE_PREFIX = "clara_me_life_setup";

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

function getOptionLabel(options, value, fallback = "Not set") {
  return options.find((option) => option.value === value)?.label || fallback;
}

function parseObject(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getLocalLifeSetup(userId) {
  if (typeof window === "undefined" || !userId) return {};
  try {
    return parseObject(window.localStorage.getItem(`${LIFE_SETUP_STORAGE_PREFIX}:${userId}`));
  } catch {
    return {};
  }
}

function saveLocalLifeSetup(userId, lifeSetup) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(`${LIFE_SETUP_STORAGE_PREFIX}:${userId}`, JSON.stringify(lifeSetup));
  } catch {
    // Non-critical fallback only.
  }
}

function getProfileLifeSetup(profile) {
  return parseObject(
    profile?.clara_life_setup ||
      profile?.life_setup ||
      profile?.life_profile ||
      profile?.financial_environment
  );
}

function buildLifeSetup(form) {
  return {
    life_stage: form.life_stage,
    relationship_status: form.relationship_status,
    children_count: form.children_count,
    employment_status: form.employment_status,
    goals: Array.isArray(form.goals) ? form.goals : [],
    current_note: form.current_note?.trim() || "",
  };
}

function buildLifeSignal(form) {
  const stage = LIFE_STAGE_OPTIONS.find((option) => option.value === form.life_stage) || LIFE_STAGE_OPTIONS[0];
  const relationship = getOptionLabel(RELATIONSHIP_OPTIONS, form.relationship_status);
  const children = getOptionLabel(CHILDREN_OPTIONS, form.children_count);
  const employment = getOptionLabel(EMPLOYMENT_OPTIONS, form.employment_status);
  const selectedGoals = FINANCIAL_GOALS.filter((goal) => form.goals?.includes(goal.value));
  const primaryGoal = selectedGoals[0]?.label || "Financial stability";

  const childSignal =
    form.children_count === "1" || form.children_count === "2" || form.children_count === "3_plus"
      ? "child-related surprise costs"
      : null;

  const relationshipSignal =
    form.relationship_status === "living_with_partner" || form.relationship_status === "married"
      ? "shared financial decisions"
      : null;

  const employmentSignal =
    form.employment_status === "freelance" || form.employment_status === "unemployed"
      ? "cash-flow uncertainty"
      : null;

  const adaptiveSignals = [childSignal, relationshipSignal, employmentSignal].filter(Boolean);

  return {
    stage,
    relationship,
    children,
    employment,
    primaryGoal,
    selectedGoals,
    adaptiveSignals,
    pressureSignals: [...stage.struggles, ...adaptiveSignals].slice(0, 5),
    watchList: [...stage.watch, `${primaryGoal} consistency`].slice(0, 5),
  };
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />
          <p className="mt-3 text-sm text-slate-400">Loading Me...</p>
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

function SelectField({ icon: Icon, label, hint, value, onChange, options }) {
  return (
    <Field icon={Icon} label={label} hint={hint}>
      <select value={value} onChange={onChange} className="input select-input">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SignalList({ title, items }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/70">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-slate-200">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalToggle({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`goal-chip ${active ? "goal-chip-active" : "goal-chip-idle"}`}
    >
      {label}
    </button>
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
    ...DEFAULT_LIFE_SETUP,
  });

  const [initialForm, setInitialForm] = useState({
    full_name: "",
    display_name: "",
    phone: "",
    ...DEFAULT_LIFE_SETUP,
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

        const lifeSetup = {
          ...DEFAULT_LIFE_SETUP,
          ...getLocalLifeSetup(user.id),
          ...getProfileLifeSetup(safeProfile),
        };

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
          ...lifeSetup,
          goals: Array.isArray(lifeSetup.goals) ? lifeSetup.goals : DEFAULT_LIFE_SETUP.goals,
        };

        setForm(nextForm);
        setInitialForm(nextForm);
      } catch (err) {
        console.error("Failed to load account:", err);
        if (mounted) setError("Failed to load Me details.");
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
  const lifeSignal = useMemo(() => buildLifeSignal(form), [form]);

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

  const planLabel = plan === "admin" ? "Admin" : PLAN_LABELS[plan] || "Free";

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const onChange = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (success) setSuccess("");
  };

  const toggleGoal = (goalValue) => {
    setForm((prev) => {
      const nextGoals = new Set(prev.goals || []);
      if (nextGoals.has(goalValue)) {
        nextGoals.delete(goalValue);
      } else {
        nextGoals.add(goalValue);
      }
      return { ...prev, goals: Array.from(nextGoals) };
    });
    if (success) setSuccess("");
  };

  const handleSave = async () => {
    try {
      if (!authUser?.id) return;

      setSaving(true);
      setError("");
      setSuccess("");

      const lifeSetup = buildLifeSetup(form);
      const accountPayload = {
        id: authUser.id,
        full_name: form.full_name.trim(),
        display_name: form.display_name.trim(),
        phone: form.phone.trim(),
        updated_at: new Date().toISOString(),
      };

      const fullPayload = {
        ...accountPayload,
        clara_life_setup: lifeSetup,
      };

      let profileStorageUsed = true;
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(fullPayload, { onConflict: "id" });

      if (updateError) {
        profileStorageUsed = false;
        console.warn("CLARA life setup profile column unavailable. Saving account fields only.", updateError);
        const { error: accountOnlyError } = await supabase
          .from("profiles")
          .upsert(accountPayload, { onConflict: "id" });

        if (accountOnlyError) throw accountOnlyError;
      }

      saveLocalLifeSetup(authUser.id, lifeSetup);

      const mergedProfile = {
        ...(profile || {}),
        ...accountPayload,
        clara_life_setup: lifeSetup,
      };

      setProfile(mergedProfile);
      setInitialForm({ ...form, ...lifeSetup });
      setSuccess(
        profileStorageUsed
          ? "Me page updated successfully."
          : "Me page updated. Life setup is saved on this device for now."
      );
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
          <button type="button" onClick={() => navigate(-1)} className="btn-icon">
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-xs tracking-[0.3em] text-emerald-300/70">CLARA PROFILE</p>
            <h1 className="text-lg font-bold">Me</h1>
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

        <section className="climate-screen">
          <div className="climate-glow climate-glow-one" />
          <div className="climate-glow climate-glow-two" />

          <div className="relative z-10">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                  <Activity size={12} />
                  Live climate preview
                </div>
                <h2 className="text-2xl font-black leading-tight text-white">
                  {lifeSignal.stage.label} Financial Climate
                </h2>
              </div>
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
                <Brain size={20} />
              </div>
            </div>

            <p className="text-sm font-semibold text-emerald-50">{lifeSignal.stage.headline}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{lifeSignal.stage.trend}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniMetric label="Stage" value={lifeSignal.stage.label} />
              <MiniMetric label="Children" value={lifeSignal.children} />
              <MiniMetric label="Work" value={lifeSignal.employment} />
            </div>

            <div className="mt-4 rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.08] p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-100">
                <TrendingUp size={16} />
                <p className="text-sm font-bold">CLARA trend reading</p>
              </div>
              <p className="text-sm leading-6 text-slate-200">
                Based on your selected setup, CLARA should prioritize <span className="font-semibold text-white">{lifeSignal.primaryGoal}</span>, watch your spending environment, and compare your behavior against common pressure patterns for people in a similar season.
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              <SignalList title="Common pressure signals" items={lifeSignal.pressureSignals} />
              <SignalList title="CLARA should watch" items={lifeSignal.watchList} />
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-100">
                <Sparkles size={16} />
                <p className="text-sm font-bold">Recommended coaching mode</p>
              </div>
              <p className="text-sm leading-6 text-slate-300">{lifeSignal.stage.recommendation}</p>
            </div>
          </div>
        </section>

        <div className="mt-5 overflow-hidden rounded-[28px] border border-emerald-400/10 bg-[#04111f]">
          <div className="bg-gradient-to-r from-[#0b3b2e] via-[#0f8f5a] to-[#0ea5e9] px-6 py-6">
            <div className="flex gap-4">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="avatar object-cover" />
                ) : (
                  <div className="avatar">{getInitials(form.full_name || form.display_name, email)}</div>
                )}

                <button
                  type="button"
                  className="camera-badge"
                  onClick={() => alert("Avatar upload can be added next once your storage flow is ready.")}
                >
                  <Camera size={14} />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-bold">
                  {form.display_name?.trim() || form.full_name?.trim() || email.split("@")[0] || "User"}
                </h2>
                <p className="truncate text-sm text-white/75">{email}</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`badge ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>{roleLabel}</span>
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
            <p className="section-title">Life Season Setup</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This is the primary information CLARA uses to understand your financial environment without forcing you to answer a long form.
            </p>

            <div className="mt-3 space-y-3">
              <SelectField
                icon={Activity}
                label="Current Life Season"
                hint="Choose the setup closest to your current reality"
                value={form.life_stage}
                onChange={onChange("life_stage")}
                options={LIFE_STAGE_OPTIONS.map(({ value, label }) => ({ value, label }))}
              />

              <SelectField
                icon={Users}
                label="Relationship Setup"
                hint="Helps CLARA understand shared or solo money pressure"
                value={form.relationship_status}
                onChange={onChange("relationship_status")}
                options={RELATIONSHIP_OPTIONS}
              />

              <SelectField
                icon={Baby}
                label="Children"
                hint="Used only to adjust household and emergency planning"
                value={form.children_count}
                onChange={onChange("children_count")}
                options={CHILDREN_OPTIONS}
              />

              <SelectField
                icon={Briefcase}
                label="Employment Status"
                hint="This helps CLARA read cash-flow stability"
                value={form.employment_status}
                onChange={onChange("employment_status")}
                options={EMPLOYMENT_OPTIONS}
              />
            </div>
          </div>

          <div>
            <p className="section-title">Current Financial Priorities</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Target size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">What should CLARA focus on?</p>
                  <p className="text-xs text-slate-400">Select one or more priorities.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {FINANCIAL_GOALS.map((goal) => (
                  <GoalToggle
                    key={goal.value}
                    active={form.goals?.includes(goal.value)}
                    label={goal.label}
                    onClick={() => toggleGoal(goal.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="section-title">Basic Account Info</p>
            <div className="mt-3 space-y-3">
              <Field icon={User} label="Full Name" hint="Your real name shown on your account">
                <input
                  type="text"
                  value={form.full_name}
                  onChange={onChange("full_name")}
                  placeholder="Enter your full name"
                  className="input"
                />
              </Field>

              <Field icon={User} label="Display Name" hint="The name CLARA can call you inside the app">
                <input
                  type="text"
                  value={form.display_name}
                  onChange={onChange("display_name")}
                  placeholder="Enter your display name"
                  className="input"
                />
              </Field>

              <Field icon={Phone} label="Phone Number" hint="Optional contact number">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={onChange("phone")}
                  placeholder="e.g. 09123456789"
                  className="input"
                />
              </Field>

              <Field icon={Mail} label="Email Address" hint="Managed by your login account">
                <input type="email" value={email} disabled className="input input-disabled" />
              </Field>
            </div>
          </div>

          <div>
            <p className="section-title">CLARA Notes</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Brain size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Anything CLARA should understand right now?</p>
                  <p className="text-xs text-slate-400">Optional. Keep it short and practical.</p>
                </div>
              </div>
              <textarea
                value={form.current_note}
                onChange={onChange("current_note")}
                rows={4}
                placeholder="Example: I am trying to stop random food spending after work."
                className="input min-h-[112px] resize-none"
              />
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
                <span className={`badge ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>{roleLabel}</span>
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
              !dirty || saving ? "cursor-not-allowed opacity-60" : "hover:brightness-110 active:scale-[0.99]"
            }`}
          >
            <Save size={18} />
            <span>{saving ? "Saving..." : "Save Me Setup"}</span>
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

        .climate-screen {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          border: 1px solid rgba(110, 231, 183, 0.16);
          background:
            radial-gradient(circle at top left, rgba(16, 185, 129, 0.2), transparent 32%),
            radial-gradient(circle at bottom right, rgba(6, 182, 212, 0.18), transparent 32%),
            linear-gradient(145deg, rgba(4, 17, 31, 0.96), rgba(2, 8, 23, 0.98));
          padding: 22px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
        }

        .climate-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(8px);
          opacity: 0.72;
          pointer-events: none;
        }

        .climate-glow-one {
          top: -80px;
          right: -80px;
          height: 170px;
          width: 170px;
          background: rgba(45, 212, 191, 0.18);
        }

        .climate-glow-two {
          bottom: -70px;
          left: -70px;
          height: 150px;
          width: 150px;
          background: rgba(16, 185, 129, 0.16);
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

        .select-input {
          appearance: none;
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

        .goal-chip {
          border-radius: 999px;
          border: 1px solid;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 700;
          transition: 0.2s ease;
        }

        .goal-chip-active {
          border-color: rgba(16, 185, 129, 0.42);
          background: rgba(16, 185, 129, 0.16);
          color: rgb(167, 243, 208);
          box-shadow: 0 10px 28px rgba(16, 185, 129, 0.12);
        }

        .goal-chip-idle {
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: rgb(203, 213, 225);
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
