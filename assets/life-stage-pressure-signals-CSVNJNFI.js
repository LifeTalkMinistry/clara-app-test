const o=[{id:"tired",icon:"😴",label:"Tired",title:"Tired decisions get expensive.",watch:"Watch for food delivery, rides, small treats, or skipped tracking when your body is asking for recovery.",tip:"Before spending, pause for one cheaper recovery move first: water, food, 10 minutes of rest, or checking your remaining budget."},{id:"stress",icon:"🧠",label:"Stressed",title:"Stress can make relief feel urgent.",watch:"Watch for buying something just to feel in control after school, work, commute, deadlines, or family pressure.",tip:"Name the pressure first. If the purchase is only for relief, set a small limit before you buy."},{id:"sleepy",icon:"🌙",label:"Sleepy",title:"Low sleep weakens money control.",watch:"Watch for automatic spending, missed budget checks, caffeine runs, and convenience choices because planning feels too heavy.",tip:"Do not make big money decisions while sleepy. Save it, sleep first, then decide when your brain is clearer."},{id:"hungry",icon:"🍜",label:"Hungry",title:"Hunger can turn into impulse spending.",watch:"Watch for overspending on meals, snacks, drinks, or treats because you waited too long to eat.",tip:"Protect a small food buffer. Eating on time is not weakness; it prevents bigger emotional spending later."},{id:"pressure",icon:"⏰",label:"Time Pressure",title:"Time pressure becomes money pressure.",watch:"Watch for paying more because you are rushing: transport, convenience food, forgotten supplies, or last-minute school costs.",tip:"Pick one predictable pressure today and prepare it early, even if the plan is small."}];function c(t){return String(t||"").replace(/\s+/g," ").trim()}function u(){return Array.from(document.querySelectorAll("section")).find(t=>{var r,i,a,n;return c((r=t.querySelector("h2"))==null?void 0:r.textContent)&&((n=(a=(i=t.querySelector("p"))==null?void 0:i.textContent)==null?void 0:a.toLowerCase)==null?void 0:n.call(a).includes("your life stage"))})}function m(t){var r,i,a,n;if(!t)return null;let e=t.nextElementSibling;for(;e;){if((r=e.matches)!=null&&r.call(e,"[data-clara-pressure-signals='true']")){e=e.nextElementSibling;continue}if(c((a=(i=e.querySelector)==null?void 0:i.call(e,"h3"))==null?void 0:a.textContent)||(n=e.querySelector)!=null&&n.call(e,"svg"))return e;e=e.nextElementSibling}return null}function g(t){return Array.from((t==null?void 0:t.children)||[]).find(e=>{var r;return(r=e.matches)==null?void 0:r.call(e,"section[data-clara-trend-snapshot='true']")})||null}function b(t){return o.find(e=>e.id===t)||o[0]}function f(){if(document.getElementById("clara-pressure-signals-bridge-styles"))return;const t=document.createElement("style");t.id="clara-pressure-signals-bridge-styles",t.textContent=`
    #root [data-clara-pressure-signals="true"] {
      position: relative !important;
      z-index: 7 !important;
      display: block !important;
      width: auto !important;
      margin-left: auto !important;
      margin-right: auto !important;
      padding: 4px 8px !important;
      border-radius: 999px !important;
      border: 1px solid rgba(255,255,255,.075) !important;
      background: radial-gradient(circle at 12% 0%, rgba(45,212,191,.075), transparent 36%), radial-gradient(circle at 96% 45%, rgba(167,139,250,.120), transparent 42%), rgba(7,18,38,.34) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 10px 24px rgba(0,0,0,.14), 0 0 18px rgba(45,212,191,.018) !important;
      backdrop-filter: blur(22px) saturate(1.12) !important;
      -webkit-backdrop-filter: blur(22px) saturate(1.12) !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      justify-self: center !important;
      max-width: calc(100% - 18px) !important;
    }

    #root [data-clara-pressure-signals="true"]::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(115deg, rgba(255,255,255,.040), transparent 36%, rgba(255,255,255,.014));
      opacity: .72;
    }

    #root [data-clara-pressure-signals="true"] .clara-pressure-track {
      position: relative !important;
      z-index: 2 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      height: 100% !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      padding: 0 2px !important;
      scrollbar-width: none !important;
    }

    #root [data-clara-pressure-signals="true"] .clara-pressure-track::-webkit-scrollbar { display: none !important; }

    #root [data-clara-pressure-signals="true"] .clara-pressure-chip {
      flex: 0 0 32px !important;
      display: grid !important;
      place-items: center !important;
      width: 32px !important;
      min-width: 32px !important;
      max-width: 32px !important;
      height: 32px !important;
      min-height: 32px !important;
      max-height: 32px !important;
      padding: 0 !important;
      margin: 0 !important;
      border-radius: 999px !important;
      border: 1px solid rgba(255,255,255,.10) !important;
      background: rgba(255,255,255,.045) !important;
      color: rgba(255,255,255,.86) !important;
      font-size: 15px !important;
      font-weight: 900 !important;
      line-height: 1 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 7px 18px rgba(0,0,0,.12) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease !important;
    }

    #root [data-clara-pressure-signals="true"] .clara-pressure-chip:active {
      transform: scale(.92) !important;
      border-color: rgba(165,243,252,.28) !important;
      background: rgba(125,211,252,.075) !important;
    }

    #root [data-clara-pressure-signals="true"] .clara-pressure-chip span {
      display: block !important;
      width: auto !important;
      height: auto !important;
      padding: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      font-size: 15px !important;
      line-height: 1 !important;
      box-shadow: none !important;
    }

    #root [data-clara-pressure-signals="true"] .clara-pressure-chip strong,
    #root [data-clara-pressure-signals="true"] .clara-pressure-label {
      display: none !important;
    }

    #root [data-clara-pressure-tip-panel="true"] {
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 18px;
      z-index: 95;
      overflow: hidden;
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,.10);
      background: radial-gradient(circle at 8% 0%, rgba(45,212,191,.13), transparent 34%), radial-gradient(circle at 96% 12%, rgba(167,139,250,.18), transparent 38%), rgba(4,9,24,.94);
      box-shadow: 0 26px 80px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.08);
      backdrop-filter: blur(30px) saturate(1.18);
      -webkit-backdrop-filter: blur(30px) saturate(1.18);
    }

    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-inner { padding: 16px; }
    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.055);
      font-size: 20px;
    }
    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-kicker {
      margin: 0;
      color: rgba(165,243,252,.52);
      font-size: 8px;
      font-weight: 1000;
      letter-spacing: .18em;
      text-transform: uppercase;
    }
    #root [data-clara-pressure-tip-panel="true"] h4 {
      margin: 6px 0 0;
      color: rgba(255,255,255,.96);
      font-size: 17px;
      font-weight: 1000;
      line-height: 1.08;
      letter-spacing: -.035em;
    }
    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-box {
      margin-top: 12px;
      padding: 12px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,.075);
      background: rgba(255,255,255,.035);
    }
    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-box p:first-child {
      margin: 0;
      color: rgba(255,255,255,.38);
      font-size: 8px;
      font-weight: 1000;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-box p:last-child {
      margin: 6px 0 0;
      color: rgba(255,255,255,.68);
      font-size: 12px;
      font-weight: 700;
      line-height: 1.55;
    }
    #root [data-clara-pressure-close="true"] {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.05);
      color: rgba(255,255,255,.68);
      font-size: 18px;
      font-weight: 900;
    }
  `,document.head.appendChild(t)}function h(t){const e=o.map(r=>r.id).join("|");t.dataset.pressureSignature!==e&&(t.dataset.pressureSignature=e,t.innerHTML=`
    <div class="clara-pressure-track" aria-label="Today pressure signals">
      ${o.map(r=>`
          <button type="button" class="clara-pressure-chip" data-clara-pressure-signal="${r.id}" aria-label="Open ${r.label} tips" title="${r.label}">
            <span aria-hidden="true">${r.icon}</span>
            <strong>${r.label}</strong>
          </button>
        `).join("")}
    </div>
  `)}function d(t){var e;(e=t==null?void 0:t.querySelectorAll)==null||e.call(t,"[data-clara-pressure-tip-panel='true']").forEach(r=>r.remove())}function x(t,e){var i;d(t);const r=document.createElement("div");r.dataset.claraPressureTipPanel="true",r.innerHTML=`
    <div class="clara-pressure-tip-inner">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
          <div class="clara-pressure-tip-icon">${e.icon}</div>
          <div style="min-width:0;">
            <p class="clara-pressure-tip-kicker">Pressure signal</p>
            <h4>${e.title}</h4>
          </div>
        </div>
        <button type="button" data-clara-pressure-close="true" aria-label="Close pressure tip">×</button>
      </div>
      <div class="clara-pressure-tip-box"><p>Watch out for</p><p>${e.watch}</p></div>
      <div class="clara-pressure-tip-box"><p>CLARA tip</p><p>${e.tip}</p></div>
    </div>
  `,(i=r.querySelector("[data-clara-pressure-close='true']"))==null||i.addEventListener("click",()=>d(t)),t.appendChild(r)}function y(t){const e=Array.from(t.children).find(i=>{var a;return(a=i.matches)==null?void 0:a.call(i,"[data-clara-pressure-signals='true']")});if(!e||e.tagName!=="SECTION")return e;const r=document.createElement("div");return r.dataset.claraPressureSignals="true",r.dataset.pressureSignature=e.dataset.pressureSignature||"",r.dataset.pressureReady=e.dataset.pressureReady||"",r.innerHTML=e.innerHTML,e.replaceWith(r),r}function w(){f();const t=u(),e=m(t),r=(e==null?void 0:e.parentElement)||(t==null?void 0:t.parentElement)||null,i=g(r);if(!e||!r||!i)return;let a=y(r);a?a.previousElementSibling!==e&&e.insertAdjacentElement("afterend",a):(a=document.createElement("div"),a.dataset.claraPressureSignals="true",e.insertAdjacentElement("afterend",a)),h(a),a.dataset.pressureReady!=="true"&&(a.dataset.pressureReady="true",a.addEventListener("click",n=>{var s,l;const p=(l=(s=n.target)==null?void 0:s.closest)==null?void 0:l.call(s,"[data-clara-pressure-signal]");p&&x(r,b(p.dataset.claraPressureSignal))}))}if(typeof window<"u"&&typeof document<"u"&&!window.__CLARA_LIFE_PRESSURE_SIGNALS__){window.__CLARA_LIFE_PRESSURE_SIGNALS__=!0;let t=!1;const e=()=>{t||(t=!0,window.requestAnimationFrame(()=>{t=!1,w()}))};new MutationObserver(e).observe(document.body,{childList:!0,subtree:!0}),window.addEventListener("storage",e,{passive:!0}),document.addEventListener("click",()=>window.setTimeout(e,80),{passive:!0}),e()}
