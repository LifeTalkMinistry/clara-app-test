from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/components/fresh/main-dashboard/assistant/ClaraMoneyScheduleOverlay.jsx"
TEST = ROOT / "tests/clara-log-expense-flow-source.test.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} block, found {count}")
    return text.replace(old, new, 1)


source = SOURCE.read_text()

source = replace_once(
    source,
    '  const [draftText, setDraftText] = useState("");\n  const [editItems, setEditItems] = useState([]);',
    '  const [draftText, setDraftText] = useState("");\n  const [addItemOpen, setAddItemOpen] = useState(false);\n  const [addAmountInput, setAddAmountInput] = useState("");\n  const [editItems, setEditItems] = useState([]);',
    "inline add state",
)

source = replace_once(
    source,
    '''  const resetReviewInlineEditing = () => {\n    setReviewEditingDayKey("");\n    setInlineEditingItemId("");\n    setInlineEditingField("");\n    setInlineLabelInput("");\n    setInlineAmountInput("");\n    setError("");\n  };\n\n  const resetRoutineFields = () => {''',
    '''  const resetReviewInlineEditing = () => {\n    setReviewEditingDayKey("");\n    setInlineEditingItemId("");\n    setInlineEditingField("");\n    setInlineLabelInput("");\n    setInlineAmountInput("");\n    setError("");\n  };\n\n  const resetAddExpenseDraft = () => {\n    setAddItemOpen(false);\n    setDraftText("");\n    setAddAmountInput("");\n  };\n\n  const resetRoutineFields = () => {''',
    "reset add helper anchor",
)

source = replace_once(
    source,
    '''    setCurrentBasisDayKey("");\n    setDraftText("");\n    setEditItems([]);\n    resetInlineItemEditing();''',
    '''    setCurrentBasisDayKey("");\n    resetAddExpenseDraft();\n    setEditItems([]);\n    resetInlineItemEditing();''',
    "reset routine add draft",
)

source = replace_once(
    source,
    '''    setDays(nextDays);\n    setDraftText("");\n    setEditItems([]);\n    setCurrentBasisDayKey("");''',
    '''    setDays(nextDays);\n    resetAddExpenseDraft();\n    setEditItems([]);\n    setCurrentBasisDayKey("");''',
    "move next day add draft",
)

source = replace_once(
    source,
    '''    setEditItems(cloneItems(sourceDay.items));\n    setCurrentBasisDayKey(sourceDay.key);\n    resetInlineItemEditing();''',
    '''    resetAddExpenseDraft();\n    setEditItems(cloneItems(sourceDay.items));\n    setCurrentBasisDayKey(sourceDay.key);\n    resetInlineItemEditing();''',
    "copy source add draft",
)

source = replace_once(
    source,
    '''    setDraftText("");\n    setEditItems([]);\n    setCurrentBasisDayKey("");\n    resetInlineItemEditing();\n    setError("");\n    appendUser("Completely different setup");''',
    '''    resetAddExpenseDraft();\n    setEditItems([]);\n    setCurrentBasisDayKey("");\n    resetInlineItemEditing();\n    setError("");\n    appendUser("Completely different setup");''',
    "different setup add draft",
)

source = replace_once(
    source,
    '''    setDayIndex(targetIndex);\n    setCurrentBasisDayKey(basisDayKeyFrom(sourceDay));\n    setDraftText("");\n    setEditItems(cloneItems(sourceDay.items));''',
    '''    setDayIndex(targetIndex);\n    setCurrentBasisDayKey(basisDayKeyFrom(sourceDay));\n    resetAddExpenseDraft();\n    setEditItems(cloneItems(sourceDay.items));''',
    "previous day edit add draft",
)

