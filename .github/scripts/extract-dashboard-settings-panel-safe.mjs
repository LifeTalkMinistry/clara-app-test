import fs from "node:fs";

const targetPath = "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";
let source = fs.readFileSync(targetPath, "utf8");
const original = source;

const target = `      <DetailHeader
        title="Profile information"
        subtitle="Manage how your CLARA profile appears across the app."
      />`;

const replacement = `      <DetailHeader title="Profile information" />`;

const index = source.indexOf(target);
if (index === -1) {
  throw new Error("Profile information subtitle anchor not found.");
}

if (source.indexOf(target, index + target.length) !== -1) {
  throw new Error("Profile information subtitle anchor is not unique.");
}

source = source.slice(0, index) + replacement + source.slice(index + target.length);

if (source.includes("Manage how your CLARA profile appears across the app.")) {
  throw new Error("Profile information helper text is still present.");
}

const requiredTokens = [
  "Profile information",
  "Display name",
  "Save profile",
  "Memory",
  "Log out",
];

for (const token of requiredTokens) {
  if (!source.includes(token)) {
    throw new Error(`Required profile content missing: ${token}`);
  }
}

if (source === original) {
  throw new Error("Profile helper text removal produced no changes.");
}

fs.writeFileSync(targetPath, source);
console.log("Removed the Profile information helper text safely.");
