export const getEventButtonLabel = (event) => {
  const button = event?.target?.closest?.("button");
  return String(button?.textContent || "").toLowerCase();
};

export const isDetailsToggleEvent = (event) => {
  const label = getEventButtonLabel(event);
  return label.includes("show details") || label.includes("hide details");
};

export const stopCapturedDetailsToggle = (event) => {
  if (!isDetailsToggleEvent(event)) return false;

  event.preventDefault();
  event.stopPropagation();
  return true;
};
