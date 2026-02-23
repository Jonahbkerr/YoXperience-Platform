import { runAnalysis } from "./analyzer.js";

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startWorker(intervalMs = 10_000) {
  if (intervalId) return;

  console.log(
    `[worker] analyzer started, running every ${intervalMs / 1000}s`
  );

  // Run immediately once
  runAnalysis().catch((err) =>
    console.error("[worker] analyzer error:", err.message)
  );

  intervalId = setInterval(async () => {
    try {
      const result = await runAnalysis();
      if (result.processedCount > 0) {
        console.log(
          `[worker] processed ${result.processedCount} events, updated ${result.updatedPreferences} preferences`
        );
      }
    } catch (err: any) {
      console.error("[worker] analyzer error:", err.message);
    }
  }, intervalMs);
}

export function stopWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[worker] analyzer stopped");
  }
}
