from pathlib import Path

path = Path('src/components/community/ClaraOrbPage.jsx')
text = path.read_text()

anchor = 'const CLARA_FINANCE_DATA_UPDATED_EVENT = "clara:finance-data-updated";\n'
helper = '''\nfunction toDateKey(date) {\n  const value = date instanceof Date ? date : new Date(date);\n  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;\n}\n'''

if 'function toDateKey(date)' not in text:
    if anchor not in text:
        raise SystemExit('Expected Orb schedule anchor not found')
    text = text.replace(anchor, anchor + helper, 1)
    path.write_text(text)
    print('Added local toDateKey helper to ClaraOrbPage.jsx')
else:
    print('toDateKey helper already present; no change needed')
