from pathlib import Path
import re


def replace_all(path, replacements):
    p = Path(path)
    text = p.read_text()
    for old, new in replacements:
        text = text.replace(old, new)
    p.write_text(text)


# Community owns only the Settings viewport geometry/scrolling and plain navy canvas.
replace_all("src/pages/Community.jsx", [
    ('import { useTheme } from "@/theme/ThemeProvider";\n', ''),
    ('  const { openThemePicker, setTheme } = useTheme();\n', ''),
    (
        'className="clara-community-settings-view relative z-[1] min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_88%_8%,rgba(79,70,229,0.10),transparent_30%),radial-gradient(circle_at_12%_22%,rgba(20,184,166,0.06),transparent_30%),#06111f] px-4 pb-[calc(env(safe-area-inset-bottom)+30px)] pt-5 sm:px-6"',
        'className="clara-community-settings-view relative z-[1] min-h-0 flex-1 overflow-y-auto bg-[#040b18] px-4 pb-[calc(env(safe-area-inset-bottom)+30px)] pt-5 sm:px-6"'
    ),
    ('              onBack={() => navigate("/community?view=profile")}\n', ''),
    ('              openThemePicker={openThemePicker}\n', ''),
    ('              resetThemeToDefault={() => setTheme("clara-hero-red-blue")}\n', ''),
])

# Notification Settings primitives are authored directly in the official CLARA palette.
replace_all("src/components/notifications/NotificationSettingsPanel.jsx", [
    ('border-rose-300/20 bg-rose-300/10 text-rose-100', 'border-[#a4384b]/45 bg-[#f32645]/8 text-[#ffc0cb]'),
    ('border-amber-300/20 bg-amber-300/10 text-amber-100', 'border-[#9c8330]/45 bg-[#ffd84a]/8 text-[#ffe681]'),
    ('border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-100/80', 'border-[#2f73bb]/45 bg-[#0867ff]/8 text-[#b8d8ff]/80'),
    ('border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] shadow-[0_14px_34px_rgba(0,0,0,0.12)]', 'border-[#1d4b7b]/45 bg-[#06142a] shadow-[0_14px_34px_rgba(0,0,0,0.16)]'),
    ('border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-100', 'border-[#2f73bb]/45 bg-[#0867ff]/9 text-[#b8d8ff]'),
    ('border-emerald-300/15 bg-emerald-300/[0.08] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/75', 'border-[#9c8330]/40 bg-[#ffd84a]/7 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#ffe681]'),
    ('data-[state=checked]:bg-emerald-500', 'data-[state=checked]:bg-[#0867ff]'),
    ('border-emerald-300/35 bg-emerald-300/15 text-emerald-50', 'border-[#4f96ff]/60 bg-[#0867ff]/14 text-[#d7eaff]'),
    ('border-emerald-300/10 bg-emerald-300/[0.05]', 'border-[#2f73bb]/35 bg-[#0867ff]/7'),
    ('border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-xs font-semibold text-emerald-100', 'border-[#2d6dae]/45 bg-[#0867ff]/8 px-4 py-3 text-xs font-semibold text-[#c5e0ff]'),
    ('border-rose-300/20 bg-rose-400/10 px-4 py-3 text-xs font-semibold text-rose-100', 'border-[#a4384b]/45 bg-[#f32645]/8 px-4 py-3 text-xs font-semibold text-[#ffc0cb]'),
    ('rounded-[24px] border border-cyan-300/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_45%),rgba(255,255,255,0.03)] p-4', 'rounded-[24px] border border-[#22588f]/45 bg-[linear-gradient(145deg,#071a35_0%,#06142a_72%,#061225_100%)] p-4'),
    ('text-cyan-100/50', 'text-[#82bfff]/70'),
    ('text-cyan-100/70', 'text-[#8ed0ff]'),
    ('rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-black text-slate-950 transition disabled:opacity-45', 'rounded-2xl border border-[#4f96ff]/35 bg-[#0867ff] px-4 py-3 text-xs font-black text-white transition hover:bg-[#1473ff] disabled:opacity-45'),
    ('mt-3 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-45', 'mt-3 w-full rounded-2xl border border-[#4f96ff]/35 bg-[#0867ff] px-4 py-3 text-sm font-black text-white disabled:opacity-45'),
    ('border-white/10', 'border-[#1d4b7b]/45'),
    ('bg-black/15', 'bg-[#040d1c]'),
    ('bg-black/20', 'bg-[#040d1c]'),
    ('bg-[#07131f]', 'bg-[#040d1c]'),
    ('bg-white/[0.035]', 'bg-[#07162b]'),
    ('bg-white/[0.04]', 'bg-[#07162b]'),
    ('bg-white/[0.025]', 'bg-[#061225]'),
    ('hover:bg-white/[0.06]', 'hover:bg-[#0a203a]'),
])

