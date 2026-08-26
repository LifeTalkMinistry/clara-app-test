from pathlib import Path

router = Path('src/runtime/installClaraOrbCommandChatRouting.js')
text = router.read_text()
text = text.replace('  "debt-obligation": "debt-obligation",\n', '')
router.write_text(text)

orb = Path('src/components/community/ClaraOrbPage.jsx')
text = orb.read_text()
text = text.replace('import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";\n', 'import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";\nimport useUserRole from "@/hooks/useUserRole";\nimport ClaraDebtObligationOverlay from "@/components/fresh/main-dashboard/assistant/ClaraDebtObligationOverlay.jsx";\n')
text = text.replace('  CLARA_ORB_COMMANDS,\n', '  CLARA_ORB_COMMAND_SELECT_EVENT,\n  CLARA_ORB_COMMANDS,\n')
text = text.replace('export default function ClaraOrbPage({ onActivate, activationDelayMs = 0 }) {\n  const [launching, setLaunching] = useState(false);', 'export default function ClaraOrbPage({ onActivate, activationDelayMs = 0 }) {\n  const { user } = useUserRole();\n  const [debtObligationOpen, setDebtObligationOpen] = useState(false);\n  const [launching, setLaunching] = useState(false);')
anchor = '  useEffect(() => {\n    if (typeof window === "undefined") return undefined;\n    const refreshPastSchedule = () => setPastSchedule(readPastOrbSchedule());'
insert = '''  useEffect(() => {\n    if (typeof window === "undefined") return undefined;\n\n    const handleOrbOwnedDebt = (event) => {\n      const commandId = String(event?.detail?.commandId || "").trim();\n      if (commandId !== "debt-obligation") return;\n      event.preventDefault?.();\n      setDebtObligationOpen(true);\n    };\n\n    window.addEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleOrbOwnedDebt);\n    return () => window.removeEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleOrbOwnedDebt);\n  }, []);\n\n'''
if insert not in text:
    text = text.replace(anchor, insert + anchor)
render_anchor = '    >\n      {pastSchedule ? ('
render_insert = '''    >\n      {debtObligationOpen ? (\n        <ClaraDebtObligationOverlay\n          isActive\n          claraAssistantContext={{ user }}\n          onClose={() => setDebtObligationOpen(false)}\n        />\n      ) : null}\n      {pastSchedule ? ('''
text = text.replace(render_anchor, render_insert, 1)
orb.write_text(text)
