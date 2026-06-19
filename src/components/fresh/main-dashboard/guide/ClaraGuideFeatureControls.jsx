export default function ClaraGuideFeatureControls({ onNext }) {
  return (
    <aside className="clara-guide-orb-feature-controls" aria-live="polite">
      <span className="clara-guide-orb-safety-badge">
        GUIDE MODE — NOTHING WILL BE SAVED
      </span>
      <button
        type="button"
        className="clara-guide-orb-feature-next"
        data-clara-guide-orb-ui-next="true"
        onClick={onNext}
      >
        NEXT
      </button>
    </aside>
  );
}
