import { useMemo } from "react";

export default function useTaskReminderPrompt() {
  const safe = useMemo(() => {
    const noop = () => {};

    const base = {
      showPrompt: false,
      isVisible: false,
      shouldShow: false,
      open: false,
      dismiss: noop,
      close: noop,
      trigger: noop,
      setOpen: noop,
    };

    return new Proxy(base, {
      get(target, prop) {
        if (prop === Symbol.iterator) {
          return function* () {
            yield false;
            yield noop;
          };
        }
        return prop in target ? target[prop] : noop;
      },
    });
  }, []);

  return safe;
}
