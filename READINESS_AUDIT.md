# TrackLab Readiness Audit

## Scope

This review covers persisted research records, UI states, result ingestion, owner notifications, and external dependencies. It does not claim that a real particle-tracking model has been trained or evaluated.

## Verified findings

| Area | Verification | Outcome |
| --- | --- | --- |
| Database-backed research records | A database count query found zero experiments, datasets, model configurations, runs, metrics, track points, findings, and report exports. | No seeded, mock, or fabricated research records are persisted. |
| Dataset inputs | Upload code accepts only CSV, JSON, and HDF5; it stores the user-provided file and a derived preview. | No synthetic research dataset is created by the platform. |
| Results and track views | The UI reads only run metrics and track points persisted through the result-ingestion path. Empty states are shown when no real payload is available. | No fabricated accuracy, efficiency, fake rate, or reconstructed trajectory is displayed. |
| Hugging Face results | A completed remote job is ingested only from a valid `TRACKLAB_RESULT` manifest in Hugging Face Job logs. Empty manifests are rejected and later refreshes retry while there is no stored result. | No remote output is invented; a valid actual output is required. |
| Model guidance | `jpata/particleflow` is displayed as a linked public HEP reconstruction reference only. It is neither preselected nor executed automatically. | No unsupported model execution configuration is assumed. |
| Owner notifications | Terminal run paths invoke the built-in owner alert helper and a Resend-compatible server-side email adapter with a metrics summary when available. | Built-in alert fallback and credential-ready external-email code are verified; a real provider delivery still requires owner-authorized sender settings. |
| Run launch | The client shows a review of the selected dataset, versioned configuration, run type, initial queued state, and hosted-execution boundary. Explicit acknowledgement is required before the existing server trigger is invoked. | Researchers cannot queue a selected run by accidentally submitting the form; the approved four-status lifecycle remains unchanged. |
| Findings and exports | The findings editor announces saved versus unsaved edits, warns only on browser exit while edits are dirty, and disables Markdown/PDF export until edits are saved. The export handler enforces the same guard. | Research reports remain traceable to the stored findings record rather than an unsaved browser draft. |
| Partial metrics | Result charts and tables filter absent or invalid metric values instead of coercing them to `0`. A dedicated empty state explains when no numeric evidence was returned. | Missing accuracy, efficiency, or fake rate is never represented as fabricated zero-valued evidence. |

## Verified production dependency baseline

The production dependency review upgraded the affected PostCSS, Axios, Drizzle ORM, AWS S3 client/presigner, tRPC, Streamdown/Markdown parser, Express routing, NanoID, and Recharts paths. The resulting lockfile resolves **PostCSS 8.5.26**, **Axios 1.18.0**, **Drizzle ORM 0.45.2**, **AWS S3 client and presigner 3.1117.0**, **tRPC 11.8.0**, **Streamdown 2.6.0**, **mdast-util-to-hast 13.2.1**, **Express 5.2.1**, **NanoID 5.1.16**, and **Recharts 3.10.1**. Each remediation was checked with an offline frozen-lockfile install, the automated regression suite, TypeScript, and a capped production build.

The final `pnpm audit --prod --json` check exits cleanly. This dependency result is intentionally separate from provider activation: it does not claim that Hugging Face execution, dedicated outbound email, or populated real-data workflow reviews have occurred. Those require the owner-authorized settings and researcher-created inputs described below.

## Remaining private dependencies

| Dependency | Why it is required | Current state |
| --- | --- | --- |
| `HF_TOKEN` | Resolves the Hugging Face namespace, submits Jobs, inspects status, and reads Job logs. | Must be supplied by the account owner; it is never exposed to the browser or server diagnostics. |
| Runnable model image and command | Particle tracking requires detector- and model-specific execution code. | Must be supplied in `_huggingFaceJob`; the platform does not invent a container or training command. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `TRACKLAB_OWNER_EMAIL` | Dedicated transactional delivery requires an account-owned API key, a provider-verified sender, and an authorized recipient. | Not configured; the adapter safely skips delivery and built-in owner alerts remain the operational channel. |

## Completion boundary

The platform is ready for authenticated research data management, configuration, reporting, visual analysis, and real-result ingestion once a valid source exists. Real Hugging Face training/inference and dedicated outbound email cannot be truthfully tested until the owner authorizes those external services. Likewise, populated workflow visual review is intentionally deferred until a researcher creates real experiment inputs; this audit does not authorize seed data solely to fill a demonstration state.
