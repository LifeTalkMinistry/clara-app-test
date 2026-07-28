/**
 * CLARA runtime patch registry.
 *
 * These imports intentionally run for side effects.
 * Keep global startup work limited to true app-wide behavior. Feature-specific
 * DOM compatibility bridges must be lazy-loaded by their owning surface.
 */

// Installed phone builds default to the existing static Performance Mode unless
// the user already chose a visual mode in Settings.
import "./installMobilePwaPerformanceDefault";

// Media playback runtime
import "./installSoundTouchFeedbackBridge";

// Route-level scroll ownership
import "./installUniversalOnboardingScrollIsolation";
import "./installSettingsScrollReset";
import "./installSettingsModalBehavior";

// Core memory runtime. The scoped compatibility layer must install before any
// legacy memory reader/writer touches the historical unscoped storage key.
import "./installScopedClaraMemoryStorage";
import "../clara-memory-bridge";

// Feature-specific DOM bridges are loaded only when their actual React surface
// appears. This replaces many always-on document-wide MutationObservers.
import "./installAssistantLegacyPatchLoader";
import "./installLifeStageLegacyPatchLoader";

// Buy Check ownership note:
// The active Pause Buy Check flow is owned by React through
// ClaraAiEnvironmentOverlay + useClaraBuyCheckFlow. The former global active
// controllers stay retired because they installed overlapping input handlers,
// DOM replacement, and duplicate opening-message observers.

// Forecast and Buy Check report CSS can remain globally available without
// installing feature-specific JavaScript observers.
import "../clara-forecast-report-focus-mode.css";
import "../clara-forecast-report-stat-row-nowrap.css";
import "../clara-forecast-report-explanation-container.css";
import "../clara-forecast-transition-loader.css";

// Schedule notification runtime bridge
import "../clara-schedule-notification-runtime-bridge";

// Google Play billing restore/activation bridge
import "../google-play-already-owned-restore-bridge";
import "../clara-google-play-verify-auth-retry";

// Core memory runtime. The cabinet autosave watches only the assistant-active
// body class; heavier assistant DOM bridges are lazy-loaded above.
import "../clara-onboarding-memory-review-bridge";
import "../clara-memory-cabinet-autosave";
import "../clara-settings-memory-entry";

// Global/mobile CSS patches
import "../clara-fab-theme.css";
import "../mobile-responsive.css";
import "../mobile-performance.css";
import "../dashboard-bottom-spacing.css";
import "../clara-ai-overlay-soft-anchor.css";
import "../life-context-polish.css";
import "../dashboard-top-nav-hover-fix.css";

// Life Stage visual patches for normal Me/profile UI. The current React Me
// screen renders its hero, support copy, and trend snapshot directly; only the
// pressure-signal bridge is loaded on demand.
import "../life-stage-hero-polish.css";
import "../life-stage-support-card.css";
import "../life-stage-trend-snapshot.css";
import "../life-stage-trend-snapshot-hide-icon.css";
import "../life-stage-trend-graph-hide.css";

// Settings behavior and visual polish. Online sync is intentionally NOT injected
// into the Settings overview. Security & privacy -> Backup & Transfer owns the
// single user-facing sync control. Device reset remains available here.
import "./installSettingsDeviceReset";
import "../settings-cleanup.css";
import "../settings-priority.css";
import "../settings-tile-consistency.css";
import "../settings-support-compose.css";

// Life Stage normal profile visual patches
import "../life-stage-collision.css";
import "../life-stage-action-position.css";
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

// The former hidden Settings double-tap demo controller is intentionally not
// loaded in production. Demo data must be entered through an explicit tool.

// Legacy Buy Check CSS can remain for old snapshots without installing runtime
// ownership or DOM observers.
import "../clara-buy-check-bottom-position.css";
import "../clara-buy-check-report-card-polish.css";
import "../clara-buy-check-report-content-polish.css";
import "../clara-buy-check-report-focus-mode.css";
