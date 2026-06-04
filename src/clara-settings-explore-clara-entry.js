const EXPLORE_ENTRY_ID = "clara-settings-explore-clara-entry";
const EXPLORE_PAGE_ID = "clara-settings-explore-clara-page";

const exploreFeatures = [
  {
    title: "Sample Data Mode",
    description: "Load a realistic sample financial setup so users can explore CLARA without using real money records.",
  },
  {
    title: "Guided App Tour",
    description: "Walk through Dashboard, Wallets, Budget, Savings, Emergency Fund, Transactions, and CLARA chat.",
  },
  {
    title: "Practice Actions",
    description: "Try safe sample actions like logging an expense, creating a budget, transferring money, or asking CLARA before buying.",
  },
  {
    title: "Mini Lessons",
    description: "Show short learning cards about budgeting, planned vs unplanned spending, emergency funds, and better money decisions.",
  },
  {
    title: "Feature Preview",
    description: "Preview advanced CLARA tools such as Can I Buy This, Forecast, Analytics, and Daily Spending Strategy.",
  },
  {
    title: "Reset Learning Progress",
    description: "Let users restart the tour, reset sample data, or try another learning scenario anytime.",
  },
];

const createIconSvg = (type = "spark") => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.style.width = "1.25rem";
  svg.style.height = "1.25rem";

  const paths =
    type === "back"
      ? ["M19 12H5", "m12 19-7-7 7-7"]
      : type === "chevron"
        ? ["m9 18 6-6-6-6"]
        : ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z", "M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"];

  paths.forEach((d) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  });

  return svg;
};

const findSettingsList = () => {
  const settingsRoot = document.querySelector("#root .space-y-5.pb-6");
  if (!settingsRoot) return null;

  const programSection = Array.from(settingsRoot.querySelectorAll("section")).find((section) =>
    section.textContent?.includes("Program") && section.textContent?.includes("About CLARA")
  );

  return { settingsRoot, programSection };
};

const createFeaturePage = () => {
  const page = document.createElement("div");
  page.id = EXPLORE_PAGE_ID;
  page.className = "clara-explore-page space-y-4 pb-6";
  page.style.display = "none";

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "clara-explore-back";
  backButton.appendChild(createIconSvg("back"));
  backButton.appendChild(document.createTextNode("Settings"));
  backButton.addEventListener("click", () => showExploreList(false));

  const hero = document.createElement("div");
  hero.className = "clara-explore-hero";
  hero.innerHTML = `
    <p class="clara-explore-kicker">Learning</p>
    <h2>Explore CLARA</h2>
    <p>Practice, preview, and understand CLARA before using real financial records.</p>
  `;

  const list = document.createElement("div");
  list.className = "clara-explore-feature-list";

  exploreFeatures.forEach((feature) => {
    const card = document.createElement("div");
    card.className = "clara-explore-feature-card";

    const icon = document.createElement("div");
    icon.className = "clara-explore-feature-icon";
    icon.appendChild(createIconSvg("spark"));

    const content = document.createElement("div");
    content.className = "clara-explore-feature-content";
    content.innerHTML = `<p>${feature.title}</p><span>${feature.description}</span>`;

    card.appendChild(icon);
    card.appendChild(content);
    list.appendChild(card);
  });

  const note = document.createElement("div");
  note.className = "clara-explore-note";
  note.textContent = "Static preview only for now. Later, each card can open its own flow or modal.";

  page.appendChild(backButton);
  page.appendChild(hero);
  page.appendChild(list);
  page.appendChild(note);

  return page;
};