source = replace_once(
    source,
    '''  const startAddExpense = () => {\n    if (!interactionReady) return;\n    setDraftText("");\n    resetInlineItemEditing();\n    setError("");\n    appendUser("Add something");\n    runAssistantSequence(\n      [`What should I add to ${currentWeekday.name}? You can say something like “Transportation 100”.`],\n      "edit-add"\n    );\n  };\n\n  const submitAddedExpense = () => {\n    if (!interactionReady) return;\n    const parsed = parseRoutineExpenses(draftText);\n    if (!parsed.items.length || parsed.invalidLines.length) {\n      setError("Use the format “Expense amount”, for example “Transportation 100”.");\n      return;\n    }\n\n    const submittedText = draftText;\n    setEditItems((current) => [...current, ...parsed.items]);\n    setDraftText("");\n    setError("");\n    appendUser(submittedText);\n    runAssistantSequence(\n      [\n        editReturnContext\n          ? "Updated. You can make another correction or press Done editing."\n          : "Added. You can add another expense, remove one, edit an item, or press Done for this day.",\n      ],\n      "day-edit"\n    );\n  };''',
    '''  const startAddExpense = () => {\n    if (!interactionReady || addItemOpen) return;\n    setDraftText("");\n    setAddAmountInput("");\n    setAddItemOpen(true);\n    resetInlineItemEditing();\n    setError("");\n  };\n\n  const cancelAddExpense = () => {\n    resetAddExpenseDraft();\n    setError("");\n  };\n\n  const submitAddedExpense = () => {\n    if (!interactionReady || !addItemOpen) return;\n    const label = cleanText(draftText);\n    const amountCentavos = parseAmountToCentavos(addAmountInput);\n\n    if (!label) {\n      setError("Type the item name first.");\n      return;\n    }\n    if (amountCentavos <= 0) {\n      setError("Enter an amount greater than zero.");\n      return;\n    }\n\n    setEditItems((current) => [...current, createUiItem(label, amountCentavos)]);\n    resetAddExpenseDraft();\n    setError("");\n  };''',
    "chat add flow",
)

source = replace_once(
    source,
    '''  const startRemoveExpense = () => {\n    if (!interactionReady || !editItems.length) return;''',
    '''  const startRemoveExpense = () => {\n    if (!interactionReady || !editItems.length || addItemOpen) return;''',
    "remove guard",
)

source = replace_once(
    source,
    '''  const toggleItemEditMode = () => {\n    if (!interactionReady || !editItems.length) return;''',
    '''  const toggleItemEditMode = () => {\n    if (!interactionReady || !editItems.length || addItemOpen) return;''',
    "edit guard",
)

source = replace_once(
    source,
    '''    setDayIndex(index);\n    setCurrentBasisDayKey("");\n    setDraftText("");\n    setEditItems([]);''',
    '''    setDayIndex(index);\n    setCurrentBasisDayKey("");\n    resetAddExpenseDraft();\n    setEditItems([]);''',
    "review recreate add draft",
)

source = replace_once(
    source,
    '''    appendUser(`Done editing ${editedWeekday.name}`);\n    setEditReturnContext(null);\n    setDraftText("");\n    setEditItems([]);''',
    '''    appendUser(`Done editing ${editedWeekday.name}`);\n    setEditReturnContext(null);\n    resetAddExpenseDraft();\n    setEditItems([]);''',
    "finish previous edit add draft",
)

source = replace_once(
    source,
    '''  const finishEditedDay = () => {\n    if (!interactionReady) return;\n    const finalItems = materializeInlineEdit(editItems);''',
    '''  const finishEditedDay = () => {\n    if (!interactionReady) return;\n    if (addItemOpen) {\n      setError("Add this item or cancel the add section before finishing the day.");\n      return;\n    }\n    const finalItems = materializeInlineEdit(editItems);''',
    "finish day add guard",
)

