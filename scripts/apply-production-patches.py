import runpy
from pathlib import Path

PATCHES = [
    'patch-savings-goal-complete.py',
    'patch-savings-completion-ledger-repair.py',
    'patch-wallet-completed-savings-link.py',
    'patch-savings-completion-correction-repair.py',
]

base = Path(__file__).resolve().parent
for patch in PATCHES:
    runpy.run_path(str(base / patch), run_name='__main__')
