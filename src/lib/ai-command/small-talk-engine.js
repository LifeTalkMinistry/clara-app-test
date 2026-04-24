function normalize(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\w\s'?]/g, " ")
    .replace(/\s+/g, " ");
}

function getDisplayName(user) {
  return user?.full_name || user?.name || user?.username || "";
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatResponse(response, user) {
  const name = getDisplayName(user);
  return response.replace("{name}", name || "").replace(/\s+/g, " ").trim();
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);

  for (let j = 1; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      matrix[i][j] =
        a[i - 1] === b[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1,
            );
    }
  }

  return matrix[a.length][b.length];
}

function isFuzzyMatch(word, keyword) {
  if (!word || !keyword) return false;
  if (word === keyword) return true;
  if (keyword.length < 4) return false;

  const distance = levenshtein(word, keyword);

  if (keyword.length <= 5) return distance <= 1;
  return distance <= 2;
}

function scoreKeyword(text, keyword) {
  const cleanKeyword = normalize(keyword);

  if (!cleanKeyword) return 0;

  if (text === cleanKeyword) return 100;
  if (text.includes(cleanKeyword)) return cleanKeyword.includes(" ") ? 85 : 65;

  const words = text.split(" ");
  const keywordWords = cleanKeyword.split(" ");

  if (keywordWords.length === 1) {
    return words.some((word) => isFuzzyMatch(word, cleanKeyword)) ? 55 : 0;
  }

  const matchedWords = keywordWords.filter((keywordWord) =>
    words.some((word) => isFuzzyMatch(word, keywordWord)),
  );

  const ratio = matchedWords.length / keywordWords.length;

  if (ratio === 1) return 70;
  if (ratio >= 0.75) return 50;

  return 0;
}

const SMALL_TALK_RULES = [
  {
    type: "greeting",
    match: [
      "hi",
      "hello",
      "hey",
      "yo",
      "good morning",
      "good afternoon",
      "good evening",
      "what's up",
      "whats up",
      "how are you",
      "how are you doing",
    ],
    responses: [
      "Hey {name}! Ready to track something? 👀",
      "Hi {name}! What are we checking today?",
      "Hello 👀 want to log or review your spending?",
      "Hey! Want to log an expense or check your balance?",
    ],
  },
  {
    type: "presence",
    match: [
      "are you there",
      "you there",
      "still there",
      "hello??",
      "can you hear me",
      "are you online",
    ],
    responses: [
      "I’m here. What do you want to check?",
      "Yep, I’m here. Need something?",
      "Always here 👀 what’s up?",
    ],
  },
  {
    type: "thanks",
    match: [
      "thanks",
      "thank you",
      "ty",
      "appreciate it",
      "thanks a lot",
      "thank you so much",
    ],
    responses: [
      "Anytime, {name}. Keep going 💪",
      "You got it. Small wins matter.",
      "Glad to help. Stay consistent 👀",
    ],
  },
  {
    type: "opener",
    match: [
      "can i ask",
      "can i ask something",
      "help me",
      "quick question",
      "can you help me",
      "i need help",
      "i have a question",
      "i want to ask something",
    ],
    responses: [
      "Of course. Go ahead.",
      "I’m here. What do you need?",
      "Sure 👀 what’s on your mind?",
    ],
  },
  {
    type: "casual",
    match: [
      "haha",
      "lol",
      "hmm",
      "hmmm",
      "ok",
      "okay",
      "ahh",
      "oh",
      "ohh",
      "alright",
      "got it",
      "i see",
    ],
    responses: [
      "Hmm 👀 what are you thinking?",
      "Alright. What do you want to do next?",
      "Got it. Let me know if you need anything.",
    ],
  },
  {
    type: "lost",
    match: [
      "what can you do",
      "i dont know",
      "i don't know",
      "idk",
      "what now",
      "not sure",
      "where do i start",
      "what should i do first",
    ],
    responses: [
      "I can log expenses, check your balance, and help you stay on track.",
      "We can track, review, or plan. Your call.",
      "Want to log something or review your spending?",
    ],
  },
  {
    type: "light_emotion",
    match: [
      "im tired",
      "i'm tired",
      "so tired",
      "busy today",
      "long day",
      "im stressed",
      "i'm stressed",
      "rough day",
      "hard day",
    ],
    responses: [
      "Sounds like a long day. Want a quick spending check?",
      "Busy days can affect spending 👀 want to review?",
      "We can keep it simple. Want to check your expenses?",
    ],
  },
  {
    type: "light_finance",
    match: [
      "i spent a lot",
      "i think i spent too much",
      "trying to save",
      "i need to save",
      "spending too much",
      "i feel broke",
      "money is tight",
      "i need to budget",
    ],
    responses: [
      "Want to check your total spending today?",
      "We can review your expenses quickly 👀",
      "Good move thinking about saving. Want to check your balance?",
    ],
  },
  {
    type: "followup",
    match: [
      "what else",
      "then what",
      "next",
      "continue",
      "go on",
      "show me more",
    ],
    responses: [
      "You can log expenses, check balance, or review your budget.",
      "We can track, review, or plan. Your call.",
      "What do you want to focus on next?",
    ],
  },
  {
    type: "goodbye",
    match: [
      "bye",
      "goodbye",
      "see you",
      "later",
      "talk to you later",
      "im done",
      "i'm done",
    ],
    responses: [
      "Alright. I’ll be here when you need me.",
      "See you 👀 stay consistent.",
      "Take care. Keep your spending in check 💪",
    ],
  },
  {
    type: "idle",
    match: [
      "whatever",
      "nothing",
      "just checking",
      "never mind",
      "nevermind",
      "forget it",
    ],
    responses: [
      "Got it 👀 let me know if you want to track something.",
      "Alright. I’m here if you need anything.",
      "No problem. Just say the word.",
    ],
  },
];

export function getSmallTalkReply(input, user) {
  const text = normalize(input);
  if (!text) return null;

  let bestMatch = null;

  for (const rule of SMALL_TALK_RULES) {
    for (const keyword of rule.match) {
      const score = scoreKeyword(text, keyword);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          rule,
          score,
          keyword,
        };
      }
    }
  }

  if (!bestMatch || bestMatch.score < 55) {
    return null;
  }

  const response = pickRandom(bestMatch.rule.responses);
  return formatResponse(response, user);
}