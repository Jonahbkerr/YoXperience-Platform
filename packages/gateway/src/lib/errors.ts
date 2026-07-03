/**
 * Format any thrown value for logging. Errors from fetch/pg often have an
 * empty .message — include name, cause, and the top stack frame so worker
 * logs are never blank.
 */
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const parts = [err.message || err.name || "unknown error"];
  if (err.cause) {
    parts.push(
      `cause: ${err.cause instanceof Error ? err.cause.message || err.cause.name : String(err.cause)}`
    );
  }
  const at = err.stack?.split("\n")[1]?.trim();
  if (at) parts.push(at);
  return parts.join(" | ");
}