old_day_controls = '''              <div className="grid grid-cols-2 gap-2.5" data-clara-money-routine-day-controls="true">\n                <button\n                  type="button"\n                  onClick={startAddExpense}\n                  className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-blue-300/18 bg-white/[0.04] px-3 text-[12px] font-black text-white/88 active:scale-[0.985]"\n                >\n                  <PlusCircle className="h-4 w-4" /> Add\n                </button>\n                <button\n                  type="button"\n                  onClick={startRemoveExpense}\n                  disabled={!editItems.length}\n                  className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-blue-300/18 bg-white/[0.04] px-3 text-[12px] font-black text-white/88 active:scale-[0.985] disabled:opacity-35"\n                >\n                  <MinusCircle className="h-4 w-4" /> Remove\n                </button>\n                <button\n                  type="button"\n                  onClick={toggleItemEditMode}\n                  disabled={!editItems.length}\n                  aria-pressed={itemEditMode}\n                  className={`flex min-h-12 items-center justify-center gap-2 rounded-[18px] border px-3 text-[12px] font-black active:scale-[0.985] disabled:opacity-35 ${\n                    itemEditMode\n                      ? "border-cyan-200/28 bg-cyan-200/[0.09] text-cyan-50"\n                      : "border-blue-300/18 bg-white/[0.04] text-white/88"\n                  }`}\n                >\n                  <PencilLine className="h-4 w-4" />\n                  {itemEditMode ? "Done editing items" : "Edit item"}\n                </button>\n                <ChoiceButton onClick={finishEditedDay}>\n                  {editReturnContext ? "Done editing" : "Done"}\n                </ChoiceButton>\n              </div>'''

new_day_controls = '''              {addItemOpen ? (\n                <form\n                  data-clara-money-routine-inline-add="true"\n                  onSubmit={(event) => {\n                    event.preventDefault();\n                    submitAddedExpense();\n                  }}\n                  className="rounded-[18px] border border-white/10 bg-[#030711]/96 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)]"\n                >\n                  <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">\n                    <label className="min-w-0">\n                      <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/36">\n                        Item\n                      </span>\n                      <input\n                        autoFocus\n                        value={draftText}\n                        onChange={(event) => {\n                          setDraftText(event.target.value);\n                          if (error) setError("");\n                        }}\n                        placeholder="Transportation"\n                        className="h-10 w-full rounded-[12px] border border-white/10 bg-black/25 px-3 text-[12px] font-bold text-white outline-none placeholder:text-white/28 focus:border-cyan-200/24"\n                      />\n                    </label>\n                    <label>\n                      <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/36">\n                        Amount\n                      </span>\n                      <div className="flex h-10 items-center rounded-[12px] border border-white/10 bg-black/25 px-2.5 focus-within:border-cyan-200/24">\n                        <span className="mr-1 text-[11px] font-black text-[#8ffff8]/72">₱</span>\n                        <input\n                          value={addAmountInput}\n                          onChange={(event) => {\n                            setAddAmountInput(sanitizeMoneyInput(event.target.value));\n                            if (error) setError("");\n                          }}\n                          inputMode="decimal"\n                          placeholder="0"\n                          className="min-w-0 flex-1 bg-transparent text-right text-[12px] font-black text-white outline-none placeholder:text-white/28"\n                        />\n                      </div>\n                    </label>\n                  </div>\n                  <div className="mt-2.5 grid grid-cols-2 gap-2">\n                    <button\n                      type="button"\n                      onClick={cancelAddExpense}\n                      className="min-h-10 rounded-[13px] border border-white/10 bg-white/[0.03] px-3 text-[10.5px] font-black text-white/64 active:scale-[0.985]"\n                    >\n                      Cancel\n                    </button>\n                    <button\n                      type="submit"\n                      disabled={!cleanText(draftText) || parseAmountToCentavos(addAmountInput) <= 0}\n                      className="min-h-10 rounded-[13px] bg-[#1769ff] px-3 text-[10.5px] font-black text-white active:scale-[0.985] disabled:opacity-35"\n                    >\n                      Add item\n                    </button>\n                  </div>\n                </form>\n              ) : null}\n\n              <div className="grid grid-cols-2 gap-2.5" data-clara-money-routine-day-controls="true">\n                <button\n                  type="button"\n                  onClick={startAddExpense}\n                  disabled={addItemOpen}\n                  aria-pressed={addItemOpen}\n                  className={`flex min-h-12 items-center justify-center gap-2 rounded-[18px] border px-3 text-[12px] font-black active:scale-[0.985] disabled:opacity-45 ${\n                    addItemOpen\n                      ? "border-cyan-200/24 bg-cyan-200/[0.07] text-cyan-50"\n                      : "border-blue-300/18 bg-white/[0.04] text-white/88"\n                  }`}\n                >\n                  <PlusCircle className="h-4 w-4" /> Add\n                </button>\n                <button\n                  type="button"\n                  onClick={startRemoveExpense}\n                  disabled={!editItems.length || addItemOpen}\n                  className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-blue-300/18 bg-white/[0.04] px-3 text-[12px] font-black text-white/88 active:scale-[0.985] disabled:opacity-35"\n                >\n                  <MinusCircle className="h-4 w-4" /> Remove\n                </button>\n                <button\n                  type="button"\n                  onClick={toggleItemEditMode}\n                  disabled={!editItems.length || addItemOpen}\n                  aria-pressed={itemEditMode}\n                  className={`flex min-h-12 items-center justify-center gap-2 rounded-[18px] border px-3 text-[12px] font-black active:scale-[0.985] disabled:opacity-35 ${\n                    itemEditMode\n                      ? "border-cyan-200/28 bg-cyan-200/[0.09] text-cyan-50"\n                      : "border-blue-300/18 bg-white/[0.04] text-white/88"\n                  }`}\n                >\n                  <PencilLine className="h-4 w-4" />\n                  {itemEditMode ? "Done editing items" : "Edit item"}\n                </button>\n                <ChoiceButton onClick={finishEditedDay} disabled={addItemOpen}>\n                  {editReturnContext ? "Done editing" : "Done"}\n                </ChoiceButton>\n              </div>'''
source = replace_once(source, old_day_controls, new_day_controls, "day controls inline add")

