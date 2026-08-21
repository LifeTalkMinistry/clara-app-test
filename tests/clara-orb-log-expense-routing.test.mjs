import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CLARA_ORB_COMMAND_SELECT_EVENT,
} from "../src/lib/clara-orb-command-ring.js";
import {
  CLARA_PAUSE_OPEN_REQUEST_EVENT,
} from "../src/lib/clara-pause-events.js";

test("Log Expense Orb command opens CLARA chat in log-expense mode", async () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;

  class TestCustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  }

  const fakeWindow = new EventTarget();
  globalThis.window = fakeWindow;
  globalThis.CustomEvent = TestCustomEvent;

  try {
    await import(`../src/runtime/installClaraOrbCommandChatRouting.js?test=${Date.now()}`);

    const pauseRequest = new Promise((resolve) => {
      fakeWindow.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, (event) => resolve(event.detail), {
        once: true,
      });
    });

    fakeWindow.dispatchEvent(
      new TestCustomEvent(CLARA_ORB_COMMAND_SELECT_EVENT, {
        detail: {
          commandId: "log-expense",
          commandLabel: "Log Expense",
          source: "clara-orb-page",
        },
      })
    );

    const detail = await pauseRequest;
    assert.equal(detail.mode, "log-expense");
    assert.equal(detail.commandId, "log-expense");
    assert.equal(detail.source, "clara-orb-page");
    assert.match(detail.requestId, /^clara-orb-log-expense-/);
  } finally {
    fakeWindow.__claraOrbCommandChatRoutingRuntime__?.destroy?.();
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("Add Income Orb command opens CLARA chat in add-income mode", async () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;

  class TestCustomEvent extends Event {
    constructor(type, options = {}) {
      super(type, { cancelable: true });
      this.detail = options.detail;
    }
  }

  const fakeWindow = new EventTarget();
  globalThis.window = fakeWindow;
  globalThis.CustomEvent = TestCustomEvent;

  try {
    await import(`../src/runtime/installClaraOrbCommandChatRouting.js?test=${Date.now()}-add-income`);

    const pauseRequest = new Promise((resolve) => {
      fakeWindow.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, (event) => resolve(event.detail), {
        once: true,
      });
    });

    const commandEvent = new TestCustomEvent(CLARA_ORB_COMMAND_SELECT_EVENT, {
      detail: {
        commandId: "add-income",
        commandLabel: "Add Income",
        source: "clara-orb-page",
      },
    });
    fakeWindow.dispatchEvent(commandEvent);

    const detail = await pauseRequest;
    assert.equal(detail.mode, "add-income");
    assert.equal(detail.commandId, "add-income");
    assert.equal(detail.source, "clara-orb-page");
    assert.match(detail.requestId, /^clara-orb-add-income-/);
    assert.equal(commandEvent.defaultPrevented, true);
  } finally {
    fakeWindow.__claraOrbCommandChatRoutingRuntime__?.destroy?.();
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("Add Income chat writes through the canonical Income Hub repository", async () => {
  const overlay = await readFile(
    new URL(
      "../src/components/fresh/main-dashboard/assistant/ClaraAddIncomeOverlayV2.jsx",
      import.meta.url
    ),
    "utf8"
  );
  const environment = await readFile(
    new URL(
      "../src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(overlay, /addMoneyToIncomeSource/);
  assert.match(overlay, /getIncomeSources/);
  assert.match(overlay, /data-clara-add-income-chat="true"/);
  assert.match(overlay, /It will only become wallet money after you transfer it to a wallet/);
  assert.match(environment, /ClaraAddIncomeOverlay/);
  assert.match(environment, /entryMode === "add-income"/);
});

test("Calendar Orb command opens the existing Community Schedule calendar", async () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;

  class TestCustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  }

  const fakeWindow = new EventTarget();
  let pushedPath = "";
  let popstateObserved = false;
  let chatOpened = false;

  fakeWindow.history = {
    state: null,
    pushState(state, _title, path) {
      this.state = state;
      pushedPath = String(path || "");
    },
  };
  fakeWindow.location = {
    assign(path) {
      pushedPath = String(path || "");
    },
  };

  fakeWindow.addEventListener("popstate", () => {
    popstateObserved = true;
  });
  fakeWindow.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, () => {
    chatOpened = true;
  });

  globalThis.window = fakeWindow;
  globalThis.CustomEvent = TestCustomEvent;

  try {
    await import(`../src/runtime/installClaraOrbCommandChatRouting.js?test=${Date.now()}-calendar`);

    fakeWindow.dispatchEvent(
      new TestCustomEvent(CLARA_ORB_COMMAND_SELECT_EVENT, {
        detail: {
          commandId: "calendar",
          commandLabel: "Calendar",
          source: "clara-orb-page",
        },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(pushedPath, "/community?view=schedule");
    assert.equal(popstateObserved, true);
    assert.equal(chatOpened, false);
  } finally {
    fakeWindow.__claraOrbCommandChatRoutingRuntime__?.destroy?.();
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("Wallet Orb command opens CLARA chat in wallet mode", async () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;

  class TestCustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  }

  const fakeWindow = new EventTarget();
  globalThis.window = fakeWindow;
  globalThis.CustomEvent = TestCustomEvent;

  try {
    await import(`../src/runtime/installClaraOrbCommandChatRouting.js?test=${Date.now()}-wallet`);

    const pauseRequest = new Promise((resolve) => {
      fakeWindow.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, (event) => resolve(event.detail), {
        once: true,
      });
    });

    fakeWindow.dispatchEvent(
      new TestCustomEvent(CLARA_ORB_COMMAND_SELECT_EVENT, {
        detail: {
          commandId: "wallet",
          commandLabel: "Wallet",
          source: "clara-orb-page",
        },
      })
    );

    const detail = await pauseRequest;
    assert.equal(detail.mode, "wallet");
    assert.equal(detail.commandId, "wallet");
    assert.equal(detail.source, "clara-orb-page");
    assert.match(detail.requestId, /^clara-orb-wallet-/);
  } finally {
    fakeWindow.__claraOrbCommandChatRoutingRuntime__?.destroy?.();
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("unknown Orb commands do not open a CLARA command chat", async () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;

  class TestCustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  }

  const fakeWindow = new EventTarget();
  globalThis.window = fakeWindow;
  globalThis.CustomEvent = TestCustomEvent;

  try {
    await import(`../src/runtime/installClaraOrbCommandChatRouting.js?test=${Date.now()}-unknown`);

    let opened = false;
    fakeWindow.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, () => {
      opened = true;
    });

    fakeWindow.dispatchEvent(
      new TestCustomEvent(CLARA_ORB_COMMAND_SELECT_EVENT, {
        detail: {
          commandId: "not-a-command",
          commandLabel: "Unknown",
          source: "clara-orb-page",
        },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(opened, false);
  } finally {
    fakeWindow.__claraOrbCommandChatRoutingRuntime__?.destroy?.();
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("Weekly Money Check consumes launch-only route state and stays internally active", async () => {
  const source = await readFile(
    new URL(
      "../src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(source, /weeklyMoneyCheckLaunchRequested/);
  assert.match(source, /useState\(\s*\(\) => weeklyMoneyCheckLaunchRequested\s*\)/);
  assert.match(source, /nextParams\.delete\("mode"\)/);
  assert.match(source, /nextParams\.delete\("source"\)/);
  assert.match(source, /setSearchParams\(nextParams, \{ replace: true \}\)/);
  assert.match(source, /setWeeklyMoneyCheckMode\(false\)/);
});

test("Money Schedule Add opens inline item and amount inputs without another chat turn", async () => {
  const source = await readFile(
    new URL(
      "../src/components/fresh/main-dashboard/assistant/ClaraMoneyScheduleOverlay.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(source, /addItemOpen/);
  assert.match(source, /addAmountInput/);
  assert.match(source, /data-clara-money-routine-inline-add="true"/);
  assert.match(source, />\s*Item\s*</);
  assert.match(source, />\s*Amount\s*</);
  assert.match(source, /createUiItem\(label, amountCentavos\)/);
  assert.match(source, /Add item/);
  assert.doesNotMatch(source, /phase === "edit-add"/);
  assert.doesNotMatch(source, /appendUser\("Add something"\)/);
  assert.doesNotMatch(source, /What should I add to \$\{currentWeekday\.name\}/);
});
