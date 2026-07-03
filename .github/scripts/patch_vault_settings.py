from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
text = PATH.read_text(encoding="utf-8")


def swap(old, new):
    global text
    if old not in text:
        raise RuntimeError(f"Missing Settings target: {old[:100]}")
    text = text.replace(old, new, 1)


swap(
    'import appPackage from "../../../../../../package.json";',
    'import appPackage from "../../../../../../package.json";\nimport { CLARA_ACCOUNT_LINKING_ENABLED, CLARA_AUTH_ENABLED } from "@/config/claraFeatureFlags";\nimport { ensureActiveLocalVaultId, isTemporaryLocalAuthUser } from "@/lib/localVaultIdentity";\nimport useLocalVaultMetadata from "@/hooks/useLocalVaultMetadata";\nimport { readLocalProfileDisplayName, saveLocalProfileDisplayName } from "@/lib/localProfileDisplayName";',
)
swap(
    "  const navigate = useNavigate();\n\n  const initialDisplayName =",
    "  const navigate = useNavigate();\n  const localVaultId = ensureActiveLocalVaultId();\n  const isLocalMode = isTemporaryLocalAuthUser(user);\n  const hasGenuineAccount = Boolean(user?.id && !isLocalMode);\n  const { metadata: vaultMetadata, loading: vaultMetadataLoading } = useLocalVaultMetadata();\n  const storedLocalDisplayName = readLocalProfileDisplayName(localVaultId);\n\n  const initialDisplayName =\n    (isLocalMode ? storedLocalDisplayName : \"\") ||",
)
swap('useNotificationPreferences(user?.id || "guest")', 'useNotificationPreferences(localVaultId)')
text = text.replace('readStoredPerformanceMode(user?.id || "guest")', 'readStoredPerformanceMode(localVaultId)')
text = text.replace('saveVisualPerformanceMode(user?.id || "guest", next)', 'saveVisualPerformanceMode(localVaultId, next)')
swap(
    "    if (!user?.id) {\n      setSettingsNotice({ type: \"error\", message: \"User session is not ready. Please log in again.\" });\n      return;\n    }\n\n    setSavingProfile(true);",
    "    if (isLocalMode) {\n      saveLocalProfileDisplayName(nextName, localVaultId);\n      setProfileName(nextName);\n      setSettingsNotice({ type: \"success\", message: \"Local profile updated.\" });\n      return;\n    }\n\n    if (!user?.id) {\n      setSettingsNotice({ type: \"error\", message: \"User session is not ready. Please log in again.\" });\n      return;\n    }\n\n    setSavingProfile(true);",
)
swap(
    "  }, [profileName, user?.email, user?.id]);",
    "  }, [isLocalMode, localVaultId, profileName, user?.email, user?.id]);",
)
swap(
    '<p className="truncate text-xs text-white/50">{user?.email || "CLARA user"}</p>',
    '<p className="truncate text-xs text-white/50">{isLocalMode ? "Stored on this device" : user?.email || "CLARA user"}</p>',
)
swap(
    '<p className="truncate text-base font-black text-white">{displayName}</p>',
    '<p className="truncate text-base font-black text-white">{isLocalMode ? displayName || "CLARA Local Profile" : displayName}</p>',
)

email_block = '''        <div className="mt-4 rounded-2xl border border-white/15 bg-black/15 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">Email</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{user?.email || "No email found"}</p>
          <p className="mt-1 text-[11px] text-white/40">For security, email is read-only inside dashboard settings.</p>
        </div>'''
account_block = '''        <div className="mt-4 rounded-2xl border border-white/15 bg-black/15 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">Account</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {isLocalMode ? "No account linked" : user?.email || "No email found"}
          </p>
          <p className="mt-1 text-[11px] text-white/40">
            {isLocalMode ? "Your CLARA records are stored on this device." : "For security, email is read-only inside dashboard settings."}
          </p>
          {isLocalMode ? (
            <button type="button" onClick={() => setActiveSetting("security")} className="mt-3 text-xs font-bold text-emerald-100">
              Protect & link my data
            </button>
          ) : null}
        </div>'''
swap(email_block, account_block)

logout_pattern = re.compile(r'      <div className="space-y-2 pt-1">\n        <button\n          type="button"\n          onClick=\{handleSignOut\}.*?      </div>\n    </div>', re.S)
logout_replacement = '''      {!isLocalMode ? (
        <div className="space-y-2 pt-1">
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
            Logging out keeps your local CLARA records on this device.
          </p>
        </div>
      ) : null}
    </div>'''
text, count = logout_pattern.subn(logout_replacement, text, count=1)
if count != 1:
    raise RuntimeError(f"Expected one logout block, found {count}")

PATH.write_text(text, encoding="utf-8")
print("Settings local-state patch applied.")
