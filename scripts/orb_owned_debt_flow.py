from pathlib import Path

router = Path('src/runtime/installClaraOrbCommandChatRouting.js')
text = router.read_text()
route_entry = '  "debt-obligation": "debt-obligation",\n'
if route_entry not in text:
    anchor = '  "savings-goal": "savings-goal",\n'
    if anchor not in text:
        raise SystemExit('Could not find CLARA chat command routing anchor')
    text = text.replace(anchor, anchor + route_entry, 1)
router.write_text(text)

orb = Path('src/components/community/ClaraOrbPage.jsx')
text = orb.read_text()

# Debt must not own a second overlay inside the Orb page. The canonical app-level
# command router opens ClaraAiEnvironmentOverlay, which already owns the dedicated
# Debt / Obligations conversational flow and the complete financial context.
text = text.replace('import useUserRole from "@/hooks/useUserRole";\n', '', 1)
text = text.replace('import ClaraDebtObligationOverlay from "@/components/fresh/main-dashboard/assistant/ClaraDebtObligationOverlay.jsx";\n', '', 1)
text = text.replace('  CLARA_ORB_COMMAND_SELECT_EVENT,\n', '', 1)
text = text.replace('  const { user } = useUserRole();\n', '', 1)
text = text.replace('  const [debtObligationOpen, setDebtObligationOpen] = useState(false);\n', '', 1)

owned_effect = '''  useEffect(() => {\n    if (typeof window === "undefined") return undefined;\n\n    const handleOrbOwnedDebt = (event) => {\n      const commandId = String(event?.detail?.commandId || "").trim();\n      if (commandId !== "debt-obligation") return;\n      event.preventDefault?.();\n      setDebtObligationOpen(true);\n    };\n\n    window.addEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleOrbOwnedDebt);\n    return () => window.removeEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleOrbOwnedDebt);\n  }, []);\n\n'''
if owned_effect in text:
    text = text.replace(owned_effect, '', 1)

owned_render = '''      {debtObligationOpen ? (\n        <ClaraDebtObligationOverlay\n          isActive\n          claraAssistantContext={{ user }}\n          onClose={() => setDebtObligationOpen(false)}\n        />\n      ) : null}\n'''
if owned_render in text:
    text = text.replace(owned_render, '', 1)

for stale in (
    'ClaraDebtObligationOverlay',
    'debtObligationOpen',
    'setDebtObligationOpen',
    'handleOrbOwnedDebt',
):
    if stale in text:
        raise SystemExit(f'Stale Orb-owned Debt code remains: {stale}')

orb.write_text(text)
