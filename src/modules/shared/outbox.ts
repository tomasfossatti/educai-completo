import "server-only";
import type { DB } from "@/db/client";
import { outboxEvents, productAnalyticsEvents } from "@/db/schema";

/**
 * Registro de eventos de dominio (envelope de API_Event_Contracts §5).
 * En el MVP la cadena se procesa en proceso, así que el evento queda publicado al registrarse;
 * la tabla conserva el log auditable y permite migrar a un dispatcher con cola sin cambiar contratos.
 */
export async function emit(
  db: DB,
  e: {
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    courseSectionId?: string | null;
    correlationId?: string;
    payload?: Record<string, unknown>;
  },
) {
  await db.insert(outboxEvents).values({
    eventType: e.eventType,
    aggregateType: e.aggregateType,
    aggregateId: e.aggregateId,
    courseSectionId: e.courseSectionId ?? null,
    correlationId: e.correlationId ?? null,
    payload: e.payload ?? {},
    publishedAt: new Date(),
  });
}

/** Analytics de producto: separado de runtime events y nunca promovido a evidencia (TA:3618-3626). */
export async function track(
  db: DB,
  eventName: string,
  props: { userId?: string | null; courseSectionId?: string | null; properties?: Record<string, unknown> } = {},
) {
  try {
    await db.insert(productAnalyticsEvents).values({
      eventName,
      userId: props.userId ?? null,
      courseSectionId: props.courseSectionId ?? null,
      properties: props.properties ?? {},
    });
  } catch {
    // La analítica nunca debe romper un flujo de usuario.
  }
}
