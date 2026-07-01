let budgetManagerHeaderObserver = null;

function styleBudgetManagerHeader(header) {
  const title = header?.querySelector("h1");
  if (!title) return;

  const titleText = String(title.textContent || "").trim();
  if (!["Current Budget Plan", "Manage Budget"].includes(titleText)) return;

  const inner = title.closest("div.mx-auto") || header.firstElementChild;
  const titleGroup = title.parentElement;
  const subtitle = titleGroup?.querySelector("p");
  const backButton = header.querySelector("button");
  const statusBadge = Array.from(header.querySelectorAll("span")).find((span) =>
    /active/i.test(String(span.textContent || "")),
  );

  header.dataset.budgetManagerHeader = "premium";
  header.style.position = "sticky";
  header.style.top = "0";
  header.style.zIndex = "70";
  header.style.isolation = "isolate";
  header.style.overflow = "hidden";
  header.style.background =
    "radial-gradient(circle at 18% -65%, rgba(45,212,191,0.34), transparent 48%), radial-gradient(circle at 92% -28%, rgba(139,92,246,0.24), transparent 44%), linear-gradient(180deg, rgba(4,13,31,0.995) 0%, rgba(8,17,39,0.985) 100%)";
  header.style.borderBottom = "1px solid rgba(165,243,252,0.12)";
  header.style.boxShadow =
    "0 18px 42px rgba(2,8,23,0.34), inset 0 -1px 0 rgba(255,255,255,0.035)";
  header.style.backdropFilter = "none";
  header.style.webkitBackdropFilter = "none";
  header.style.paddingBottom = "13px";

  if (inner) {
    inner.style.position = "relative";
    inner.style.zIndex = "2";
    inner.style.minHeight = "54px";
    inner.style.alignItems = "center";
  }

  if (backButton) {
    backButton.style.width = "42px";
    backButton.style.height = "42px";
    backButton.style.borderRadius = "999px";
    backButton.style.border = "1px solid rgba(165,243,252,0.17)";
    backButton.style.background =
      "linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.025))";
    backButton.style.color = "rgba(236,254,255,0.82)";
    backButton.style.boxShadow =
      "inset 0 1px 0 rgba(255,255,255,0.09), 0 10px 24px rgba(0,0,0,0.22)";
  }

  if (titleGroup) {
    titleGroup.style.display = "flex";
    titleGroup.style.minWidth = "0";
    titleGroup.style.flex = "1";
    titleGroup.style.flexDirection = "column";
    titleGroup.style.justifyContent = "center";
  }

  title.textContent = "Manage Budget";
  title.style.order = "2";
  title.style.margin = "2px 0 0";
  title.style.fontSize = "18px";
  title.style.fontWeight = "900";
  title.style.lineHeight = "1.05";
  title.style.letterSpacing = "-0.035em";
  title.style.color = "#ffffff";
  title.style.textShadow = "0 1px 18px rgba(34,211,238,0.08)";

  if (subtitle) {
    subtitle.textContent = "Current plan";
    subtitle.style.order = "1";
    subtitle.style.margin = "0";
    subtitle.style.fontSize = "8px";
    subtitle.style.fontWeight = "900";
    subtitle.style.lineHeight = "1.15";
    subtitle.style.letterSpacing = "0.18em";
    subtitle.style.textTransform = "uppercase";
    subtitle.style.color = "rgba(165,243,252,0.55)";
    subtitle.style.whiteSpace = "nowrap";
  }

  if (statusBadge) {
    statusBadge.style.display = "inline-flex";
    statusBadge.style.alignItems = "center";
    statusBadge.style.gap = "6px";
    statusBadge.style.border = "1px solid rgba(110,231,183,0.2)";
    statusBadge.style.borderRadius = "999px";
    statusBadge.style.background =
      "linear-gradient(145deg, rgba(16,185,129,0.13), rgba(16,185,129,0.055))";
    statusBadge.style.padding = "6px 10px";
    statusBadge.style.color = "rgba(209,250,229,0.9)";
    statusBadge.style.fontSize = "9px";
    statusBadge.style.fontWeight = "850";
    statusBadge.style.boxShadow =
      "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.16)";

    if (!statusBadge.querySelector("[data-budget-active-dot]")) {
      statusBadge.textContent = "";
      const dot = document.createElement("span");
      dot.dataset.budgetActiveDot = "true";
      dot.style.width = "6px";
      dot.style.height = "6px";
      dot.style.flex = "0 0 auto";
      dot.style.borderRadius = "999px";
      dot.style.background = "#6ee7b7";
      dot.style.boxShadow = "0 0 10px rgba(110,231,183,0.72)";
      statusBadge.append(dot, document.createTextNode("Active"));
    }
  }

  let accent = header.querySelector("[data-budget-manager-accent]");
  if (!accent) {
    accent = document.createElement("div");
    accent.dataset.budgetManagerAccent = "true";
    accent.setAttribute("aria-hidden", "true");
    header.appendChild(accent);
  }

  accent.style.position = "absolute";
  accent.style.left = "16px";
  accent.style.right = "16px";
  accent.style.bottom = "0";
  accent.style.height = "1px";
  accent.style.pointerEvents = "none";
  accent.style.background =
    "linear-gradient(90deg, transparent, rgba(103,232,249,0.42), rgba(167,139,250,0.32), transparent)";
}

function scanBudgetManagerHeaders() {
  document.querySelectorAll("header").forEach(styleBudgetManagerHeader);
}

export function installBudgetManagerHeaderPolish() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  scanBudgetManagerHeaders();

  if (budgetManagerHeaderObserver) return;
  budgetManagerHeaderObserver = new MutationObserver(scanBudgetManagerHeaders);
  budgetManagerHeaderObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
