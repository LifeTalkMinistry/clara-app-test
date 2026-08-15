import { readFileSync, writeFileSync } from "node:fs";

const panelPath = "src/components/notifications/NotificationSettingsPanel.jsx";
let source = readFileSync(panelPath, "utf8");

const statusStart = "  const deliveryStatusTitle = phoneDeliveryReady";
const returnMarker = "\n\n  return (\n";
const statusStartIndex = source.indexOf(statusStart);
const returnIndex = source.indexOf(returnMarker, statusStartIndex);
if (statusStartIndex < 0 || returnIndex < 0) {
  throw new Error("Expected notification delivery status block was not found.");
}

const nextStatusBlock = `  const phoneDeliveryStatusLabel = phoneDeliveryReady
    ? "On"
    : deliveryWantsDevice
      ? "Needs attention"
      : "Off";
  const phoneDeliveryIssue = !deliveryWantsDevice || phoneDeliveryReady
    ? ""
    : taskReminderSettings.permissionState === "denied"
      ? "Phone permission is blocked. In-app notifications remain active."
      : !taskReminderSettings.pushSupported
        ? "Phone notifications are unavailable here. In-app notifications remain active."
        : "Phone delivery needs to be reconnected. In-app notifications remain active.";`;

source = source.slice(0, statusStartIndex) + nextStatusBlock + source.slice(returnIndex);

const deliverySectionStart = '      <section className="rounded-[24px] border border-[#22588f]/45 bg-[linear-gradient(145deg,#071a35_0%,#06142a_72%,#061225_100%)] p-4">';
const familyMarker = '      <section>\n        <div className="mb-3 px-1">\n          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">\n            Notification families';
const deliveryStartIndex = source.indexOf(deliverySectionStart);
const familyStartIndex = source.indexOf(familyMarker, deliveryStartIndex);
if (deliveryStartIndex < 0 || familyStartIndex < 0) {
  throw new Error("Expected oversized notification delivery section was not found.");
}

const compactDeliverySection = `      <section className="rounded-[20px] border border-[#1d4b7b]/45 bg-[#06142a] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#2f73bb]/40 bg-[#0867ff]/8 text-[#8ed0ff]">
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-white">Phone notifications</p>
              <span
                className={\`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] \${
                  phoneDeliveryReady
                    ? "border-[#2f73bb]/45 bg-[#0867ff]/10 text-[#b8d8ff]"
                    : deliveryWantsDevice
                      ? "border-[#9c8330]/45 bg-[#ffd84a]/8 text-[#ffe681]"
                      : "border-white/10 bg-white/[0.03] text-white/40"
                }\`}
              >
                {phoneDeliveryStatusLabel}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Receive CLARA reminders outside the app. In-app notifications remain active.
            </p>
          </div>
          <Switch
            checked={phoneDeliveryReady}
            disabled={taskReminderSettings.pushEnabling}
            onCheckedChange={(checked) => {
              if (checked) {
                void enableDeviceNotifications();
              } else {
                void useInAppOnly();
              }
            }}
            aria-label="Phone notifications"
            className="shrink-0 data-[state=checked]:bg-[#0867ff] data-[state=unchecked]:bg-white/15"
          />
        </div>

        {phoneDeliveryIssue ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#9c8330]/30 bg-[#ffd84a]/[0.05] px-3 py-2.5">
            <p className="min-w-0 text-[11px] leading-4 text-white/50">
              {phoneDeliveryIssue}
            </p>
            <button
              type="button"
              onClick={enableDeviceNotifications}
              disabled={taskReminderSettings.pushEnabling}
              className="shrink-0 rounded-lg border border-[#9c8330]/40 bg-[#ffd84a]/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#ffe681] disabled:opacity-45"
            >
              {taskReminderSettings.pushEnabling ? "Fixing..." : "Fix"}
            </button>
          </div>
        ) : null}
      </section>

`;

source = source.slice(0, deliveryStartIndex) + compactDeliverySection + source.slice(familyStartIndex);

for (const token of [
  "Notification delivery",
  "Refresh phone notifications",
  "Use in-app only",
  "deliveryStatusTitle",
  "deliveryStatusDescription",
]) {
  if (source.includes(token)) {
    throw new Error(`Oversized delivery UI residue remains: ${token}`);
  }
}
for (const required of [
  "Phone notifications",
  "checked={phoneDeliveryReady}",
  'aria-label="Phone notifications"',
  "phoneDeliveryIssue",
  "void enableDeviceNotifications()",
  "void useInAppOnly()",
]) {
  if (!source.includes(required)) {
    throw new Error(`Compact delivery UI is missing required contract: ${required}`);
  }
}
writeFileSync(panelPath, source, "utf8");

const testPath = "tests/notification-runtime-contracts.test.mjs";
let testSource = readFileSync(testPath, "utf8");

const oldStatusAssertions = `  assert.match(notificationPanelSource, /Phone notifications need attention/);
  assert.match(notificationPanelSource, /In-app notifications remain active/);`;
const newStatusAssertions = `  assert.match(notificationPanelSource, /phoneDeliveryIssue/);
  assert.match(notificationPanelSource, /Needs attention/);
  assert.match(notificationPanelSource, /In-app notifications remain active/);`;
if (!testSource.includes(oldStatusAssertions)) {
  throw new Error("Expected phone delivery status assertions were not found.");
}
testSource = testSource.replace(oldStatusAssertions, newStatusAssertions);

const oldSystemTest = `test("notification Settings exposes one user-facing notification system", () => {
  assert.match(notificationPanelSource, /Delivery diagnostics/);
  assert.match(notificationPanelSource, /Technical delivery status only/);
  assert.doesNotMatch(notificationPanelSource, /TaskReminderSettingsCard/);
  assert.doesNotMatch(notificationPanelSource, /Advanced delivery & task reminder tools/);
  assert.doesNotMatch(notificationPanelSource, /Save advanced task schedule/);
});`;
const newSystemTest = `test("notification Settings exposes one compact delivery control and one notification system", () => {
  assert.match(notificationPanelSource, /Phone notifications/);
  assert.match(notificationPanelSource, /checked=\\{phoneDeliveryReady\\}/);
  assert.match(notificationPanelSource, /aria-label="Phone notifications"/);
  assert.doesNotMatch(notificationPanelSource, /Notification delivery/);
  assert.doesNotMatch(notificationPanelSource, /Refresh phone notifications/);
  assert.doesNotMatch(notificationPanelSource, /Use in-app only/);
  assert.doesNotMatch(notificationPanelSource, /Delivery diagnostics/);
  assert.doesNotMatch(notificationPanelSource, /TaskReminderSettingsCard/);
  assert.doesNotMatch(notificationPanelSource, /Advanced delivery & task reminder tools/);
  assert.doesNotMatch(notificationPanelSource, /Save advanced task schedule/);
});`;
if (!testSource.includes(oldSystemTest)) {
  throw new Error("Expected notification Settings regression test was not found.");
}
testSource = testSource.replace(oldSystemTest, newSystemTest);
writeFileSync(testPath, testSource, "utf8");

console.log("Compact phone notification delivery UI prepared.");
