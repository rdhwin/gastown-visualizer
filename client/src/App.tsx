import { useEffect, useState, useCallback } from "react";
import { TownCanvas } from "./TownCanvas";
import { InspectPanel, SelectedEntity, ApiData } from "./InspectPanel";

const POLL_INTERVAL_MS = 5000;

export function App() {
  const [status, setStatus] = useState<string>("loading...");
  const [selected, setSelected] = useState<SelectedEntity | null>(null);
  const [apiData, setApiData] = useState<ApiData>({
    polecats: [],
    beads: [],
    rigs: [],
  });

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("server offline"));
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) return;
      const data = await res.json();
      setApiData({
        polecats: Array.isArray(data.polecats) ? data.polecats : [],
        beads: Array.isArray(data.beads) ? data.beads : [],
        rigs: Array.isArray(data.rigs) ? data.rigs : [],
      });
    } catch {
      // Silently retry next interval
    }
  }, []);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchState]);

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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
          padding: "0 16px",
        }}
      >
        <TownCanvas
          polecats={apiData.polecats}
          onSelect={setSelected}
          selected={selected}
        />
        <InspectPanel selected={selected} apiData={apiData} />
      </div>
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
