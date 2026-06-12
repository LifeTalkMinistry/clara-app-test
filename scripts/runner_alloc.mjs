import fs from 'node:fs';

const target = ['src','components','fresh','main-dashboard','budget','useDashboardMonthlyBudgetPlan.js'].join('/');
const source = fs.readFileSync(target, 'utf8');
const oldText = '      const allocated = firstValidNumber(item?.allocated);';
const newText = `      const allocated = firstValidNumber(
        item?.allocated,
        item?.allocated_amount,
        item?.budget_amount,
        item?.total_budget,
        item?.amount,
        item?.budget?.allocated_amount,
        item?.budget?.budget_amount,
        item?.budget?.total_budget,
        item?.budget?.amount
      );`;
const count = source.split(oldText).length - 1;
if (count !== 1) {
  throw new Error(`Expected one allocation fallback match, found ${count}`);
}
fs.writeFileSync(target, source.replace(oldText, newText));
console.log('allocation fallback patched');
