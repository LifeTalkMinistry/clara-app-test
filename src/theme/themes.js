const DEFAULT_THEME_KEY = "clara-hero-red-blue";
const GLOBAL_THEME_STORAGE_KEY = "clara_global_theme";

const CATEGORY_LABELS = {
  default: "Default",
  classic: "Classic",
  aesthetic: "Aesthetic",
  season: "Season",
  weather: "Weather",
  financeMood: "Finance / Mood",
};

const CATEGORY_ORDER = [
  "default",
  "classic",
  "aesthetic",
  "season",
  "weather",
  "financeMood",
];

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "").trim();
  const source =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const int = Number.parseInt(source, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToHslString(hex) {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }

    hue /= 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(
    lightness * 100
  )}%`;
}

function makeTheme({
  key,
  label,
  category,
  chip,
  preview,
  isLight = false,
  moneyTone = "blue",
  monthTone = "blue",
  tipTone = "teal",
  background = "#041120",
  surface = "#09192c",
  card = "#0d2238",
  cardAlt = "#112a44",
  primary = "#4fb4ff",
  secondary = "#f35b78",
  accent = "#2fffe0",
  danger = "#ff6d85",
  success = "#3bf2a4",
  warning = "#ffca62",
  text = "#f8fbff",
  mutedText = "#9eb2c8",
  border = "#1f4c72",
  glow = "#24d9ff",
  bottomNav = "linear-gradient(180deg, rgba(9,24,43,0.96) 0%, rgba(5,15,30,0.92) 100%)",
  topNav = "linear-gradient(135deg, rgba(12,38,84,0.96) 0%, rgba(25,42,104,0.92) 48%, rgba(110,18,36,0.88) 100%)",
  gradientHero = "linear-gradient(135deg, rgba(7,28,67,0.96) 0%, rgba(17,48,118,0.92) 46%, rgba(118,16,34,0.88) 100%)",
  gradientCard = "linear-gradient(135deg, rgba(7,28,67,0.94) 0%, rgba(15,33,78,0.92) 48%, rgba(94,14,32,0.90) 100%)",
  gradientExpense = "linear-gradient(135deg, rgba(34,20,64,0.94) 0%, rgba(88,19,36,0.92) 100%)",
  gradientMoney = "linear-gradient(135deg, rgba(10,46,112,0.95) 0%, rgba(20,44,110,0.92) 55%, rgba(46,24,96,0.90) 100%)",
  gradientEmergency = "linear-gradient(135deg, rgba(7,31,73,0.95) 0%, rgba(20,37,84,0.93) 50%, rgba(102,15,34,0.90) 100%)",
}) {
  return {
    key,
    label,
    category,
    chip,
    preview: preview || gradientCard,
    isLight,
    moneyTone,
    monthTone,
    tipTone,
    tokens: {
      background,
      surface,
      card,
      cardAlt,
      primary,
      secondary,
      accent,
      danger,
      success,
      warning,
      text,
      mutedText,
      border,
      glow,
      bottomNav,
      topNav,
      gradientHero,
      gradientCard,
      gradientExpense,
      gradientMoney,
      gradientEmergency,
    },
  };
}

export const claraThemes = [
  makeTheme({
    key: "clara-hero-red-blue",
    label: "CLARA Hero Red/Blue",
    category: "default",
    chip: "Default CLARA",
    moneyTone: "blue",
    monthTone: "blue",
    tipTone: "teal",
    background: "#041120",
    surface: "#07182d",
    card: "#0a2038",
    cardAlt: "#10294a",
    primary: "#57a8ff",
    secondary: "#ff5b73",
    accent: "#2ef6de",
    danger: "#ff7288",
    success: "#3ef4a5",
    warning: "#ffcc67",
    text: "#f9fbff",
    mutedText: "#9eb3c8",
    border: "#1789d5",
    glow: "#20d8ff",
    bottomNav:
      "linear-gradient(180deg, rgba(8,22,44,0.97) 0%, rgba(5,15,30,0.94) 100%)",
    topNav:
      "linear-gradient(135deg, rgba(11,44,102,0.96) 0%, rgba(26,53,122,0.92) 48%, rgba(145,26,40,0.88) 100%)",
    gradientHero:
      "linear-gradient(135deg, rgba(8,41,103,0.97) 0%, rgba(24,53,126,0.94) 46%, rgba(163,27,45,0.88) 100%)",
    gradientCard:
      "linear-gradient(135deg, rgba(8,32,82,0.95) 0%, rgba(21,39,91,0.93) 46%, rgba(132,18,36,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(42,21,86,0.95) 0%, rgba(105,22,44,0.92) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(13,54,126,0.96) 0%, rgba(28,52,120,0.92) 54%, rgba(54,31,112,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(8,42,98,0.96) 0%, rgba(20,37,85,0.94) 48%, rgba(130,18,38,0.90) 100%)",
  }),
  makeTheme({
    key: "midnight-gold",
    label: "Midnight Gold",
    category: "classic",
    chip: "Dark luxury",
    moneyTone: "gold",
    monthTone: "gold",
    tipTone: "gold",
    background: "#090d15",
    surface: "#111721",
    card: "#191f2b",
    cardAlt: "#211b1a",
    primary: "#f9c15b",
    secondary: "#c18a2c",
    accent: "#ffe7a2",
    border: "#7e6226",
    glow: "#f7c560",
    gradientCard:
      "linear-gradient(135deg, rgba(17,23,33,0.96) 0%, rgba(35,30,23,0.92) 55%, rgba(88,59,20,0.88) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(22,28,40,0.96) 0%, rgba(53,42,27,0.92) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(31,25,18,0.96) 0%, rgba(88,58,26,0.92) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(15,20,29,0.96) 0%, rgba(53,38,24,0.92) 100%)",
  }),
  makeTheme({
    key: "emerald-navy",
    label: "Emerald Navy",
    category: "classic",
    chip: "Refined finance",
    moneyTone: "emerald",
    monthTone: "teal",
    tipTone: "emerald",
    background: "#03131a",
    surface: "#09212f",
    card: "#0f2436",
    cardAlt: "#143245",
    primary: "#38d6ab",
    secondary: "#1d4d8f",
    accent: "#53ffe0",
    border: "#18887f",
    glow: "#29f0d4",
    gradientCard:
      "linear-gradient(135deg, rgba(7,37,52,0.96) 0%, rgba(16,51,73,0.92) 56%, rgba(8,82,73,0.88) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(7,42,57,0.96) 0%, rgba(14,79,74,0.92) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(10,29,49,0.96) 0%, rgba(28,62,104,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(7,35,52,0.96) 0%, rgba(10,64,74,0.92) 100%)",
  }),
  makeTheme({
    key: "royal-blue",
    label: "Royal Blue",
    category: "classic",
    chip: "Sharp prestige",
    moneyTone: "blue",
    monthTone: "blue",
    tipTone: "blue",
    background: "#07132d",
    surface: "#0b1f47",
    card: "#10295b",
    cardAlt: "#173872",
    primary: "#73a4ff",
    secondary: "#3769e6",
    accent: "#8cd6ff",
    border: "#3d7bff",
    glow: "#6cb4ff",
    gradientCard:
      "linear-gradient(135deg, rgba(9,28,69,0.96) 0%, rgba(17,53,121,0.92) 60%, rgba(22,76,164,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(9,40,100,0.96) 0%, rgba(32,80,182,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(12,26,82,0.96) 0%, rgba(20,55,144,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(10,33,85,0.96) 0%, rgba(17,60,150,0.90) 100%)",
  }),
  makeTheme({
    key: "charcoal-silver",
    label: "Charcoal Silver",
    category: "classic",
    chip: "Clean metal",
    monthTone: "blue",
    tipTone: "teal",
    background: "#0b1118",
    surface: "#161e27",
    card: "#1b2633",
    cardAlt: "#243140",
    primary: "#d8e3f3",
    secondary: "#7b8aa2",
    accent: "#9fd4ff",
    border: "#5a708a",
    glow: "#9ebbd9",
    text: "#f6f9ff",
    mutedText: "#a7b3c3",
    gradientCard:
      "linear-gradient(135deg, rgba(20,28,38,0.96) 0%, rgba(29,40,54,0.92) 55%, rgba(56,71,91,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(18,29,44,0.96) 0%, rgba(38,58,88,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(28,34,44,0.96) 0%, rgba(64,73,88,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(16,25,35,0.96) 0%, rgba(49,58,72,0.90) 100%)",
  }),
  makeTheme({
    key: "luxury-black",
    label: "Luxury Black",
    category: "classic",
    chip: "Jet glass",
    background: "#040506",
    surface: "#0c0d10",
    card: "#121418",
    cardAlt: "#191c22",
    primary: "#ffffff",
    secondary: "#7b8a9a",
    accent: "#67d6ff",
    border: "#3a4453",
    glow: "#7ed7ff",
    text: "#fbfcff",
    mutedText: "#9ba5b2",
    gradientCard:
      "linear-gradient(135deg, rgba(10,12,16,0.97) 0%, rgba(18,21,28,0.93) 55%, rgba(38,46,59,0.84) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(10,14,22,0.97) 0%, rgba(18,39,62,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(15,16,21,0.97) 0%, rgba(38,36,45,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(8,10,15,0.97) 0%, rgba(31,36,45,0.90) 100%)",
  }),
  makeTheme({
    key: "neon-glass",
    label: "Neon Glass",
    category: "aesthetic",
    chip: "Electric cyan",
    moneyTone: "teal",
    monthTone: "blue",
    tipTone: "teal",
    background: "#03111d",
    surface: "#071e32",
    card: "#0b2842",
    cardAlt: "#112f4f",
    primary: "#58c7ff",
    secondary: "#ff4e78",
    accent: "#27ffe2",
    border: "#1ed0ff",
    glow: "#26ffe2",
    gradientCard:
      "linear-gradient(135deg, rgba(7,34,67,0.96) 0%, rgba(16,49,92,0.92) 48%, rgba(128,20,68,0.84) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(8,45,88,0.96) 0%, rgba(18,86,120,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(44,22,86,0.96) 0%, rgba(121,21,77,0.88) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(8,39,82,0.96) 0%, rgba(120,23,58,0.88) 100%)",
  }),
  makeTheme({
    key: "aurora-glow",
    label: "Aurora Glow",
    category: "aesthetic",
    chip: "Polar blend",
    moneyTone: "teal",
    monthTone: "emerald",
    tipTone: "blue",
    background: "#03151d",
    surface: "#082230",
    card: "#113043",
    cardAlt: "#19384d",
    primary: "#62d3ff",
    secondary: "#6c64ff",
    accent: "#6cffc6",
    border: "#49d7e8",
    glow: "#6cffc6",
    gradientCard:
      "linear-gradient(135deg, rgba(8,42,61,0.96) 0%, rgba(16,56,86,0.92) 46%, rgba(41,103,110,0.88) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(8,46,66,0.96) 0%, rgba(16,88,110,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(18,34,74,0.96) 0%, rgba(69,68,150,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(8,47,66,0.96) 0%, rgba(42,105,112,0.90) 100%)",
  }),
  makeTheme({
    key: "cyber-teal",
    label: "Cyber Teal",
    category: "aesthetic",
    chip: "Future mode",
    moneyTone: "teal",
    monthTone: "teal",
    tipTone: "teal",
    background: "#021419",
    surface: "#07232b",
    card: "#0b313a",
    cardAlt: "#13404c",
    primary: "#38e0d2",
    secondary: "#0f7ef1",
    accent: "#7bffef",
    border: "#24d5c7",
    glow: "#2cf7e4",
    gradientCard:
      "linear-gradient(135deg, rgba(7,42,55,0.96) 0%, rgba(10,78,91,0.92) 52%, rgba(11,48,84,0.88) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(6,45,55,0.96) 0%, rgba(10,96,112,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(7,38,59,0.96) 0%, rgba(20,76,136,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(5,40,50,0.96) 0%, rgba(14,82,98,0.90) 100%)",
  }),
  makeTheme({
    key: "soft-violet",
    label: "Soft Violet",
    category: "aesthetic",
    chip: "Silky glass",
    moneyTone: "blue",
    monthTone: "blue",
    tipTone: "teal",
    background: "#120c23",
    surface: "#1b1531",
    card: "#251d44",
    cardAlt: "#31255a",
    primary: "#bc9eff",
    secondary: "#7c5af3",
    accent: "#9ee7ff",
    border: "#8b71e5",
    glow: "#c8a5ff",
    gradientCard:
      "linear-gradient(135deg, rgba(28,20,53,0.96) 0%, rgba(51,33,92,0.92) 54%, rgba(90,56,160,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(24,20,52,0.96) 0%, rgba(59,50,136,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(37,20,60,0.96) 0%, rgba(90,45,138,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(26,18,50,0.96) 0%, rgba(75,49,128,0.90) 100%)",
  }),
  makeTheme({
    key: "rose-quartz",
    label: "Rose Quartz",
    category: "aesthetic",
    chip: "Elegant warmth",
    moneyTone: "gold",
    monthTone: "gold",
    tipTone: "blue",
    background: "#1a101b",
    surface: "#291720",
    card: "#34202b",
    cardAlt: "#422936",
    primary: "#ffb0c8",
    secondary: "#ff6d8e",
    accent: "#ffd8ef",
    border: "#c9688f",
    glow: "#ff9eb6",
    gradientCard:
      "linear-gradient(135deg, rgba(37,20,31,0.96) 0%, rgba(70,32,54,0.92) 50%, rgba(120,49,83,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(42,25,44,0.96) 0%, rgba(106,48,86,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(53,22,32,0.96) 0%, rgba(130,44,76,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(33,18,28,0.96) 0%, rgba(108,40,76,0.90) 100%)",
  }),
  makeTheme({
    key: "ocean-depth",
    label: "Ocean Depth",
    category: "aesthetic",
    chip: "Deep tide",
    moneyTone: "blue",
    monthTone: "teal",
    tipTone: "blue",
    background: "#031520",
    surface: "#072130",
    card: "#0b3141",
    cardAlt: "#103d4e",
    primary: "#5cc7ff",
    secondary: "#127fca",
    accent: "#5dffe8",
    border: "#1aaad1",
    glow: "#4fe0ff",
    gradientCard:
      "linear-gradient(135deg, rgba(7,31,52,0.96) 0%, rgba(8,56,78,0.92) 48%, rgba(8,85,110,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(8,39,62,0.96) 0%, rgba(9,79,112,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(11,33,56,0.96) 0%, rgba(19,81,125,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(8,34,56,0.96) 0%, rgba(7,86,104,0.90) 100%)",
  }),
  makeTheme({
    key: "summer-lime",
    label: "Summer Lime",
    category: "season",
    chip: "Fresh momentum",
    moneyTone: "emerald",
    monthTone: "gold",
    tipTone: "emerald",
    background: "#07160f",
    surface: "#112a18",
    card: "#193820",
    cardAlt: "#214627",
    primary: "#b6ef5a",
    secondary: "#54c74b",
    accent: "#daff7c",
    border: "#84d84f",
    glow: "#b8ff63",
    gradientCard:
      "linear-gradient(135deg, rgba(16,40,18,0.96) 0%, rgba(31,67,24,0.92) 55%, rgba(62,112,26,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(16,44,18,0.96) 0%, rgba(54,118,32,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(34,42,14,0.96) 0%, rgba(99,108,18,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(16,38,18,0.96) 0%, rgba(80,116,28,0.90) 100%)",
  }),
  makeTheme({
    key: "autumn-amber",
    label: "Autumn Amber",
    category: "season",
    chip: "Warm strategy",
    moneyTone: "gold",
    monthTone: "gold",
    tipTone: "gold",
    background: "#1b1109",
    surface: "#29170d",
    card: "#352011",
    cardAlt: "#492915",
    primary: "#ffb24d",
    secondary: "#ef7b2e",
    accent: "#ffd38e",
    border: "#d1812a",
    glow: "#ffb34f",
    gradientCard:
      "linear-gradient(135deg, rgba(37,21,12,0.96) 0%, rgba(73,39,17,0.92) 56%, rgba(138,72,18,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(42,24,12,0.96) 0%, rgba(145,73,20,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(47,22,12,0.96) 0%, rgba(168,58,20,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(33,18,12,0.96) 0%, rgba(132,68,16,0.90) 100%)",
  }),
  makeTheme({
    key: "winter-frost",
    label: "Winter Frost",
    category: "season",
    chip: "Icy clarity",
    isLight: true,
    moneyTone: "blue",
    monthTone: "teal",
    tipTone: "blue",
    background: "#e9f5ff",
    surface: "#f4fbff",
    card: "#ffffff",
    cardAlt: "#edf7ff",
    primary: "#4f9fff",
    secondary: "#77b9f7",
    accent: "#54d6ff",
    danger: "#ff7d96",
    success: "#4fdbb1",
    warning: "#f4ba62",
    text: "#0f1b2d",
    mutedText: "#58708c",
    border: "#bfd7f4",
    glow: "#9fd8ff",
    bottomNav:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(234,245,255,0.94) 100%)",
    topNav:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(225,240,255,0.96) 48%, rgba(214,234,255,0.92) 100%)",
    gradientHero:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(221,240,255,0.96) 48%, rgba(199,233,255,0.92) 100%)",
    gradientCard:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(238,247,255,0.96) 52%, rgba(223,240,255,0.92) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(231,244,255,0.96) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(247,251,255,0.98) 0%, rgba(224,240,255,0.96) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(227,242,255,0.96) 100%)",
  }),
  makeTheme({
    key: "spring-mint",
    label: "Spring Mint",
    category: "season",
    chip: "Clean restart",
    isLight: true,
    moneyTone: "emerald",
    monthTone: "teal",
    tipTone: "emerald",
    background: "#edfdf8",
    surface: "#f8fffc",
    card: "#ffffff",
    cardAlt: "#effdf7",
    primary: "#36c89f",
    secondary: "#70dcbf",
    accent: "#6af4dc",
    text: "#143127",
    mutedText: "#58756c",
    border: "#cdeee3",
    glow: "#87f6d9",
    bottomNav:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(237,253,248,0.94) 100%)",
    topNav:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(229,253,245,0.96) 48%, rgba(212,248,238,0.94) 100%)",
    gradientHero:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(224,252,243,0.96) 48%, rgba(200,247,231,0.94) 100%)",
    gradientCard:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,252,247,0.96) 55%, rgba(217,249,238,0.94) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(228,252,242,0.96) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(250,255,253,0.98) 0%, rgba(219,248,236,0.96) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(220,248,238,0.96) 100%)",
  }),
  makeTheme({
    key: "christmas-glow",
    label: "Christmas Glow",
    category: "season",
    chip: "Festive contrast",
    moneyTone: "emerald",
    monthTone: "gold",
    tipTone: "gold",
    background: "#09150f",
    surface: "#0f2417",
    card: "#14311f",
    cardAlt: "#412021",
    primary: "#3be38c",
    secondary: "#ff556e",
    accent: "#e9ff8e",
    border: "#27c46a",
    glow: "#ff6b6b",
    gradientCard:
      "linear-gradient(135deg, rgba(14,44,24,0.96) 0%, rgba(18,56,30,0.92) 48%, rgba(117,24,36,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(12,46,22,0.96) 0%, rgba(42,110,48,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(41,18,24,0.96) 0%, rgba(144,28,42,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(12,41,22,0.96) 0%, rgba(124,24,36,0.90) 100%)",
  }),
  makeTheme({
    key: "sunrise",
    label: "Sunrise",
    category: "weather",
    chip: "Bright optimism",
    isLight: true,
    moneyTone: "gold",
    monthTone: "gold",
    tipTone: "blue",
    background: "#fff4e8",
    surface: "#fffaf4",
    card: "#ffffff",
    cardAlt: "#fff3e7",
    primary: "#ff8b4d",
    secondary: "#ffb35e",
    accent: "#ffcf8e",
    text: "#3d2417",
    mutedText: "#8b6755",
    border: "#ffd5ae",
    glow: "#ffb87a",
    gradientHero:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,233,212,0.96) 44%, rgba(255,196,154,0.94) 100%)",
    gradientCard:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,239,223,0.96) 55%, rgba(255,216,184,0.94) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,232,204,0.96) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(255,250,243,0.98) 0%, rgba(255,219,188,0.96) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,225,197,0.96) 100%)",
  }),
  makeTheme({
    key: "sunset",
    label: "Sunset",
    category: "weather",
    chip: "Warm horizon",
    moneyTone: "gold",
    monthTone: "gold",
    tipTone: "blue",
    background: "#1b1220",
    surface: "#2a1628",
    card: "#341c2b",
    cardAlt: "#482332",
    primary: "#ff9455",
    secondary: "#ff5d7c",
    accent: "#ffc08b",
    border: "#dc6d73",
    glow: "#ff9a76",
    gradientCard:
      "linear-gradient(135deg, rgba(39,20,42,0.96) 0%, rgba(77,34,54,0.92) 50%, rgba(168,67,40,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(49,21,44,0.96) 0%, rgba(145,68,52,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(51,23,38,0.96) 0%, rgba(174,54,70,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(35,18,34,0.96) 0%, rgba(138,56,50,0.90) 100%)",
  }),
  makeTheme({
    key: "rainy-night",
    label: "Rainy Night",
    category: "weather",
    chip: "Moody focus",
    moneyTone: "blue",
    monthTone: "blue",
    tipTone: "teal",
    background: "#06111b",
    surface: "#0a1b2d",
    card: "#11263d",
    cardAlt: "#17304d",
    primary: "#66b2ff",
    secondary: "#3b81d4",
    accent: "#88dcff",
    border: "#2f7dbf",
    glow: "#55a6ff",
    gradientCard:
      "linear-gradient(135deg, rgba(9,23,44,0.96) 0%, rgba(17,42,74,0.92) 58%, rgba(32,78,110,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(8,28,48,0.96) 0%, rgba(21,66,120,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(10,25,43,0.96) 0%, rgba(16,49,94,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(8,22,38,0.96) 0%, rgba(25,62,104,0.90) 100%)",
  }),
  makeTheme({
    key: "storm-blue",
    label: "Storm Blue",
    category: "weather",
    chip: "Heavy cloud power",
    moneyTone: "blue",
    monthTone: "blue",
    tipTone: "blue",
    background: "#07121e",
    surface: "#102130",
    card: "#153148",
    cardAlt: "#1a3b56",
    primary: "#6fb8ff",
    secondary: "#516f93",
    accent: "#9fe0ff",
    border: "#547db1",
    glow: "#8ebaf2",
    gradientCard:
      "linear-gradient(135deg, rgba(12,28,49,0.96) 0%, rgba(24,47,78,0.92) 58%, rgba(42,78,122,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(13,31,55,0.96) 0%, rgba(28,70,124,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(18,29,49,0.96) 0%, rgba(51,71,104,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(11,24,42,0.96) 0%, rgba(32,60,102,0.90) 100%)",
  }),
  makeTheme({
    key: "cloud-silver",
    label: "Cloud Silver",
    category: "weather",
    chip: "Quiet clarity",
    isLight: true,
    background: "#eef4fb",
    surface: "#f8fbff",
    card: "#ffffff",
    cardAlt: "#edf2f8",
    primary: "#7b94b4",
    secondary: "#c0cddd",
    accent: "#8dc3f7",
    text: "#1b2737",
    mutedText: "#66778c",
    border: "#d9e1ea",
    glow: "#c9d8e8",
    gradientHero:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(240,245,251,0.96) 44%, rgba(223,233,245,0.94) 100%)",
    gradientCard:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(243,247,252,0.96) 54%, rgba(230,238,247,0.94) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(237,243,250,0.96) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(250,252,255,0.98) 0%, rgba(229,236,245,0.96) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(233,240,248,0.96) 100%)",
  }),
  makeTheme({
    key: "tropical-sky",
    label: "Tropical Sky",
    category: "weather",
    chip: "Vacation blue",
    moneyTone: "teal",
    monthTone: "blue",
    tipTone: "teal",
    background: "#031824",
    surface: "#07283a",
    card: "#0a3651",
    cardAlt: "#104364",
    primary: "#5dc8ff",
    secondary: "#20b8c5",
    accent: "#61ffe5",
    border: "#2bbccf",
    glow: "#3ad7ff",
    gradientCard:
      "linear-gradient(135deg, rgba(8,42,65,0.96) 0%, rgba(8,71,103,0.92) 50%, rgba(18,121,137,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(8,48,72,0.96) 0%, rgba(20,120,131,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(8,37,67,0.96) 0%, rgba(17,90,144,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(6,39,60,0.96) 0%, rgba(16,102,128,0.90) 100%)",
  }),
  makeTheme({
    key: "debt-crusher",
    label: "Debt Crusher",
    category: "financeMood",
    chip: "Aggressive payoff",
    moneyTone: "gold",
    monthTone: "gold",
    tipTone: "gold",
    background: "#16090a",
    surface: "#250f10",
    card: "#331516",
    cardAlt: "#461a1b",
    primary: "#ff625e",
    secondary: "#ff9a4f",
    accent: "#ffd066",
    border: "#d9544b",
    glow: "#ff7369",
    gradientCard:
      "linear-gradient(135deg, rgba(45,15,18,0.96) 0%, rgba(84,25,20,0.92) 48%, rgba(173,82,28,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(54,16,22,0.96) 0%, rgba(168,55,39,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(54,17,18,0.96) 0%, rgba(188,63,33,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(38,14,16,0.96) 0%, rgba(148,50,34,0.90) 100%)",
  }),
  makeTheme({
    key: "savings-calm",
    label: "Savings Calm",
    category: "financeMood",
    chip: "Peaceful growth",
    moneyTone: "teal",
    monthTone: "teal",
    tipTone: "emerald",
    background: "#041318",
    surface: "#082029",
    card: "#102a34",
    cardAlt: "#143747",
    primary: "#57d8d0",
    secondary: "#3ca7e6",
    accent: "#8efff1",
    border: "#2cb8b2",
    glow: "#52e9dc",
    gradientCard:
      "linear-gradient(135deg, rgba(8,35,45,0.96) 0%, rgba(14,61,76,0.92) 54%, rgba(14,108,112,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(8,40,48,0.96) 0%, rgba(16,94,102,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(9,31,52,0.96) 0%, rgba(18,84,130,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(7,32,42,0.96) 0%, rgba(14,88,104,0.90) 100%)",
  }),
  makeTheme({
    key: "budget-warrior",
    label: "Budget Warrior",
    category: "financeMood",
    chip: "Disciplined power",
    moneyTone: "blue",
    monthTone: "gold",
    tipTone: "gold",
    background: "#0a1020",
    surface: "#121c37",
    card: "#18274c",
    cardAlt: "#2d2956",
    primary: "#6b9dff",
    secondary: "#ff9960",
    accent: "#ffcf76",
    border: "#5879dd",
    glow: "#7aa6ff",
    gradientCard:
      "linear-gradient(135deg, rgba(15,28,62,0.96) 0%, rgba(26,45,91,0.92) 48%, rgba(111,63,41,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(14,35,72,0.96) 0%, rgba(36,74,160,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(33,24,60,0.96) 0%, rgba(134,76,42,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(15,28,62,0.96) 0%, rgba(88,48,46,0.90) 100%)",
  }),
  makeTheme({
    key: "emergency-shield",
    label: "Emergency Shield",
    category: "financeMood",
    chip: "Safe and ready",
    moneyTone: "blue",
    monthTone: "teal",
    tipTone: "teal",
    background: "#05111d",
    surface: "#091b30",
    card: "#102641",
    cardAlt: "#153151",
    primary: "#52a8ff",
    secondary: "#1d74d7",
    accent: "#5dffef",
    border: "#2aa8ff",
    glow: "#41dfff",
    gradientCard:
      "linear-gradient(135deg, rgba(8,31,66,0.96) 0%, rgba(16,46,88,0.92) 48%, rgba(13,92,102,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(9,36,74,0.96) 0%, rgba(26,75,142,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(7,33,56,0.96) 0%, rgba(14,76,116,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(8,36,72,0.96) 0%, rgba(13,89,112,0.90) 100%)",
  }),
  makeTheme({
    key: "wealth-builder",
    label: "Wealth Builder",
    category: "financeMood",
    chip: "Long-term gain",
    moneyTone: "gold",
    monthTone: "emerald",
    tipTone: "emerald",
    background: "#0c120e",
    surface: "#151f16",
    card: "#1c2b20",
    cardAlt: "#233826",
    primary: "#c0d96a",
    secondary: "#37c778",
    accent: "#f3e590",
    border: "#86bb55",
    glow: "#d2ef77",
    gradientCard:
      "linear-gradient(135deg, rgba(18,27,18,0.96) 0%, rgba(31,47,23,0.92) 48%, rgba(87,112,28,0.86) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(20,31,18,0.96) 0%, rgba(94,128,28,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(16,31,22,0.96) 0%, rgba(40,117,66,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(16,28,18,0.96) 0%, rgba(66,118,35,0.90) 100%)",
  }),
  makeTheme({
    key: "focus-mode",
    label: "Focus Mode",
    category: "financeMood",
    chip: "Minimal precision",
    background: "#06090f",
    surface: "#0d131d",
    card: "#141c27",
    cardAlt: "#1c2633",
    primary: "#7dc1ff",
    secondary: "#4f647b",
    accent: "#8ef0ff",
    border: "#415775",
    glow: "#75cfff",
    text: "#f4f8ff",
    mutedText: "#96a5b8",
    gradientCard:
      "linear-gradient(135deg, rgba(12,19,30,0.97) 0%, rgba(18,29,44,0.93) 56%, rgba(34,50,71,0.88) 100%)",
    gradientMoney:
      "linear-gradient(135deg, rgba(13,21,32,0.97) 0%, rgba(20,48,78,0.90) 100%)",
    gradientExpense:
      "linear-gradient(135deg, rgba(15,20,28,0.97) 0%, rgba(39,44,56,0.90) 100%)",
    gradientEmergency:
      "linear-gradient(135deg, rgba(10,16,24,0.97) 0%, rgba(31,41,56,0.90) 100%)",
  }),
];

export const claraThemesByKey = claraThemes.reduce((acc, theme) => {
  acc[theme.key] = theme;
  return acc;
}, {});

export function getThemeByKey(themeKey) {
  return claraThemesByKey[themeKey] || claraThemesByKey[DEFAULT_THEME_KEY];
}

export function buildThemeGroups() {
  return CATEGORY_ORDER.map((categoryKey) => ({
    key: categoryKey,
    label: CATEGORY_LABELS[categoryKey] || categoryKey,
    items: claraThemes.filter((theme) => theme.category === categoryKey),
  })).filter((group) => group.items.length > 0);
}

export function readStoredThemeKey() {
  if (typeof window === "undefined") return DEFAULT_THEME_KEY;

  try {
    const raw = window.localStorage.getItem(GLOBAL_THEME_STORAGE_KEY);
    return claraThemesByKey[raw] ? raw : DEFAULT_THEME_KEY;
  } catch (error) {
    console.error("Failed to read CLARA theme:", error);
    return DEFAULT_THEME_KEY;
  }
}

export function writeStoredThemeKey(themeKey) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, themeKey);
  } catch (error) {
    console.error("Failed to store CLARA theme:", error);
  }
}

export function extractProfileThemeKey(profile) {
  const candidates = [
    profile?.app_theme,
    profile?.theme_key,
    profile?.dashboard_theme,
    profile?.theme,
    profile?.preferences?.theme,
  ];

  return (
    candidates.find((candidate) => claraThemesByKey[String(candidate || "").trim()]) ||
    null
  );
}

export function buildNavPalette(theme) {
  const selectedTheme = getThemeByKey(theme?.key || theme);
  const { tokens, isLight } = selectedTheme;

  return {
    accent: tokens.accent,
    accentEnd: tokens.primary,
    accentSoft: withAlpha(tokens.accent, isLight ? 0.12 : 0.16),
    accentBorder: withAlpha(tokens.border, isLight ? 0.28 : 0.34),
    accentGlow: withAlpha(tokens.glow, isLight ? 0.22 : 0.28),
    shellStart: withAlpha(tokens.surface, 0.98),
    shellEnd: withAlpha(tokens.background, 0.94),
    surfaceGlowFrom: withAlpha(tokens.primary, isLight ? 0.10 : 0.12),
    surfaceGlowMid: withAlpha(tokens.accent, isLight ? 0.08 : 0.06),
    surfaceGlowTo: withAlpha(tokens.secondary, isLight ? 0.10 : 0.12),
    panelStart: withAlpha(tokens.card, 0.98),
    panelEnd: withAlpha(tokens.cardAlt, 0.94),
    panelBorder: withAlpha(tokens.border, isLight ? 0.32 : 0.22),
    fabRing: withAlpha(tokens.background, isLight ? 0.14 : 0.96),
    mutedText: withAlpha(tokens.mutedText, 0.95),
    strongText: tokens.text,
  };
}

export function getThemeCssVariables(theme) {
  const selectedTheme = getThemeByKey(theme?.key || theme);
  const { tokens } = selectedTheme;
  const nav = buildNavPalette(selectedTheme);

  return {
    "--theme-background": tokens.background,
    "--theme-surface": tokens.surface,
    "--theme-card": tokens.card,
    "--theme-card-alt": tokens.cardAlt,
    "--theme-primary": tokens.primary,
    "--theme-secondary": tokens.secondary,
    "--theme-accent": tokens.accent,
    "--theme-danger": tokens.danger,
    "--theme-success": tokens.success,
    "--theme-warning": tokens.warning,
    "--theme-text": tokens.text,
    "--theme-muted-text": tokens.mutedText,
    "--theme-border": tokens.border,
    "--theme-glow": tokens.glow,
    "--theme-bottom-nav": tokens.bottomNav,
    "--theme-top-nav": tokens.topNav,
    "--theme-gradient-hero": tokens.gradientHero,
    "--theme-gradient-card": tokens.gradientCard,
    "--theme-gradient-expense": tokens.gradientExpense,
    "--theme-gradient-money": tokens.gradientMoney,
    "--theme-gradient-emergency": tokens.gradientEmergency,
    "--theme-nav-accent": nav.accent,
    "--theme-nav-accent-end": nav.accentEnd,
    "--theme-nav-accent-soft": nav.accentSoft,
    "--theme-nav-accent-border": nav.accentBorder,
    "--theme-nav-accent-glow": nav.accentGlow,
    "--theme-nav-shell-start": nav.shellStart,
    "--theme-nav-shell-end": nav.shellEnd,
    "--theme-nav-glow-from": nav.surfaceGlowFrom,
    "--theme-nav-glow-mid": nav.surfaceGlowMid,
    "--theme-nav-glow-to": nav.surfaceGlowTo,
    "--theme-nav-panel-start": nav.panelStart,
    "--theme-nav-panel-end": nav.panelEnd,
    "--theme-nav-panel-border": nav.panelBorder,
    "--theme-nav-fab-ring": nav.fabRing,
    "--background": hexToHslString(tokens.background),
    "--foreground": hexToHslString(tokens.text),
    "--card": hexToHslString(tokens.card),
    "--card-foreground": hexToHslString(tokens.text),
    "--popover": hexToHslString(tokens.cardAlt),
    "--popover-foreground": hexToHslString(tokens.text),
    "--primary": hexToHslString(tokens.primary),
    "--primary-foreground": hexToHslString(tokens.text),
    "--secondary": hexToHslString(tokens.secondary),
    "--secondary-foreground": hexToHslString(tokens.text),
    "--muted": hexToHslString(tokens.surface),
    "--muted-foreground": hexToHslString(tokens.mutedText),
    "--accent": hexToHslString(tokens.accent),
    "--accent-foreground": hexToHslString(tokens.text),
    "--destructive": hexToHslString(tokens.danger),
    "--destructive-foreground": hexToHslString(tokens.text),
    "--border": hexToHslString(tokens.border),
    "--input": hexToHslString(tokens.cardAlt),
    "--ring": hexToHslString(tokens.glow),
  };
}

export { CATEGORY_LABELS, CATEGORY_ORDER, DEFAULT_THEME_KEY, GLOBAL_THEME_STORAGE_KEY };
