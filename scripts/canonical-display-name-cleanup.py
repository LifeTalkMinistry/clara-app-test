from pathlib import Path
import re

settings_path = Path('src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx')
source = settings_path.read_text()

def replace_once(old, new, label):
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    source = source.replace(old, new, 1)

def sub_once(pattern, replacement, label):
    global source
    source, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')

replace_once('  Home,\n', '', 'remove Home icon import')
replace_once(
    'import { signOutFromClaraBackend } from "@/lib/clara-backend-client";\n',
    'import { signOutFromClaraBackend } from "@/lib/clara-backend-client";\nimport {\n  fetchCanonicalClaraProfile,\n  resolveCanonicalDisplayName,\n} from "@/lib/canonical-clara-profile";\n',
    'add canonical profile import',
)
replace_once(
    'import DashboardMeLifePanel from "@/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel";\n',
    '',
    'remove embedded ME panel import',
)
replace_once('  "profile",\n', '', 'remove profile detail key')
replace_once(
    '''\n  const initialDisplayName =\n    user?.full_name ||\n    user?.display_name ||\n    user?.nickname ||\n    user?.user_metadata?.full_name ||\n    user?.user_metadata?.name ||\n    user?.email?.split("@")?.[0] ||\n    "";\n''',
    '\n',
    'remove Settings display-name fallback authority',
)
replace_once(
    '  const [profileName, setProfileName] = useState(initialDisplayName);\n',
    '  const [canonicalProfile, setCanonicalProfile] = useState(null);\n',
    'replace Settings profile-name state',
)
replace_once('  const [savingProfile, setSavingProfile] = useState(false);\n', '', 'remove Settings profile save state')
replace_once(
    '''\n  useEffect(() => {\n    setProfileName(initialDisplayName);\n  }, [initialDisplayName]);\n''',
    '\n',
    'remove Settings profile-name synchronization',
)
replace_once(
    'const displayName = profileName?.trim() || initialDisplayName || "Your CLARA account";\n',
    '''  useEffect(() => {\n    let mounted = true;\n    setCanonicalProfile(null);\n\n    fetchCanonicalClaraProfile()\n      .then((profile) => {\n        if (mounted) setCanonicalProfile(profile || null);\n      })\n      .catch((error) => {\n        console.warn("Canonical CLARA profile unavailable in Settings:", error);\n        if (mounted) setCanonicalProfile(null);\n      });\n\n    return () => { mounted = false; };\n  }, [user?.id]);\n\nconst canonicalDisplayName = resolveCanonicalDisplayName(canonicalProfile);\nconst displayName = canonicalDisplayName || "Your CLARA account";\n''',
    'read Settings header from canonical profile',
)
sub_once(
    r'\n  const handleSaveProfile = useCallback\(async \(\) => \{.*?\n  \}, \[profileName, user\?\.email, user\?\.id\]\);\n',
    '\n',
    'remove Settings display-name writer',
)
sub_once(
    r'\n        \{\n          key: "profile",\n          title: "Profile information",.*?\n        \},',
    '',
    'remove Profile information Settings row',
)
replace_once(
    '''      const senderName =\n        displayName ||\n        user?.user_metadata?.full_name ||\n        user?.user_metadata?.name ||\n        user?.email ||\n        "CLARA User";\n''',
    '      const senderName = canonicalDisplayName || "CLARA User";\n',
    'use canonical name for Settings support sender',
)
replace_once(
    '''  }, [\n    displayName,\n    onOpenMessages,\n    supportEmail,\n    supportMessage,\n    supportTopic,\n    user?.email,\n    user?.id,\n    user?.user_metadata?.full_name,\n    user?.user_metadata?.name,\n  ]);\n''',
    '''  }, [\n    canonicalDisplayName,\n    onOpenMessages,\n    supportEmail,\n    supportMessage,\n    supportTopic,\n    user?.email,\n    user?.id,\n  ]);\n''',
    'update support dependency list',
)
sub_once(
    r'\n  const renderProfilePage = \(\) => \(.*?\n  \);\n\n  const renderNotificationsPage',
    '\n  const renderNotificationsPage',
    'remove Settings Profile information detail page',
)
replace_once('    if (activeSetting === "profile") return renderProfilePage();\n', '', 'remove stale profile detail render path')

