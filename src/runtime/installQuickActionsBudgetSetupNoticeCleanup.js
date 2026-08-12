const NOTICE_TEXT =
  "Unplanned and Undocumented are always available. Set up a budget to add planned choices here too.";

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

function removeQuickActionsBudgetSetupNotice(root = document) {
  if (typeof document === "undefined" || !root?.querySelectorAll) return;

  root.querySelectorAll("p").forEach((paragraph) => {
    if (normalizeText(paragraph.textContent) !== NOTICE_TEXT) return;

    const notice = paragraph.parentElement;
    if (!notice) return;

    const setupButton = notice.querySelector("button");
    if (normalizeText(setupButton?.textContent) !== "Set up budget") return;

    notice.remove();
  });
}

function installQuickActionsBudgetSetupNoticeCleanup() {
  if (typeof document === "undefined") return;

  const start = () => {
    removeQuickActionsBudgetSetupNotice(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;

          if (node.matches?.("p") && normalizeText(node.textContent) === NOTICE_TEXT) {
            removeQuickActionsBudgetSetupNotice(node.parentElement || document);
            return;
          }

          removeQuickActionsBudgetSetupNotice(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) start();
  else window.addEventListener("DOMContentLoaded", start, { once: true });
}

installQuickActionsBudgetSetupNoticeCleanup();
