import { LIFE_STAGE_GUIDANCE } from "./life-stage-guidance";

// Working Student signal copy needs to fit the compact premium support card
// without browser ellipsis. Keep the thought complete, but short enough for
// small mobile heights.
const workingStudent = LIFE_STAGE_GUIDANCE?.["Working Student"];
const signals = workingStudent?.signals || {};

const FITTED_WORKING_STUDENT_SIGNALS = {
  tired: {
    awareness: {
      body: "Heavy days can trigger shortcuts, comfort buys, or skipped tracking.",
    },
    guidance: {
      body: "Use one low-effort rule: fare ready, food limit, or one quick expense check.",
    },
  },
  stress: {
    awareness: {
      body: "Stress can push relief spending when school, work, commute, deadlines, or family needs stack up.",
    },
    guidance: {
      body: "Name the pressure first, then set a small limit if you still need relief.",
    },
  },
  sleepy: {
    awareness: {
      body: "Sleepy days can trigger caffeine runs, automatic spending, and convenience choices.",
    },
    guidance: {
      body: "Save bigger decisions for later, then choose when your mind is clearer.",
    },
  },
  hungry: {
    awareness: {
      body: "Delayed meals can turn snacks, drinks, and treats into bigger spending.",
    },
    guidance: {
      body: "Eat on time when possible so hunger does not decide the price later.",
    },
  },
  pressure: {
    awareness: {
      body: "Rushing can add fare, food, forgotten supplies, and last-minute school costs.",
    },
    guidance: {
      body: "Prepare one predictable pressure before the rush begins today.",
    },
  },
  moneyTiming: {
    awareness: {
      body: "Late money can make even small food, fare, load, and school costs feel heavier.",
    },
    guidance: {
      body: "Protect fare, food, load, and school needs until the next money comes.",
    },
  },
  commute: {
    awareness: {
      body: "Long travel can quietly add fare, food, drinks, and comfort stops.",
    },
    guidance: {
      body: "Set aside fare first before optional spending starts.",
    },
  },
};

Object.entries(FITTED_WORKING_STUDENT_SIGNALS).forEach(([signalId, states]) => {
  if (!signals[signalId]) return;
  Object.entries(states).forEach(([mode, copy]) => {
    signals[signalId][mode] = {
      ...signals[signalId][mode],
      ...copy,
    };
  });
});
