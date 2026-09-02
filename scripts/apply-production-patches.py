import runpy
from pathlib import Path

PATCHES = [
    'patch-savings-goal-complete.py',
    'patch-savings-completion-ledger-repair.py',
    'patch-wallet-completed-savings-link.py',
    'patch-savings-completion-correction-repair.py',
]

base = Path(__file__).resolve().parent
repo_root = base.parent

# The semantic conversation-action wrapper added one JSX indentation level around
# the Savings Goal action region. The legacy production patch intentionally
# matches the canonical Add Fund / Move Fund Out pair, so normalize only that
# whitespace before running it. JSX behavior is unchanged; this keeps the
# production patch idempotent without weakening its structural checks.
overlay = repo_root / 'src/components/fresh/main-dashboard/assistant/ClaraSavingsGoalOverlay.jsx'
if overlay.exists():
    source = overlay.read_text()
    canonical = (
        '              <ReplyButton onClick={startAddFund} disabled={saving}>Add Fund</ReplyButton>\n'
        '              <ReplyButton onClick={startMoveFundOut} disabled={saving || getGoalSavedAmount(selectedManagedGoal) <= 0}>Move Fund Out</ReplyButton>'
    )
    nested = (
        '                <ReplyButton onClick={startAddFund} disabled={saving}>Add Fund</ReplyButton>\n'
        '                <ReplyButton onClick={startMoveFundOut} disabled={saving || getGoalSavedAmount(selectedManagedGoal) <= 0}>Move Fund Out</ReplyButton>'
    )
    if canonical not in source and nested in source:
        overlay.write_text(source.replace(nested, canonical, 1))

for patch in PATCHES:
    runpy.run_path(str(base / patch), run_name='__main__')
