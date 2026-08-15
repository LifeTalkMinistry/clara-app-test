import { readFileSync, writeFileSync } from "node:fs";

const panelPath = "src/components/notifications/NotificationSettingsPanel.jsx";
let source = readFileSync(panelPath, "utf8");

source = source.replace("  Bell,\n", "");

const statusStart = "  const phoneDeliveryStatusLabel = phoneDeliveryReady";
const returnMarker = "\n\n  return (\n";
const statusStartIndex = source.indexOf(statusStart);
const returnIndex = source.indexOf(returnMarker, statusStartIndex);
if (statusStartIndex < 0 || returnIndex < 0) {
  throw new Error("Expected phone delivery status block was not found.");
}
source = source.slice(0, statusStartIndex) + source.slice(returnIndex);

const deliverySectionStart = '      <section className="rounded-[20px] border border-[#1d4b7b]/45 bg-[#06142a] px-4 py-3">';
const familyMarker = '      <section>\n        <div className="mb-3 px-1">\n          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">\n            Notification families';
const deliveryStartIndex = source.indexOf(deliverySectionStart);
const familyStartIndex = source.indexOf(familyMarker, deliveryStartIndex);
if (deliveryStartIndex < 0 || familyStartIndex < 0) {
  throw new Error("Expected phone notification delivery section was not found.");
}

const cleanDeliverySection = `      <section className="rounded-[20px] border border-[#1d4b7b]/45 bg-[#06142a] px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-black text-white">Phone notifications</p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-white/40">
              {phoneDeliveryReady ? "On" : "Off"}
            </span>
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
        </div>
      </section>

`;

source = source.slice(0, deliveryStartIndex) + cleanDeliverySection + source.slice(familyStartIndex);

for (const forbidden of [
  "Notification delivery",
  "Refresh phone notifications",
  "Use in-app only",
  "phoneDeliveryIssue",
  "Needs attention",
  "Fixing...",
  "Receive CLARA reminders outside the app",
]) {
  if (source.includes(forbidden)) {
    throw new Error(`Phone notification UI residue remains: ${forbidden}`);
  }
}
for (const required of [
  "Phone notifications",
  'checked={phoneDeliveryReady}',
  'aria-label="Phone notifications"',
  '{phoneDeliveryReady ? "On" : "Off"}',
  "void enableDeviceNotifications()",
  "void useInAppOnly()",
]) {
  if (!source.includes(required)) {
    throw new Error(`Clean phone notification toggle is missing: ${required}`);
  }
}

writeFileSync(panelPath, source, "utf8");

const testPath = "tests/notification-runtime-contracts.test.mjs";
let testSource = readFileSync(testPath, "utf8");

const oldReadinessTest = `test("phone delivery status requires live capability, permission, and configuration", () => {
  assert.match(notificationPanelSource, /deliveryWantsDevice/);
  assert.match(notificationPanelSource, /taskReminderSettings\\.pushSupported/);
  assert.match(
    notificationPanelSource,
    /taskReminderSettings\\.permissionState === "granted"/
  );
  assert.match(notificationPanelSource, /taskReminderSettings\\.pushConfigured/);
  assert.match(notificationPanelSource, /phoneDeliveryIssue/);
  assert.match(notificationPanelSource, /Needs attention/);
  assert.match(notificationPanelSource, /In-app notifications remain active/);
});`;

const newReadinessTest = `test("phone delivery toggle reflects live capability, permission, and configuration", () => {
  assert.match(notificationPanelSource, /deliveryWantsDevice/);
  assert.match(notificationPanelSource, /taskReminderSettings\\.pushSupported/);
  assert.match(
    notificationPanelSource,
    /taskReminderSettings\\.permissionState === "granted"/
  );
  assert.match(notificationPanelSource, /taskReminderSettings\\.pushConfigured/);
  assert.match(notificationPanelSource, /checked=\\{phoneDeliveryReady\\}/);
  assert.match(notificationPanelSource, /phoneDeliveryReady \\? "On" : "Off"/);
  assert.doesNotMatch(notificationPanelSource, /phoneDeliveryIssue/);
  assert.doesNotMatch(notificationPanelSource, /Needs attention/);
});`;

if (!testSource.includes(oldReadinessTest)) {
  throw new Error("Expected phone delivery readiness regression test was not found.");
}
testSource = testSource.replace(oldReadinessTest, newReadinessTest);

const oldCompactTest = `test("notification Settings exposes one compact delivery control and one notification system", () => {
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

const newCompactTest = `test("notification Settings exposes one clean On/Off phone delivery control", () => {
  assert.match(notificationPanelSource, /Phone notifications/);
  assert.match(notificationPanelSource, /checked=\\{phoneDeliveryReady\\}/);
  assert.match(notificationPanelSource, /aria-label="Phone notifications"/);
  assert.match(notificationPanelSource, /phoneDeliveryReady \\? "On" : "Off"/);
  assert.doesNotMatch(notificationPanelSource, /Notification delivery/);
  assert.doesNotMatch(notificationPanelSource, /Refresh phone notifications/);
  assert.doesNotMatch(notificationPanelSource, /Use in-app only/);
  assert.doesNotMatch(notificationPanelSource, /Needs attention/);
  assert.doesNotMatch(notificationPanelSource, /Fixing\\.\\.\\./);
  assert.doesNotMatch(notificationPanelSource, /Receive CLARA reminders outside the app/);
  assert.doesNotMatch(notificationPanelSource, /Delivery diagnostics/);
  assert.doesNotMatch(notificationPanelSource, /TaskReminderSettingsCard/);
  assert.doesNotMatch(notificationPanelSource, /Advanced delivery & task reminder tools/);
  assert.doesNotMatch(notificationPanelSource, /Save advanced task schedule/);
});`;

if (!testSource.includes(oldCompactTest)) {
  throw new Error("Expected compact notification Settings regression test was not found.");
}
testSource = testSource.replace(oldCompactTest, newCompactTest);
writeFileSync(testPath, testSource, "utf8");

console.log("Clean On/Off phone notification toggle prepared.");