source = replace_once(
    source,
    '''\n          {phase === "edit-add" && controlsReady ? (\n            <div className="mt-auto pt-3">\n              <Composer\n                value={draftText}\n                onChange={setDraftText}\n                onSubmit={submitAddedExpense}\n                placeholder="Transportation 100"\n              />\n            </div>\n          ) : null}\n''',
    "\n",
    "legacy edit-add composer",
)

SOURCE.write_text(source)


test_text = TEST.read_text()
anchor = '''test("Money Schedule edits item names and amounts directly inside the routine card", () => {'''
new_test = '''test("Money Schedule Add opens a direct item-and-amount section without another chat turn", () => {\n  assert.match(moneyScheduleSource, /addItemOpen/);\n  assert.match(moneyScheduleSource, /addAmountInput/);\n  assert.match(moneyScheduleSource, /data-clara-money-routine-inline-add="true"/);\n  assert.match(moneyScheduleSource, />\\s*Item\\s*</);\n  assert.match(moneyScheduleSource, />\\s*Amount\\s*</);\n  assert.match(moneyScheduleSource, /createUiItem\\(label, amountCentavos\\)/);\n  assert.match(moneyScheduleSource, /Add item/);\n  assert.doesNotMatch(moneyScheduleSource, /phase === "edit-add"/);\n  assert.doesNotMatch(moneyScheduleSource, /appendUser\\("Add something"\\)/);\n  assert.doesNotMatch(moneyScheduleSource, /What should I add to \\${currentWeekday\\.name}/);\n});\n\n'''
if new_test not in test_text:
    if anchor not in test_text:
        raise RuntimeError("Could not find test insertion anchor")
    test_text = test_text.replace(anchor, new_test + anchor, 1)

TEST.write_text(test_text)
