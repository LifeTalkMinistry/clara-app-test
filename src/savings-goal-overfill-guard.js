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
  const addButton = Array.from(dialog.querySelectorAll('button')).find((button) => /Add Savings|Add ₱|Adding/i.test(button.textContent || ''));

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

function claraConfirmSavingsOverfill(event) {
  const button = event.target?.closest?.('button');
  if (!button || !/Add Savings/i.test(button.textContent || '')) return;

  const state = claraGetAddSavingsState();
  if (!state) return;

  const { requested, remaining, capped } = state;
  if (!(requested > remaining && remaining > 0)) return;

  const ok = window.confirm(`You entered ${claraPeso(requested)}, but this goal only needs ${claraPeso(capped)}. CLARA will only deduct ${claraPeso(capped)}. Continue?`);
  if (!ok) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }
}

if (typeof window !== 'undefined' && !window.__CLARA_SAVINGS_OVERFILL_GUARD__) {
  window.__CLARA_SAVINGS_OVERFILL_GUARD__ = true;
  document.addEventListener('input', claraUpdateSavingsOverfillUi, true);
  document.addEventListener('change', claraUpdateSavingsOverfillUi, true);
  document.addEventListener('click', claraConfirmSavingsOverfill, true);
  setInterval(claraUpdateSavingsOverfillUi, 600);
}
