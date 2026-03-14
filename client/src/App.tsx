import { useEffect, useState, useRef, useCallback } from "react";
import { TownCanvas } from "./TownCanvas";
import { InspectPanel, SelectedEntity, ApiData } from "./InspectPanel";

const RECONNECT_DELAY_MS = 3000;

function parseApiData(data: Record<string, unknown>): ApiData {
  return {
    polecats: Array.isArray(data.polecats) ? data.polecats : [],
    beads: Array.isArray(data.beads) ? data.beads : [],
    rigs: Array.isArray(data.rigs) ? data.rigs : [],
  };
}

export function App() {
  const [status, setStatus] = useState<string>("connecting...");
  const [selected, setSelected] = useState<SelectedEntity | null>(null);
  const [apiData, setApiData] = useState<ApiData>({
    polecats: [],
    beads: [],
    rigs: [],
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("ok");

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setApiData(parseApiData(data));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setStatus("reconnecting...");
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

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
