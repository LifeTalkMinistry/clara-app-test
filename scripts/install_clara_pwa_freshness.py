from pathlib import Path

TARGET = Path(__file__).resolve().parents[1] / "src/runtime/installClaraOrbGreeting.js"
source = TARGET.read_text(encoding="utf-8")
import_line = 'import "./installClaraPwaFreshness";\n'

if import_line not in source:
    source = import_line + source
    TARGET.write_text(source, encoding="utf-8")
    print("Installed CLARA PWA freshness runtime import.")
else:
    print("CLARA PWA freshness runtime already wired.")