# Advanced reminder Settings primitive receives the same source-level treatment.
replace_all("src/components/TaskReminderSettingsCard.jsx", [
    ('text-emerald-300/85', 'text-[#8ed0ff]'),
    ('border-emerald-400/10 bg-[linear-gradient(180deg,rgba(5,17,31,1)_0%,rgba(6,18,29,0.94)_100%)]', 'border-[#1d4b7b]/45 bg-[#06142a]'),
    ('text-emerald-300/72', 'text-[#82bfff]/75'),
    ('data-[state=checked]:bg-emerald-500', 'data-[state=checked]:bg-[#0867ff]'),
    ('border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15', 'border border-[#4f96ff]/45 bg-[#0867ff]/10 text-[#b9d9ff] hover:bg-[#0867ff]/16'),
    ('border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-xs font-black text-cyan-50 transition hover:bg-cyan-300/15', 'border border-[#3d85c6]/45 bg-[#19b5ff]/9 px-4 py-3 text-xs font-black text-[#c9ebff] transition hover:bg-[#19b5ff]/14'),
    ('border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs font-semibold leading-5 text-emerald-100', 'border border-[#2d6dae]/45 bg-[#0867ff]/8 p-3 text-xs font-semibold leading-5 text-[#c5e0ff]'),
    ('border border-rose-300/20 bg-rose-400/10 p-3 text-xs font-semibold leading-5 text-rose-100', 'border border-[#a4384b]/45 bg-[#f32645]/8 p-3 text-xs font-semibold leading-5 text-[#ffc0cb]'),
    ('border border-cyan-300/10 bg-cyan-300/[0.06] p-3 text-cyan-50/60', 'border border-[#2f73bb]/35 bg-[#0867ff]/6 p-3 text-[#b8d8ff]/65'),
    ('border-white/10', 'border-[#1d4b7b]/45'),
    ('bg-white/[0.04]', 'bg-[#07162b]'),
    ('bg-white/[0.05]', 'bg-[#07162b]'),
    ('bg-black/20', 'bg-[#040d1c]'),
    ('bg-[#07131f]', 'bg-[#040d1c]'),
    ('hover:bg-white/[0.08]', 'hover:bg-[#0a203a]'),
])

# Regression tests now protect source ownership instead of the retired cascade.
canonical = Path("tests/canonical-display-name-authority.test.mjs")
canonical.write_text(canonical.read_text().replace("DashboardSettingsPanelOfficial.jsx", "DashboardSettingsPanel.jsx"))

local_test = Path("tests/settings-local-only-regression.test.mjs")
text = local_test.read_text()
text = text.replace('const settingsCleanupSource = readSource("src/settings-cleanup.css");\n', '')
text = re.sub(
    r'test\("Settings permanently hides theme customization through one scoped CSS owner", \(\) => \{.*?\n\}\);',
    '''test("Settings owns appearance directly and exposes no theme customization row", () => {
  assert.equal(existsSync(retiredThemePatchUrl), false);
  assert.doesNotMatch(
    activeSettingsSource,
    /openThemePicker|lucide-palette|title: "Appearance"|title: "Theme"/
  );
});''',
    text,
    flags=re.S,
)
local_test.write_text(text)

integrity = Path("tests/settings-integrity-regression.test.mjs")
text = integrity.read_text()
text = text.replace('const settingsCleanupSource = readSource("src/settings-cleanup.css");\n', '')
text = re.sub(
    r'test\("the Settings overview no longer claims all notifications are On or Off from one reminder flag", \(\) => \{.*?\n\}\);',
    '''test("the Settings overview leaves notification state to the Notifications detail surface", () => {
  const row = activeSettingsSource.match(/key: "notifications"[\\s\\S]{0,320}?action:/)?.[0] || "";
  assert.match(row, /title: "Notifications"/);
  assert.doesNotMatch(row, /badge:/);
});''',
    text,
    flags=re.S,
)
integrity.write_text(text)

Path("tests/settings-top-spacing.test.mjs").write_text('''import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const communitySource = await readFile(
  new URL("../src/pages/Community.jsx", import.meta.url),
  "utf8"
);

test("Community shell owns Settings scrolling and outer spacing only", () => {
  const settingsBranch = communitySource.match(
    /activeView === "settings"[\\s\\S]{0,1200}?<DashboardSettingsPanel/
  )?.[0] || "";
  assert.match(settingsBranch, /clara-community-settings-view/);
  assert.match(settingsBranch, /overflow-y-auto/);
  assert.match(settingsBranch, /px-4/);
  assert.match(settingsBranch, /bg-\\[#040b18\\]/);
  assert.doesNotMatch(settingsBranch, /rgba\\(79,70,229|rgba\\(20,184,166/);
});
''')

Path("tests/settings-visual-authority.test.mjs").write_text('''import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const settings = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
);
const notifications = readSource("src/components/notifications/NotificationSettingsPanel.jsx");
const taskCard = readSource("src/components/TaskReminderSettingsCard.jsx");
const runtime = readSource("src/runtime/installClaraRuntimePatches.js");

const retiredVisualFiles = [
  "src/settings-cleanup.css",
  "src/settings-priority.css",
  "src/settings-support-compose.css",
  "src/settings-official-brand-theme.css",
  "src/settings-community-brand-fix.css",
];

test("Settings visual authority is React-owned and legacy theme layers are retired", () => {
  retiredVisualFiles.forEach((file) => {
    assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), false);
    assert.doesNotMatch(
      runtime,
      new RegExp(file.split("/").at(-1).replaceAll(".", "\\\\."))
    );
  });

  for (const source of [settings, notifications, taskCard]) {
    assert.doesNotMatch(source, /emerald-|violet-|teal-/);
  }

  assert.match(settings, /#0867ff/);
  assert.match(settings, /#19b5ff/);
  assert.match(settings, /#ffd84a/);
  assert.match(settings, /#f32645/);
});
''')

# Retire the old Settings visual authorities completely.
for filename in [
    "src/settings-cleanup.css",
    "src/settings-priority.css",
    "src/settings-support-compose.css",
    "src/settings-official-brand-theme.css",
    "src/settings-community-brand-fix.css",
]:
    path = Path(filename)
    if path.exists():
        path.unlink()

# This migration is one-time; neither it nor its workflow remain as authorities.
for filename in [
    ".github/scripts/settings-visual-authority-cleanup.py",
    ".github/workflows/settings-visual-authority-cleanup.yml",
]:
    path = Path(filename)
    if path.exists():
        path.unlink()
