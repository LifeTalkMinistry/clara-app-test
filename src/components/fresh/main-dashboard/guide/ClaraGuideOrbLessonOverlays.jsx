import { useCallback, useRef } from "react";
import TransactionHub from "@/pages/TransactionHub";

function GuideBubble({ copy, onNext }) {
  const lockRef = useRef(false);
  const hasAction = Boolean(copy?.actionLabel && onNext);

  const activate = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!hasAction || lockRef.current) return;

      lockRef.current = true;
      onNext();
      window.setTimeout(() => {
        lockRef.current = false;
      }, 280);
    },
    [hasAction, onNext]
  );

  return (
    <div className="clara-guide-orb-bubble-shell" role="status" aria-live="polite">
      <div className="clara-guide-orb-bubble-surface">
        <div className="clara-guide-orb-bubble-arrow" aria-hidden="true" />
        <p className="clara-guide-orb-bubble-title">{copy.title}</p>
        <p className="clara-guide-orb-bubble-body">{copy.body}</p>

        {copy.items?.length ? (
          <div className="clara-guide-orb-bubble-items">
            {copy.items.map((item) => (
              <div key={item.label} className="clara-guide-orb-bubble-item">
                <span className="clara-guide-orb-bubble-item-label">{item.label}</span>
                <strong className="clara-guide-orb-bubble-item-value">{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        <p className="clara-guide-orb-bubble-footer">{copy.footer}</p>

        {hasAction ? (
          <button
            type="button"
            className="clara-guide-orb-next"
            data-clara-guide-orb-ui-next="true"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={activate}
          >
            {copy.actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function GuideFeatureControls({ onNext }) {
  const lockRef = useRef(false);

  const activate = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (lockRef.current) return;

      lockRef.current = true;
      onNext?.();
      window.setTimeout(() => {
        lockRef.current = false;
      }, 280);
    },
    [onNext]
  );

  return (
    <div className="clara-guide-orb-feature-controls" aria-label="Guide simulation controls">
      <div className="clara-guide-orb-safety-badge">
        GUIDE MODE — NOTHING WILL BE SAVED
      </div>
      <button
        type="button"
        data-clara-guide-orb-ui-next="true"
        className="clara-guide-orb-feature-next"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={activate}
      >
        NEXT
      </button>
    </div>
  );
}

export default function ClaraGuideOrbLessonOverlays({ controller }) {
  if (!controller?.isActive) return null;

  return (
    <>
      {controller.phase === "showing-transaction-hub" ? (
        <div className="fixed inset-0 z-[250] overflow-y-auto bg-[#020713]">
          <TransactionHub guideSimulationMode onClose={controller.next} />
        </div>
      ) : null}

      {controller.copy ? (
        <GuideBubble
          copy={controller.copy}
          onNext={controller.copy.actionLabel ? controller.next : undefined}
        />
      ) : null}

      {controller.isShowingFeature ? (
        <GuideFeatureControls onNext={controller.next} />
      ) : null}
    </>
  );
}
