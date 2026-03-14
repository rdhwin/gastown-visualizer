import { createServer } from "node:http";
import express from "express";
import { WebSocketServer } from "ws";
import { getState, startPolling, onStateChange } from "./poller.js";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/state", (_req, res) => {
  res.json(getState());
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  // Send current state immediately on connect
  ws.send(JSON.stringify(getState()));
});

onStateChange((state) => {
  const payload = JSON.stringify(state);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  startPolling();
});
