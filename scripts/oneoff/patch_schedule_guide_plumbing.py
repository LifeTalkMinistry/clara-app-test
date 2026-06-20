from pathlib import Path
import re


def exact(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def rx(text, pattern, repl, label):
    updated, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return updated


renderer = Path("src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx")
text = renderer.read_text(encoding="utf-8")
text = exact(
    text,
    'const COMMITMENT_DECLINE_HOME_EVENT = "clara:commitment-decline-home";',
    'const COMMITMENT_DECLINE_HOME_EVENT = "clara:commitment-decline-home";\nconst CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT = "clara:guide-schedule-phase-change";\nconst CLARA_GUIDE_EXIT_EVENT = "clara:guide-exit";',
    "renderer constants",
)
text = exact(
    text,
    '  const [purchaseIntent, setPurchaseIntent] = useState(COMMITTED_MONTHLY_PURCHASE_INTENT);',
    '''  const [purchaseIntent, setPurchaseIntent] = useState(COMMITTED_MONTHLY_PURCHASE_INTENT);
  const [scheduleGuidePhase, setScheduleGuidePhase] = useState("inactive");
  const scheduleGuidePreviewActive =
    scheduleGuidePhase !== "inactive" && scheduleGuidePhase !== "await-schedule-tab";

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleScheduleGuidePhase = (event) => {
      setScheduleGuidePhase(event?.detail?.phase || "inactive");
    };
    const handleGuideExit = () => setScheduleGuidePhase("inactive");
    window.addEventListener(CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT, handleScheduleGuidePhase);
    window.addEventListener(CLARA_GUIDE_EXIT_EVENT, handleGuideExit);
    return () => {
      window.removeEventListener(CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT, handleScheduleGuidePhase);
      window.removeEventListener(CLARA_GUIDE_EXIT_EVENT, handleGuideExit);
    };
  }, []);''',
    "renderer state",
)
text = rx(
    text,
    r'  if \(activePanel === "schedule"\) \{\n    const content = <DashboardSchedulePanel />;\n    return \(\n      <>\n        \{!hasCommittedAccess \? \(\n          <LockedPanelPreview.*?\n        \{booklet\}\n      </>\n    \);\n  \}',
    '''  if (activePanel === "schedule") {
    const content = (
      <DashboardSchedulePanel
        guidePreviewMode={scheduleGuidePreviewActive}
        scheduleGuidePhase={scheduleGuidePhase}
      />
    );
    return (
      <>
        {!hasCommittedAccess && !scheduleGuidePreviewActive ? (
          <LockedPanelPreview onOpenCommitmentBooklet={() => openCommitmentBooklet(COMMITTED_MONTHLY_PURCHASE_INTENT)}>{content}</LockedPanelPreview>
        ) : (
          content
        )}
        {booklet}
      </>
    );
  }''',
    "renderer schedule block",
)
renderer.write_text(text, encoding="utf-8")

wrapper = Path("src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.jsx")
text = wrapper.read_text(encoding="utf-8")
text = exact(
    text,
    'export default function DashboardScheduleImpactPortalPanel() {',
    'export default function DashboardScheduleImpactPortalPanel({ guidePreviewMode = false, scheduleGuidePhase = "inactive" }) {',
    "wrapper signature",
)
text = exact(
    text,
    '  const startPlanner = async (form) => {',
    '  const startPlanner = async (form) => {\n    if (guidePreviewMode) return;',
    "AI guard",
)
text = exact(
    text,
    '      if (!label.includes("calculate money impact")) return;\n      event.preventDefault();',
    '      if (!label.includes("calculate money impact")) return;\n      event.preventDefault();\n      if (guidePreviewMode) {\n        event.stopPropagation();\n        event.stopImmediatePropagation?.();\n        return;\n      }',
    "click guard",
)
text = exact(
    text,
    '      if (!submitterText.includes("calculate money impact")) return;\n      event.preventDefault();',
    '      if (!submitterText.includes("calculate money impact")) return;\n      event.preventDefault();\n      if (guidePreviewMode) {\n        event.stopPropagation();\n        event.stopImmediatePropagation?.();\n        return;\n      }',
    "submit guard",
)
text = exact(text, '  }, [planner, panelKey]);', '  }, [guidePreviewMode, planner, panelKey]);', "dependencies")
text = exact(
    text,
    '    <div ref={rootRef} className="contents">\n      <OriginalDashboardSchedulePanel key={panelKey} />',
    '''    <div ref={rootRef} className="contents" data-clara-guide-schedule-wrapper={guidePreviewMode ? "true" : undefined}>
      <OriginalDashboardSchedulePanel
        key={panelKey}
        guidePreviewMode={guidePreviewMode}
        scheduleGuidePhase={scheduleGuidePhase}
      />''',
    "forward props",
)
wrapper.write_text(text, encoding="utf-8")

print("Schedule Guide plumbing patched")
