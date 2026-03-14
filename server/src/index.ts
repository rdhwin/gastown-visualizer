import express from "express";
import { getState, startPolling } from "./poller.js";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/state", (_req, res) => {
  res.json(getState());
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  startPolling();
});
