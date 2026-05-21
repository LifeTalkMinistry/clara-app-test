function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const WHY_NOTES = {
  "Emotional Fatigue": "Use this as a watch signal: tired moments can quietly turn small choices into relief spending.",
  "Reward Frequency Risk": "This matters because repeated tiny rewards can become a weekly habit before they feel expensive.",
  "Daily Pressure": "This matters because food, fare, data, and school needs can create pressure even when each cost looks small.",
  "Reward Control": "This is a protection signal: rewards are safer when the limit is chosen before stress arrives.",
  "Essential-Cost Load": "This matters because essentials should be protected before flexible spending starts.",
  "Recovery Gap": "This matters because low recovery time can make convenience feel necessary.",
  "Cash Buffer Risk": "This matters because one surprise school or commute cost can affect the whole week without a small buffer.",
  "Shared-Money Pressure": "This matters because helping others is healthier when your own essentials stay protected.",
  "Responsibility Load": "This matters because pressure from school and home can drain the same energy source.",
  "Boundary Risk": "This matters because clear limits protect both support and stability.",
  "Fatigue Load": "This matters because time pressure can become money pressure.",
  "Schedule-Cost Pressure": "This matters because rushed days often create extra costs.",
  "Convenience Spend Risk": "This matters because convenience becomes risky when it turns into the default response.",
  "Debt Stress Load": "This matters because old money pressure can quietly control new decisions.",
  "Repayment Pressure": "This matters because repayment stability reduces repair-mode budgeting.",
  "Cash-Flow Stability": "This matters because timing mismatch can create stress even when total money looks enough.",
  "Independence Load": "This matters because independence needs structure before ambition stays consistent.",
  "Essential Pressure": "This matters because essentials should not compete with impulse decisions.",
  "Buffer Stability": "This matters because a small buffer can protect peace more than strict rules alone.",
  "Burnout Watch": "This matters because recovery planning keeps spending from becoming the only relief.",
  "Financial Pressure": "This matters because repeated small costs often explain the monthly leak.",
  "Micro-Spend Risk": "This matters because small leaks matter when they repeat without being noticed.",
  "Future Potential": "This matters because the goal is a rhythm you can repeat, not a perfect plan."
};

function getModal() {
  return Array.from(document.querySelectorAll(".absolute")).find((node) => {
    const text = clean(node.textContent).toLowerCase();
    return node.querySelector("h4") && text.includes("sources");
  });
}

function enhanceTrendModalFill() {
  const modal = getModal();
  if (!modal) return;

  const title = clean(modal.querySelector("h4")?.textContent);
  const sourceHeading = Array.from(modal.querySelectorAll("p")).find((node) => clean(node.textContent) === "Sources");
  const sourceBox = sourceHeading?.closest("div");
  if (!title || !sourceBox) return;

  sourceBox.querySelectorAll("p").forEach((node) => {
    if (node === sourceHeading) return;
    node.hidden = true;
    node.style.display = "none";
  });

  let note = modal.querySelector("[data-clara-modal-bottom-note='true']");
  if (!note) {
    note = document.createElement("div");
    note.dataset.claraModalBottomNote = "true";
    sourceBox.insertAdjacentElement("afterend", note);
  }

  note.style.cssText = "margin:10px 0 0;padding:10px 12px;border-radius:18px;border:1px solid rgba(255,255,255,.085);background:linear-gradient(135deg, rgba(34,211,238,.055), rgba(168,85,247,.045));box-shadow:inset 0 1px 0 rgba(255,255,255,.045);";
  note.innerHTML = `
    <p style="margin:0 0 4px;font-size:8px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.58);">Quick read</p>
    <p style="margin:0;font-size:10.5px;line-height:1.45;color:rgba(255,255,255,.78);">${WHY_NOTES[title] || "This card helps CLARA turn vague pressure into one behavior to watch today."}</p>
  `;
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_TREND_MODAL_FILL__) {
  window.__CLARA_TREND_MODAL_FILL__ = true;
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceTrendModalFill();
    });
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", () => window.setTimeout(schedule, 120), { passive: true });
  schedule();
}
