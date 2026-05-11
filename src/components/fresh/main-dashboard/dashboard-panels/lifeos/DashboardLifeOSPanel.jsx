import { useEffect, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock3,
  Flag,
  HeartHandshake,
  Home,
  Target,
  X,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const DEFAULT_LIFE_OS = {
  focus: "Build savings",
  currentPriority: "Emergency fund",
  scheduleStyle: "Simple routine",
  workMode: "Balanced work life",
  pressureLevel: "Manageable",
  upcomingFocus: "Monthly bills",
};

const LIFE_OS_FIELDS = [
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
    helper: "The most important thing CLARA should help you protect.",
    icon: Flag,
    options: ["Emergency fund", "Monthly bills", "School expenses", "Family support", "Debt payments", "Savings goal"],
  },
  {
    key: "scheduleStyle",
    label: "Lifestyle rhythm",
    helper: "How your weekly life usually feels.",
    icon: CalendarDays,
    options: ["Simple routine", "Busy schedule", "Always moving", "Unpredictable", "Work-heavy", "Family-focused"],
  },
  {
    key: "workMode",
    label: "Current workload",
    helper: "How your work or responsibilities feel lately.",
    icon: Briefcase,
    options: ["Balanced work life", "Heavy workload", "Recovering from stress", "Starting fresh", "Focused on growth"],
  },
  {
    key: "pressureLevel",
    label: "Current pressure",
    helper: "How pressured life currently feels.",
    icon: HeartHandshake,
    options: ["Manageable", "A little pressured", "Financially stressed", "Emotionally drained", "Trying to recover"],
  },
  {
    key: "upcomingFocus",
    label: "Upcoming focus",
    helper: "What is coming soon in your life.",
    icon: Clock3,
    options: ["Monthly bills", "Upcoming travel", "School payment", "Big purchase", "Family event", "No major plans yet"],
  },
];

function getStorageKey(user) {
  return `clara_life_os_${user?.id || user?.email || "guest"}`;
}

function readLifeOS(user) {
  if (typeof window === "undefined") return DEFAULT_LIFE_OS;

  try {
    const raw = window.localStorage.getItem(getStorageKey(user));
    return raw
      ? {
          ...DEFAULT_LIFE_OS,
          ...JSON.parse(raw),
        }
      : DEFAULT_LIFE_OS;
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

      <p className="mt-4 text-[11px] font-semibold text-white/40">
        Saved for your LifeOS setup.
      </p>
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
            <Icon className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{field.label}</p>
            <p className="mt-1 truncate text-xs font-semibold text-emerald-100/68">
              {value || "Not set"}
            </p>
          </div>

          <ChevronRight
            className={`h-4 w-4 shrink-0 transition ${
              active ? "rotate-90 text-emerald-100/70" : "text-white/25 group-hover:text-white/50"
            }`}
          />
        </div>
      </button>

      {active ? (
        <InlineEditor
          field={field}
          value={value}
          onChange={onChange}
          onClose={onClose}
        />
      ) : null}
    </div>
  );
}

export default function DashboardLifeOSPanel() {
  const { user } = useUserRole() || {};

  const [activeKey, setActiveKey] = useState(null);
  const [profile, setProfile] = useState(() => readLifeOS(user));

  useEffect(() => {
    setProfile(readLifeOS(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    saveLifeOS(user, profile);
  }, [profile, user]);

  const updateProfile = (key, value) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-white/12 bg-[linear-gradient(135deg,rgba(13,65,78,0.72),rgba(16,24,55,0.86)_48%,rgba(55,24,100,0.78))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-white/16 bg-white/10 text-white">
            <Home className="h-7 w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-white">LifeOS</p>
            <p className="mt-1 text-xs text-white/52">
              Your routines, priorities, and upcoming life direction.
            </p>
            <p className="mt-1 truncate text-[11px] font-bold text-emerald-100/58">
              {profile.focus} • {profile.currentPriority}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/10 px-4 py-3">
          <p className="text-sm font-black text-white">Organize your current life direction.</p>
          <p className="mt-1 text-xs leading-5 text-white/52">
            LifeOS helps CLARA understand what is happening around your life right now.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            Life setup
          </p>

          <p className="mt-1 text-xs text-white/42">
            Tap any row to edit.
          </p>
        </div>

        <div className="space-y-2.5">
          {LIFE_OS_FIELDS.map((field) => (
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
      </section>
    </div>
  );
}
