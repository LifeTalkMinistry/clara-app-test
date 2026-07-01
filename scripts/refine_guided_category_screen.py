# Trigger refinement workflow
from pathlib import Path

path = Path("src/pages/monthly-budget-plan/MonthlyBudgetPlanGuided.jsx")
source = path.read_text(encoding="utf-8")

old_header = '''            <QuestionHeader
              icon={ListChecks}
              eyebrow="Question 4"
              title={
                categoryQuestion === "name"
                  ? "What do you need to set money aside for?"
                  : `How much should go to ${normalizeString(categoryName) || "this category"}?`
              }
              body={
                categoryQuestion === "name"
                  ? "Add one category at a time. Your plan will build below as you answer."
                  : `You currently have ${fmt(Math.max(declared - (editing ? allocated - firstAmount(editing.allocated) : allocated), 0))} available to assign.`
              }
            />'''

new_header = '''            <QuestionHeader
              icon={ListChecks}
              eyebrow="Question 4"
              title={
                categoryQuestion === "name"
                  ? "Add a budget item"
                  : `How much should go to ${normalizeString(categoryName) || "this category"}?`
              }
              body={
                categoryQuestion === "name"
                  ? null
                  : `You can assign up to ${fmt(Math.max(declared - (editing ? allocated - firstAmount(editing.allocated) : allocated), 0))}.`
              }
            />

            <div className="mt-4 flex items-end justify-between gap-4 border-y border-white/8 py-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/34">Allocated</p>
                <p className="mt-1 truncate text-sm font-black text-white/82">
                  {fmt(allocated)}
                  <span className="ml-2 text-xs font-bold text-white/38">
                    · {budgetOptions.length} {budgetOptions.length === 1 ? "category" : "categories"}
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/45">Left to assign</p>
                <p className="mt-1 text-lg font-black tracking-[-0.03em] text-cyan-100">{fmt(left)}</p>
              </div>
            </div>'''

if old_header not in source:
    raise SystemExit("Category question header marker not found")
source = source.replace(old_header, new_header, 1)

old_section_header = '''                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">Categories added</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/38">
                      {fmt(categoryAllocated)} assigned across {budgetOptions.length} {budgetOptions.length === 1 ? "category" : "categories"}.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/58">
                    {budgetOptions.length}
                  </span>
                </div>'''

new_section_header = '''                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                  Budget items
                </p>'''

if old_section_header not in source:
    raise SystemExit("Category list header marker not found")
source = source.replace(old_section_header, new_section_header, 1)

old_row = '''                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{item.title}</p>
                        <p className="mt-0.5 text-xs font-semibold text-white/38">
                          {fmt(item.allocated)} assigned
                        </p>
                      </div>'''

new_row = '''                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{item.title}</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-white/82">{fmt(item.allocated)}</p>'''

if old_row not in source:
    raise SystemExit("Category row marker not found")
source = source.replace(old_row, new_row, 1)

source = source.replace(
    '      setNotice(editing ? "Category updated." : "Category added to your plan.");',
    '      setNotice("");',
    1,
)
source = source.replace('      setNotice("Category removed.");', '      setNotice("");', 1)

old_footer = '''        <div className="pb-4 text-center">
          <p className="text-[11px] font-semibold text-white/28">You can edit any completed answer anytime.</p>
        </div>'''
source = source.replace(old_footer, "", 1)

path.write_text(source, encoding="utf-8")
