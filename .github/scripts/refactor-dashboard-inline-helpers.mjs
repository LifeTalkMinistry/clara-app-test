import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const insertAfter = (needle, addition) => {
  if (source.includes(addition.trim())) return;
  const index = source.indexOf(needle);
  if (index === -1) {
    throw new Error(`Import anchor not found: ${needle}`);
  }
  source = source.slice(0, index + needle.length) + addition + source.slice(index + needle.length);
};

const removeBlock = (startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  if (start === -1) return false;
  const end = source.indexOf(endNeedle, start);
  if (end === -1) {
    throw new Error(`End needle not found for block starting: ${startNeedle}`);
  }
  source = source.slice(0, start) + source.slice(end);
  return true;
};

insertAfter(
  'import DashboardMoneySummary from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummary";\n',
  'import {\n  DASHBOARD_SCALE,\n  useDashboardViewportMode,\n} from "@/components/fresh/main-dashboard/dashboard-scale/dashboardScale";\n'
);

insertAfter(
  '} from "@/components/fresh/main-dashboard/dashboard-scale/dashboardScale";\n',
  'import {\n  applyVisualPerformanceMode,\n  readStoredPerformanceMode,\n  saveVisualPerformanceMode,\n} from "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode";\n'
);

insertAfter(
  '} from "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode";\n',
  'import {\n  MONEY_SUMMARY_PRIVACY_KEY,\n  persistDashboardPrefs,\n  persistMoneySummaryVisibility,\n  persistStoredNotificationSettings,\n  readDashboardPrefs,\n  readMoneySummaryVisibility,\n  readStoredNotificationSettings,\n} from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";\n'
);

insertAfter(
  '} from "@/lib/program-access";\n',
  'import {\n  isProgramApproved,\n  shouldForceToEnroll,\n} from "@/components/fresh/main-dashboard/program-access/programAccessRules";\n'
);

removeBlock(
  'const dashboardRuntimePrefs = new Map();',
  'const dashboardRuntimeProgramPrompts = new Set();'
);
source = source.replace(
  'const dashboardRuntimeProgramPrompts = new Set();',
  'const dashboardRuntimeProgramPrompts = new Set();'
);

removeBlock(
  'const CLARA_VISUAL_PERFORMANCE_STYLE_ID = "clara-visual-performance-mode-style";',
  'const dashboardRuntimeProgramPrompts = new Set();'
);
source = source.replace(
  'const dashboardRuntimeProgramPrompts = new Set();',
  'const dashboardRuntimeProgramPrompts = new Set();'
);

removeBlock(
  'const getDashboardViewportMode = () => {',
  'const DEFAULT_DASHBOARD_THEME_KEY = DEFAULT_THEME_KEY || "obsidian";'
);
source = source.replace(
  'const DEFAULT_DASHBOARD_THEME_KEY = DEFAULT_THEME_KEY || "obsidian";',
  'const DEFAULT_DASHBOARD_THEME_KEY = DEFAULT_THEME_KEY || "obsidian";'
);

removeBlock(
  'const isProgramApproved = (profile, isPaid, enrollmentRecord = null) => {',
  'const OnboardingActionBar = ({'
);
source = source.replace(
  'const OnboardingActionBar = ({',
  'const OnboardingActionBar = ({'
);

source = source.replaceAll(
  'isProgramApproved(profile, isPaid, enrollmentRecord)',
  'isProgramApproved(profile, isPaid, enrollmentRecord, ENROLLMENT_APPROVED_STATUSES)'
);
source = source.replaceAll(
  'shouldForceToEnroll(profile, enrollmentRecord, isPaid)',
  'shouldForceToEnroll(\n      profile,\n      enrollmentRecord,\n      isPaid,\n      ENROLLMENT_APPROVED_STATUSES,\n      ENROLLMENT_PENDING_STATUSES,\n      ENROLLMENT_BLOCKED_TO_ENROLL_STATUSES\n    )'
);

if (source === original) {
  console.log("No changes made to Dashboard.jsx");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Dashboard.jsx reduced by ${original.length - source.length} characters.`);
