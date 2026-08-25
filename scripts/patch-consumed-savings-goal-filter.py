from pathlib import Path

# CLARA Savings Goal chat: hide already-consumed legacy goals.
overlay = Path('src/components/fresh/main-dashboard/assistant/ClaraSavingsGoalOverlay.jsx')
s = overlay.read_text()
old_overlay = '''      .filter((goal) => goal && !goal?.deletedAt && !goal?.deleted_at && !goal?.is_archived)
      .map((goal) => ({ ...goal, id: getGoalId(goal) }))
'''
new_overlay = '''      .filter((goal) => {
        if (!goal || goal?.deletedAt || goal?.deleted_at || goal?.is_archived) return false;
        const consumed = getGoalSavedAmount(goal) <= 0.0001 && getGoalActivity(goal).some((item) => clean(item?.type).toLowerCase() === "use");
        return !consumed;
      })
      .map((goal) => ({ ...goal, id: getGoalId(goal) }))
'''
if old_overlay in s:
    s = s.replace(old_overlay, new_overlay, 1)
    overlay.write_text(s)
elif 'const consumed = getGoalSavedAmount(goal) <= 0.0001' not in s:
    raise SystemExit('Overlay consumed-goal filter anchor missing')

# Dashboard Savings card: hide the same legacy consumed goals immediately.
card = Path('src/components/SavingsCardRefined.jsx')
c = card.read_text()
marker = 'function isConsumedSavingsGoal(goal = {})'
if marker not in c:
    helper_anchor = 'const getTitle = (goal = {}) =>\n  goal.title || goal.name || goal.goal_name || goal.label || "Savings Goal";\n\n'
    helper = '''const getTitle = (goal = {}) =>
  goal.title || goal.name || goal.goal_name || goal.label || "Savings Goal";

function isConsumedSavingsGoal(goal = {}) {
  const rows = goal?.savingsActivityLog || goal?.savings_activity_log || goal?.activityLog || goal?.activity_log || [];
  const used = Array.isArray(rows) && rows.some((item) => String(item?.type || "").trim().toLowerCase() === "use");
  return getSaved(goal) <= 0.0001 && used;
}

'''
    if helper_anchor not in c:
        raise SystemExit('Savings card helper anchor missing')
    c = c.replace(helper_anchor, helper, 1)

old_card = '''  const goals = Array.isArray(savingsGoals)
    ? savingsGoals.filter((goal) => goal && !goal.deleted_at && !goal.deletedAt)
    : [];
'''
new_card = '''  const goals = Array.isArray(savingsGoals)
    ? savingsGoals.filter((goal) => goal && !goal.deleted_at && !goal.deletedAt && !goal.is_archived && !isConsumedSavingsGoal(goal))
    : [];
'''
if old_card in c:
    c = c.replace(old_card, new_card, 1)
elif '!isConsumedSavingsGoal(goal)' not in c:
    raise SystemExit('Savings card active-goals filter anchor missing')
card.write_text(c)

print('Consumed Savings Goals filtered from active UI')
