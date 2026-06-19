from pathlib import Path
import re

ROOT = Path.cwd()


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, content):
    target = ROOT / path
    target.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count}: {old[:90]!r}")
    write(path, text.replace(old, new, 1))


def replace_regex(path, pattern, replacement):
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Expected one regex match in {path}, found {count}: {pattern[:90]!r}")
    write(path, updated)


summary = "src/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable.jsx"
replace_once(
    summary,
    'import { useCallback, useEffect, useRef } from "react";\nimport { Eye, EyeOff } from "lucide-react";\n\nconst SINGLE_TAP_DELAY = 240;\nconst DOUBLE_TAP_WINDOW = 280;\nconst LONG_PRESS_DELAY = 550;\nconst MOVE_CANCEL_DISTANCE = 12;\n',
    'import { useCallback } from "react";\nimport { Eye, EyeOff } from "lucide-react";\nimport useClaraOrbGestureController from "@/components/fresh/main-dashboard/money-summary/useClaraOrbGestureController";\n',
)
replace_once(
    summary,
    '''  onGuidePrivacyToggle,\n  moneyLeftSummaryHandlers = {},''',
    '''  onGuidePrivacyToggle,\n  isGuideOrbLessonActive = false,\n  guideOrbExpectedAction = null,\n  onGuideOrbSingleTap,\n  onGuideOrbDoubleTap,\n  onGuideOrbLongPress,\n  onOrbSingleTap,\n  onOrbDoubleTap,\n  onOrbLongPress,\n  moneyLeftSummaryHandlers = {},''',
)
replace_regex(
    summary,
    r'''  const tapTimerRef = useRef\(null\);.*?  const handleOrbClick = useCallback\(\n    \(event\) => \{\n      stopOrbEvent\(event\);\n    \},\n    \[stopOrbEvent\]\n  \);\n\n''',
    r'''  const spacingClass = flushSpacing ? "mt-0" : "mt-2";
  const effectiveMoneySummaryVisible = isGuidePrivacyStepActive
    ? guideMoneySummaryVisible
    : moneySummaryVisible;

  const productionSingleTap = useCallback(() => {
    if (typeof onOrbSingleTap === "function") {
      onOrbSingleTap();
      return;
    }
    moneyLeftSummaryHandlers?.openManualExpenseFromMoneyLeft?.();
  }, [moneyLeftSummaryHandlers, onOrbSingleTap]);

  const productionDoubleTap = useCallback(
    (event) => {
      if (typeof onOrbDoubleTap === "function") {
        onOrbDoubleTap(event);
        return;
      }
      moneyLeftSummaryHandlers?.openTransactionHubFromMoneyLeft?.(event);
    },
    [moneyLeftSummaryHandlers, onOrbDoubleTap]
  );

  const {
    handleOrbPointerDown,
    handleOrbPointerMove,
    handleOrbPointerUp,
    handleOrbCancel,
    handleOrbClick,
    handleOrbKeyDown,
    handleOrbKeyUp,
  } = useClaraOrbGestureController({
    isGuideMode,
    isGuideOrbLessonActive,
    guideOrbExpectedAction,
    onGuideOrbSingleTap,
    onGuideOrbDoubleTap,
    onGuideOrbLongPress,
    onProductionSingleTap: productionSingleTap,
    onProductionDoubleTap: productionDoubleTap,
    onProductionLongPress: onOrbLongPress,
    stopLegacyOrbEvent: stopMoneyLeftOrbEvent,
  });

''',
)
replace_once(
    summary,
    '''          onPointerCancel={handleOrbCancel}\n          onPointerLeave={handleOrbCancel}\n          onContextMenu={handleOrbClick}''',
    '''          onPointerCancel={handleOrbCancel}\n          onPointerLeave={handleOrbCancel}\n          onKeyDown={handleOrbKeyDown}\n          onKeyUp={handleOrbKeyUp}\n          onBlur={handleOrbCancel}\n          onContextMenu={handleOrbClick}''',
)

