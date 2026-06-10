import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { tmpdir } from "node:os";

for (const name of ["core", "ui-billing", "sql", "tighten"]) {
  const encoded = readFileSync(`.github/membership-migration/${name}.mjs.gz.b64`, "utf8").trim();
  const target = join(tmpdir(), `clara-membership-${name}.mjs`);
  writeFileSync(target, gunzipSync(Buffer.from(encoded, "base64")));
  execFileSync(process.execPath, ["--check", target], { stdio: "inherit" });
  execFileSync(process.execPath, [target], { stdio: "inherit" });
}
