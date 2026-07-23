import fs from "node:fs";

const targetPath =
  "src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx";
const testPath = "tests/committed-facebook-support.test.mjs";

let source = fs.readFileSync(targetPath, "utf8");

const replaceOnce = (before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  source = source.replace(before, after);
};

if (!source.includes("Already Activated?")) {
  replaceOnce(
    'import { CalendarDays, ExternalLink, Lock, MessageCircle, X } from "lucide-react";',
    'import { CalendarDays, ExternalLink, Lock, X } from "lucide-react";',
    "remove unused message icon"
  );

  const oldSupport = `                <div className="rounded-[18px] border border-white/[0.09] bg-white/[0.045] px-3.5 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">\n                  <div className="flex items-start gap-3">\n                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-cyan-100/14 bg-cyan-100/[0.08] text-cyan-50/78">\n                      <MessageCircle className="h-4 w-4" />\n                    </span>\n                    <div className="min-w-0">\n                      <p className="text-[11px] font-black text-white/82">\n                        Concerned about your access?\n                      </p>\n                      <p className="mt-0.5 text-[10px] font-semibold leading-4 text-white/46">\n                        Message us on the CLARA Facebook page.\n                      </p>\n                    </div>\n                  </div>\n                  <a\n                    href="https://www.facebook.com/profile.php?id=61590352695488&sk=followers"\n                    target="_blank"\n                    rel="noopener noreferrer"\n                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] border border-cyan-100/14 bg-cyan-100/[0.08] px-4 text-[11px] font-black text-cyan-50/82 transition hover:bg-cyan-100/[0.14] hover:text-cyan-50 active:scale-[0.99]"\n                  >\n                    Message CLARA\n                    <ExternalLink className="h-3.5 w-3.5" />\n                  </a>\n                </div>`;

  const newSupport = `                <div className="rounded-[18px] border border-white/[0.09] bg-white/[0.045] px-3.5 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">\n                  <p className="text-[11px] font-black text-white/82">\n                    Already Activated?\n                  </p>\n                  <a\n                    href="https://www.facebook.com/profile.php?id=61590352695488&sk=followers"\n                    target="_blank"\n                    rel="noopener noreferrer"\n                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] border border-cyan-100/14 bg-cyan-100/[0.08] px-4 text-[11px] font-black text-cyan-50/82 transition hover:bg-cyan-100/[0.14] hover:text-cyan-50 active:scale-[0.99]"\n                  >\n                    Message CLARA\n                    <ExternalLink className="h-3.5 w-3.5" />\n                  </a>\n                </div>`;

  replaceOnce(oldSupport, newSupport, "simplify Facebook support block");
  fs.writeFileSync(targetPath, source);
}

let testSource = fs.readFileSync(testPath, "utf8");
testSource = testSource
  .replace(
    '  assert.match(source, /Concerned about your access\\?/);\n  assert.match(source, /Message us on the CLARA Facebook page\\./);',
    '  assert.match(source, /Already Activated\\?/);\n  assert.doesNotMatch(source, /Concerned about your access\\?/);\n  assert.doesNotMatch(source, /Message us on the CLARA Facebook page\\./);'
  )
  .replace(
    '  assert.doesNotMatch(source, /Already enrolled\\?/);',
    '  assert.doesNotMatch(source, /Already enrolled\\?/);\n  assert.doesNotMatch(source, /MessageCircle/);'
  );
fs.writeFileSync(testPath, testSource);
