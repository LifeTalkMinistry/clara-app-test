import fs from "node:fs";

const file = ".github/scripts/refactor-wallet-expanded-flow.mjs";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  'style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 38px rgba(0,0,0,0.22), 0 0 34px ${currentProvider.accent}2b` }}',
  'style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 38px rgba(0,0,0,0.22), 0 0 34px " + currentProvider.accent + "2b" }}'
);

fs.writeFileSync(file, content);
