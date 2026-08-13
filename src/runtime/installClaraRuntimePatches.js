/**
 * CLARA runtime patch registry.
 *
 * These imports intentionally run for side effects.
 * Do not delete entries from this file without tracing:
 * - imports
 * - window events
 * - localStorage/sessionStorage keys
 * - DOM selectors
 * - CSS selectors
 * - manual dashboard/billing/supabase smoke tests
 */

// Password reset email compatibility. Canonicalizes legacy query-string reset
// links into the HashRouter reset-password route before React mounts.
import "./installPasswordResetRouteBridge";

// Media playback runtime
import "./installSoundTouchFeedbackBridge";

// Route-level scroll ownership
import "./installUniversalOnboardingScrollIsolation";
import "./installSettingsModalBehavior";
import "./installCommunityProfileScrollOwnership";

// Community/social data is online account data owned by the self-hosted CLARA
// backend. Financial records remain under their existing local/device ownership.
import "./installCommunityBackendOwnership";
import "./installMessagesSearchCancel";
import "./installMessagesProfilePhotos";
import "./installCommunityGuideLauncherBridge";
// Post/reaction notification routing must stay inside the Community shell so
// opening the exact post never hides or scrolls away the shared top navigation.
import "./installCommunityNotificationPostNavigationGuard";
// Private-message unread state belongs to the Message icon. General Community
// activity remains on the bell, with each badge clearing independently.
import "./installCommunityMessageNotificationSplit";

// Core memory runtime. The scoped compatibility layer must install before any
// legacy memory reader/writer touches the historical unscoped storage key.
import "./installScopedClaraMemoryStorage";
import "../clara-memory-bridge";

// Authenticated app-open tracking. This records only session timestamps and a
// broad platform label; it does not inspect budgets, screens, notes, or messages.
import "./installAppOpenTracking";

// Daily challenge reporting sends only streak/check-in metadata needed by the
// admin contender board. Budget, transaction, message, and note content is never sent.
import "./installChallengeStreakTracking";

// Buy Check ownership note:
// The active Pause Buy Check flow is now owned by React through
// ClaraAiEnvironmentOverlay + useClaraBuyCheckFlow. The former global
// controllers are intentionally not imported here because they installed
// overlapping submit/click/keydown handlers, independent session stores,
// DOM replacement, and duplicate opening-message observers.
// Retired active controllers:
// - clara-buy-check-budget-aware-prefilter
// - clara-buy-check-report-router
// - clara-assistant-buy-check-tab
// - clara-buy-check-effective-context-guard
// - clara-buy-check-price-question-copy
// - clara-buy-check-message-hierarchy
// - clara-buy-check-not-buy-completion-flow
// Their reusable budget, context, confirmation, and report behavior now lives
// in the React-owned flow rather than side-effect patches.

// Forecast runtime controllers
import "../clara-forecast-report-router";

// Analytics runtime controllers
import "../clara-analytics-report-router";

// Forecast report visual patches
import "../clara-forecast-slide5-final";
import "../clara-forecast-report-final-affirmation";

// Buy Check report-only visual polish. These are inert unless a legacy static
// report exists, and they do not own input or session state.
import "../clara-buy-check-report-content-polish";
import "../clara-buy-check-report-focus-mode";

// Forecast report visual patches
import "../clara-forecast-report-focus-mode.css";
import "../clara-forecast-report-stat-row-nowrap.css";
import "../clara-forecast-report-explanation-container.css";
import "../clara-forecast-transition-loader.css";

// Schedule notification runtime bridge
import "../clara-schedule-notification-runtime-bridge";

// Google Play billing restore/activation bridge
import "../google-play-already-owned-restore-bridge";
import "../clara-google-play-verify-auth-retry";

// Beta tester invitations are verified by the CLARA backend before the account
// is refreshed into the Committed Version. No plan is granted locally.
import "./installBetaTesterActivation";

// WARNING:
// These patches relabel/replace assistant tabs through DOM selectors.
// Later they should become real React tab configuration.
// Assistant tab runtime controllers
import "../clara-assistant-forecast-tab";
import "../clara-assistant-analytic-tab";
import "../clara-assistant-feature-dock-polish";
import "../clara-assistant-memory-tab";

