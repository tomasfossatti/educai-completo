# Educai

Repositorio principal de **Educai**.

Educai es un sistema adaptativo de aprendizaje y diseño pedagógico que convierte experiencias educativas reales en evidencia, interpreta esa evidencia y utiliza el resultado para decidir la siguiente mejor acción del estudiante y la siguiente mejor intervención del docente.

## MVP demostrable

El repositorio incluye un MVP que recorre el loop completo con datos calculados por los motores:

```text
experiencia → evidencia → interpretación → recomendación → nueva experiencia
```

- **Docente.** Ve qué necesita su aula (por ejemplo, "44 % necesita revisar Product Owner vs. Scrum Master"), entiende por qué Educai lo detectó con evidencia anónima, genera y lanza una experiencia, y ve el efecto agregado.
- **Estudiante.** Ve su próximo paso, resuelve la experiencia, recibe feedback y ve cómo cambia su estado y su recomendación.

**Guía para presentarlo:** [docs/demo/Guion_Demo_MVP.md](docs/demo/Guion_Demo_MVP.md) (10 a 15 minutos).

### Requisitos

- Node.js 22 o superior.
- pnpm 10 (`corepack enable` lo activa).

No hace falta Docker ni una base de datos externa.

### Levantar la app

```bash
pnpm install
pnpm dev
```

Abrí <http://localhost:3000>. El primer arranque crea la base, corre las migraciones y siembra el escenario demo (unos 25 segundos). Después entrás con uno de los usuarios demo desde `/entrar`:

| Usuario | Rol | Para qué sirve |
|---|---|---|
| Ana Torres | Docente | Cátedra *Innovación de Procesos y Diseño de Proyectos*, 36 estudiantes, clase 4 de 11 |
| Lucía Fernández | Estudiante | Protagonista: explica bien los roles de Scrum pero se confunde al aplicarlos |
| Nicolás Herrera | Estudiante | Mismo curso, otro momento: su próximo paso es transferir lo aprendido |

**Reiniciar demo** (en `/entrar`) o `pnpm db:reset` recrea el escenario desde cero.

### Configuración

Copiá `.env.example` a `.env` si necesitás cambiar algo. Todas las variables son opcionales para correr la demo.

| Variable | Efecto |
|---|---|
| `DATABASE_URL` | Usa ese PostgreSQL en lugar de PGlite (`./.data/pglite`). Mismo schema y migraciones. |
| `ANTHROPIC_API_KEY` | Activa la IA. Sin key, cada tarea usa su fallback determinista y la demo funciona completa. |
| `EDUCAI_MODEL` | Cambia el modelo de las tareas de IA. |
| `EDUCAI_AI=off` | Fuerza el modo sin IA aunque haya key. |
| `DEMO_MODE` | `true` por defecto. Habilita "Reiniciar demo" y "Simular participación del aula". |
| `SESSION_SECRET` | Firma de la cookie de sesión demo. Cambiala en cualquier despliegue compartido. |
| `APP_BASE_URL` | URL de los links y QR. Para que un celular entre por QR: `pnpm dev -H 0.0.0.0` y `APP_BASE_URL=http://<IP-de-tu-compu>:3000`. |

Con IA activa se suman:

- la conversación libre del tutor;
- la evaluación semántica de explicaciones;
- la generación de experiencias para cualquier capacidad;
- una extracción curricular más fina a partir del programa.

### Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build && pnpm start` | Build y servidor de producción |
| `pnpm typecheck`, `pnpm lint` | Tipos y lint |
| `pnpm test` | Tests unitarios y de contrato (Vitest con PGlite en memoria) |
| `pnpm test:e2e` | Guion de demo completo en el navegador (Playwright). Levanta su propio servidor en el puerto 3100 con una base aparte (`.data/e2e`). |
| `pnpm db:reset` | Recrea el escenario demo |
| `pnpm db:generate` | Genera una migración nueva a partir del schema de Drizzle |

### Cómo está armado

Es un monolito modular en una sola app Next.js:

| Ruta | Contenido |
|---|---|
| `src/app/` | Pantallas de estudiante (`/estudiante`) y docente (`/docente`), deep links de QR (`/x/[code]`) y API REST (`/api/v1`) |
| `src/modules/` | Un módulo por bounded context: `evidence`, `interpretation`, `recommendation`, `teacher-projection`, `experience`, `tutor`, `sources`, `curriculum`, `academic`, `identity`, `ai-gateway`, `demo`. Los motores son funciones puras con parámetros versionados y los servicios alrededor leen y escriben en la base. |
| `src/db/` | Schema de Drizzle, migraciones y seed del escenario demo. El seed pasa por el pipeline real. |
| `src/ui/` | Componentes del design system |
| `tests/` | Golden tests de los motores, contratos (loop central, privacidad docente, aislamiento entre cátedras, borrado de fuentes, importación) y el e2e del guion |

Las decisiones que se apartan de la arquitectura de referencia están en [docs/implementation/MVP_Demo_Decisions.md](docs/implementation/MVP_Demo_Decisions.md).

## Empezar por acá

Para retomar el proyecto desde otro chat o con un agente de código:

1. [docs/00-START-HERE.md](docs/00-START-HERE.md)
2. [AGENTS.md](AGENTS.md)
3. [docs/implementation/Implementation_Backlog_v1.0.md](docs/implementation/Implementation_Backlog_v1.0.md)
4. [docs/implementation/MVP_Demo_Decisions.md](docs/implementation/MVP_Demo_Decisions.md)

## Documentación canónica

### Producto
- [PRD Maestro](docs/product/PRD_Maestro_v1.0.md)
- [Onboarding de autodescubrimiento](docs/product/Onboarding_Autodescubrimiento_v2.md)

### Motores
- [Modelo Curricular + Evidence Engine](docs/engines/Curriculum_Model_Evidence_Engine_v1.0.md)
- [Interpretation Engine](docs/engines/Interpretation_Engine_v1.0.md)
- [Recommendation Engine](docs/engines/Recommendation_Engine_v1.0.md)
- [Experience Engine / Runtime](docs/engines/Experience_Engine_Runtime_v1.0.md)

### Arquitectura
- [Technical Architecture](docs/architecture/Technical_Architecture_v1.0.md)

### Contratos de implementación
- [Data Model & Database Schema](docs/implementation/Data_Model_Database_Schema_v1.0.md)
- [API & Event Contracts](docs/implementation/API_Event_Contracts_v1.0.md)
- [UX/UI Screen & State Specification](docs/implementation/UX_UI_Screen_State_Spec_v1.0.md)
- [Implementation Backlog](docs/implementation/Implementation_Backlog_v1.0.md)

### MVP
- [Decisiones del MVP demostrable](docs/implementation/MVP_Demo_Decisions.md)
- [Guion de demo](docs/demo/Guion_Demo_MVP.md)

## Regla para agentes de código

No redefinir producto, privacidad, evidencia, estados académicos ni contratos técnicos durante la implementación. Si existe ambigüedad, consultar los documentos versionados en `docs/` y dejar explícita la decisión pendiente en lugar de inventarla.

## Estado actual

- **Producto, motores, arquitectura y contratos:** definidos.
- **MVP:** implementado. Cubre el loop central de punta a punta, las vistas de estudiante y docente, la creación de cátedra desde un programa, el tutor, la importación de conversaciones y el borrado de fuentes con recálculo.

**Siguiente fase:** llevar el MVP hacia la arquitectura de referencia según el backlog. Prioridades:

- workers asíncronos y outbox con consumidores;
- runtime aislado para experiencias con código;
- autenticación institucional;
- eval cases de las tareas de IA.
