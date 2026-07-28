import fs from "node:fs";

const file = "tests/income-hub-expanded-flow-regression.test.mjs";
let content = fs.readFileSync(file, "utf8");

const replacements = [
  [
    'assert.equal(financeActionModal.includes("submitDisabledLabel = "Unavailable""), true);',
    'assert.equal(financeActionModal.includes(\'submitDisabledLabel = "Unavailable"\'), true);',
  ],
  [
    'assert.equal(surfaces.includes("type === "transfer_money""), true);',
    'assert.equal(surfaces.includes(\'type === "transfer_money"\'), true);',
  ],
];

for (const [source, target] of replacements) {
  content = content.replace(source, target);
}

fs.writeFileSync(file, content);