home = "src/components/fresh/main-dashboard/shell/DashboardHomePanel.jsx"
replace_once(
    home,
    'import DashboardMoneySummaryStable from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable";\n',
    'import DashboardMoneySummaryStable from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable";\nimport ClaraGuideOrbLessonOverlays from "@/components/fresh/main-dashboard/guide/ClaraGuideOrbLessonOverlays";\nimport useClaraGuideOrbLesson, { GUIDE_FEATURE_MONEY_LEFT_ORB } from "@/components/fresh/main-dashboard/guide/useClaraGuideOrbLesson";\n',
)
replace_once(
    home,
    '''  financeActionLoading,\n  openManualExpenseModal,''',
    '''  financeActionLoading,\n  openManualExpenseModal,\n  closeFinanceModal,''',
)
replace_once(
    home,
    '''  const effectiveWallets = wallets;''',
    '''  const openProductionClaraAi = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("clara:open-ai-environment", {
        detail: { source: "money-left-orb", guideSimulationMode: false },
      })
    );
  }, []);

  const orbGuide = useClaraGuideOrbLesson({
    isGuideMode,
    openManualExpenseModal,
    closeFinanceModal,
  });
  const isMoneyLeftOrbGuideActive =
    isGuideMode && guideFeature === GUIDE_FEATURE_MONEY_LEFT_ORB && orbGuide.isActive;

  const effectiveWallets = wallets;''',
)
replace_regex(
    home,
    r'''  const handleGuidePrivacyComplete = useCallback\(\(\) => \{\n    if \(!isMoneyLeftPrivacyGuideActive \|\| moneyLeftPrivacyPhase !== "complete"\) return;\n    if \(typeof window === "undefined"\) return;\n\n    window\.dispatchEvent\(\n      new CustomEvent\(CLARA_GUIDE_FEATURE_COMPLETE_EVENT, \{\n        detail: \{ feature: GUIDE_FEATURE_MONEY_LEFT_PRIVACY \},\n      \}\)\n    \);\n  \}, \[isMoneyLeftPrivacyGuideActive, moneyLeftPrivacyPhase\]\);''',
    r'''  const handleGuidePrivacyComplete = useCallback(() => {
    if (!isMoneyLeftPrivacyGuideActive || moneyLeftPrivacyPhase !== "complete") return;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(CLARA_GUIDE_FEATURE_COMPLETE_EVENT, {
          detail: { feature: GUIDE_FEATURE_MONEY_LEFT_PRIVACY },
        })
      );
    }

    setGuideFeature(GUIDE_FEATURE_MONEY_LEFT_ORB);
    setGuideStep(0);
    setGuideRootFeatureClass(null);
    orbGuide.start();
  }, [isMoneyLeftPrivacyGuideActive, moneyLeftPrivacyPhase, orbGuide]);''',
)
replace_once(
    home,
    '''      {isGuideIntroOpen ? (''',
    '''      <ClaraGuideOrbLessonOverlays controller={orbGuide} />\n\n      {isGuideIntroOpen ? (''',
)
replace_once(
    home,
    '''            moneyLeftSummaryHandlers={isGuideMode ? undefined : moneyLeftSummaryHandlers}\n            handleMoneyLeftOrbClick={isGuideMode ? undefined : handleMoneyLeftOrbClick}\n            startMoneyLeftOrbLongPress={isGuideMode ? undefined : startMoneyLeftOrbLongPress}\n            moveMoneyLeftOrbLongPress={isGuideMode ? undefined : moveMoneyLeftOrbLongPress}\n            endMoneyLeftOrbLongPress={isGuideMode ? undefined : endMoneyLeftOrbLongPress}\n            stopMoneyLeftOrbEvent={isGuideMode ? undefined : stopMoneyLeftOrbEvent}''',
    '''            isGuideOrbLessonActive={isMoneyLeftOrbGuideActive}\n            guideOrbExpectedAction={orbGuide.expectedAction}\n            onGuideOrbSingleTap={orbGuide.onGuideOrbSingleTap}\n            onGuideOrbDoubleTap={orbGuide.onGuideOrbDoubleTap}\n            onGuideOrbLongPress={orbGuide.onGuideOrbLongPress}\n            onOrbSingleTap={openManualExpenseModal}\n            onOrbDoubleTap={moneyLeftSummaryHandlers?.openTransactionHubFromMoneyLeft}\n            onOrbLongPress={openProductionClaraAi}\n            stopMoneyLeftOrbEvent={stopMoneyLeftOrbEvent}''',
)

dashboard = "src/pages/Dashboard.jsx"
replace_once(
    dashboard,
    '''            openManualExpenseModal, saveSurvivalExpenseInline, openBudgetModal,''',
    '''            openManualExpenseModal, closeFinanceModal, saveSurvivalExpenseInline, openBudgetModal,''',
)

main = "src/main.jsx"
replace_once(
    main,
    'import "./guide-mode-money-left-orb.css";\n',
    'import "./guide-mode-money-left-orb.css";\nimport "./guide-mode-money-left-orb-react-layout.css";\nimport "./guide-mode-money-left-orb-react-controls.css";\n',
)

for stale in [
    "docs/clara-orb-guide-architecture.md",
    "src/components/fresh/main-dashboard/guide/ClaraGuideFeatureControls.jsx",
    "src/components/fresh/main-dashboard/guide/ClaraGuideOrbBubble.jsx",
    "src/context/ClaraGuideSimulationContext.jsx",
    "src/context/ClaraGuideSimulationProvider.jsx",
    "src/runtime/ClaraGuideMoneyLeftOrbController.jsx",
]:
    target = ROOT / stale
    if target.exists():
        target.unlink()

print("Core CLARA orb guide migration applied.")
