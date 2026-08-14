from pathlib import Path

path = Path("src/pages/onboarding/UniversalOnboarding.jsx")
text = path.read_text()

replacements = [
    (
        "const revealDelay = 0.2 + index * 0.065;",
        "const revealDelay = 0.22 + index * 0.08;",
    ),
    (
        "const floatDelay = 1.05 + index * 0.16;",
        "const floatDelay = 1.28 + index * 0.14;",
    ),
    (
        "initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}",
        "initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.965 }}",
    ),
    (
        "duration: 0.52,",
        "duration: 0.58,",
    ),
    (
        "animate={reduceMotion ? undefined : { y: [0, -1.4, 0, 0.8, 0] }}",
        "animate={reduceMotion ? undefined : { y: [0, -2, 0, 1.5, 0] }}",
    ),
    (
        "duration: 4.6,",
        "duration: 3.2,",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one occurrence of {old!r}, found {count}")
    text = text.replace(old, new, 1)

path.write_text(text)
