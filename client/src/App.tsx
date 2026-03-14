import { useEffect, useState } from "react";
import { TownCanvas } from "./TownCanvas";

export function App() {
  const [status, setStatus] = useState<string>("loading...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("server offline"));
  }, []);

  return (
    <div style={{ background: "#111", minHeight: "100vh", padding: "20px 0" }}>
      <h1
        style={{
          textAlign: "center",
          color: "#e0e0e0",
          fontFamily: "monospace",
          fontSize: "1.5rem",
          marginBottom: "16px",
        }}
      >
        Gas Town Visualizer
      </h1>
      <TownCanvas />
      <p
        style={{
          textAlign: "center",
          color: "#888",
          fontFamily: "monospace",
          fontSize: "0.75rem",
          marginTop: "12px",
        }}
      >
        Server: {status}
      </p>
    </div>
  );
}
