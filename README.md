# Educai

Repositorio principal de **Educai**.

Educai es un sistema adaptativo de aprendizaje y diseño pedagógico que convierte experiencias educativas reales en evidencia, interpreta esa evidencia y utiliza el resultado para decidir la siguiente mejor acción del estudiante y la siguiente mejor intervención del docente.

## Empezar por acá

Para retomar el proyecto desde otro chat o con un agente de código:

1. [docs/00-START-HERE.md](docs/00-START-HERE.md)
2. [AGENTS.md](AGENTS.md)
3. [docs/implementation/Implementation_Backlog_v1.0.md](docs/implementation/Implementation_Backlog_v1.0.md)

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

## Regla para agentes de código

No redefinir producto, privacidad, evidencia, estados académicos ni contratos técnicos durante la implementación. Si existe ambigüedad, consultar los documentos versionados en `docs/` y dejar explícita la decisión pendiente en lugar de inventarla.

## Estado actual

Producto, motores, arquitectura y contratos principales definidos.

**Siguiente fase:** implementación desde Foundations y primer vertical slice end-to-end.

Prompt sugerido para un chat nuevo:

> Trabajá sobre el repositorio `tomasfossatti/educai-completo`. Leé primero `docs/00-START-HERE.md` y `AGENTS.md`, después `docs/implementation/Implementation_Backlog_v1.0.md`. Tomá los documentos versionados del repo como fuente de verdad y empezá por la siguiente story P0 no implementada. No redefinas decisiones de producto salvo contradicción explícita.
