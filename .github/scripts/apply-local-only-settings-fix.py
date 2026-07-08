from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


settings_path = Path(
    "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
)
settings = settings_path.read_text()

settings = replace_once(
    settings,
    "  ChevronRight,\n  Edit,",
    "  ChevronRight,\n  Database,\n  Edit,",
    "add Database icon import",
)
settings = replace_once(
    settings,
    '  const [signingOut, setSigningOut] = useState(false);\n',
    "",
    "remove sign-out state",
)
settings = replace_once(
    settings,
    '''  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    setSettingsNotice(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Sign out failed:", error);
      setSettingsNotice({ type: "error", message: "Sign out failed. Please try again." });
      setSigningOut(false);
    }
  }, [navigate]);

''',
    "",
    "remove sign-out handler",
)
settings = replace_once(
    settings,
    '''              {user?.email ? (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">Signed in as</p>
                  <p className="mt-1 break-all text-sm font-semibold leading-5 text-white/78">{user.email}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold leading-6 text-white/68">
                  This device is your private CLARA environment.
                </p>
              )}
''',
    '''              <p className="mt-3 text-sm font-semibold leading-6 text-white/68">
                This device is your private CLARA environment.
              </p>
''',
    "replace authentication status with local-device copy",
)

backup_row = '''        <button
          type="button"
          onClick={() => navigate("/data-export")}
          className="group flex min-h-[72px] w-full items-center gap-3 rounded-[22px] border border-white/15 bg-white/[0.045] px-4 py-3.5 text-left transition hover:bg-white/[0.07]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/18 bg-emerald-400/8 text-emerald-100">
            <Database className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Backup & Transfer</p>
            <p className="mt-1 text-xs leading-5 text-white/46">
              Download or upload your CLARA device backup.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-white/45">
            <span>Open</span>
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-white/65" />
          </div>
        </button>

'''
ai_privacy_anchor = '''        <button
          type="button"
          onClick={() => setIsAiPrivacyModalOpen(true)}
'''
settings = replace_once(
    settings,
    ai_privacy_anchor,
    backup_row + ai_privacy_anchor,
    "insert Backup & Transfer row",
)
settings = replace_once(
    settings,
    '''      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-rose-300/20 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_34%),rgba(244,63,94,0.08)] px-4 py-4 text-sm font-black text-rose-100 shadow-[0_14px_40px_rgba(244,63,94,0.08)] transition hover:bg-rose-500/15 disabled:opacity-55"
        >
          <X className="h-4 w-4" />
          {signingOut ? "Signing out..." : "Log out"}
        </button>

        <p className="px-3 text-center text-[10px] font-semibold leading-4 text-white/32">
          You can log back in anytime using your CLARA account.
        </p>
      </div>
''',
    "",
    "remove logout UI",
)
settings_path.write_text(settings)

identity_path = Path("src/lib/start-local-vault-identity.js")
identity = identity_path.read_text()
identity = replace_once(
    identity,
    'import "../runtime/installLocalVaultSettingsExperience.js";\n',
    "",
    "remove obsolete Settings patch import",
)
identity_path.write_text(identity)

runtime_patch = Path("src/runtime/installLocalVaultSettingsExperience.js")
if not runtime_patch.exists():
    raise SystemExit("obsolete runtime Settings patch was already missing")
runtime_patch.unlink()

app_path = Path("src/App.jsx")
app = app_path.read_text()
app = replace_once(
    app,
    'const Settings = lazy(() => import("./pages/Settings"));\n',
    "",
    "remove legacy Settings lazy import",
)
app = replace_once(
    app,
    '''                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/:section" element={<Settings />} />
''',
    '''                    <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/settings/:section" element={<Navigate to="/dashboard" replace />} />
''',
    "redirect legacy Settings routes",
)
app_path.write_text(app)

package_path = Path("package.json")
package_text = package_path.read_text()
package_text = replace_once(
    package_text,
    'tests/local-vault-account-linking.test.mjs"',
    'tests/local-vault-account-linking.test.mjs tests/settings-local-only-regression.test.mjs"',
    "register Settings regression tests",
)
package_path.write_text(package_text)

test_path = Path("tests/settings-local-only-regression.test.mjs")
test_path.write_text(
    '''import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const activeSettingsSource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
);
const dataExportSource = readSource("src/pages/DataExport.jsx");
const appSource = readSource("src/App.jsx");
const localVaultIdentityStartup = readSource("src/lib/start-local-vault-identity.js");

test("active Settings directly exposes Backup & Transfer through /data-export", () => {
  assert.match(activeSettingsSource, /Backup & Transfer/);
  assert.match(activeSettingsSource, /Download or upload your CLARA device backup\./);
  assert.match(activeSettingsSource, /navigate\("\/data-export"\)/);
  assert.match(activeSettingsSource, />Open</);
});

test("active local-only Settings does not render authentication or account-linking controls", () => {
  assert.doesNotMatch(activeSettingsSource, /Log out/);
  assert.doesNotMatch(activeSettingsSource, /Signing out/);
  assert.doesNotMatch(activeSettingsSource, /handleSignOut/);
  assert.doesNotMatch(activeSettingsSource, /auth\.signOut/);
  assert.doesNotMatch(activeSettingsSource, /Protect & link my data/);
  assert.doesNotMatch(activeSettingsSource, /Signed in as/);
});

test("backup page keeps download, upload, validation, confirmation, restore, and reload behavior", () => {
  assert.match(dataExportSource, /Download CLARA Backup/);
  assert.match(dataExportSource, /Upload CLARA Backup/);
  assert.match(dataExportSource, /accept="application\/json,\.json"/);
  assert.match(
    dataExportSource,
    /window\.confirm\("Use this CLARA backup file on this device\?"\)/
  );
  assert.match(dataExportSource, /restoreClaraLocalDataFromFile/);
  assert.match(dataExportSource, /window\.location\.reload\(\)/);
});

test("router preserves /data-export and retires the legacy account-based Settings surface", () => {
  assert.match(appSource, /path="\/data-export" element=\{<DataExport \/>\}/);
  assert.match(
    appSource,
    /path="\/settings" element=\{<Navigate to="\/dashboard" replace \/>\}/
  );
  assert.match(
    appSource,
    /path="\/settings\/:section" element=\{<Navigate to="\/dashboard" replace \/>\}/
  );
  assert.doesNotMatch(appSource, /<Settings \/>/);
});

test("obsolete DOM Settings patch is no longer initialized", () => {
  assert.doesNotMatch(localVaultIdentityStartup, /installLocalVaultSettingsExperience/);
  assert.equal(
    existsSync(
      new URL(
        "../src/runtime/installLocalVaultSettingsExperience.js",
        import.meta.url
      )
    ),
    false
  );
});
'''
)
