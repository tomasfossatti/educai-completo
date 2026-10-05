"use client";

/**
 * Experience SDK v1 mínimo (EDU-0904): getContext viene del servidor; acá viven
 * events.emit (con secuencia + idempotencia + reintentos), requestHint y complete.
 * El SDK no puede elegir estudiante ni cátedra: los agrega el servidor (API:849-856).
 */

export type EventResult =
  | { event_id: string; type: "hint"; stepId: string; hint: string; hintsUsed: number }
  | { event_id: string; type: "feedback"; stepId: string; correct: boolean; feedback: string; takeaway: string; correctOptionId: string; correctText: string }
  | { event_id: string; type: "ack" };

export class ExperienceSDK {
  private seq: number;
  constructor(
    private sessionId: string,
    lastSequenceNo: number,
  ) {
    this.seq = lastSequenceNo + 1;
  }

  async emit(eventType: string, opts: { stepId?: string; opportunityId?: string; payload?: Record<string, unknown> } = {}): Promise<EventResult | null> {
    const event = {
      event_id: `${this.sessionId.slice(0, 8)}-${crypto.randomUUID()}`,
      sequence_no: this.seq++,
      event_type: eventType,
      step_id: opts.stepId ?? null,
      opportunity_id: opts.opportunityId ?? null,
      occurred_at: new Date().toISOString(),
      schema_version: "1.0",
      payload: opts.payload ?? {},
    };
    const body = JSON.stringify({ session_id: this.sessionId, batch_id: `b-${event.event_id}`, sdk_version: "1.0.0", events: [event] });
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch("/api/v1/runtime/event-batches", { method: "POST", headers: { "content-type": "application/json" }, body });
        if (r.status === 401) throw new Error("auth");
        if (!r.ok && r.status >= 500) throw new Error(`http ${r.status}`);
        const data = (await r.json()) as { results?: EventResult[]; error?: { message: string } };
        if (data.error) throw new Error(data.error.message);
        return data.results?.find((x) => x.event_id === event.event_id) ?? null;
      } catch (e) {
        lastError = e;
        await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("No pudimos guardar el evento.");
  }

  async complete() {
    const r = await fetch(`/api/v1/runtime/sessions/${this.sessionId}/complete`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message ?? "No pudimos cerrar la actividad.");
    return data;
  }
}
