import { chromium } from "playwright";

const baseUrl = process.env.CLARA_VISUAL_BASE_URL || "http://127.0.0.1:4173";
const path = "/tests/visual/clara-add-income-header-only-regression.html";
const cases = [
  ["desktop-1280", 1280, 800],
  ["desktop-edge-431", 431, 844],
  ["mobile-edge-430", 430, 844],
  ["mobile-390", 390, 844],
  ["mobile-360", 360, 740],
];

const browser = await chromium.launch({ headless: true });
try {
  for (const [label, width, height] of cases) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.locator('[data-clara-add-income-chat="true"]').waitFor({ state: "attached", timeout: 10000 });
    await page.waitForTimeout(900);
    const trace = await page.evaluate(() => {
      const shape = (node) => {
        if (!node) return null;
        const r = node.getBoundingClientRect();
        const s = getComputedStyle(node);
        return {
          tag: node.tagName,
          cls: node.className,
          x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom,
          display: s.display,
          visibility: s.visibility,
          opacity: s.opacity,
          position: s.position,
          overflow: s.overflow,
          overflowY: s.overflowY,
          contain: s.contain,
          transform: s.transform,
          zIndex: s.zIndex,
          minHeight: s.minHeight,
          maxHeight: s.maxHeight,
          flex: s.flex,
        };
      };
      const setup = document.querySelector('[data-clara-financial-context-setup="true"]');
      const root = document.querySelector('[data-clara-add-income-chat="true"]');
      const viewport = root?.querySelector('[data-clara-ai-message-viewport="true"]');
      const stack = root?.querySelector('[data-clara-ai-message-stack="true"]');
      const assistant = root?.querySelector('[data-clara-conversation-role="assistant"]');
      const action = root?.querySelector('[data-clara-conversation-action-region="true"]');
      const community = document.querySelector('.clara-community-root');
      return {
        env: {
          innerWidth, innerHeight, outerWidth, outerHeight,
          dpr: devicePixelRatio,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
          coarse: matchMedia('(pointer: coarse)').matches,
          fine: matchMedia('(pointer: fine)').matches,
          hover: matchMedia('(hover: hover)').matches,
          noHover: matchMedia('(hover: none)').matches,
          standalone: matchMedia('(display-mode: standalone)').matches,
          max430: matchMedia('(max-width: 430px)').matches,
          max767: matchMedia('(max-width: 767px)').matches,
          visualViewport: window.visualViewport ? {
            width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale,
            offsetTop: visualViewport.offsetTop, offsetLeft: visualViewport.offsetLeft,
          } : null,
        },
        community: shape(community),
        communityChildren: community ? Array.from(community.children).map(shape) : [],
        setup: shape(setup),
        setupChildren: setup ? Array.from(setup.children).map(shape) : [],
        addIncome: shape(root),
        addIncomeChildren: root ? Array.from(root.children).map(shape) : [],
        viewport: shape(viewport),
        stack: shape(stack),
        assistant: shape(assistant),
        action: shape(action),
        stackChildren: stack?.children.length || 0,
        actionChildren: action?.children.length || 0,
        text: root?.innerText?.slice(0, 500) || "",
      };
    });
    console.log(`TRACE ${label} ${JSON.stringify(trace)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
