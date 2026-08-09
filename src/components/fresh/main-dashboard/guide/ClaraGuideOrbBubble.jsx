const COPY = {
  intro: {
    title: "MEET THE CLARA ORB",
    body: "The real orb gives you three quick actions.",
    footer: "LEARN EACH ACTION ONE AT A TIME.",
    items: [
      ["1 TAP", "Log Expense"],
      ["2 TAPS", "Transaction Hub"],
      ["HOLD", "Pause Before Buying"],
    ],
    showNext: true,
  },
  "await-single": {
    title: "1 TAP — LOG EXPENSE",
    body: "Tap the real CLARA orb once to open the actual expense logger.",
    footer: "TAP THE ORB ONCE.",
  },
  "await-double": {
    title: "2 TAPS — TRANSACTION HUB",
    body: "Tap the real orb twice quickly to open the complete Transaction Hub.",
    footer: "DOUBLE-TAP THE ORB NOW.",
  },
  "await-hold": {
    title: "HOLD — PAUSE BEFORE BUYING",
    body: "Press and hold the real orb to open CLARA’s Pause Before Buying flow before a purchase.",
    footer: "PRESS AND HOLD THE ORB NOW.",
  },
  complete: {
    title: "ORB READY",
    body: "Tap once to log an expense, tap twice for Transaction Hub, or hold to pause before buying.",
    footer: "YOU NOW KNOW ALL THREE ORB ACTIONS.",
    showNext: true,
  },
};

function stopControlEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

export default function ClaraGuideOrbBubble({ phase, onNext }) {
  const copy = COPY[phase];
  if (!copy) return null;

  return (
    <div className="clara-guide-orb-bubble-shell" data-clara-guide-orb-bubble="true">
      <section className="clara-guide-orb-bubble-surface" aria-live="polite">
        <span className="clara-guide-orb-bubble-arrow" aria-hidden="true" />
        <p className="clara-guide-orb-bubble-title">{copy.title}</p>
        <p className="clara-guide-orb-bubble-body">{copy.body}</p>

        {copy.items ? (
          <div className="clara-guide-orb-bubble-items">
            {copy.items.map(([label, value]) => (
              <div key={label} className="clara-guide-orb-bubble-item">
                <span className="clara-guide-orb-bubble-item-label">{label}</span>
                <span className="clara-guide-orb-bubble-item-value">{value}</span>
              </div>
            ))}
          </div>
        ) : null}

        <p className="clara-guide-orb-bubble-footer">{copy.footer}</p>

        {copy.showNext ? (
          <button
            type="button"
            className="clara-guide-orb-next"
            data-clara-guide-orb-ui-next="true"
            onPointerDown={stopControlEvent}
            onPointerUp={stopControlEvent}
            onClick={onNext}
          >
            NEXT
          </button>
        ) : null}
      </section>
    </div>
  );
}
