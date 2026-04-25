// CLARA FAB draggable behavior
(function () {
  const selector = ".clara-fab, .clara-quick-fab, .clara-quick-button, .clara-ai-fab, .quick-fab, .quick-circle, .quick-orb, .fab-button, .ai-fab, .bottom-nav-fab, .floating-ai-button, .floating-quick-button, .floating-action-button";
  const key = "clara_fab_position_v2";
  const gap = 16;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function saved() {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function store(position) {
    try {
      localStorage.setItem(key, JSON.stringify(position));
    } catch {
      return;
    }
  }

  function bounds(el, x, y) {
    const rect = el.getBoundingClientRect();
    return {
      x: clamp(x, gap, window.innerWidth - rect.width - gap),
      y: clamp(y, gap, window.innerHeight - rect.height - gap),
    };
  }

  function setPosition(el, position) {
    const next = bounds(el, position.x, position.y);
    el.style.position = "fixed";
    el.style.left = next.x + "px";
    el.style.top = next.y + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.zIndex = "80";
    el.style.transform = "none";
    store(next);
    return next;
  }

  function defaultPosition(el) {
    const rect = el.getBoundingClientRect();
    return bounds(el, window.innerWidth - rect.width - 24, window.innerHeight - rect.height - 96);
  }

  function snap(el, position) {
    const rect = el.getBoundingClientRect();
    const leftSide = position.x + rect.width / 2 < window.innerWidth / 2;
    el.classList.add("is-snapping");
    const next = setPosition(el, {
      x: leftSide ? gap : window.innerWidth - rect.width - gap,
      y: position.y,
    });
    setTimeout(() => el.classList.remove("is-snapping"), 220);
    return next;
  }

  function make(el) {
    if (!el || el.dataset.claraFabReady === "true") return;
    el.dataset.claraFabReady = "true";
    el.classList.add("clara-draggable-fab");

    let pos = setPosition(el, saved() || defaultPosition(el));
    let down = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;
    let blockClick = false;

    el.addEventListener("pointerdown", (event) => {
      down = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      baseX = pos.x;
      baseY = pos.y;
      el.classList.add("is-dragging");
    });

    el.addEventListener("pointermove", (event) => {
      if (!down) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) < 8) return;
      moved = true;
      pos = setPosition(el, { x: baseX + dx, y: baseY + dy });
    });

    el.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      el.classList.remove("is-dragging");
      if (moved) {
        pos = snap(el, pos);
        blockClick = true;
        setTimeout(() => {
          blockClick = false;
        }, 180);
      }
    });

    el.addEventListener("click", (event) => {
      if (!blockClick) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    window.addEventListener("resize", () => {
      pos = setPosition(el, pos);
    });
  }

  function init() {
    document.querySelectorAll(selector).forEach(make);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  setInterval(init, 1200);
})();
