import { readFileSync, writeFileSync, unlinkSync } from "node:fs";

const controllerPath = "src/clara-assistant-buy-check-tab.js";
const overlayPath = "src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay.jsx";
const registryPath = "src/runtime/installClaraRuntimePatches.js";
const bridgePath = "src/clara-buy-check-auto-start-bridge.js";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing expected block: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected one block but found multiple: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let controller = readFileSync(controllerPath, "utf8");

controller = replaceOnce(
  controller,
  `function startStaticBuyCheckFlow() {
  buyCheckFlow = {
    step: "item",
    item: "",
    price: 0,
    reason: "",
    busy: false,
    done: false,
    messages: [
      makeFlowMessage("clara", "Hi, Max! What do you want to buy?\\n\\nType the exact item first. Example: Running shoes"),
    ],
  };

  renderStaticBuyCheckChat();
}
`,
  `function createStaticBuyCheckFlow() {
  return {
    step: "item",
    item: "",
    price: 0,
    reason: "",
    busy: false,
    done: false,
    messages: [
      makeFlowMessage("clara", "Hi, Max! What do you want to buy?\\n\\nType the exact item first. Example: Running shoes"),
    ],
  };
}

function startStaticBuyCheckFlow() {
  buyCheckFlow = createStaticBuyCheckFlow();
  renderStaticBuyCheckChat();
}
`,
  "create Buy Check flow without rendering"
);

controller = replaceOnce(
  controller,
  `function renderBuyCheckBoard() {
  ensureBuyCheckBoardStyle();

  const board = findInstructionBoard();
  if (!board) {
    startStaticBuyCheckFlow();
    return;
  }

  board.innerHTML = \\`
    <button type="button" class="clara-buy-check-board-close" data-clara-buy-check-close-board="true" aria-label="Close CLARA AI mode">×</button>
    <p class="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">BUY CHECK</p>
    <h3 class="mt-3 text-xl font-black leading-tight tracking-tight text-white">Let’s check this purchase first.</h3>
    <div class="mx-auto mt-3 max-w-[292px] text-sm leading-6 text-slate-300/75">
      <p>Answer clearly so CLARA can judge the decision properly.</p>
    </div>
    <div class="clara-buy-check-board-steps">
      <span><b>1</b> Item you want to buy</span>
      <span><b>2</b> Amount or price</span>
      <span><b>3</b> Why you want it</span>
    </div>
    <p class="clara-buy-check-board-note">Then CLARA checks wallet, budget, schedule, Me profile, goals, and memory before giving a decision.</p>
    <button type="button" class="clara-buy-check-board-start" data-clara-start-buy-check="true">Start Buy Check</button>
  \\`;

  board.setAttribute("data-clara-buy-check-board", "true");
  hidePanelTabsForBuyCheckBoard(board);
}

function openBuyCheckMode() {
  renderBuyCheckBoard();
}
`,
  `function renderBuyCheckBoard() {
  ensureBuyCheckBoardStyle();

  if (!buyCheckFlow || buyCheckFlow.done) {
    buyCheckFlow = createStaticBuyCheckFlow();
  }

  const board = findInstructionBoard();
  if (!board) {
    renderStaticBuyCheckChat();
    return;
  }

  if (board.dataset.claraBuyCheckOpeningBoard === "true") {
    board.setAttribute("data-clara-buy-check-board", "true");
    hidePanelTabsForBuyCheckBoard(board);
    return;
  }

  board.innerHTML = \\`
    <button type="button" class="clara-buy-check-board-close" data-clara-buy-check-close-board="true" aria-label="Close CLARA AI mode">×</button>
    <p class="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">BUY CHECK</p>
    <h3 class="mt-3 text-xl font-black leading-tight tracking-tight text-white">Let’s check this purchase first.</h3>
    <div class="mx-auto mt-3 max-w-[292px] text-sm leading-6 text-slate-300/75">
      <p>Answer clearly so CLARA can judge the decision properly.</p>
    </div>
    <div class="clara-buy-check-board-steps">
      <span><b>1</b> Item you want to buy</span>
      <span><b>2</b> Amount or price</span>
      <span><b>3</b> Why you want it</span>
    </div>
    <p class="clara-buy-check-board-note">Then CLARA checks wallet, budget, schedule, Me profile, goals, and memory before giving a decision.</p>
    <div class="clara-buy-check-active-question" data-clara-buy-check-active-question="true" aria-live="polite">
      <strong>Hi, Max! What do you want to buy?</strong>
      <span>Type the exact item first. <em>Example: Running shoes</em></span>
    </div>
  \\`;

  board.setAttribute("data-clara-buy-check-board", "true");
  hidePanelTabsForBuyCheckBoard(board);
}

function openBuyCheckMode() {
  if (!buyCheckFlow || buyCheckFlow.done) {
    buyCheckFlow = createStaticBuyCheckFlow();
  }
  renderBuyCheckBoard();
}
`,
  "single Buy Check opening board"
);

controller = replaceOnce(
  controller,
  `  lastExplicitOpenRequestId = requestId || \\`buy-check-\${Date.now()}\\`;
  buyCheckFlow = null;
  openBuyCheckMode();
`,
  `  lastExplicitOpenRequestId = requestId || \\`buy-check-\${Date.now()}\\`;
  buyCheckFlow = createStaticBuyCheckFlow();
  openBuyCheckMode();
`,
  "initialize explicit Buy Check flow"
);

controller = replaceOnce(
  controller,
  `    const startButton = event.target?.closest?.("[data-clara-start-buy-check]");
    if (startButton) {
      event.preventDefault();
      event.stopPropagation();
      startStaticBuyCheckFlow();
      return;
    }

`,
  "",
  "remove obsolete Start Buy Check click path"
);

