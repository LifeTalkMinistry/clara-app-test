from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
text = PATH.read_text(encoding="utf-8")

marker = "  const openSupportMessages = useCallback(() => {"
handler = '''  const handleProtectAndLink = useCallback(() => {
    if (!CLARA_AUTH_ENABLED || !CLARA_ACCOUNT_LINKING_ENABLED) {
      setSettingsNotice({
        type: "error",
        message: "Account linking is temporarily unavailable while account services are being restored. Your current data remains safe on this device.",
      });
      return;
    }
    navigate("/login?intent=link-local-vault");
  }, [navigate]);

  const openSupportMessages = useCallback(() => {'''
if marker not in text:
    raise RuntimeError("Missing support handler marker")
text = text.replace(marker, handler, 1)

status_pattern = re.compile(
    r'''              <h3 className="text-base font-black text-white">Your CLARA data is private</h3>\n\n              \{user\?\.email \? \(.*?              \)\}''',
    re.S,
)
status_replacement = '''              <h3 className="text-base font-black text-white">
                {vaultMetadata?.linkStatus === "linked"
                  ? hasGenuineAccount
                    ? "Your CLARA account is linked"
                    : "Account linked — signed out"
                  : vaultMetadata?.linkStatus === "link_failed"
                    ? "We could not link your account"
                    : "Your CLARA data is private"}
              </h3>

              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                  {vaultMetadata?.linkStatus === "linked" && hasGenuineAccount ? "Signed in as" : "Status"}
                </p>
                <p className="mt-1 break-all text-sm font-semibold leading-5 text-white/78">
                  {vaultMetadata?.linkStatus === "linked" && hasGenuineAccount
                    ? user?.email || vaultMetadata?.accountEmail
                    : vaultMetadata?.linkStatus === "linked"
                      ? "Stored on this device — signed out"
                      : vaultMetadata?.linkStatus === "linking"
                        ? "Connecting your CLARA data…"
                        : "Stored on this device"}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/48">
                  {vaultMetadata?.linkStatus === "link_failed"
                    ? "Your existing CLARA data is still safe on this device."
                    : "Your financial records are currently saved on this device."}
                </p>
              </div>'''
text, count = status_pattern.subn(status_replacement, text, count=1)
if count != 1:
    raise RuntimeError(f"Expected one security status block, found {count}")

button_marker = '''          <button
            type="button"
            onClick={() => setIsDataDetailsOpen((current) => !current)}'''
button_replacement = '''          <button
            type="button"
            onClick={handleProtectAndLink}
            disabled={vaultMetadataLoading || vaultMetadata?.linkStatus === "linking"}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.22)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {vaultMetadata?.linkStatus === "linking"
              ? "Connecting your CLARA data…"
              : vaultMetadata?.linkStatus === "linked" && !hasGenuineAccount
                ? "Sign in again"
                : vaultMetadata?.linkStatus === "link_failed"
                  ? "Try again"
                  : "Protect & link my data"}
          </button>

          <button
            type="button"
            onClick={() => setIsDataDetailsOpen((current) => !current)}'''
if button_marker not in text:
    raise RuntimeError("Missing data-details button marker")
text = text.replace(button_marker, button_replacement, 1)

PATH.write_text(text, encoding="utf-8")
print("Security card state patch applied.")
