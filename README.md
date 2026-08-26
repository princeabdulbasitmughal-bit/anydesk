# TrackLab

TrackLab is an authenticated research workspace for **high-energy particle-track reconstruction**. It provides an evidence-preserving workflow for managing experiments, accepting research datasets, recording model configurations, monitoring training or inference runs, visualizing actual reconstructed tracks, and exporting research findings.

> TrackLab is a research-management platform. It does **not** invent datasets, trained models, metrics, track points, or scientific conclusions. Results appear only after an authorized researcher supplies data or a configured remote job returns a validated result payload.

## Verified platform capabilities

| Research workflow | TrackLab behavior |
| --- | --- |
| Access control | Manus OAuth authentication with researcher and administrator authorization boundaries. |
| Experiment management | Researchers can create and select experiments as the organizing context for all records. |
| Dataset intake | The server accepts **CSV, JSON, and HDF5 only**, enforcing a **25 MiB** maximum; user-provided files are stored in managed object storage. |
| Model configuration | Model identifiers and versioned hyperparameter JSON can record model revision, dataset revision, random seed, execution image, and command for reproducibility. |
| Experiment protocols | Researchers can create append-only, experiment-scoped revisions containing their own objective, detector context, evaluation plan, and acceptance criteria before execution. |
| Run management | Training and inference runs use exactly four states: `queued`, `running`, `completed`, and `failed`; new runs require an explicitly selected, owned protocol revision and retain that immutable reference. |
| Analysis | Results display persisted accuracy, efficiency, and fake-rate metrics; 2D and 3D viewers display only persisted reconstructed track points. |
| Findings and exports | Experiment findings support Markdown authoring with Markdown and PDF export only. |
| Research assistant | The assistant is grounded in the authenticated user's stored experiment context. |
| Operational alerts | Terminal run outcomes invoke the built-in owner-alert pathway. A Resend-compatible dedicated email adapter is prepared but activates only with owner-authorized settings. |

## Research integrity and data boundaries

TrackLab applies input and authorization checks at the server boundary. The browser provides early format, size, JSON-syntax, and run-prerequisite feedback, while the server remains authoritative for dataset limits, role access, storage, and persistence. Empty research states remain empty until real records are added; no demo metrics, tracks, reports, or findings are seeded.

Remote results require an actual `TRACKLAB_RESULT=<base64-json>` manifest from a configured Hugging Face Job log. The validated payload may contain accuracy, efficiency, fake rate, optional metric metadata, and ordered reconstructed points. Missing or malformed remote payloads are not filled with placeholders. See the [Hugging Face execution runbook](./HUGGING_FACE_RUNBOOK.md) and [readiness audit](./READINESS_AUDIT.md) for the exact handoff and verification boundary.

## Workspace architecture

| Layer | Primary responsibility |
| --- | --- |
| `client/src/` | React research workspace, dashboard shell, protected routes, accessible forms, and scientific visualizations. |
| `server/research/` | tRPC research procedures, authorization enforcement, validation, Hugging Face status synchronization, result ingestion, reports, and notifications. |
| `shared/` | Browser and server input rules, research contracts, and route-specific experiment guidance. |
| `drizzle/` | MySQL/TiDB schema for experiments, protocol revisions, datasets, model configurations, runs, metrics, track points, findings, and report exports. |
| Managed object storage | Stores uploaded datasets, returned model artifacts, and generated report files; relational records store their metadata and references. |

## Local development and validation

Install the locked dependencies, then start the development server. The project uses React, TypeScript, Tailwind CSS, Express, tRPC, Drizzle ORM, and MySQL/TiDB.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Before a release or handoff, run all three validation commands:

```bash
pnpm test
pnpm check
pnpm build
```

The automated suite exercises the critical contracts for authorization, dataset restrictions, model configuration, run lifecycle, remote-result ingestion, terminal notifications, and user-safe recovery behavior. The production build verifies the route-splitting strategy that keeps the command center eager while loading heavier research views only when needed.

## Activating optional external execution

The local research workflow, record management, visual analysis, and reporting are available without external provider credentials. **Live hosted execution and dedicated email delivery are intentionally disabled until their account owner authorizes the relevant services.**

| Capability | Required private settings | Activation condition |
| --- | --- | --- |
| Hugging Face Jobs | `HF_TOKEN` | The token must authorize the owner's namespace to create, inspect, and manage Jobs. A selected model configuration must also include a detector-specific image and execution command under `_huggingFaceJob`. |
| Dedicated terminal-run email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TRACKLAB_OWNER_EMAIL` | The sending address must be provider-verified and the recipient must be owner-authorized. Without all settings, the adapter safely skips delivery while owner alerts remain available. |

No token, provider key, authorization header, or verified sender value is committed to the repository, returned to the browser, or surfaced by diagnostic output. Provider-specific activation details are documented in the [Hugging Face execution runbook](./HUGGING_FACE_RUNBOOK.md).

## Project documentation

| Document | Purpose |
| --- | --- |
| [Hugging Face execution runbook](./HUGGING_FACE_RUNBOOK.md) | Single-token activation, job contract, status mapping, result handoff, and dedicated-email boundary. |
| [Readiness audit](./READINESS_AUDIT.md) | No-fabrication review and external-dependency boundary. |
| [Experiment Protocols](./EXPERIMENT_PROTOCOLS.md) | Pre-execution versioning model and evidence boundary for researcher-authored protocols. |
| [Particleflow reference revalidation](./MODEL_REFERENCE_REVALIDATION.md) | Dated public-source validation that keeps the cited reconstruction repository as a research reference rather than an assumed execution setup. |
| [Operational readiness audit](./OPERATIONAL_READINESS_AUDIT.md) | Secret-free researcher-facing operational-state review. |
| [Quality refinement audit](./QUALITY_REFINEMENT_AUDIT.md) | Scientific usability, clarity, and reliability refinement record. |
| [Accessibility refinement audit](./ACCESSIBILITY_REFINEMENT_AUDIT.md) | Keyboard navigation, focus management, and responsive-accessibility record. |
| [Performance refinement audit](./PERFORMANCE_REFINEMENT_AUDIT.md) | Assistant lazy-loading and initial payload reduction record. |

## References

[1] [Hugging Face Jobs guide](https://huggingface.co/docs/huggingface_hub/en/guides/jobs)

[2] [Hugging Face Jobs API reference](https://huggingface.co/docs/hub/en/jobs-reference)

[3] [Resend Send Email API reference](https://resend.com/docs/api-reference/emails/send-email)