for token in ['profileName','handleSaveProfile','savingProfile','title: "Profile information"','activeSetting === "profile"','placeholder="Enter your name"']:
    if token in source:
        raise SystemExit(f'Settings duplicate identity authority still contains: {token}')
settings_path.write_text(source)

css_path = Path('src/settings-cleanup.css')
css = css_path.read_text()
css = re.sub(
    r'/\*\n \* Keep the account identity card and Profile information row visible\..*?#root \.space-y-4:has\(input\[placeholder="Enter your name"\]\).*?\n}\n\n',
    '',
    css,
    count=1,
    flags=re.S,
)
css_path.write_text(css)

local_test_path = Path('tests/settings-local-only-regression.test.mjs')
test_source = local_test_path.read_text()
test_source, count = re.subn(
    r'test\("Settings keeps the signed-in account identity and Profile entry visible", \(\) => \{.*?\n}\);',
    '''test("Settings presents canonical account identity without owning a second profile editor", () => {\n  assert.match(activeSettingsSource, /fetchCanonicalClaraProfile/);\n  assert.match(activeSettingsSource, /resolveCanonicalDisplayName\\(canonicalProfile\\)/);\n  assert.match(activeSettingsSource, /user\\?\\.email \\|\\| "CLARA user"/);\n  assert.doesNotMatch(activeSettingsSource, /title: "Profile information"/);\n  assert.doesNotMatch(activeSettingsSource, /activeSetting === "profile"/);\n  assert.doesNotMatch(activeSettingsSource, /handleSaveProfile|profileName|placeholder="Enter your name"/);\n});''',
    test_source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('settings-local-only profile regression block did not match')
local_test_path.write_text(test_source)

integrity_path = Path('tests/settings-integrity-regression.test.mjs')
integrity = integrity_path.read_text()
integrity, count = re.subn(
    r'test\("profile Settings writes the display name through the CLARA backend account", \(\) => \{.*?\n}\);',
    '''test("legacy profile compatibility writes through the canonical CLARA Profile", () => {\n  assert.match(localFacadeSource, /async updateUser\\(\\{ data \\} = \\{\\}\\)/);\n  assert.match(localFacadeSource, /updateCurrentBackendProfile/);\n  assert.match(profileClientSource, /updateCanonicalClaraDisplayName/);\n  assert.doesNotMatch(profileClientSource, /\\/api\\/users\\/me/);\n});''',
    integrity,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('settings-integrity profile regression block did not match')
integrity_path.write_text(integrity)

Path('tests/canonical-display-name-authority.test.mjs').write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nconst readSource = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");\nconst settings = readSource("src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx");\nconst orbGreeting = readSource("src/runtime/installClaraOrbGreeting.js");\nconst canonicalClient = readSource("src/lib/canonical-clara-profile.js");\nconst compatibilityClient = readSource("src/lib/profile-backend-client.js");\nconst communityProfile = readSource("src/pages/CommunityProfile.jsx");\ntest("Community Profile remains the display-name writer", () => { assert.match(communityProfile, /\\/api\\/community\\/profile\\/me/); assert.match(communityProfile, /display_name: form\\.display_name/); });\ntest("Settings has no independent display-name editor or stale detail route", () => { assert.match(settings, /fetchCanonicalClaraProfile/); assert.match(settings, /resolveCanonicalDisplayName\\(canonicalProfile\\)/); assert.doesNotMatch(settings, /title: "Profile information"|handleSaveProfile|profileName|activeSetting === "profile"/); });\ntest("Orb greeting reads the canonical CLARA profile", () => { assert.match(orbGreeting, /fetchCanonicalClaraProfile/); assert.match(orbGreeting, /resolveCanonicalFirstName/); assert.doesNotMatch(orbGreeting, /clara_backend_user_v1|BACKEND_USER_KEY|user_metadata/); });\ntest("compatibility name writes target the canonical Community Profile field", () => { assert.match(canonicalClient, /backendRequest\\("\\/api\\/community\\/profile\\/me"/); assert.match(canonicalClient, /body: \\{ display_name: cleanName \\}/); assert.match(compatibilityClient, /updateCanonicalClaraDisplayName/); assert.doesNotMatch(compatibilityClient, /\\/api\\/users\\/me/); });\n''')