const showExploreList = (show) => {
  const { settingsRoot } = findSettingsList() || {};
  const page = document.getElementById(EXPLORE_PAGE_ID);
  if (!settingsRoot || !page) return;

  settingsRoot.style.display = show ? "none" : "";
  page.style.display = show ? "block" : "none";

  if (show) {
    page.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const createExploreSection = () => {
  const section = document.createElement("section");
  section.id = EXPLORE_ENTRY_ID;
  section.className = "space-y-2 clara-explore-section";

  const label = document.createElement("p");
  label.className = "px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35";
  label.textContent = "Learning";

  const wrapper = document.createElement("div");
  wrapper.className = "space-y-2.5";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "group clara-explore-entry";
  button.addEventListener("click", () => showExploreList(true));

  const iconWrap = document.createElement("div");
  iconWrap.className = "clara-explore-entry-icon";
  iconWrap.appendChild(createIconSvg("spark"));

  const textWrap = document.createElement("div");
  textWrap.className = "clara-explore-entry-text";
  textWrap.innerHTML = `
    <p>Explore CLARA</p>
    <span>Sample data, guided tour, practice, and previews</span>
  `;

  const badge = document.createElement("span");
  badge.className = "clara-explore-entry-badge";
  badge.textContent = "Start";

  button.appendChild(iconWrap);
  button.appendChild(textWrap);
  button.appendChild(badge);
  button.appendChild(createIconSvg("chevron"));

  wrapper.appendChild(button);
  section.appendChild(label);
  section.appendChild(wrapper);

  return section;
};

const installExploreClaraEntry = () => {
  if (typeof document === "undefined") return;

  const match = findSettingsList();
  if (!match) return;

  const { settingsRoot, programSection } = match;
  if (!programSection) return;

  if (!document.getElementById(EXPLORE_ENTRY_ID)) {
    const exploreSection = createExploreSection();
    programSection.insertAdjacentElement("afterend", exploreSection);
  }

  if (!document.getElementById(EXPLORE_PAGE_ID)) {
    const page = createFeaturePage();
    settingsRoot.insertAdjacentElement("afterend", page);
  }
};

const installExploreClaraStyles = () => {
  if (typeof document === "undefined" || document.getElementById("clara-explore-clara-styles")) return;

  const style = document.createElement("style");
  style.id = "clara-explore-clara-styles";
  style.textContent = `
    #${EXPLORE_ENTRY_ID} > p {
      color: rgba(207, 250, 254, 0.38) !important;
      letter-spacing: 0.21em !important;
      text-shadow: 0 0 14px rgba(34, 211, 238, 0.10);
    }

    .clara-explore-entry {
      display: flex;
      width: 100%;
      min-height: 4.2rem;
      align-items: center;
      gap: 0.75rem;
      border-radius: 24px;
      border: 1px solid rgba(165, 243, 252, 0.135);
      padding: 1rem;
      text-align: left;
      background:
        radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.095), transparent 36%),
        radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.075), transparent 40%),
        rgba(255, 255, 255, 0.04);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.065),
        0 12px 30px rgba(0, 0, 0, 0.13),
        0 0 20px rgba(34, 211, 238, 0.025);
      transition: 160ms ease;
    }

    .clara-explore-entry:hover {
      border-color: rgba(165, 243, 252, 0.2);
      background:
        radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.12), transparent 36%),
        radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.095), transparent 40%),
        rgba(255, 255, 255, 0.055);
    }

    .clara-explore-entry-icon,
    .clara-explore-feature-icon {
      display: flex;
      height: 2.75rem;
      width: 2.75rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 1rem;
      border: 1px solid rgba(165, 243, 252, 0.16);
      background: rgba(255, 255, 255, 0.075);
      color: rgba(236, 253, 255, 0.72);
    }

    .clara-explore-entry-text {
      min-width: 0;
      flex: 1;
    }

    .clara-explore-entry-text p {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.875rem;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.92);
    }

    .clara-explore-entry-text span {
      margin-top: 0.25rem;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.75rem;
      color: rgba(236, 253, 255, 0.46);
    }

    .clara-explore-entry-badge {
      max-width: 96px;
      flex-shrink: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.08);
      padding: 0.25rem 0.625rem;
      font-size: 10px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.58);
    }

    .clara-explore-entry > svg {
      height: 1rem !important;
      width: 1rem !important;
      flex-shrink: 0;
      color: rgba(255, 255, 255, 0.32);
      transition: 160ms ease;
    }

    .clara-explore-entry:hover > svg {
      transform: translateX(2px);
      color: rgba(255, 255, 255, 0.56);
    }

    .clara-explore-page {
      min-height: 100%;
    }

    .clara-explore-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.08);
      padding: 0.5rem 0.75rem;
      font-size: 11px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.70);
    }

    .clara-explore-back svg {
      height: 0.875rem !important;
      width: 0.875rem !important;
    }

    .clara-explore-hero,
    .clara-explore-note {
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background:
        radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.12), transparent 38%),
        radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.10), transparent 42%),
        rgba(255, 255, 255, 0.045);
      padding: 1rem;
      box-shadow: 0 18px 50px rgba(0,0,0,0.18);
      backdrop-filter: blur(18px);
    }

    .clara-explore-kicker {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(165, 243, 252, 0.55);
    }

    .clara-explore-hero h2 {
      margin-top: 0.45rem;
      font-size: 1.25rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: white;
    }

    .clara-explore-hero p:last-child {
      margin-top: 0.5rem;
      max-width: 30ch;
      font-size: 0.78rem;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.52);
    }

    .clara-explore-feature-list {
      display: grid;
      gap: 0.75rem;
    }

    .clara-explore-feature-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.045);
      padding: 1rem;
    }

    .clara-explore-feature-content {
      min-width: 0;
      flex: 1;
    }

    .clara-explore-feature-content p {
      font-size: 0.875rem;
      font-weight: 900;
      color: white;
    }

    .clara-explore-feature-content span {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.75rem;
      line-height: 1.55;
      color: rgba(255, 255, 255, 0.48);
    }

    .clara-explore-note {
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.55;
      color: rgba(236, 253, 255, 0.54);
    }
  `;

  document.head.appendChild(style);
};

if (typeof window !== "undefined") {
  installExploreClaraStyles();
  installExploreClaraEntry();

  const observer = new MutationObserver(() => {
    installExploreClaraStyles();
    installExploreClaraEntry();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
