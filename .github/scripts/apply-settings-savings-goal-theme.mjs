import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), "../..");
const settingsPath = resolve(
  repoRoot,
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
);
const workflowPath = resolve(
  repoRoot,
  ".github/workflows/apply-settings-savings-goal-theme.yml"
);

let source = readFileSync(settingsPath, "utf8");

const replaceExactlyOnce = (pattern, replacement, label) => {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`));

  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${matches?.length || 0}.`);
  }

  source = source.replace(pattern, () => replacement);
};

const premiumRowReplacement = String.raw`  const settingsToneStyles = {
    cyan: {
      icon: "border-cyan-300/18 bg-cyan-400/[0.08] text-cyan-100",
      iconFeatured:
        "border-cyan-200/28 bg-cyan-400/[0.14] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.14)]",
      badge: "border-cyan-300/16 bg-cyan-400/[0.07] text-cyan-100/72",
    },
    blue: {
      icon: "border-sky-300/16 bg-sky-400/[0.07] text-sky-100",
      iconFeatured:
        "border-sky-200/26 bg-sky-400/[0.13] text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.13)]",
      badge: "border-sky-300/15 bg-sky-400/[0.07] text-sky-100/70",
    },
    violet: {
      icon: "border-violet-300/18 bg-violet-400/[0.08] text-violet-100",
      iconFeatured:
        "border-violet-200/28 bg-violet-400/[0.14] text-violet-50 shadow-[0_0_24px_rgba(139,92,246,0.15)]",
      badge: "border-violet-300/18 bg-violet-400/[0.08] text-violet-100/76",
    },
  };

  const PremiumRow = ({
    icon: Icon,
    title,
    description,
    badge,
    featured,
    tone = "cyan",
    isLast = false,
    onClick,
  }) => {
    const palette = settingsToneStyles[tone] || settingsToneStyles.cyan;

    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex min-h-[74px] w-full items-center gap-3 px-4 py-3.5 text-left transition duration-200 hover:bg-white/[0.04] active:bg-white/[0.065] ${
          isLast ? "" : "border-b border-white/[0.075]"
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] border transition duration-200 group-hover:-translate-y-0.5 ${
            featured ? palette.iconFeatured : palette.icon
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black tracking-[-0.01em] text-white/94">
            {title}
          </p>
          <p className="mt-1 truncate text-[11px] font-medium text-slate-300/48">
            {description}
          </p>
        </div>

        {badge ? (
          <span
            className={`max-w-[92px] shrink-0 truncate rounded-full border px-2.5 py-1 text-[9px] font-black ${palette.badge}`}
          >
            {badge}
          </span>
        ) : null}

        <ChevronRight className="h-4 w-4 shrink-0 text-white/26 transition duration-200 group-hover:translate-x-0.5 group-hover:text-white/58" />
      </button>
    );
  };`;

replaceExactlyOnce(
  /  const PremiumRow = \(\{ icon: Icon, title, description, badge, featured, onClick \}\) => \([\s\S]*?\n  \);(?=\n\n  const DetailHeader =)/,
  premiumRowReplacement,
  "PremiumRow replacement"
);

const overviewReplacement = String.raw`  return (
    <div ref={settingsRootRef} className="space-y-4 pb-7">
      {renderNotice()}

      <section className="relative overflow-hidden rounded-[28px] border border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.13),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.17),transparent_44%),linear-gradient(135deg,rgba(7,30,51,0.96),rgba(12,19,48,0.98))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[74px] -right-12 h-32 w-64 rotate-[-8deg] rounded-[50%] border border-violet-300/18 bg-violet-500/[0.08]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-14 -top-16 h-32 w-32 rounded-full bg-cyan-400/[0.07] blur-2xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-200/20 bg-cyan-300/[0.09] text-lg font-black text-white shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]">
            {dashboardPanelInitials(displayName)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black tracking-[-0.02em] text-white">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-300/52">
              {user?.email || "CLARA user"}
            </p>
          </div>

          <span className="max-w-[98px] shrink-0 truncate rounded-full border border-cyan-200/18 bg-[linear-gradient(110deg,rgba(34,211,238,0.11),rgba(124,58,237,0.11))] px-3 py-1 text-[9px] font-black text-cyan-100/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {currentPlan}
          </span>
        </div>
      </section>

      {settingSections.map((section) => {
        const isProgramSection = section.title === "Program";
        const isPreferencesSection = section.title === "Preferences";
        const tone = isProgramSection
          ? "violet"
          : isPreferencesSection
            ? "blue"
            : "cyan";
        const sectionLabelClass = isProgramSection
          ? "text-violet-200/58"
          : isPreferencesSection
            ? "text-sky-200/52"
            : "text-cyan-200/52";
        const sectionFrameClass = isProgramSection
          ? "border-violet-300/15 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.11),transparent_42%),linear-gradient(145deg,rgba(8,23,43,0.92),rgba(18,15,49,0.94))]"
          : isPreferencesSection
            ? "border-sky-300/13 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.09),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_42%),rgba(7,22,42,0.93)]"
            : "border-cyan-300/14 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.09),transparent_39%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.08),transparent_43%),rgba(7,23,42,0.94)]";

        return (
          <section key={section.title} className="space-y-2">
            <p
              className={`px-1.5 text-[10px] font-black uppercase tracking-[0.21em] ${sectionLabelClass}`}
            >
              {section.title}
            </p>

            <div
              className={`relative overflow-hidden rounded-[26px] border shadow-[0_16px_42px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl ${sectionFrameClass}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
              />

              <div className="relative">
                {section.rows.map((row, index) => (
                  <PremiumRow
                    key={row.key}
                    icon={row.icon}
                    title={row.title}
                    description={row.description}
                    badge={row.badge}
                    featured={row.featured}
                    tone={tone}
                    isLast={index === section.rows.length - 1}
                    onClick={row.action}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="space-y-2 pt-0.5">
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] border border-rose-300/16 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.09),transparent_36%),rgba(8,18,35,0.88)] px-4 py-3.5 text-sm font-black text-rose-100/86 shadow-[0_12px_34px_rgba(0,0,0,0.18)] transition hover:border-rose-300/24 hover:bg-rose-500/[0.11] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Logging out..." : "Log out"}
        </button>
        <p className="px-2 text-center text-[10px] font-semibold leading-4 text-white/42">
          Your financial records stay on this device. Log in again anytime.
        </p>
      </section>
    </div>
  );
}`;

replaceExactlyOnce(
  /  return \(\n    <div ref=\{settingsRootRef\} className="space-y-5 pb-6">[\s\S]*\n  \);\n}\s*$/,
  overviewReplacement,
  "Settings overview replacement"
);

writeFileSync(settingsPath, source, "utf8");

for (const temporaryPath of [scriptPath, workflowPath]) {
  if (existsSync(temporaryPath)) rmSync(temporaryPath);
}

console.log("Applied the Savings Goals visual language to the Settings overview.");
