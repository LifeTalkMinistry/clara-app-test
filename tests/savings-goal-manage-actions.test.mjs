import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/pages/SavingsGoalsIntegrated.jsx", import.meta.url), "utf8");

test("Savings Goal detail keeps only primary actions visible", () => {
  const manageIndex = source.indexOf(">Manage Goal</Button>");
  assert.ok(manageIndex >= 0, "expected the Manage Goal action");
  const footerStart = source.lastIndexOf('<div className="border-t border-white/10 bg-[#041226]/96', manageIndex);
  const footerEnd = source.indexOf("</div></div></div></DialogContent></Dialog>", manageIndex);
  assert.ok(footerStart >= 0 && footerEnd > footerStart, "expected the Savings Goal detail footer");
  const footer = source.slice(footerStart, footerEnd);
  assert.match(footer, />Add Savings<\/Button>/);
  assert.match(footer, />Use Savings<\/Button>/);
  assert.match(footer, />Manage Goal<\/Button>/);
  assert.doesNotMatch(footer, />Correct Balance<\/Button>/);
  assert.doesNotMatch(footer, />Reconcile Wallet<\/Button>/);
  assert.doesNotMatch(footer, />Delete<\/Button>/);
  assert.doesNotMatch(footer, />Close<\/Button>/);
});

test("secondary Savings Goal controls live inside Manage Goal", () => {
  assert.match(source, /Manage Savings Goal/);
  assert.match(source, />Edit Goal<\/span>/);
  assert.match(source, />Release Savings<\/span>/);
  assert.match(source, />Fix Balance Issue<\/span>/);
  assert.match(source, />Delete Goal<\/span>/);
  assert.ok(source.includes('openReconciliation(hasBalanceMismatch ? "wallet_correct" : "both")'));
});
