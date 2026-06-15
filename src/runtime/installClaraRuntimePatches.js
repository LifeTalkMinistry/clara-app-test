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

// Memory and report bridges
import "../clara-memory-bridge";

// Buy Check runtime patches
import "../clara-buy-check-budget-aware-prefilter";
import "../clara-buy-check-report-router";

// Memory and report bridges
import "../clara-forecast-report-router";
import "../clara-analytics-report-router";

// Forecast/report styling patches
import "../clara-forecast-slide5-final";
import "../clara-forecast-report-final-affirmation";

// Buy Check runtime patches
import "../clara-buy-check-price-question-copy";
import "../clara-buy-check-report-content-polish";
import "../clara-buy-check-report-focus-mode";

// Forecast/report styling patches
import "../clara-forecast-report-focus-mode.css";
import "../clara-forecast-report-stat-row-nowrap.css";
import "../clara-forecast-report-explanation-container.css";
import "../clara-forecast-transition-loader.css";

// Buy Check runtime patches
import "../clara-buy-check-effective-context-guard";

// Assistant runtime patches
import "../clara-assistant-buy-check-tab";
import "../clara-assistant-forecast-tab";
import "../clara-assistant-analytic-tab";
import "../clara-assistant-feature-dock-polish";
import "../clara-assistant-memory-tab";

// Memory and report bridges
import "../clara-onboarding-memory-review-bridge";
import "../clara-memory-cabinet-autosave";
import "../clara-settings-memory-entry";
import "../clara-me-panel";
import "../clara-talk-pause-bridge";

// Life-stage runtime patches
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

// Global CSS runtime patches
import "../clara-fab-theme.css";
import "../mobile-responsive.css";
import "../mobile-performance.css";
import "../dashboard-bottom-spacing.css";
import "../life-context-polish.css";
import "../life-stage-hero-polish.css";
import "../life-stage-support-card.css";
import "../life-stage-trend-snapshot.css";
import "../life-stage-trend-snapshot-hide-icon.css";
import "../life-stage-trend-graph-hide.css";
import "../settings-cleanup.css";
import "../settings-priority.css";
import "../settings-support-compose.css";
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
import "../savings-goals-modal-polish.css";
import "../finance-action-modal-copy-polish.css";
import "../emergency-fund-header-copy-fit.css";

// Settings/runtime behavior patches
import "../settings-hide-theme-appearance.js";
import "../clara-settings-young-professional-current-state.js";

// Buy Check runtime patches
import "../clara-buy-check-bottom-position.css";
import "../clara-buy-check-message-hierarchy";
import "../clara-buy-check-report-card-polish.css";
import "../clara-buy-check-report-content-polish.css";
import "../clara-buy-check-report-focus-mode.css";
