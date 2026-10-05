/** Errores de dominio con código estable (envelope de API_Event_Contracts §3). */
export class DomainError extends Error {
  constructor(
    public code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "UNAVAILABLE",
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
  get status() {
    return { NOT_FOUND: 404, FORBIDDEN: 403, VALIDATION: 422, CONFLICT: 409, UNAVAILABLE: 503 }[this.code];
  }
}

export const notFound = (what = "Recurso") => new DomainError("NOT_FOUND", `${what} no encontrado`);
