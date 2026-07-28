import fs from "node:fs";

const path =
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";
let source = fs.readFileSync(path, "utf8");
const original = source;

const replaceOnce = (before, after, label) => {
  if (source.includes(after)) return;
  const first = source.indexOf(before);
  if (first === -1) throw new Error(`Missing Settings anchor: ${label}`);
  if (source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`Settings anchor is not unique: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
};

replaceOnce(
  'import { useCallback, useEffect, useMemo, useState } from "react";',
  'import { useCallback, useEffect, useMemo, useRef, useState } from "react";',
  "React useRef import"
);
replaceOnce('  Bell,\n', '  Bell,\n  BrainCircuit,\n', "Memory icon import");
replaceOnce('  ListChecks,\n', '  ListChecks,\n  LogOut,\n', "Logout icon import");
replaceOnce(
  'import { supabase } from "@/lib/supabaseClient";\n',
  'import { supabase } from "@/lib/supabaseClient";\nimport { signOutFromClaraBackend } from "@/lib/clara-backend-client";\n',
  "backend logout import"
);

replaceOnce(
  `const dashboardRuntimeSurvivalExpenses = { clear: () => {} };
`,
  `const dashboardRuntimeSurvivalExpenses = { clear: () => {} };
const PANEL_HISTORY_KEY = "__claraDashboardPanel";
const SETTINGS_DETAIL_HISTORY_KEY = "__claraSettingsDetail";
const SETTINGS_DETAIL_KEYS = new Set([
  "profile",
  "security",
  "performance",
  "notifications",
  "plan",
  "support",
  "about",
]);
`,
  "Settings history constants"
);

replaceOnce(
  `  const navigate = useNavigate();
`,
  `  const navigate = useNavigate();
  const settingsRootRef = useRef(null);
`,
  "Settings root ref"
);

replaceOnce(
  `  const [activeSetting, setActiveSetting] = useState(null);`,
  `  const [activeSetting, setActiveSetting] = useState(() => {
    if (typeof window === "undefined") return null;
    const detailKey = window.history.state?.[SETTINGS_DETAIL_HISTORY_KEY];
    return SETTINGS_DETAIL_KEYS.has(detailKey) ? detailKey : null;
  });`,
  "Settings detail initial state"
);

replaceOnce(
  `  const [isDataDetailsOpen, setIsDataDetailsOpen] = useState(false);
  const membershipState`,
  `  const [isDataDetailsOpen, setIsDataDetailsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const membershipState`,
  "Settings logout state"
);

replaceOnce(
  `const supportEmail = "claraprogram2026@gmail.com";

  const persistPerformanceToggle`,
  `const supportEmail = "claraprogram2026@gmail.com";

  const openSetting = useCallback((settingKey) => {
    if (!SETTINGS_DETAIL_KEYS.has(settingKey)) return;

    setSettingsNotice(null);
    setActiveAboutInfo(null);
    setIsAiPrivacyModalOpen(false);
    setIsDataDetailsOpen(false);

    if (typeof window !== "undefined") {
      const currentState = window.history.state || {};
      if (currentState?.[SETTINGS_DETAIL_HISTORY_KEY] !== settingKey) {
        window.history.pushState(
          {
            ...currentState,
            [PANEL_HISTORY_KEY]: "settings",
            [SETTINGS_DETAIL_HISTORY_KEY]: settingKey,
          },
          "",
          window.location.href
        );
      }
    }

    setActiveSetting(settingKey);
  }, []);

  const closeActiveSetting = useCallback(() => {
    setSettingsNotice(null);
    setActiveAboutInfo(null);
    setIsAiPrivacyModalOpen(false);
    setIsDataDetailsOpen(false);

    if (
      typeof window !== "undefined" &&
      window.history.state?.[SETTINGS_DETAIL_HISTORY_KEY]
    ) {
      window.history.back();
      return;
    }

    setActiveSetting(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleSettingsPopState = (event) => {
      const statePanel = event?.state?.[PANEL_HISTORY_KEY];
      if (statePanel && statePanel !== "settings") return;

      const detailKey = event?.state?.[SETTINGS_DETAIL_HISTORY_KEY];
      setActiveSetting(SETTINGS_DETAIL_KEYS.has(detailKey) ? detailKey : null);
      setActiveAboutInfo(null);
      setSettingsNotice(null);
      setIsAiPrivacyModalOpen(false);
      setIsDataDetailsOpen(false);
    };

    window.addEventListener("popstate", handleSettingsPopState);
    return () => window.removeEventListener("popstate", handleSettingsPopState);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const scrollOwner = settingsRootRef.current?.closest?.(".overflow-y-auto");
      scrollOwner?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeSetting]);

  const openMemoryBoard = useCallback(() => {
    dispatchClaraEvent("clara:open-assistant-memory-board", {
      cabinetName: "Spending Memory",
      source: "settings",
    });
  }, []);

  const handleLogout = useCallback(() => {
    if (signingOut) return;
    setSigningOut(true);
    signOutFromClaraBackend();
    window.setTimeout(() => window.location.reload(), 80);
  }, [signingOut]);

  const persistPerformanceToggle`,
  "React-owned Settings behavior"
);

const actionReplacements = [
  ["profile", "profile"],
  ["security", "security"],
  ["performance", "performance"],
  ["notifications", "notifications"],
  ["plan", "plan"],
  ["support", "support"],
  ["about", "about"],
];

for (const [label, key] of actionReplacements) {
  replaceOnce(
    `action: () => setActiveSetting("${key}"),`,
    `action: () => openSetting("${key}"),`,
    `${label} row navigation`
  );
}

replaceOnce(
  `        {
          key: "security",
          title: "Security & privacy",
          description: "Local records, AI privacy, and safe reset",
          icon: ShieldCheck,
          badge: "Safe",
          action: () => openSetting("security"),
        },`,
  `        {
          key: "security",
          title: "Security & privacy",
          description: "Local records, AI privacy, and safe reset",
          icon: ShieldCheck,
          badge: "Safe",
          action: () => openSetting("security"),
        },
        {
          key: "memory",
          title: "Memory",
          description: "Saved context, patterns, and AI memory",
          icon: BrainCircuit,
          badge: "Review",
          action: openMemoryBoard,
        },`,
  "Memory Settings row"
);

replaceOnce(
  `        onClick={() => {
          setActiveSetting(null);
          setActiveAboutInfo(null);
          setSettingsNotice(null);
        }}`,
  `        onClick={closeActiveSetting}`,
  "shared Settings detail back button"
);

replaceOnce(
  `          onClick={() => {
            setSettingsNotice(null);
            setActiveSetting("support");
          }}`,
  `          onClick={() => openSetting("support")}`,
  "Plan to support navigation"
);

replaceOnce(
  `            onClick={() => {
              closeSecurityOverlays();
              setIsDataDetailsOpen(false);
              setActiveSetting(null);
              setActiveAboutInfo(null);
              setSettingsNotice(null);
            }}`,
  `            onClick={() => {
              closeSecurityOverlays();
              closeActiveSetting();
            }}`,
  "Security back button"
);

replaceOnce(
  `          onClick={() => {
            setActiveSetting(null);
            setActiveAboutInfo(null);
            setSettingsNotice(null);
          }}`,
  `          onClick={closeActiveSetting}`,
  "About back button"
);

replaceOnce(
  "Your CLARA data is private",
  "Your CLARA data stays private",
  "privacy title"
);
replaceOnce(
  "This device is your private CLARA environment.",
  "This device has its own CLARA data. Signing in on another device will not automatically bring your financial records with it.",
  "device privacy explanation"
);
replaceOnce(
  '["Financial records protected", "Device-first data", "Not publicly visible"]',
  '["Financial records protected", "Each device starts with its own data", "No automatic device-to-device sync", "You choose when to transfer your data"]',
  "privacy bullets"
);
replaceOnce(
  "Your wallets, expenses, budgets, savings, transfers, transaction history, and AI context remain protected.",
  "Your wallets, expenses, budgets, savings, transfers, transaction history, and AI context remain on this device unless you choose to back up or transfer them.",
  "privacy data summary"
);
replaceOnce("Backup & Transfer", "Move & Restore Data", "data transfer title");
replaceOnce(
  "Download or upload your CLARA device backup.",
  "Move your CLARA data to another device or restore a previous backup.",
  "data transfer description"
);

replaceOnce(
  `      <div className="min-h-full space-y-4 pb-6">
        {renderActiveSetting()}`,
  `      <div ref={settingsRootRef} className="min-h-full space-y-4 pb-6">
        {renderActiveSetting()}`,
  "Settings detail root ref"
);
replaceOnce(
  `    <div className="space-y-5 pb-6">
      {renderNotice()}`,
  `    <div ref={settingsRootRef} className="space-y-5 pb-6">
      {renderNotice()}`,
  "Settings overview root ref"
);

replaceOnce(
  `      {settingSections.map((section) => (
        <section key={section.title} className="space-y-2">
          <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            {section.title}
          </p>

          <div className="space-y-2.5">
            {section.rows.map((row) => (
              <PremiumRow
                key={row.key}
                icon={row.icon}
                title={row.title}
                description={row.description}
                badge={row.badge}
                featured={row.featured}
                onClick={row.action}
              />
            ))}
          </div>
        </section>
      ))}

    </div>`,
  `      {settingSections.map((section) => (
        <section key={section.title} className="space-y-2">
          <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            {section.title}
          </p>

          <div className="space-y-2.5">
            {section.rows.map((row) => (
              <PremiumRow
                key={row.key}
                icon={row.icon}
                title={row.title}
                description={row.description}
                badge={row.badge}
                featured={row.featured}
                onClick={row.action}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[24px] border border-rose-300/25 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_34%),rgba(244,63,94,0.10)] px-4 py-4 text-sm font-black text-rose-100 shadow-[0_14px_40px_rgba(244,63,94,0.10)] transition hover:bg-rose-500/18 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Logging out..." : "Log out"}
        </button>
        <p className="px-2 text-center text-[10px] font-semibold leading-4 text-white/55">
          Your financial records stay on this device. Log in again anytime.
        </p>
      </section>
    </div>`,
  "React-owned logout section"
);

if (source === original) {
  console.log("Settings React ownership is already applied.");
} else {
  fs.writeFileSync(path, source);
  console.log(`Updated ${path}`);
}
