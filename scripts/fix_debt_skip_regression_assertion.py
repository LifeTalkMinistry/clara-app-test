from pathlib import Path

path = Path("tests/debt-skip-occurrence-regression.test.mjs")
text = path.read_text()
text = text.replace('  assert.match(card, />Pay</);\n', '  assert.match(card, /"Pay"/);\n')
text = text.replace('  assert.match(card, />Skip</);\n', '  assert.match(card, /"Skip"/);\n')
path.write_text(text)
print("Debt Skip verifier assertions normalized.")
