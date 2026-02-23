import { db } from "../db/client.js";
import { telemetryEvents } from "../db/schema.js";

interface TelemetryEvent {
  slotKey: string;
  variant: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export async function writeTelemetryEvents(
  projectId: string,
  endUserId: string,
  events: TelemetryEvent[]
): Promise<number> {
  if (events.length === 0) return 0;

  const rows = events.map((evt) => ({
    projectId,
    endUserId,
    slotKey: evt.slotKey,
    variant: evt.variant,
    eventType: evt.eventType,
    metadata: evt.metadata ? JSON.stringify(evt.metadata) : null,
  }));

  await db.insert(telemetryEvents).values(rows);
  return rows.length;
}
