import { getWorkerColor } from "./renderer/sprites";

export interface SelectedEntity {
  type: "worker" | "building";
  name: string;
}

export interface ApiData {
  polecats: Record<string, unknown>[];
  beads: Record<string, unknown>[];
  rigs: Record<string, unknown>[];
}

interface InspectPanelProps {
  selected: SelectedEntity | null;
  apiData: ApiData;
}

function formatDuration(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "unknown";
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function statusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
    case "running":
    case "in_progress":
      return "#4CAF50";
    case "idle":
      return "#888";
    case "blocked":
      return "#FF5722";
    case "hooked":
      return "#FFD700";
    case "open":
      return "#42A5F5";
    case "closed":
      return "#4CAF50";
    default:
      return "#e0e0e0";
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

function Field({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ marginBottom: "3px", lineHeight: "1.4" }}>
      <span style={{ color: "#888" }}>{label}:</span>{" "}
      <span style={{ color: valueColor ?? "#e0e0e0" }}>{value}</span>
    </div>
  );
}

function WorkerDetails({
  name,
  apiData,
}: {
  name: string;
  apiData: ApiData;
}) {
  const worker = apiData.polecats.find(
    (p) => String(p.name ?? p.id ?? "") === name,
  );

  if (!worker) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>WORKER</div>
        <div style={emptyStyle}>Worker &quot;{name}&quot; not found</div>
      </div>
    );
  }

  const rig = String(worker.rig ?? "unknown");
  const status = String(worker.status ?? "unknown");
  const beadId = worker.bead_id ? String(worker.bead_id) : null;
  const color = getWorkerColor(rig);
  const startedAt = worker.started_at ? String(worker.started_at) : null;

  const bead = beadId
    ? apiData.beads.find((b) => String(b.id ?? "") === beadId)
    : null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ color }}>&#9632;</span> WORKER
      </div>
      <div style={sectionStyle}>
        <Field label="Name" value={name} />
        <Field label="Rig" value={rig} valueColor={color} />
        <Field
          label="Status"
          value={status}
          valueColor={statusColor(status)}
        />
        {startedAt && (
          <Field label="Running" value={formatDuration(startedAt)} />
        )}
      </div>
      {beadId ? (
        <div style={sectionStyle}>
          <div style={subHeaderStyle}>Current Bead</div>
          <Field label="ID" value={beadId} valueColor="#FFD700" />
          {bead && (
            <>
              <Field label="Title" value={String(bead.title ?? "")} />
              <Field label="Type" value={String(bead.type ?? "")} />
              <Field label="Priority" value={`P${bead.priority ?? "?"}`} />
            </>
          )}
        </div>
      ) : (
        <div style={{ ...sectionStyle, color: "#666" }}>No bead assigned</div>
      )}
    </div>
  );
}

function BuildingDetails({
  name,
  apiData,
}: {
  name: string;
  apiData: ApiData;
}) {
  const color = getWorkerColor(name);

  const agents = apiData.polecats.filter((p) => {
    const rig = String(p.rig ?? "").toLowerCase();
    return rig.includes(name.toLowerCase());
  });

  const rigBeads = apiData.beads.filter((b) => {
    const assignee = String(
      b.assignee ?? b.rig ?? b.owner ?? "",
    ).toLowerCase();
    return assignee.includes(name.toLowerCase());
  });

  const openBeads = rigBeads.filter((b) => {
    const s = String(b.status ?? "").toLowerCase();
    return s === "open" || s === "in_progress" || s === "hooked";
  });

  const closedBeads = rigBeads.filter((b) => {
    const s = String(b.status ?? "").toLowerCase();
    return s === "closed";
  });

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ color }}>&#9632;</span> BUILDING
      </div>
      <div style={sectionStyle}>
        <Field label="Rig" value={name} valueColor={color} />
      </div>
      <div style={sectionStyle}>
        <div style={subHeaderStyle}>Agents ({agents.length})</div>
        {agents.length === 0 && (
          <div style={{ color: "#666", fontSize: "0.7rem" }}>
            No agents docked
          </div>
        )}
        {agents.map((a, i) => (
          <div key={i} style={{ marginBottom: "2px", fontSize: "0.7rem" }}>
            <span style={{ color: statusColor(String(a.status ?? "")) }}>
              &#9679;
            </span>{" "}
            {String(a.name ?? a.id ?? "unknown")}
            <span style={{ color: "#666", marginLeft: "8px" }}>
              {String(a.status ?? "")}
            </span>
          </div>
        ))}
      </div>
      <div style={sectionStyle}>
        <div style={subHeaderStyle}>Beads</div>
        <Field
          label="Open"
          value={String(openBeads.length)}
          valueColor="#FFD700"
        />
        <Field
          label="Closed"
          value={String(closedBeads.length)}
          valueColor="#4CAF50"
        />
      </div>
      {closedBeads.length > 0 && (
        <div style={sectionStyle}>
          <div style={subHeaderStyle}>Recent Completions</div>
          {closedBeads.slice(0, 3).map((b, i) => (
            <div
              key={i}
              style={{ marginBottom: "2px", fontSize: "0.7rem", lineHeight: "1.3" }}
            >
              <span style={{ color: "#4CAF50" }}>&#10003;</span>{" "}
              <span style={{ color: "#FFD700" }}>{String(b.id ?? "")}</span>{" "}
              <span style={{ color: "#aaa" }}>
                {truncate(String(b.title ?? ""), 28)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InspectPanel({ selected, apiData }: InspectPanelProps) {
  if (!selected) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>INSPECT</div>
        <div style={emptyStyle}>Click a building or worker to inspect</div>
      </div>
    );
  }

  if (selected.type === "worker") {
    return <WorkerDetails name={selected.name} apiData={apiData} />;
  }

  return <BuildingDetails name={selected.name} apiData={apiData} />;
}

const panelStyle: React.CSSProperties = {
  width: "280px",
  minHeight: "200px",
  background: "#1a1a2e",
  border: "2px solid #333",
  borderRadius: "4px",
  padding: "12px",
  fontFamily: "monospace",
  fontSize: "0.75rem",
  color: "#e0e0e0",
  alignSelf: "flex-start",
};

const headerStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: "bold",
  color: "#e0e0e0",
  borderBottom: "1px solid #333",
  paddingBottom: "8px",
  marginBottom: "8px",
  letterSpacing: "2px",
};

const emptyStyle: React.CSSProperties = {
  color: "#666",
  textAlign: "center",
  padding: "24px 8px",
  fontSize: "0.7rem",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "10px",
  paddingBottom: "8px",
  borderBottom: "1px solid #222",
};

const subHeaderStyle: React.CSSProperties = {
  color: "#888",
  fontSize: "0.7rem",
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "1px",
};
