import fs from "node:fs";

const file = "tests/income-hub-expanded-flow-regression.test.mjs";
let content = fs.readFileSync(file, "utf8");
content = content.replace(
  'assert.equal(financeActionModal.includes("submitDisabledLabel = "Unavailable""), true);',
  'assert.equal(financeActionModal.includes(\'submitDisabledLabel = "Unavailable"\'), true);'
);
fs.writeFileSync(file, content);
