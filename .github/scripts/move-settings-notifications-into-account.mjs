import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), "../..");
const workflowPath = resolve(
  repoRoot,
  ".github/workflows/move-settings-notifications-into-account.yml"
);
const settingsPath = resolve(
  repoRoot,
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
);
const mainPath = resolve(repoRoot, "src/main.jsx");
const cleanupPath = resolve(repoRoot, "src/settings-cleanup.css");
const compactCssPath = resolve(repoRoot, "src/settings-preferences-compact.css");

let settingsSource = readFileSync(settingsPath, "utf8");
let mainSource = readFileSync(mainPath, "utf8");
let cleanupSource = readFileSync(cleanupPath, "utf8");

const oldSections = `        {
          key: "memory",
          title: "Memory",
          description: "Saved context, patterns, and AI memory",
          icon: BrainCircuit,
          badge: "Review",
          action: openMemoryBoard,
        },
      ],
    },
    {
      title: "Preferences",
      rows: [
        {
          key: "appearance",
          title: "Theme & appearance",
          description: "Colors, visual style, and dashboard theme",
          icon: Palette,
          badge: "Customize",
          featured: true,
          action: openThemePicker,
        },
        {
          key: "performance",
          title: "Performance Mode",
          description: "Static visuals with no animation, glow, or blur",
          icon: Rocket,
          badge: localPerformanceMode ? "On" : "Off",
          featured: localPerformanceMode,
          action: () => openSetting("performance"),
        },
        {
          key: "notifications",
          title: "Notifications",
          description: "Reminders, alerts, and program updates",
          icon: Bell,
          badge: notificationPreferences.dailyCheckIn ? "On" : "Off",
          action: () => openSetting("notifications"),
        },
      ],
    },
    {
      title: "Program",`;

const newSections = `        {
          key: "memory",
          title: "Memory",
          description: "Saved context, patterns, and AI memory",
          icon: BrainCircuit,
          badge: "Review",
          action: openMemoryBoard,
        },
        {
          key: "notifications",
          title: "Notifications",
          description: "Reminders, alerts, and program updates",
          icon: Bell,
          action: () => openSetting("notifications"),
        },
      ],
    },
    {
      title: "Program",`;

if (!settingsSource.includes(oldSections)) {
  throw new Error("Settings section structure did not match the expected source.");
}

settingsSource = settingsSource.replace(oldSections, newSections);

if (settingsSource.includes('title: "Preferences"')) {
  throw new Error("Preferences section still exists after migration.");
}

const notificationMatches = settingsSource.match(/key: "notifications"/g) || [];
if (notificationMatches.length !== 1) {
  throw new Error(
    `Expected one Notifications overview row, found ${notificationMatches.length}.`
  );
}

mainSource = mainSource.replace(
  'import "./settings-preferences-compact.css";\n',
  ""
);

cleanupSource = cleanupSource.replaceAll(
  "section.space-y-2:nth-of-type(3)",
  "section.space-y-2:has(svg.lucide-wallet-cards)"
);

writeFileSync(settingsPath, settingsSource, "utf8");
writeFileSync(mainPath, mainSource, "utf8");
writeFileSync(cleanupPath, cleanupSource, "utf8");

for (const removablePath of [compactCssPath, scriptPath, workflowPath]) {
  if (existsSync(removablePath)) rmSync(removablePath);
}

console.log("Moved Notifications into the actual Account section and removed the obsolete Preferences shell.");
