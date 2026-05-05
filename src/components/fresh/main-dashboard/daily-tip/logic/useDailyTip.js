import { useEffect, useState } from "react";
import { DAILY_TIPS } from "../data/tipsData";

const STORAGE_KEY = "clara_daily_tip_cycle";

export default function useDailyTip() {
  const [tip, setTip] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    let cycle;

    if (stored) {
      cycle = JSON.parse(stored);
    } else {
      cycle = {
        order: shuffle([...Array(DAILY_TIPS.length).keys()]),
        pointer: 0,
      };
    }

    const currentIndex = cycle.order[cycle.pointer];

    setTip(DAILY_TIPS[currentIndex]);
    setIndex(currentIndex);

    cycle.pointer++;

    if (cycle.pointer >= cycle.order.length) {
      cycle = {
        order: shuffle([...Array(DAILY_TIPS.length).keys()]),
        pointer: 0,
      };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cycle));
  }, []);

  return { tip, index };
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
