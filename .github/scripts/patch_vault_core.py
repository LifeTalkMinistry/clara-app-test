from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace(path, old, new, all_matches=False):
    file = ROOT / path
    text = file.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Missing target in {path}: {old[:90]}")
    text = text.replace(old, new) if all_matches else text.replace(old, new, 1)
    file.write_text(text, encoding="utf-8")


replace(
    "src/components/fresh/main-dashboard/dashboard-cache/useDashboardPageCacheController.js",
    'import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";',
    'import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";\nimport { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";',
)
replace(
    "src/components/fresh/main-dashboard/dashboard-cache/useDashboardPageCacheController.js",
    "export default function useDashboardPageCacheController({ cacheKey = null } = {}) {\n  const hasLoadedDashboardRef = useRef(false);",
    "export default function useDashboardPageCacheController() {\n  const cacheKey = ensureActiveLocalVaultId();\n  const hasLoadedDashboardRef = useRef(false);",
)

replace(
    "src/components/fresh/main-dashboard/dashboard-cache/useDashboardDataLoader.js",
    '} from "@/lib/supabaseQuotaGuard";',
    '} from "@/lib/supabaseQuotaGuard";\nimport { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";',
)
replace(
    "src/components/fresh/main-dashboard/dashboard-cache/useDashboardDataLoader.js",
    'const ownerKey = cacheKey || currentUser.id || currentUser.email || "guest";',
    'const ownerKey = ensureActiveLocalVaultId();',
)
replace(
    "src/components/fresh/main-dashboard/dashboard-cache/useDashboardDataLoader.js",
    "readDashboardPrefs(currentUser.id)",
    "readDashboardPrefs(ownerKey)",
    True,
)
replace(
    "src/components/fresh/main-dashboard/dashboard-cache/useDashboardDataLoader.js",
    "readStoredSurvivalExpense(currentUser.id)",
    "readStoredSurvivalExpense(ownerKey)",
    True,
)

replace(
    "src/components/fresh/main-dashboard/finance-content/useDashboardFinanceStateSync.js",
    'import { getWalletDisplayBalance } from "@/utils/dashboard/dashboardHelpers";',
    'import { getWalletDisplayBalance } from "@/utils/dashboard/dashboardHelpers";\nimport { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";',
)
replace(
    "src/components/fresh/main-dashboard/finance-content/useDashboardFinanceStateSync.js",
    "export default function useDashboardFinanceStateSync({\n  cacheKey,",
    "export default function useDashboardFinanceStateSync({",
)
replace(
    "src/components/fresh/main-dashboard/finance-content/useDashboardFinanceStateSync.js",
    "}) {\n  useEffect(() => {",
    "}) {\n  const cacheKey = ensureActiveLocalVaultId();\n\n  useEffect(() => {",
)

replace(
    "src/components/fresh/main-dashboard/dashboard-cache/useDashboardCacheOwnerSync.js",
    'import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";',
    'import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";\nimport { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";',
)
replace(
    "src/components/fresh/main-dashboard/dashboard-cache/useDashboardCacheOwnerSync.js",
    "export default function useDashboardCacheOwnerSync({\n  cacheKey,",
    "export default function useDashboardCacheOwnerSync({",
)
replace(
    "src/components/fresh/main-dashboard/dashboard-cache/useDashboardCacheOwnerSync.js",
    "} = {}) {\n  useEffect(() => {",
    "} = {}) {\n  const cacheKey = ensureActiveLocalVaultId();\n\n  useEffect(() => {",
)

replace(
    "src/components/fresh/main-dashboard/dashboard-settings/useDashboardNotificationSettings.js",
    'import { readStoredNotificationSettings } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";',
    'import { readStoredNotificationSettings } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";\nimport { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";',
)
replace(
    "src/components/fresh/main-dashboard/dashboard-settings/useDashboardNotificationSettings.js",
    "export default function useDashboardNotificationSettings(userId) {",
    "export default function useDashboardNotificationSettings() {\n  const userId = ensureActiveLocalVaultId();",
)

replace(
    "src/hooks/useNotificationPreferences.js",
    '} from "@/lib/notifications/notificationPreferences";',
    '} from "@/lib/notifications/notificationPreferences";\nimport { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";',
)
replace(
    "src/hooks/useNotificationPreferences.js",
    "export default function useNotificationPreferences(userId) {",
    "export default function useNotificationPreferences() {\n  const userId = ensureActiveLocalVaultId();",
)

replace(
    "src/components/fresh/main-dashboard/dashboard-theme/useDashboardThemePersistence.js",
    'import { normalizeString } from "@/utils/dashboard/dashboardHelpers";',
    'import { normalizeString } from "@/utils/dashboard/dashboardHelpers";\nimport { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";',
)
replace(
    "src/components/fresh/main-dashboard/dashboard-theme/useDashboardThemePersistence.js",
    "export default function useDashboardThemePersistence({\n  selectedDashboardTheme,\n  userId,\n}) {",
    "export default function useDashboardThemePersistence({ selectedDashboardTheme }) {\n  const userId = ensureActiveLocalVaultId();",
)

print("Core vault ownership patch applied.")
