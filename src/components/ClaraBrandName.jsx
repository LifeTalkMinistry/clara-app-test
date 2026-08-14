const CLARA_BRAND_LETTERS = [
  { char: "C", color: "#4d8cff" },
  { char: "L", color: "#4d8cff" },
  { char: "A", color: "#ffd42f" },
  { char: "R", color: "#ff4d55" },
  { char: "A", color: "#ff4d55" },
];

export default function ClaraBrandName({ className = "" }) {
  return (
    <span
      className={className}
      aria-label="CLARA"
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        font: "inherit",
        fontWeight: "inherit",
        letterSpacing: "inherit",
      }}
    >
      {CLARA_BRAND_LETTERS.map(({ char, color }, index) => (
        <span key={`${char}-${index}`} aria-hidden="true" style={{ color }}>
          {char}
        </span>
      ))}
    </span>
  );
}
