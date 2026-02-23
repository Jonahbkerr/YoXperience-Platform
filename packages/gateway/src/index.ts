import { createApp } from "./app.js";
import { startWorker } from "./worker/scheduler.js";

const PORT = parseInt(process.env.GATEWAY_PORT || "3457", 10);

const app = createApp();

app.listen(PORT, () => {
  console.log(`[gateway] listening on http://localhost:${PORT}`);
  startWorker();
});
