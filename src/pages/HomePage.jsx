import StatCard from "../components/StatCard.jsx";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#081018",
        color: "white",
        padding: "24px",
      }}
    >
      <h1 style={{ color: "#facc15", fontSize: "32px", marginBottom: "20px" }}>
        CLARA Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard title="Income" value="₱0.00" />
        <StatCard title="Expenses" value="₱0.00" />
        <StatCard title="Savings" value="₱0.00" />
      </div>
    </div>
  );
}