// Core memory runtime
import "../clara-onboarding-memory-review-bridge";
import "../clara-memory-cabinet-autosave";
import "../clara-me-panel";
import "../clara-talk-pause-bridge";

// Memory Review presentation. The legacy runtime owns behavior; this scoped CSS
// owns only the visual hierarchy for Review and Edit Mode.
import "../clara-memory-review-premium.css";

// The review list owns scrolling. Its cards retain their natural content height
// so populated sections cannot collapse into thin pills.
import "../clara-memory-review-layout-integrity.css";

// Header controls stay pinned to the true top-right corner while the title and
// timestamp reserve their footprint on narrow screens.
import "../clara-memory-review-header-actions-position.css";

// Life Stage ownership note:
// FinancialClimateUniversalScreen now owns the Me-page pressure dock, support
// state, heart interaction, Snapshot rendering, and mutation events through
// React. The former body-wide MutationObserver controllers are intentionally
// not installed because they rewrote the same DOM after React rendered it.
// The setup-flow polish remains until the setup screen itself is separated into
// a route; it does not own the configured Me-page container or profile data.
import "../life-stage-setup-flow-polish";

// Global/mobile CSS patches
import "../clara-fab-theme.css";
import "../mobile-responsive.css";
import "../mobile-performance.css";
import "../viewport-edge-seam-fix.css";
import "../dashboard-bottom-spacing.css";
import "../clara-ai-overlay-soft-anchor.css";
import "../life-context-polish.css";
import "../community-premium-theme.css";
import "../community-reference-refresh.css";
import "../community-composer-centering-fix.css";
import "../community-feed-post-seams.css";
import "./installClaraOrbIdleLife";
import "./installClaraOrbGreeting";
import "./installClaraOrbImmersiveNav";
import "./installClaraOrbPreciseHitTarget";
// Keep this last in the Community stack so the official CLARA blue/gold/red feed wins the cascade.
import "../community-official-brand-theme.css";

// Life Stage visual patches
import "../life-stage-hero-polish.css";
import "../life-stage-support-card.css";
import "../life-stage-trend-snapshot.css";
import "../life-stage-trend-snapshot-hide-icon.css";
import "../life-stage-trend-graph-hide.css";

// Settings behavior and visual polish. Online sync is intentionally NOT injected
// into the Settings overview. Security & privacy -> Backup & Transfer owns the
// single user-facing sync control. Device reset remains available here.
import "./installSettingsDeviceReset";
import "./installSettingsLogoutRow";
import "../settings-cleanup.css";
import "../settings-priority.css";
import "../settings-support-compose.css";
// Keep this last in the Settings stack so the official CLARA blue/gold/red system wins the cascade.
import "../settings-official-brand-theme.css";

// Life Stage visual patches
import "../life-stage-collision.css";
import "../life-stage-action-position.css";
import "../life-stage-setup-scale.css";
import "../life-stage-setup-flow-polish.css";
import "../life-stage-question-compact-mobile.css";
import "../life-stage-progress-indicator-fix.css";
import "../life-stage-story-canonical-working-student.css";
import "../life-stage-story-canonical-young-professional.css";
import "../life-stage-diagnosis-cleanup.css";
import "../life-stage-young-professional-overlap-fix.css";
import "../me-life-stage-signal-gap-fix.css";
import "../me-life-stage-pressure-dock-spacing.css";
import "../life-stage-idle-support-copy.css";

// Finance/modal polish CSS patches
import "../savings-goals-modal-polish.css";
import "../finance-action-modal-copy-polish.css";
import "../emergency-fund-header-copy-fit.css";

// The former hidden Settings double-tap demo controller is intentionally not
// loaded in production. Demo data must be entered through an explicit tool.

// Legacy Buy Check CSS can remain for old snapshots without installing runtime
// ownership or DOM observers.
import "../clara-buy-check-bottom-position.css";
import "../clara-buy-check-report-card-polish.css";
import "../clara-buy-check-report-content-polish.css";
import "../clara-buy-check-report-focus-mode.css";

// Final budget activation screen: motivational copy + consolidated summary.
import "./installBudgetFinalMotivation";

// Home Money Left: the former projected-total pill is now one icon that toggles
// the main Money Left amount between current wallet funds and after-budget funds.
import "./installMoneyLeftAfterBudgetToggle";