import "server-only";
import path from "node:path";
import fs from "node:fs";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * PostgreSQL es la fuente de verdad (ADR-002).
 * - Con DATABASE_URL → node-postgres.
 * - Sin DATABASE_URL → PGlite (Postgres embebido, persistido en .data/pglite) para correr la demo sin setup.
 * Ambos comparten schema y migraciones.
 */
export type DB = NodePgDatabase<typeof schema>;

type DbState = { db: DB; ready: Promise<void>; close: () => Promise<void> };

const globalForDb = globalThis as unknown as { __educaiDb?: Promise<DbState> };

const MIGRATIONS_FOLDER = path.join(process.cwd(), "src", "db", "migrations");

async function createDb(): Promise<DbState> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url, max: 10 });
    const db = drizzle(pool, { schema });
    const ready = migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return { db, ready, close: () => pool.end() };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const memory = dataDir === "memory";
  if (!memory) fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(memory ? undefined : dataDir, { relaxedDurability: true });
  const db = drizzle(client, { schema }) as unknown as DB;
  const ready = migrate(drizzle(client, { schema }), { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, ready, close: () => client.close() };
}

async function init(): Promise<DbState> {
  const state = await createDb();
  await state.ready;
  const { ensureSeeded } = await import("./seed/ensure");
  await ensureSeeded(state.db);
  return state;
}

export async function getDb(): Promise<DB> {
  if (!globalForDb.__educaiDb) {
    globalForDb.__educaiDb = init().catch((err) => {
      globalForDb.__educaiDb = undefined;
      throw err;
    });
  }
  return (await globalForDb.__educaiDb).db;
}

/** Solo para tests/scripts. */
export async function closeDb(): Promise<void> {
  const s = await globalForDb.__educaiDb;
  globalForDb.__educaiDb = undefined;
  await s?.close();
}
