function claraReadPeso(text) {
  const raw = String(text || '').replace(/[^0-9.]/g, '');
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function claraPeso(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function claraFindDialogByTitle(title) {
  return Array.from(document.querySelectorAll('[role="dialog"]')).find((dialog) =>
    String(dialog.textContent || '').includes(title)
  );
}

function claraGetAddSavingsState() {
  const dialog = claraFindDialogByTitle('Add Savings');
  if (!dialog) return null;

  const textBlocks = Array.from(dialog.querySelectorAll('p, div'));
  const remainingLabel = textBlocks.find((node) => String(node.textContent || '').trim() === 'Remaining');
  const remaining = claraReadPeso(remainingLabel?.parentElement?.textContent || '');
  const amountInput = Array.from(dialog.querySelectorAll('input')).find((input) => input.type === 'number' || input.placeholder === 'Enter amount');
  const requested = claraReadPeso(amountInput?.value || '');
  const capped = requested > 0 ? Math.min(requested, remaining) : 0;
  const addButton = Array.from(dialog.querySelectorAll('button')).find((button) => /Add Savings|Adding/i.test(button.textContent || ''));

  return { dialog, remaining, amountInput, requested, capped, addButton };
}

function claraUpdateSavingsOverfillUi() {
  const state = claraGetAddSavingsState();
  if (!state?.dialog || !state?.amountInput) return;

  const { dialog, requested, remaining, capped, amountInput } = state;
  const isOver = requested > remaining && remaining > 0;
  let note = dialog.querySelector('[data-clara-savings-overfill-note="true"]');

  if (!isOver) {
    if (note) note.remove();
    return;
  }

  if (!note) {
    note = document.createElement('div');
    note.setAttribute('data-clara-savings-overfill-note', 'true');
    note.style.border = '1px solid rgba(252, 211, 77, 0.24)';
    note.style.background = 'rgba(251, 191, 36, 0.10)';
    note.style.color = 'rgba(255, 251, 235, 0.92)';
    note.style.borderRadius = '16px';
    note.style.padding = '10px 12px';
    note.style.fontSize = '12px';
    note.style.fontWeight = '700';
    note.style.lineHeight = '1.55';
    amountInput.closest('div')?.insertAdjacentElement('afterend', note);
  }

  note.textContent = `It looks like you entered more than this goal still needs. CLARA will only use ${claraPeso(capped)}, not your full input of ${claraPeso(requested)}.`;
}

function claraCloseSavingsOverfillModal() {
  document.querySelector('[data-clara-savings-overfill-modal="true"]')?.remove();
}

function claraShowSavingsOverfillModal(state) {
  claraCloseSavingsOverfillModal();

  const overlay = document.createElement('div');
  overlay.setAttribute('data-clara-savings-overfill-modal', 'true');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '99999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '16px';
  overlay.style.background = 'rgba(0, 0, 0, 0.72)';
  overlay.style.backdropFilter = 'blur(10px)';

  const card = document.createElement('div');
  card.style.width = 'min(420px, 100%)';
  card.style.border = '1px solid rgba(255,255,255,0.10)';
  card.style.borderRadius = '26px';
  card.style.background = 'rgba(6, 18, 36, 0.98)';
  card.style.color = 'white';
  card.style.boxShadow = '0 24px 80px rgba(0,0,0,0.55)';
  card.style.overflow = 'hidden';

  const header = document.createElement('div');
  header.style.padding = '18px 18px 14px';
  header.style.borderBottom = '1px solid rgba(255,255,255,0.10)';

  const title = document.createElement('p');
  title.textContent = 'Too much savings amount';
  title.style.margin = '0';
  title.style.fontSize = '20px';
  title.style.fontWeight = '800';
  title.style.letterSpacing = '-0.03em';

  const body = document.createElement('div');
  body.style.padding = '16px 18px';

  const message = document.createElement('div');
  message.style.border = '1px solid rgba(252, 211, 77, 0.24)';
  message.style.background = 'rgba(251, 191, 36, 0.10)';
  message.style.borderRadius = '18px';
  message.style.padding = '14px';
  message.style.color = 'rgba(255,251,235,0.92)';
  message.style.fontSize = '14px';
  message.style.lineHeight = '1.65';
  message.style.fontWeight = '650';
  message.innerHTML = `You entered <strong style="color:white">${claraPeso(state.requested)}</strong>, but this goal only needs <strong style="color:white">${claraPeso(state.capped)}</strong> more.<br/><br/>Please enter <strong style="color:white">${claraPeso(state.capped)}</strong> or less to complete this goal.`;

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = '10px';
  footer.style.justifyContent = 'flex-end';
  footer.style.padding = '14px 18px 18px';
  footer.style.borderTop = '1px solid rgba(255,255,255,0.10)';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.style.height = '40px';
  cancel.style.borderRadius = '14px';
  cancel.style.border = '1px solid rgba(255,255,255,0.12)';
  cancel.style.background = 'rgba(255,255,255,0.04)';
  cancel.style.color = 'rgba(255,255,255,0.82)';
  cancel.style.padding = '0 16px';
  cancel.style.fontWeight = '700';
  cancel.onclick = claraCloseSavingsOverfillModal;

  const useOnly = document.createElement('button');
  useOnly.type = 'button';
  useOnly.textContent = `Use ${claraPeso(state.capped)} only`;
  useOnly.style.height = '40px';
  useOnly.style.borderRadius = '14px';
  useOnly.style.border = '1px solid rgba(74,222,128,0.24)';
  useOnly.style.background = 'rgb(34,197,94)';
  useOnly.style.color = 'white';
  useOnly.style.padding = '0 16px';
  useOnly.style.fontWeight = '800';
  useOnly.onclick = () => {
    claraCloseSavingsOverfillModal();
    window.__CLARA_SAVINGS_OVERFILL_ALLOW_ONCE__ = true;
    state.addButton?.click();
  };

  header.appendChild(title);
  body.appendChild(message);
  footer.appendChild(cancel);
  footer.appendChild(useOnly);
  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(footer);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function claraConfirmSavingsOverfill(event) {
  const button = event.target?.closest?.('button');
  if (!button || !/Add Savings/i.test(button.textContent || '')) return;

  if (window.__CLARA_SAVINGS_OVERFILL_ALLOW_ONCE__) {
    window.__CLARA_SAVINGS_OVERFILL_ALLOW_ONCE__ = false;
    return;
  }

  const state = claraGetAddSavingsState();
  if (!state) return;

  const { requested, remaining } = state;
  if (!(requested > remaining && remaining > 0)) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  claraShowSavingsOverfillModal(state);
}

if (typeof window !== 'undefined' && !window.__CLARA_SAVINGS_OVERFILL_GUARD__) {
  window.__CLARA_SAVINGS_OVERFILL_GUARD__ = true;
  document.addEventListener('input', claraUpdateSavingsOverfillUi, true);
  document.addEventListener('change', claraUpdateSavingsOverfillUi, true);
  document.addEventListener('click', claraConfirmSavingsOverfill, true);
  setInterval(claraUpdateSavingsOverfillUi, 600);
}