writeFileSync(controllerPath, controller);

let overlay = readFileSync(overlayPath, "utf8");

overlay = replaceOnce(
  overlay,
  `function PauseEntryBoard({ onClose }) {
  return (
    <section
      data-clara-pause-entry-board="true"
      className="relative overflow-hidden rounded-[30px] border border-cyan-100/22 bg-white/[0.055] px-6 pb-6 pt-8 text-center shadow-[0_26px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl"
    >
      <FloatingCloseButton onClose={onClose} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(124,58,237,0.30),transparent_38%),linear-gradient(145deg,rgba(8,47,73,0.35),rgba(30,27,75,0.38))]" />

      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/55">
        PAUSE BEFORE YOU BUY
      </p>
      <h3 className="mx-auto mt-4 max-w-[318px] text-[24px] font-black leading-[1.12] tracking-[-0.045em] text-white">
        Let’s check this purchase first.
      </h3>
      <p className="mx-auto mt-5 max-w-[292px] text-[13.5px] font-medium leading-7 text-slate-300/76">
        CLARA will ask for the item, price, and reason before reading your money situation.
      </p>
      <p className="mx-auto mt-3 max-w-[278px] text-[13.5px] font-medium leading-7 text-slate-300/70">
        Your current Buy Check will open automatically.
      </p>
    </section>
  );
}
`,
  `function PauseEntryBoard({ onClose }) {
  return (
    <section
      data-clara-pause-entry-board="true"
      data-clara-buy-check-board="true"
      data-clara-buy-check-opening-board="true"
      className="relative overflow-hidden rounded-[30px] border border-cyan-100/22 bg-white/[0.055] px-6 pb-6 pt-8 text-center shadow-[0_26px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl"
    >
      <FloatingCloseButton onClose={onClose} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(124,58,237,0.30),transparent_38%),linear-gradient(145deg,rgba(8,47,73,0.35),rgba(30,27,75,0.38))]" />

      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/55">
        BUY CHECK
      </p>
      <h3 className="mx-auto mt-4 max-w-[318px] text-[22px] font-black leading-[1.15] tracking-[-0.035em] text-white">
        Let’s check this purchase first.
      </h3>
      <p className="mx-auto mt-4 max-w-[292px] text-[13.5px] font-medium leading-6 text-slate-300/76">
        Answer clearly so CLARA can judge the decision properly.
      </p>

      <div className="mx-auto mt-4 grid max-w-[250px] gap-2.5 text-left">
        {["Item you want to buy", "Amount or price", "Why you want it"].map((label, index) => (
          <div key={label} className="flex items-center gap-2.5 text-[12.5px] font-extrabold leading-[1.35] text-slate-200/85">
            <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-[11px] font-black text-emerald-300/95">
              {index + 1}
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-4 max-w-[286px] text-[12px] font-bold leading-[1.55] text-slate-300/62">
        Then CLARA checks wallet, budget, schedule, Me profile, goals, and memory before giving a decision.
      </p>

      <div
        data-clara-buy-check-active-question="true"
        aria-live="polite"
        className="mx-auto mt-5 max-w-[292px] rounded-[18px] border border-emerald-300/15 bg-slate-950/25 px-4 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <strong className="block text-[13px] font-black leading-[1.45] text-white/95">
          Hi, Max! What do you want to buy?
        </strong>
        <span className="mt-1 block text-[11.5px] font-semibold leading-[1.5] text-slate-300/72">
          Type the exact item first. <em className="font-extrabold not-italic text-emerald-300/90">Example: Running shoes</em>
        </span>
      </div>
    </section>
  );
}
`,
  "final React Buy Check opening board"
);

overlay = replaceOnce(
  overlay,
  `  useEffect(() => {
    if (!isActive) {
      setDraft("");
      return undefined;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus?.(), 180);
    return () => window.clearTimeout(timer);
  }, [isActive]);
`,
  `  useEffect(() => {
    if (!isActive) setDraft("");
  }, [isActive]);
`,
  "remove opening-time forced focus"
);

overlay = replaceOnce(
  overlay,
  `            placeholder="Enter the item or answer Buy Check"
`,
  `            placeholder="Type the item you want to buy"
`,
  "first-question input placeholder"
);

writeFileSync(overlayPath, overlay);

let registry = readFileSync(registryPath, "utf8");
registry = replaceOnce(
  registry,
  `import "../clara-assistant-buy-check-tab";
import "../clara-buy-check-auto-start-bridge";
`,
  `import "../clara-assistant-buy-check-tab";
`,
  "remove temporary auto-start bridge import"
);
writeFileSync(registryPath, registry);

unlinkSync(bridgePath);

const checks = [
  [controllerPath, [
    "function createStaticBuyCheckFlow()",
    'board.dataset.claraBuyCheckOpeningBoard === "true"',
    'data-clara-buy-check-active-question="true"',
  ], [
    "data-clara-start-buy-check",
    "Start Buy Check",
  ]],
  [overlayPath, [
    'data-clara-buy-check-opening-board="true"',
    "Hi, Max! What do you want to buy?",
    'placeholder="Type the item you want to buy"',
  ], [
    "inputRef.current?.focus",
    "Your current Buy Check will open automatically.",
  ]],
  [registryPath, [], ["clara-buy-check-auto-start-bridge"]],
];

for (const [path, required, forbidden] of checks) {
  const text = readFileSync(path, "utf8");
  for (const marker of required) {
    if (!text.includes(marker)) throw new Error(`Missing ${marker} in ${path}`);
  }
  for (const marker of forbidden) {
    if (text.includes(marker)) throw new Error(`Forbidden ${marker} remains in ${path}`);
  }
}

console.log("Buy Check single-render source fix applied.");
