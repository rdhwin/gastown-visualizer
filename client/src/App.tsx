import { useEffect, useState } from "react";

export function App() {
  const [status, setStatus] = useState<string>("loading...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("server offline"));
  }, []);

  return (
    <div>
      <h1>Gas Town Visualizer</h1>
      <p>Server: {status}</p>
    </div>
  );
}
