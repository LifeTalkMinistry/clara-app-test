import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const ensureImportAfter = (anchor, imports) => {
  if (!source.includes(anchor)) {
    throw new Error(`Import anchor not found: ${anchor.trim()}`);
  }

  const missingImports = imports.filter((line) => !source.includes(line.trim()));
  if (!missingImports.length) return;

  source = source.replace(anchor, `${anchor}${missingImports.join("")}`);
};

ensureImportAfter(
  'import DashboardTopNav from "@/components/fresh/main-dashboard/top-nav/DashboardTopNav";\n',
  [
    'import DashboardShell from "@/components/fresh/main-dashboard/shell/DashboardShell";\n',
    'import DashboardContentArea from "@/components/fresh/main-dashboard/shell/DashboardContentArea";\n',
    'import DashboardPanelRenderer from "@/components/fresh/main-dashboard/shell/DashboardPanelRenderer";\n',
    'import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";\n',
  ]
);

const rootOpen = `  return (
    <div
      ref={dashboardScrollRef}
      className={\`theme-page-shell relative isolate z-0 w-full max-w-[430px] mx-auto \${dashboardScale.page} overflow-x-hidden \${dashboardSmartScrollClass}\`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >`;

const rootOpenReplacement = `  return (
    <DashboardShell
      as="div"
      ref={dashboardScrollRef}
      baseClassName=""
      className={\`theme-page-shell relative isolate z-0 w-full max-w-[430px] mx-auto \${dashboardScale.page} overflow-x-hidden \${dashboardSmartScrollClass}\`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >`;

if (source.includes(rootOpen)) {
  source = source.replace(rootOpen, rootOpenReplacement);
} else if (!source.includes("<DashboardShell") || !source.includes("ref={dashboardScrollRef}")) {
  throw new Error("Dashboard root shell boundary not found.");
}

const contentOpen = `      <div
        ref={dashboardContentRef}
        className={\`mx-auto w-full max-w-[430px] \${
          activeDashboardPanel === "messages"
            ? "mt-3 px-[clamp(14px,4vw,18px)] pb-0 [padding-bottom:0!important]"
            : \`\${dashboardScale.content} \${activeDashboardPanel === "home" ? dashboardSmartContentClass : "[padding-bottom:0!important]"}\`
        }\`}
      >`;

const contentOpenReplacement = `      <DashboardContentArea
        ref={dashboardContentRef}
        className={\`mx-auto w-full max-w-[430px] \${
          activeDashboardPanel === "messages"
            ? "mt-3 px-[clamp(14px,4vw,18px)] pb-0 [padding-bottom:0!important]"
            : \`\${dashboardScale.content} \${activeDashboardPanel === "home" ? dashboardSmartContentClass : "[padding-bottom:0!important]"}\`
        }\`}
      >`;

if (source.includes(contentOpen)) {
  source = source.replace(contentOpen, contentOpenReplacement);
} else if (!source.includes("<DashboardContentArea") || !source.includes("ref={dashboardContentRef}")) {
  throw new Error("Dashboard content area boundary not found.");
}

if (!source.includes("<DashboardPanelRenderer")) {
  const panelStartNeedle = '          {activeDashboardPanel === "home" ? (\n            <>\n';
  const homeCloseNeedle = '\n            </>\n          ) : activeDashboardPanel === "feed" ? (';
  const settingsNeedle = '          ) : activeDashboardPanel === "settings" ? (';
  const panelEndNeedle = '          ) : null}';

  const panelStart = source.indexOf(panelStartNeedle);
  if (panelStart === -1) throw new Error("Dashboard home panel start boundary not found.");

  const homeStart = panelStart + panelStartNeedle.length;
  const homeEnd = source.indexOf(homeCloseNeedle, homeStart);
  if (homeEnd === -1) throw new Error("Dashboard home panel closing boundary not found.");

  const settingsStart = source.indexOf(settingsNeedle, homeEnd);
  if (settingsStart === -1) throw new Error("Dashboard settings panel boundary not found.");

  const panelEnd = source.indexOf(panelEndNeedle, settingsStart);
  if (panelEnd === -1) throw new Error("Dashboard panel conditional end boundary not found.");

  const homeContent = source.slice(homeStart, homeEnd);
  const renderer = `          <DashboardPanelRenderer
            activePanel={activeDashboardPanel}
            renderHome={() => (
              <>
${homeContent}
              </>
            )}
            renderFeed={() => <DashboardFeedPanel onBack={closeDashboardPanel} />}
            renderMessages={() => <DashboardMessagesPanel onBack={closeDashboardPanel} />}
            renderSettings={() => (
              <DashboardSettingsPanel
                onBack={closeDashboardPanel}
                user={user}
                plan={plan}
                isPaid={isPaid}
                isFree={isFree}
                isAdmin={isAdmin}
                notificationSettings={notificationSettings}
                openThemePicker={openThemePicker}
                resetThemeToDefault={resetDashboardThemeToDefault}
                onOpenMessages={() => openDashboardPanel("messages")}
              />
            )}
          />`;

  source = source.slice(0, panelStart) + renderer + source.slice(panelEnd + panelEndNeedle.length);
}

const contentClose = `        </div>
      </div>


      <DashboardFinanceExpandedSheet`;
const contentCloseReplacement = `        </div>
      </DashboardContentArea>

      <DashboardModalLayer>
        <DashboardFinanceExpandedSheet`;

if (source.includes(contentClose)) {
  source = source.replace(contentClose, contentCloseReplacement);
} else if (!source.includes("</DashboardContentArea>") || !source.includes("<DashboardModalLayer>")) {
  throw new Error("Dashboard content close / modal layer boundary not found.");
}

const rootClose = `    </div>
  );
}`;
const rootCloseReplacement = `      </DashboardModalLayer>
    </DashboardShell>
  );
}`;

if (!source.includes("</DashboardShell>")) {
  const trimmedSource = source.trimEnd();
  const trailingWhitespace = source.slice(trimmedSource.length);

  if (!trimmedSource.endsWith(rootClose)) {
    throw new Error("Dashboard root closing boundary not found.");
  }

  source =
    trimmedSource.slice(0, -rootClose.length) +
    rootCloseReplacement +
    trailingWhitespace;
}

const requiredTokens = [
  "<DashboardShell",
  "</DashboardShell>",
  "<DashboardContentArea",
  "</DashboardContentArea>",
  "<DashboardPanelRenderer",
  "<DashboardModalLayer>",
  "</DashboardModalLayer>",
  "setDashboardPanelDirection",
  "setActiveDashboardPanel",
];

for (const token of requiredTokens) {
  if (!source.includes(token)) {
    throw new Error(`Required Dashboard token missing after patch: ${token}`);
  }
}

if (source.includes('useDashboardPanelController')) {
  throw new Error("useDashboardPanelController should not be wired because the current panel logic also tracks direction.");
}

if (source === original) {
  console.log("Dashboard shell atoms are already wired.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Wired Dashboard shell atoms, delta: ${source.length - original.length} characters.`);
