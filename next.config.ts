import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite trae binarios WASM y el driver pg usa módulos nativos opcionales:
  // se cargan desde node_modules en runtime, sin bundlear.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "unpdf"],
  poweredByHeader: false,
  typedRoutes: false,
};

export default nextConfig;
