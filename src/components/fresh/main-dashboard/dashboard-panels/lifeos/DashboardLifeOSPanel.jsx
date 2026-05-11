import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Flag,
  HeartHandshake,
  History,
  Home,
  LayoutDashboard,
  ListChecks,
  Lock,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const DEFAULT_LIFE_OS = {
  focus: "Build savings",
  currentPriority: "Emergency fund",
  upcomingEvent: "Monthly bills",
  expectedCost: "",
  targetDate: "",
  scheduleStyle: "Simple routine",
  pressureLevel: "Manageable",
};

const LIFE_OS_SECTIONS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "areas", label: "Life Areas", icon: ListChecks },
  { key: "profile", label: "Life Profile", icon: UserRound },
  { key: "history", label: "History", icon: History },
  { key: "insights", label: "Insights", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

const PROFILE_FIELDS = [
  {
    key: "focus",
    label: "Main life focus",
    helper: "What matters most right now.",
    icon: Target,
    options: ["Build savings", "Pay debt", "Stabilize finances", "Grow income", "Support family", "Improve routine"],
  },
  {
    key: "currentPriority",
    label: "Current priority",
    helper: "What CLARA should help you protect first.",
    icon: Flag,
    options: ["Emergency fund", "Monthly bills", "School expenses", "Family support", "Debt payments", "Savings goal"],
  },
  {
    key: "upcomingEvent",
    label: "Upcoming event",
    helper: "What is coming soon that may affect spending.",
    icon: Clock3,
    options: ["Monthly bills", "Upcoming travel", "School payment", "Big purchase", "Family event", "No major plans yet"],
  },
  {
    key: "expectedCost",
    label: "Expected cost",
    helper: "Optional amount for the upcoming event.",
    icon: WalletCards,
    input: "text",
    placeholder: "Example: ₱2,500",
  },
  {
    key: "targetDate",
    label: "Target date",
    helper: "Optional date or timing.",
    icon: CalendarDays,
    input: "text",
    placeholder: "Example: May 15 or this Friday",
  },
  {
    key: "scheduleStyle",
    label: "Lifestyle rhythm",
    helper: "How your week usually feels.",
    icon: Briefcase,
    options: ["Simple routine", "Busy schedule", "Always moving", "Unpredictable", "Work-heavy", "Family-focused"],
  },
  {
    key: "pressureLevel",
    label: "Current pressure",
    helper: "How heavy life feels right now.",
    icon: HeartHandshake,
    options: ["Manageable", "A little pressured", "Financially stressed", "Emotionally drained", "Trying to recover"],
  },
];

const LIFE_AREAS = [
  "Food & daily lifestyle",
  "Work & career",
  "Family responsibilities",
  "Debt & obligations",
  "Health & wellness",
  "Goals & future plans",
  "Emotional spending",
  "Social life",
];

const CALENDAR_ITEMS = [
  { title: "Bills / due dates", detail: "Protect money before due dates.", icon: CreditCard },
  { title: "Paydays", detail: "Plan before income arrives.", icon: WalletCards },
  { title: "Planned purchases", detail: "Mark big buys before they happen.", icon: Target },
  { title: "Important events", detail: "Appointments, trips, and family plans.", icon: CalendarDays },
];

function getStorageKey(user) {
  return `clara_life_os_v2_${user?.id || user?.email || "guest"}`;
}

function readLifeOS(user) {
  if (typeof window === "undefined") return DEFAULT_LIFE_OS;

  try {
    const latest = window.localStorage.getItem(getStorageKey(user));
    const legacy = window.localStorage.getItem(`clara_life_os_${user?.id || user?.email || "guest"}`);
    const raw = latest || legacy;

    return raw ? { ...DEFAULT_LIFE_OS, ...JSON.parse(raw) } : DEFAULT_LIFE_OS;
  } catch {
    return DEFAULT_LIFE_OS;
  }
}

function saveLifeOS(user, profile) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getStorageKey(user), JSON.stringify(profile));
  } catch {
    // Optional local save.
  }
}

function ChoiceButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-[12px] font-bold transition active:scale-[0.98] ${
        active
          ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-50"
          : "border-white/12 bg-white/[0.045] text-white/58 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

function SectionChip({ section, active, onClick }) {
  const Icon = section.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black transition active:scale-[0.98] ${
        active
          ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-50 shadow-[0_0_20px_rgba(110,231,183,0.08)]"
          : "border-white/12 bg-white/[0.04] text-white/55 hover:bg-white/[0.065]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {section.label}
    </button>
  );
}

function InfoCard({ icon: Icon, title, value, description, onClick }) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="w-full rounded-[22px] border border-white/12 bg-white/[0.035] p-4 text-left transition hover:bg-white/[0.055] active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.055] text-white/58">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{title}</p>
          {value ? <p className="mt-1 truncate text-xs font-bold text-emerald-100/68">{value}</p> : null}
          {description ? <p className="mt-1 text-xs leading-5 text-white/45">{description}</p> : null}
        </div>
        {onClick ? <ChevronRight className="h-4 w-4 shrink-0 text-white/25" /> : null}
      </div>
    </Tag>
  );
}

