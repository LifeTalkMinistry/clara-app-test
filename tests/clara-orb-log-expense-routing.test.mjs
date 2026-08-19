import assert from "node:assert/strict";
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

test("non Log Expense Orb commands do not open the Log Expense chat mode", async () => {
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
    await import(`../src/runtime/installClaraOrbCommandChatRouting.js?test=${Date.now()}-other`);

    let opened = false;
    fakeWindow.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, () => {
      opened = true;
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

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(opened, false);
  } finally {
    fakeWindow.__claraOrbCommandChatRoutingRuntime__?.destroy?.();
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});
