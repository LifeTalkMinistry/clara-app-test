import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/pages/SavingsGoalsIntegrated.jsx", import.meta.url), "utf8");

test("Manage Savings Goal uses a dedicated responsive action sheet", () => {
  assert.ok(source.includes('const manageDialogClass = "left-[50%] top-auto bottom-[max(0.5rem,env(safe-area-inset-bottom))]'));
  assert.ok(source.includes('translate-y-0 gap-0'));
  assert.ok(source.includes('sm:top-[50%] sm:bottom-auto sm:w-full sm:translate-y-[-50%]'));
  assert.ok(source.includes('<DialogContent className={manageDialogClass}>'));
  assert.ok(source.includes('pb-[max(1rem,env(safe-area-inset-bottom))]'));
});

test("Savings detail and action dialogs never compete on screen", () => {
  assert.ok(source.includes('const detailActionOpen = manageOpen || addSavingsOpen || useSavingsOpen || overAmountOpen || releaseSavingsOpen || correctionOpen || reconciliationOpen;'));
  assert.ok(source.includes('open={Boolean(goal) && !detailActionOpen}'));
  assert.ok(source.includes('open={addSavingsOpen && !overAmountOpen}'));
});

test("Manage action rows wrap and secondary dialogs open cleanly", () => {
  const start = source.indexOf('<Dialog open={manageOpen}');
  const end = source.indexOf('<Dialog open={addSavingsOpen && !overAmountOpen}', start);
  assert.ok(start >= 0 && end > start, "expected the Manage Savings Goal block");
  const manage = source.slice(start, end);
  assert.ok(manage.includes('items-start justify-start whitespace-normal'));
  assert.ok(manage.includes('min-w-0 flex-1'));
  assert.ok(manage.includes('whitespace-normal break-words'));
  assert.ok(manage.includes('setManageOpen(false); onClose(); onEdit(goal);'));
  assert.ok(manage.includes('setManageOpen(false); onClose(); onDelete(goal);'));
  assert.ok(!manage.includes('className={formDialogClass}'));
});
