import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/financial-carousel/cards/budget/ui/BudgetCardContent.jsx", import.meta.url),
  "utf8",
);

test("budget documentation is portaled to document.body and keeps its intended top offset", () => {
  assert.match(source, /import \{ createPortal \} from "react-dom"/);
  assert.match(source, /return createPortal\(/);
  assert.match(source, /pt-\[128px\]/);
  assert.match(source, /document\.body/);
});
