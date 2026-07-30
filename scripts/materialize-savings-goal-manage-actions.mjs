import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pagePath = "src/pages/SavingsGoalsIntegrated.jsx";
const packagePath = "package.json";
const testPath = "tests/savings-goal-manage-actions.test.mjs";
const markerPath = ".savings-goal-manage-actions-request";
const scriptPath = fileURLToPath(import.meta.url);

let source = readFileSync(pagePath, "utf8");

function replaceOnce(input, searchValue, replacement, label) {
  const next = input.replace(searchValue, replacement);
  if (next === input) throw new Error(`Could not apply ${label}.`);
  return next;
}

source = replaceOnce(
  source,
  'import { ArrowLeft, Plus, Target, AlertTriangle, Calendar, Edit, Trash2, Wallet, MinusCircle } from "lucide-react";',
  'import { ArrowLeft, Plus, Target, AlertTriangle, Calendar, Edit, Trash2, Wallet, MinusCircle, Settings2 } from "lucide-react";',
  "Settings icon import",
);

source = replaceOnce(
  source,
  '  const [releaseError, setReleaseError] = useState("");\n',
  '  const [releaseError, setReleaseError] = useState("");\n  const [manageOpen, setManageOpen] = useState(false);\n',
  "Manage dialog state",
);

const oldFooterPattern = /<div className="border-t border-white\/10 bg-\[#041226\]\/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="grid grid-cols-2 gap-2"><Button type="button" onClick=\{\(\) => onEdit\(goal\)\}[\s\S]*?<Button type="button" onClick=\{onClose\}[\s\S]*?>Close<\/Button><\/div><\/div><\/div><\/DialogContent><\/Dialog>/;

const newFooter = `<div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => { setAmount(""); setAddError(""); setSourceWalletId(goal?.wallet_id || walletId(wallets?.[0])); setAddSavingsOpen(true); }} disabled={remaining <= 0} className="h-10 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50"><Plus className="w-4 h-4 mr-2" />Add Savings</Button><Button type="button" onClick={() => { setUseAmount(""); setUseReason(""); setUseError(""); setUseSavingsOpen(true); }} disabled={saved <= 0 || !assignedWallet} className="h-10 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"><MinusCircle className="w-4 h-4 mr-2" />Use Savings</Button><Button type="button" onClick={() => setManageOpen(true)} variant="ghost" className="col-span-2 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white"><Settings2 className="w-4 h-4 mr-2" />Manage Goal</Button></div></div></div></DialogContent></Dialog>`;

source = replaceOnce(source, oldFooterPattern, newFooter, "primary action footer");

const addSavingsMarker = '    <Dialog open={addSavingsOpen}';
const manageDialog = `    <Dialog open={manageOpen} onOpenChange={(value) => { if (!savingAmount) setManageOpen(value); }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Manage Savings Goal</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.title}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-2"><Button type="button" onClick={() => { setManageOpen(false); onEdit(goal); }} variant="ghost" className="h-auto w-full justify-start rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-white/85 hover:bg-white/[0.08] hover:text-white"><Edit className="mr-3 h-4 w-4 shrink-0" /><span><span className="block text-sm font-bold">Edit Goal</span><span className="mt-1 block text-xs font-normal text-white/45">Change the goal details, target, date, wallet, or notes.</span></span></Button><Button type="button" onClick={() => { setManageOpen(false); setReleaseAmount(""); setReleaseReason(""); setReleaseError(""); setReleaseSavingsOpen(true); }} disabled={saved <= 0} className="h-auto w-full justify-start rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-left text-sky-100 hover:bg-sky-500/15 disabled:opacity-50"><MinusCircle className="mr-3 h-4 w-4 shrink-0" /><span><span className="block text-sm font-bold">Release Savings</span><span className="mt-1 block text-xs font-normal text-sky-100/55">Make protected money spendable again without recording an expense.</span></span></Button><Button type="button" onClick={() => { setManageOpen(false); openReconciliation(hasBalanceMismatch ? "wallet_correct" : "both"); }} className="h-auto w-full justify-start rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-left text-cyan-100 hover:bg-cyan-500/15"><AlertTriangle className="mr-3 h-4 w-4 shrink-0" /><span><span className="block text-sm font-bold">Fix Balance Issue</span><span className="mt-1 block text-xs font-normal text-cyan-100/55">Correct the saved amount, wallet balance, or assigned wallet together.</span></span></Button><Button type="button" onClick={() => { setManageOpen(false); onDelete(goal); }} variant="ghost" className="h-auto w-full justify-start rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-left text-red-200 hover:bg-red-500/15 hover:text-red-100"><Trash2 className="mr-3 h-4 w-4 shrink-0" /><span><span className="block text-sm font-bold">Delete Goal</span><span className="mt-1 block text-xs font-normal text-red-100/55">Remove the goal while leaving its wallet money available.</span></span></Button></div></div></div></DialogContent></Dialog>\n`;

source = replaceOnce(source, addSavingsMarker, manageDialog + addSavingsMarker, "Manage dialog");
writeFileSync(pagePath, source);

const testSource = `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\n\nconst source = readFileSync(new URL("../src/pages/SavingsGoalsIntegrated.jsx", import.meta.url), "utf8");\n\ntest("Savings Goal detail keeps only primary actions visible", () => {\n  const footerMatch = source.match(/bg-\\\[#041226\\\]\\/96[\\s\\S]*?<\\/Dialog>/);\n  assert.ok(footerMatch, "expected the Savings Goal detail footer");\n  const footer = footerMatch[0];\n  assert.match(footer, />Add Savings<\\/Button>/);\n  assert.match(footer, />Use Savings<\\/Button>/);\n  assert.match(footer, />Manage Goal<\\/Button>/);\n  assert.doesNotMatch(footer, />Correct Balance<\\/Button>/);\n  assert.doesNotMatch(footer, />Reconcile Wallet<\\/Button>/);\n  assert.doesNotMatch(footer, />Delete<\\/Button>/);\n  assert.doesNotMatch(footer, />Close<\\/Button>/);\n});\n\ntest("secondary Savings Goal controls live inside Manage Goal", () => {\n  assert.match(source, /Manage Savings Goal/);\n  assert.match(source, />Edit Goal<\\/span>/);\n  assert.match(source, />Release Savings<\\/span>/);\n  assert.match(source, />Fix Balance Issue<\\/span>/);\n  assert.match(source, />Delete Goal<\\/span>/);\n  assert.match(source, /openReconciliation\\(hasBalanceMismatch \? "wallet_correct" : "both"\\)/);\n});\n`;
writeFileSync(testPath, testSource);

let packageSource = readFileSync(packagePath, "utf8");
packageSource = packageSource.replace(/("test"\s*:\s*")([^"]*)(")/, (full, start, command, end) => {
  if (command.includes(testPath)) return full;
  return `${start}${command} ${testPath}${end}`;
});
writeFileSync(packagePath, packageSource);

if (existsSync(markerPath)) unlinkSync(markerPath);
unlinkSync(scriptPath);
