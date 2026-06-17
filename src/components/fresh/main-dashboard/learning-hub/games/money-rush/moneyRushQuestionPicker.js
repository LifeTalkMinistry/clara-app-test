import moneyRushQuestions from './moneyRushQuestions';

const DEFAULT_COUNT = 10;

const TYPE_TARGETS = [
  { types: ['scenario'], count: 3 },
  { types: ['meaning'], count: 2 },
  { types: ['money-term', 'fact'], count: 2 },
  { types: ['trap'], count: 2 },
  { types: ['behavior'], count: 1 },
];

const shuffle = (items) => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
};

const normalizeCount = (count) => {
  const parsedCount = Number(count);

  if (!Number.isFinite(parsedCount) || parsedCount <= 0) return DEFAULT_COUNT;

  return Math.floor(parsedCount);
};

const normalizeQuestion = (question) => {
  const options = Array.isArray(question?.options) ? question.options.filter(Boolean) : [];
  const answer = question?.answer;
  const dedupedOptions = Array.from(new Set([answer, ...options].filter(Boolean)));

  return {
    ...question,
    answer,
    options: shuffle(dedupedOptions).slice(0, 4),
  };
};

const pickFromTypes = ({ bank, selectedIds, types, count }) => {
  const matchingQuestions = shuffle(
    bank.filter((question) => types.includes(question?.type) && !selectedIds.has(question?.id)),
  );

  return matchingQuestions.slice(0, count);
};

export function selectMoneyRushQuestions({ count = DEFAULT_COUNT } = {}) {
  const targetCount = normalizeCount(count);
  const safeBank = Array.isArray(moneyRushQuestions)
    ? moneyRushQuestions.filter(
        (question) =>
          question?.id &&
          question?.question &&
          question?.answer &&
          Array.isArray(question?.options) &&
          question.options.length >= 4,
      )
    : [];

  const selectedQuestions = [];
  const selectedIds = new Set();

  TYPE_TARGETS.forEach((target) => {
    if (selectedQuestions.length >= targetCount) return;

    const remainingCount = targetCount - selectedQuestions.length;
    const pickedQuestions = pickFromTypes({
      bank: safeBank,
      selectedIds,
      types: target.types,
      count: Math.min(target.count, remainingCount),
    });

    pickedQuestions.forEach((question) => {
      if (selectedIds.has(question.id) || selectedQuestions.length >= targetCount) return;
      selectedQuestions.push(question);
      selectedIds.add(question.id);
    });
  });

  if (selectedQuestions.length < targetCount) {
    shuffle(safeBank)
      .filter((question) => !selectedIds.has(question.id))
      .slice(0, targetCount - selectedQuestions.length)
      .forEach((question) => {
        selectedQuestions.push(question);
        selectedIds.add(question.id);
      });
  }

  return shuffle(selectedQuestions).slice(0, targetCount).map(normalizeQuestion);
}

export default selectMoneyRushQuestions;
