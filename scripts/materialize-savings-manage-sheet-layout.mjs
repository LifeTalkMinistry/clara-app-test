import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pagePath = "src/pages/SavingsGoalsIntegrated.jsx";
const packagePath = "package.json";
const testPath = "tests/savings-manage-sheet-layout.test.mjs";
const markerPath = ".savings-manage-sheet-layout-request";
const scriptPath = fileURLToPath(import.meta.url);

let source = readFileSync(pagePath, "utf8");

function replaceOnce(input, searchValue, replacement, label) {
  const next = input.replace(searchValue, replacement);
  if (next === input) throw new Error(`Could not apply ${label}.`);
  return next;
}

source = replaceOnce(
  source,
  /(const detailDialogClass = "[^"]+";\n)/,
  `$1const manageDialogClass = "left-[50%] top-auto bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-[80] w-[calc(100vw-1rem)] max-w-[27rem] max-h-[min(78dvh,34rem)] translate-x-[-50%] translate-y-0 gap-0 overflow-hidden rounded-[26px] border border-white/10 bg-[#061224] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:top-[50%] sm:bottom-auto sm:w-full sm:translate-y-[-50%] [&>button]:top-3 [&>button]:right-3 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:bg-white/5 [&>button]:text-white/75 [&>button]:hover:bg-white/10 [&>button]:hover:text-white";\n`,
  "Manage dialog class",
);

source = replaceOnce(
  source,
  '  const addExceedsRemaining = requestedAddAmount > remaining && remaining > 0;\n',
  '  const addExceedsRemaining = requestedAddAmount > remaining && remaining > 0;\n  const detailActionOpen = manageOpen || addSavingsOpen || useSavingsOpen || overAmountOpen || releaseSavingsOpen || correctionOpen || reconciliationOpen;\n',
  "single visible Savings dialog state",
);

source = replaceOnce(
  source,
  '    <Dialog open={Boolean(goal)} onOpenChange={(value) => !value && !savingAmount && onClose()}>',
  '    <Dialog open={Boolean(goal) && !detailActionOpen} onOpenChange={(value) => !value && !savingAmount && onClose()}>',
  "hide detail dialog behind action sheets",
);

source = replaceOnce(
  source,
  '    <Dialog open={addSavingsOpen} onOpenChange=',
  '    <Dialog open={addSavingsOpen && !overAmountOpen} onOpenChange=',
  "hide Add Savings behind its amount confirmation",
);

const manageStart = source.indexOf('    <Dialog open={manageOpen}');
const addSavingsStart = source.indexOf('    <Dialog open={addSavingsOpen && !overAmountOpen}', manageStart);
if (manageStart < 0 || addSavingsStart < 0) throw new Error("Could not locate the Manage Savings Goal dialog.");

const manageDialog = `    <Dialog open={manageOpen} onOpenChange={(value) => { if (!savingAmount) setManageOpen(value); }}>
      <DialogContent className={manageDialogClass}>
        <div className="flex min-h-0 max-h-[inherit] flex-col">
          <DialogHeader className="shrink-0 border-b border-white/10 px-5 py-4 pr-12 text-left">
            <DialogTitle className="text-left text-xl font-bold leading-tight text-white">Manage Savings Goal</DialogTitle>
            <p className="mt-1 truncate pr-2 text-left text-xs text-white/50">{goal?.title}</p>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
            <div className="space-y-2.5">
              <Button type="button" onClick={() => { setManageOpen(false); onClose(); onEdit(goal); }} variant="ghost" className="h-auto min-h-[72px] w-full items-start justify-start whitespace-normal rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-white/85 hover:bg-white/[0.08] hover:text-white">
                <Edit className="mr-3 mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Edit Goal</span><span className="mt-1 block whitespace-normal break-words text-xs font-normal leading-5 text-white/50">Change details, target, date, wallet, or notes.</span></span>
              </Button>
              <Button type="button" onClick={() => { setManageOpen(false); setReleaseAmount(""); setReleaseReason(""); setReleaseError(""); setReleaseSavingsOpen(true); }} disabled={saved <= 0} className="h-auto min-h-[72px] w-full items-start justify-start whitespace-normal rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-left text-sky-100 hover:bg-sky-500/15 disabled:opacity-50">
                <MinusCircle className="mr-3 mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Release Savings</span><span className="mt-1 block whitespace-normal break-words text-xs font-normal leading-5 text-sky-100/60">Make protected money spendable again without an expense.</span></span>
              </Button>
              <Button type="button" onClick={() => { setManageOpen(false); openReconciliation(hasBalanceMismatch ? "wallet_correct" : "both"); }} className="h-auto min-h-[72px] w-full items-start justify-start whitespace-normal rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-left text-cyan-100 hover:bg-cyan-500/15">
                <AlertTriangle className="mr-3 mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Fix Balance Issue</span><span className="mt-1 block whitespace-normal break-words text-xs font-normal leading-5 text-cyan-100/60">Correct the saved amount, wallet balance, or assigned wallet.</span></span>
              </Button>
              <Button type="button" onClick={() => { setManageOpen(false); onClose(); onDelete(goal); }} variant="ghost" className="h-auto min-h-[72px] w-full items-start justify-start whitespace-normal rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-left text-red-200 hover:bg-red-500/15 hover:text-red-100">
                <Trash2 className="mr-3 mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Delete Goal</span><span className="mt-1 block whitespace-normal break-words text-xs font-normal leading-5 text-red-100/60">Remove this goal. Its wallet money stays available.</span></span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
`;

source = source.slice(0, manageStart) + manageDialog + source.slice(addSavingsStart);
writeFileSync(pagePath, source);

const testSource = `import test from "node:test";
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
`;
writeFileSync(testPath, testSource);

let packageSource = readFileSync(packagePath, "utf8");
packageSource = packageSource.replace(/("test"\s*:\s*")([^"]*)(")/, (full, start, command, end) => {
  if (command.includes(testPath)) return full;
  return `${start}${command} ${testPath}${end}`;
});
writeFileSync(packagePath, packageSource);

if (existsSync(markerPath)) unlinkSync(markerPath);
unlinkSync(scriptPath);
