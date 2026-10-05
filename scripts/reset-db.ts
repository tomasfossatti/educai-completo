/**
 * Recrea el escenario demo desde cero (equivale al botón "Reiniciar demo" de /entrar).
 * Uso: pnpm db:reset  (PGlite local o DATABASE_URL)
 */
import { closeDb, getDb } from "@/db/client";
import { resetDemo } from "@/db/seed/ensure";

async function main() {
  // Evita sembrar dos veces cuando la base está vacía: resetDemo ya siembra.
  process.env.EDUCAI_SEED = "off";
  const started = Date.now();
  const db = await getDb();
  await resetDemo(db);
  await closeDb();
  console.log(`[educai] demo reiniciada en ${Date.now() - started} ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
