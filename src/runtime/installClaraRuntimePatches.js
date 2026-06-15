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

// Core memory runtime
import "../clara-memory-bridge";

// WARNING:
// Buy Check patches share global state, DOM selectors, and report context.
// Do not remove or reorder without testing:
// - Buy Check start flow
// - planned budget prefilter
// - report generation
// - Will buy expense logging
// - Not buy reflection saving
// Buy Check runtime controllers
import "../clara-buy-check-budget-aware-prefilter";
import "../clara-buy-check-report-router";

// Forecast runtime controllers
import "../clara-forecast-report-router";

// Analytics runtime controllers
import "../clara-analytics-report-router";

// Forecast report visual patches
import "../clara-forecast-slide5-final";
import "../clara-forecast-report-final-affirmation";

// Buy Check report polish and completion behavior
import "../clara-buy-check-price-question-copy";
import "../clara-buy-check-report-content-polish";
import "../clara-buy-check-report-focus-mode";

// Forecast report visual patches
import "../clara-forecast-report-focus-mode.css";
import "../clara-forecast-report-stat-row-nowrap.css";
import "../clara-forecast-report-explanation-container.css";
import "../clara-forecast-transition-loader.css";

// Buy Check runtime controllers
import "../clara-buy-check-effective-context-guard";

// WARNING:
// These patches relabel/replace assistant tabs through DOM selectors.
// Later they should become real React tab configuration.
// Assistant tab runtime controllers
import "../clara-assistant-buy-check-tab";
import "../clara-assistant-forecast-tab";
import "../clara-assistant-analytic-tab";
import "../clara-assistant-feature-dock-polish";
import "../clara-assistant-memory-tab";

// Core memory runtime
import "../clara-onboarding-memory-review-bridge";
import "../clara-memory-cabinet-autosave";
import "../clara-settings-memory-entry";
import "../clara-me-panel";
import "../clara-talk-pause-bridge";

// WARNING:
// These patches stabilize Life Stage UI through DOM mutation observers.
// Later they should move into the real Life Stage components.
// Life Stage runtime controllers
import "../life-stage-support-card";
import "../life-stage-default-support-card-guard";
import "../life-stage-heart-solution-hint";
import "../life-stage-living-with-partner-signals";
import "../life-stage-working-student-heart-default-guard";
import "../life-stage-living-with-partner-reveal";
import "../life-stage-trend-snapshot";
import "../life-stage-setup-flow-polish";
import "../life-stage-working-student-identity-context";
import "../life-stage-apply-diagnosis";
import "../life-stage-working-student-signal-fit";

// Global/mobile CSS patches
import "../clara-fab-theme.css";
import "../mobile-responsive.css";
import "../mobile-performance.css";
import "../dashboard-bottom-spacing.css";
import "../life-context-polish.css";

// Life Stage visual patches
import "../life-stage-hero-polish.css";
import "../life-stage-support-card.css";
import "../life-stage-trend-snapshot.css";
import "../life-stage-trend-snapshot-hide-icon.css";
import "../life-stage-trend-graph-hide.css";

// Settings and demo runtime behavior
import "../settings-cleanup.css";
import "../settings-priority.css";
import "../settings-support-compose.css";

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
import "../me-adaptive-viewport.css";
import "../me-hero-support-bond.css";
import "../life-stage-young-professional-overlap-fix.css";
import "../me-life-stage-signal-gap-fix.css";

// Finance/modal polish CSS patches
import "../savings-goals-modal-polish.css";
import "../finance-action-modal-copy-polish.css";
import "../emergency-fund-header-copy-fit.css";

// Buy Check report polish and completion behavior
import "../clara-buy-check-not-buy-completion-flow";

// Settings and demo runtime behavior
import "../settings-hide-theme-appearance.js";
import "../clara-settings-young-professional-current-state.js";

// Buy Check report polish and completion behavior
import "../clara-buy-check-bottom-position.css";
import "../clara-buy-check-message-hierarchy";
import "../clara-buy-check-report-card-polish.css";
import "../clara-buy-check-report-content-polish.css";
import "../clara-buy-check-report-focus-mode.css";
