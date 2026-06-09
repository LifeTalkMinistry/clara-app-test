import fs from "node:fs";

const targetPath = "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";
let source = fs.readFileSync(targetPath, "utf8");
const original = source;

const replaceOnce = (text, search, replacement, label) => {
  const index = text.indexOf(search);
  if (index === -1) throw new Error(`Missing ${label} anchor.`);
  if (text.indexOf(search, index + search.length) !== -1) {
    throw new Error(`Duplicate ${label} anchor.`);
  }
  return text.slice(0, index) + replacement + text.slice(index + search.length);
};

source = replaceOnce(source, "  RotateCcw,\n", "", "RotateCcw import");
source = replaceOnce(
  source,
  "  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);\n",
  "",
  "reset modal state"
);
source = replaceOnce(
  source,
  `    const resetIncludes = [
      "Theme selection",
      "Dashboard preferences",
      "AI visual preferences",
      "Tutorial state",
    ];
    const resetDoesNotDelete = [
      "Wallet balances",
      "Expenses",
      "Budgets",
      "Savings data",
      "Emergency fund",
      "Transfers",
      "Transaction history",
      "AI financial context",
    ];

`,
  "",
  "reset details arrays"
);
source = replaceOnce(
  source,
  `    const closeSecurityOverlays = () => {
      setIsAiPrivacyModalOpen(false);
      setIsResetConfirmationOpen(false);
    };`,
  `    const closeSecurityOverlays = () => {
      setIsAiPrivacyModalOpen(false);
    };`,
  "security overlay closer"
);

const resetHeadingIndex = source.indexOf(">Reset appearance and preferences</h3>");
if (resetHeadingIndex === -1) throw new Error("Reset card heading not found.");
const resetSectionStart = source.lastIndexOf("        <section", resetHeadingIndex);
const resetSectionEndMarker = "        </section>";
const resetSectionEndIndex = source.indexOf(resetSectionEndMarker, resetHeadingIndex);
if (resetSectionStart === -1 || resetSectionEndIndex === -1) {
  throw new Error("Unable to isolate reset card section.");
}
source =
  source.slice(0, resetSectionStart) +
  source.slice(resetSectionEndIndex + resetSectionEndMarker.length + 1);

const resetModalStart = source.indexOf("        {isResetConfirmationOpen ? (");
if (resetModalStart === -1) throw new Error("Reset confirmation modal not found.");
const resetModalEndMarker = "        ) : null}\n";
const resetModalEnd = source.indexOf(resetModalEndMarker, resetModalStart);
if (resetModalEnd === -1) throw new Error("Unable to isolate reset confirmation modal.");
source =
  source.slice(0, resetModalStart) +
  source.slice(resetModalEnd + resetModalEndMarker.length);

const forbiddenTokens = [
  "Reset appearance and preferences",
  "Reset preferences",
  "isResetConfirmationOpen",
  "setIsResetConfirmationOpen",
  "resetIncludes",
  "resetDoesNotDelete",
  "<RotateCcw",
];

for (const token of forbiddenTokens) {
  if (source.includes(token)) {
    throw new Error(`Reset UI token still present: ${token}`);
  }
}

const requiredTokens = [
  "Your CLARA data is private",
  "View data details",
  "AI privacy",
  "How CLARA uses your information",
  "Log out",
];

for (const token of requiredTokens) {
  if (!source.includes(token)) {
    throw new Error(`Required Settings content missing: ${token}`);
  }
}

if (source === original) throw new Error("Reset UI removal produced no changes.");

fs.writeFileSync(targetPath, source);
console.log("Removed the Security preferences reset card and modal safely.");
