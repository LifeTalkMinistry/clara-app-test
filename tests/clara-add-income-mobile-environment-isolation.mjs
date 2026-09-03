import { chromium, devices } from "playwright";

const baseUrl = process.env.CLARA_VISUAL_BASE_URL || "http://127.0.0.1:4173";
const harnessPath = "/tests/visual/clara-add-income-header-only-regression.html";
const widths = [1280, 1024, 768, 600, 500, 480, 431, 430, 414, 390, 375, 360, 320];

function inspectPage(page, label) {
  return page.evaluate((label) => {
    const root = document.querySelector('[data-clara-add-income-chat="true"]');
    const viewport = root?.querySelector('[data-clara-ai-message-viewport="true"]');
    const assistant = root?.querySelector('[data-clara-conversation-role="assistant"]');
    const setup = document.querySelector('[data-clara-financial-context-setup="true"]');
    const rect = (node) => node ? node.getBoundingClientRect() : null;
    const style = (node) => node ? getComputedStyle(node) : null;

    const assistantPaintVisible = (() => {
      if (!assistant || !root) return false;
      const r = assistant.getBoundingClientRect();
      const rr = root.getBoundingClientRect();
      const left = Math.max(r.left, rr.left);
      const right = Math.min(r.right, rr.right);
      const top = Math.max(r.top, rr.top);
      const bottom = Math.min(r.bottom, rr.bottom);
      if (right <= left || bottom <= top) return false;
      const xs = [left + 1, (left + right) / 2, right - 1];
      const ys = [top + 1, (top + bottom) / 2, bottom - 1];
      return xs.some((x) => ys.some((y) => {
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && assistant.contains(hit));
      }));
    })();

    const sr = rect(setup);
    const rr = rect(root);
    const vr = rect(viewport);
    const ar = rect(assistant);
    const ss = style(setup);
    const rs = style(root);
    return {
      label,
      env: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
        ua: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        coarse: matchMedia('(pointer: coarse)').matches,
        fine: matchMedia('(pointer: fine)').matches,
        hover: matchMedia('(hover: hover)').matches,
        max430: matchMedia('(max-width: 430px)').matches,
        max767: matchMedia('(max-width: 767px)').matches,
      },
      setup: { height: sr?.height ?? null, position: ss?.position, contain: ss?.contain, overflow: ss?.overflow },
      root: { height: rr?.height ?? null, top: rr?.top ?? null, bottom: rr?.bottom ?? null, position: rs?.position, overflow: rs?.overflow },
      viewport: { height: vr?.height ?? null, top: vr?.top ?? null, bottom: vr?.bottom ?? null },
      assistant: { height: ar?.height ?? null, top: ar?.top ?? null, bottom: ar?.bottom ?? null, paintVisible: assistantPaintVisible },
    };
  }, label);
}

async function runCase(browser, label, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(`${baseUrl}${harnessPath}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.locator('[data-clara-add-income-chat="true"]').waitFor({ state: "attached", timeout: 10000 });
  await page.waitForTimeout(900);
  const result = await inspectPage(page, label);
  console.log(`ISOLATION ${JSON.stringify(result)}`);
  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true });
try {
  for (const width of widths) {
    await runCase(browser, `width-${width}-desktop-env`, {
      viewport: { width, height: width >= 768 ? 800 : 844 },
      isMobile: false,
      hasTouch: false,
      deviceScaleFactor: 1,
    });
  }

  const iphone = devices["iPhone 12 Pro"];
  await runCase(browser, "desktop-width-mobile-UA-touch-DPR", {
    viewport: { width: 1280, height: 800 },
    userAgent: iphone.userAgent,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  await runCase(browser, "mobile-width-desktop-UA-no-touch", {
    viewport: { width: 390, height: 844 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });
  await runCase(browser, "mobile-width-touch-only", {
    viewport: { width: 390, height: 844 },
    isMobile: false,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await runCase(browser, "mobile-width-DPR-only", {
    viewport: { width: 390, height: 844 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 3,
  });
  await runCase(browser, "mobile-width-mobile-UA-no-touch", {
    viewport: { width: 390, height: 844 },
    userAgent: iphone.userAgent,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });
} finally {
  await browser.close();
}