function InlineEditor({ field, value, onChange, onClose }) {
  if (!field) return null;

  return (
    <div className="mt-2 rounded-[20px] border border-emerald-300/16 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{field.label}</p>
          <p className="mt-1 text-xs text-white/45">{field.helper}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/55"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {field.input ? (
        <input
          value={value || ""}
          onChange={(event) => onChange(field.key, event.target.value)}
          type="text"
          placeholder={field.placeholder || "Type your answer"}
          className="mt-4 w-full rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-emerald-300/35"
        />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {field.options.map((option) => (
              <ChoiceButton
                key={option}
                active={value === option}
                onClick={() => onChange(field.key, option)}
              >
                {option}
              </ChoiceButton>
            ))}
          </div>

          <input
            value={field.options.includes(value) ? "" : value || ""}
            onChange={(event) => onChange(field.key, event.target.value)}
            type="text"
            placeholder="Or type your own answer"
            className="mt-3 w-full rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-emerald-300/35"
          />
        </>
      )}

      <p className="mt-4 text-[11px] font-semibold text-white/40">Saved for your LifeOS setup.</p>
    </div>
  );
}

function LifeOSRow({ field, value, active, onClick, onChange, onClose }) {
  const Icon = field.icon;

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={`group w-full rounded-[22px] border px-4 py-3.5 text-left transition active:scale-[0.99] ${
          active
            ? "border-emerald-300/25 bg-emerald-300/[0.075]"
            : "border-white/12 bg-white/[0.035] hover:bg-white/[0.055]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
              active
                ? "border-emerald-300/25 bg-emerald-300/12 text-emerald-100"
                : "border-white/12 bg-white/[0.055] text-white/58"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{field.label}</p>
            <p className="mt-1 truncate text-xs font-semibold text-emerald-100/68">{value || "Not set"}</p>
          </div>

          <ChevronRight
            className={`h-4 w-4 shrink-0 transition ${
              active ? "rotate-90 text-emerald-100/70" : "text-white/25 group-hover:text-white/50"
            }`}
          />
        </div>
      </button>

      {active ? <InlineEditor field={field} value={value} onChange={onChange} onClose={onClose} /> : null}
    </div>
  );
}

function DashboardSection({ profile, setActiveSection }) {
  return (
    <div className="space-y-3">
      <InfoCard
        icon={Target}
        title="Today’s life focus"
        value={profile.focus}
        description="This is the main direction CLARA should consider before giving money advice."
        onClick={() => setActiveSection("profile")}
      />
      <InfoCard
        icon={ShieldCheck}
        title="Protect first"
        value={profile.currentPriority}
        description="Money decisions should not quietly hurt this priority."
        onClick={() => setActiveSection("profile")}
      />
      <InfoCard
        icon={Bell}
        title="Timing awareness"
        value={profile.upcomingEvent}
        description={profile.expectedCost || profile.targetDate ? `${profile.expectedCost || "Cost not set"} • ${profile.targetDate || "Date not set"}` : "Add an expected cost or date in Life Profile."}
        onClick={() => setActiveSection("calendar")}
      />
      <InfoCard
        icon={Sparkles}
        title="CLARA insight"
        description="LifeOS connects your timing, pressure, and responsibilities to spending decisions."
      />
    </div>
  );
}

function CalendarSection({ profile, setActiveSection }) {
  return (
    <div className="space-y-3">
      <section className="rounded-[24px] border border-white/12 bg-white/[0.035] p-4">
        <p className="text-sm font-black text-white">Calendar</p>
        <p className="mt-1 text-xs leading-5 text-white/45">Your timing shapes your money decisions.</p>
        <div className="mt-4 rounded-[22px] border border-emerald-300/16 bg-emerald-300/[0.055] p-3">
          <p className="text-xs font-black text-emerald-50">Upcoming focus</p>
          <p className="mt-1 text-sm font-black text-white">{profile.upcomingEvent}</p>
          <p className="mt-1 text-xs text-white/50">{profile.expectedCost || "Expected cost not set"} • {profile.targetDate || "Date not set"}</p>
        </div>
      </section>
      {CALENDAR_ITEMS.map((item) => (
        <InfoCard key={item.title} icon={item.icon} title={item.title} description={item.detail} />
      ))}
      <button
        type="button"
        onClick={() => setActiveSection("profile")}
        className="w-full rounded-[22px] border border-emerald-300/18 bg-emerald-300/[0.065] px-4 py-3 text-sm font-black text-emerald-50"
      >
        Add timing details in Life Profile
      </button>
    </div>
  );
}

function AreasSection() {
  return (
    <div className="space-y-3">
      <section className="rounded-[24px] border border-white/12 bg-white/[0.035] p-4">
        <p className="text-sm font-black text-white">Life Areas</p>
        <p className="mt-1 text-xs leading-5 text-white/45">Choose the part of life that affected your money decisions today.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LIFE_AREAS.map((area) => (
            <span key={area} className="rounded-full border border-white/12 bg-white/[0.045] px-3 py-2 text-[12px] font-bold text-white/58">
              {area}
            </span>
          ))}
        </div>
      </section>
      <InfoCard icon={ListChecks} title="Guided check-in" description="Later, this will ask what happened, how it affected spending, and whether CLARA should remember it." />
    </div>
  );
}

function ProfileSection({ profile, activeKey, setActiveKey, updateProfile }) {
  return (
    <div className="space-y-2.5">
      {PROFILE_FIELDS.map((field) => (
        <LifeOSRow
          key={field.key}
          field={field}
          value={profile[field.key]}
          active={activeKey === field.key}
          onClick={() => setActiveKey((current) => (current === field.key ? null : field.key))}
          onChange={updateProfile}
          onClose={() => setActiveKey(null)}
        />
      ))}
    </div>
  );
}

function HistorySection() {
  const items = [
    "Past Ask CLARA decisions",
    "Saved reflections",
    "Repeated spending triggers",
    "Regret / confirmed outcomes",
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <InfoCard key={item} icon={History} title={item} description="History will appear here as CLARA learns from decisions over time." />
      ))}
    </div>
  );
}

function InsightsSection({ profile }) {
  return (
    <div className="space-y-3">
      <InfoCard icon={BarChart3} title="Current signal" value={profile.pressureLevel} description="Life pressure can change how risky a purchase feels." />
      <InfoCard icon={Target} title="Priority signal" value={profile.currentPriority} description="CLARA will use this as the priority to protect first." />
      <InfoCard icon={Sparkles} title="Future insight layer" description="Later, this will show patterns, risks, and what to protect next week." />
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="space-y-3">
      <InfoCard icon={Lock} title="Memory control" description="Choose what LifeOS can remember and use for future advice." />
      <InfoCard icon={Bell} title="Check-in reminders" description="Control how often CLARA asks about life context." />
      <InfoCard icon={Settings} title="LifeOS preferences" description="Manage calendar visibility, privacy mode, and future LifeOS options." />
    </div>
  );
}

function SectionContent({ activeSection, profile, activeKey, setActiveKey, updateProfile, setActiveSection }) {
  if (activeSection === "calendar") return <CalendarSection profile={profile} setActiveSection={setActiveSection} />;
  if (activeSection === "areas") return <AreasSection />;
  if (activeSection === "profile") {
    return <ProfileSection profile={profile} activeKey={activeKey} setActiveKey={setActiveKey} updateProfile={updateProfile} />;
  }
  if (activeSection === "history") return <HistorySection />;
  if (activeSection === "insights") return <InsightsSection profile={profile} />;
  if (activeSection === "settings") return <SettingsSection />;

  return <DashboardSection profile={profile} setActiveSection={setActiveSection} />;
}

export default function DashboardLifeOSPanel() {
  const { user } = useUserRole() || {};

  const [activeSection, setActiveSection] = useState("dashboard");
  const [activeKey, setActiveKey] = useState(null);
  const [profile, setProfile] = useState(() => readLifeOS(user));

  useEffect(() => {
    setProfile(readLifeOS(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    saveLifeOS(user, profile);
  }, [profile, user]);

  const currentSection = useMemo(
    () => LIFE_OS_SECTIONS.find((section) => section.key === activeSection) || LIFE_OS_SECTIONS[0],
    [activeSection]
  );

  const updateProfile = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-white/12 bg-[linear-gradient(135deg,rgba(13,65,78,0.72),rgba(16,24,55,0.86)_48%,rgba(55,24,100,0.78))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-white/16 bg-white/10 text-white">
            <currentSection.icon className="h-7 w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-white">LifeOS</p>
            <p className="mt-1 text-xs text-white/52">{currentSection.label}</p>
            <p className="mt-1 truncate text-[11px] font-bold text-emerald-100/58">
              {profile.focus} • {profile.currentPriority}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/10 px-4 py-3">
          <p className="text-sm font-black text-white">Your life context for money decisions.</p>
          <p className="mt-1 text-xs leading-5 text-white/52">
            Calendar, life areas, profile, memory, and insights will live here.
          </p>
        </div>
      </section>

      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 pb-1">
          {LIFE_OS_SECTIONS.map((section) => (
            <SectionChip
              key={section.key}
              section={section}
              active={activeSection === section.key}
              onClick={() => {
                setActiveSection(section.key);
                setActiveKey(null);
              }}
            />
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            {currentSection.label}
          </p>
          <p className="mt-1 text-xs text-white/42">
            Phase 1 structure. Details will become smarter over time.
          </p>
        </div>

        <SectionContent
          activeSection={activeSection}
          profile={profile}
          activeKey={activeKey}
          setActiveKey={setActiveKey}
          updateProfile={updateProfile}
          setActiveSection={setActiveSection}
        />
      </section>
    </div>
  );
}
