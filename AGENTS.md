# AGENTS.md

This repository is the canonical implementation workspace for **Educai**.

## Mandatory reading before coding

Read, in this order:

1. `docs/00-START-HERE.md`
2. `docs/implementation/Implementation_Backlog_v1.0.md`
3. The relevant domain spec for the story being implemented
4. `docs/architecture/Technical_Architecture_v1.0.md`
5. `docs/implementation/Data_Model_Database_Schema_v1.0.md`
6. `docs/implementation/API_Event_Contracts_v1.0.md`
7. `docs/implementation/UX_UI_Screen_State_Spec_v1.0.md` when UI is involved

## Working rule

Implement one backlog story or one coherent vertical slice at a time.

Do not silently redesign product decisions while coding.

If documents conflict:
- stop at the conflicting decision;
- identify the conflict explicitly;
- prefer the more specific and more recent canonical specification;
- do not invent a third interpretation.

## Hard product invariants

### Academic isolation

Academic evidence, interpretations and states are isolated by `course_section_id`.

A student's global profile may personalize context across subjects, but academic state from one course section must never be used as academic evidence in another.

### Teacher privacy boundary

Teacher-facing APIs must be aggregate-only where academic evidence is concerned.

Never expose to a teacher:
- student identity associated with errors;
- individual academic evidence;
- private projects;
- individual professional profiles;
- identified AI conversations.

Do not rely only on frontend hiding. Enforce this in backend contracts and authorization.

### Evidence lineage

Preserve:

```text
SourceArtifact
→ RawInteraction
→ EvidenceEvent
→ EvidenceSignal
→ CapabilityInterpretation
→ Recommendation
```

Never collapse these layers into a single LLM output.

### Declared is not observed

Do not use:
- self-report;
- interest;
- preference;
- time on task;
- AI-generated answer;

as direct proof of academic capability.

### Generated experiences

Generated experience code:
- cannot access production DB directly;
- cannot receive production secrets;
- cannot arbitrarily fetch external URLs;
- must use the restricted Experience SDK;
- must run on the isolated runtime origin;
- must emit schema-valid events;
- must pass contract/security/accessibility tests before publication.

### Source deletion

Deleting/invalidation of a source must propagate through derived evidence, interpretation and recommendations.

## Engineering expectations

Every core feature should include, when applicable:

- schema/contract;
- authorization;
- validation;
- migration;
- domain tests;
- API/contract tests;
- observability;
- product analytics;
- error states;
- retry/idempotency;
- documentation.

AI features additionally need:

- task identifier;
- prompt/model version;
- structured-output schema validation;
- eval cases;
- cost telemetry;
- retry/timeout/fallback.

Runtime features additionally need:

- instrumentation completeness;
- sandbox/security review;
- accessibility checks;
- contract tests.

## Architecture

Current v1 architecture:

> **core modular monolith + asynchronous workers + PostgreSQL as source of truth + isolated generated-experience runtime**

Do not split the core into microservices without a demonstrated operational need.

## Current implementation status

At the time this file was added, product code had not yet been implemented.

Begin from the first applicable P0 story in the backlog and preserve the documented build order.
