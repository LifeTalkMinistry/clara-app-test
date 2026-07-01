from pathlib import Path

path = Path("src/pages/monthly-budget-plan/MonthlyBudgetPlanGuided.jsx")
source = path.read_text(encoding="utf-8")

old_add_start = '''  const addCategory = async () => {
    const title = normalizeString(categoryName);
    const amount = firstAmount(categoryAmount);
    if (!title) {
      setNotice("Name the category first.");
      setCategoryQuestion("name");
      return;
    }
    if (amount <= 0) {
      setNotice("Enter an amount above ₱0.");
      return;
    }

    const current = editing
      ? Math.max(allocated - firstAmount(editing.allocated), 0)
      : allocated;'''

new_add_start = '''  const addCategory = async () => {
    const title = normalizeString(categoryName);
    const amount = firstAmount(categoryAmount);
    if (!title) {
      setNotice("Name the category first.");
      setCategoryQuestion("name");
      return;
    }

    const duplicateCategory = budgetOptions.find((item) => {
      const sameName = normalizeString(item?.title).toLowerCase() === title.toLowerCase();
      const sameItem = editing && String(item?.id || item?.key) === String(editing?.id || editing?.key);
      return sameName && !sameItem;
    });

    if (duplicateCategory) {
      setNotice(`${duplicateCategory.title} is already in your budget. Use its edit button to change the total amount.`);
      setCategoryQuestion("name");
      setCategoryAmount("");
      return;
    }

    if (amount <= 0) {
      setNotice("Enter an amount above ₱0.");
      return;
    }

    const current = editing
      ? Math.max(allocated - firstAmount(editing.allocated), 0)
      : allocated;'''

if old_add_start not in source:
    raise SystemExit("addCategory start marker not found")
source = source.replace(old_add_start, new_add_start, 1)

old_suggestions = '''                  {["Food", "Bills", "Rent", "Transport", "Groceries"].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setCategoryName(suggestion);
                        setNotice("");
                      }}
                      className="rounded-full border border-white/9 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/55"
                    >
                      {suggestion}
                    </button>
                  ))}'''

new_suggestions = '''                  {["Food", "Bills", "Rent", "Transport", "Groceries"]
                    .filter(
                      (suggestion) =>
                        !budgetOptions.some(
                          (item) =>
                            normalizeString(item?.title).toLowerCase() === suggestion.toLowerCase(),
                        ),
                    )
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setCategoryName(suggestion);
                          setNotice("");
                        }}
                        className="rounded-full border border-white/9 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/55"
                      >
                        {suggestion}
                      </button>
                    ))}'''

if old_suggestions not in source:
    raise SystemExit("suggestions marker not found")
source = source.replace(old_suggestions, new_suggestions, 1)

old_continue = '''                    if (!normalizeString(categoryName)) {
                      setNotice("Name the category first.");
                      return;
                    }
                    setNotice("");
                    setCategoryQuestion("amount");'''

new_continue = '''                    const cleanCategoryName = normalizeString(categoryName);
                    if (!cleanCategoryName) {
                      setNotice("Name the category first.");
                      return;
                    }
                    const duplicateCategory = budgetOptions.find((item) => {
                      const sameName =
                        normalizeString(item?.title).toLowerCase() === cleanCategoryName.toLowerCase();
                      const sameItem =
                        editing &&
                        String(item?.id || item?.key) === String(editing?.id || editing?.key);
                      return sameName && !sameItem;
                    });
                    if (duplicateCategory) {
                      setNotice(`${duplicateCategory.title} is already in your budget. Use its edit button to change the total amount.`);
                      return;
                    }
                    setNotice("");
                    setCategoryQuestion("amount");'''

if old_continue not in source:
    raise SystemExit("category continue marker not found")
source = source.replace(old_continue, new_continue, 1)

old_edit_body = ''': `You can assign up to ${fmt(Math.max(declared - (editing ? allocated - firstAmount(editing.allocated) : allocated), 0))}.`'''
new_edit_body = ''': editing
                    ? `Set the new total allocation. ${fmt(editing.allocated)} is currently assigned.`
                    : `You can assign up to ${fmt(Math.max(declared - allocated, 0))}.`'''

if old_edit_body not in source:
    raise SystemExit("amount guidance marker not found")
source = source.replace(old_edit_body, new_edit_body, 1)

path.write_text(source, encoding="utf-8")
