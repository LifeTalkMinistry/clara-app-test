import fs from "node:fs";

const targetPath = "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";
let source = fs.readFileSync(targetPath, "utf8");
const original = source;

const removeOnce = (text, target, label) => {
  const index = text.indexOf(target);
  if (index === -1) throw new Error(`Missing ${label} anchor.`);
  if (text.indexOf(target, index + target.length) !== -1) {
    throw new Error(`Duplicate ${label} anchor.`);
  }
  return text.slice(0, index) + text.slice(index + target.length);
};

source = removeOnce(
  source,
  `            <p className="mt-1.5 max-w-[34ch] text-xs leading-5 text-white/50">
              Manage how CLARA protects and uses your information.
            </p>
`,
  "Security page subtitle"
);

source = removeOnce(
  source,
  `                  <p className="mt-1 text-xs leading-5 text-white/45">
                    A simple explanation of the context CLARA uses for guidance.
                  </p>
`,
  "AI privacy modal subtitle"
);

source = removeOnce(
  source,
  `
              <button
                type="button"
                onClick={() => setIsAiPrivacyModalOpen(false)}
                className="mt-6 min-h-11 w-full rounded-2xl bg-white/[0.09] px-4 py-3 text-sm font-black text-white transition hover:bg-white/[0.13]"
              >
                Close
              </button>
`,
  "AI privacy bottom Close button"
);

const forbiddenTokens = [
  "Manage how CLARA protects and uses your information.",
  "A simple explanation of the context CLARA uses for guidance.",
  '>\n                Close\n              </button>',
];

for (const token of forbiddenTokens) {
  if (source.includes(token)) {
    throw new Error(`Removed content is still present: ${token}`);
  }
}

const requiredTokens = [
  "Security & privacy",
  "Your CLARA data is private",
  "AI privacy",
  "How CLARA uses your information",
  'aria-label="Close AI privacy information"',
  "Log out",
];

for (const token of requiredTokens) {
  if (!source.includes(token)) {
    throw new Error(`Required Settings content missing: ${token}`);
  }
}

if (source === original) throw new Error("Selected Security cleanup produced no changes.");

fs.writeFileSync(targetPath, source);
console.log("Removed selected Security and AI privacy helper elements safely.");
