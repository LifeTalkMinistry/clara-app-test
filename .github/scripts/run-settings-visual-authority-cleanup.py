from pathlib import Path
import re
import runpy

original_sub = re.sub


def literal_replacement_sub(pattern, replacement, string, *args, **kwargs):
    if isinstance(replacement, str):
        literal_value = replacement
        replacement = lambda _match: literal_value
    return original_sub(pattern, replacement, string, *args, **kwargs)


re.sub = literal_replacement_sub
runpy.run_path(
    ".github/scripts/settings-visual-authority-cleanup.py",
    run_name="__main__",
)

runner_path = Path(__file__)
if runner_path.exists():
    runner_path.unlink()
