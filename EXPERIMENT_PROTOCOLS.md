# Experiment Protocols

TrackLab's **Experiment Protocols** workflow records researcher-authored intent before a training or inference run is evaluated. It is an authenticated, experiment-scoped recordkeeping feature; it does not configure remote execution, run a model, infer detector properties, or create scientific evidence.

## Run provenance guard

Before a future run can be queued, the researcher must explicitly select one saved revision from the active experiment. TrackLab stores that selected revision identifier with the run and confirms that the revision belongs to the same authenticated owner and experiment as the selected dataset and model configuration. No protocol revision is selected automatically, and a missing, unowned, or cross-experiment revision prevents queueing.

The evidence-only Reproducibility Ledger records protocol revision identifiers and their run links, but it does not treat a protocol as an execution result or disclose the protocol's authored text in the manifest.

## Stored revision fields

Every saved revision contains the following non-empty, bounded text fields:

| Field | Purpose |
| --- | --- |
| Objective | The research question or reconstruction purpose supplied by the researcher. |
| Detector context | The factual detector, geometry, source, or reconstruction context supplied by the researcher. |
| Evaluation plan | The researcher-specified process for reviewing returned evidence. |
| Acceptance criteria | The pre-specified completion or review criteria supplied by the researcher. |

## Versioning and access boundary

The protocol table is append-only at the application level. Each experiment receives an incrementing revision number; a later save records a new revision instead of replacing an earlier one. List, latest, and save operations are protected by researcher authorization and verify ownership of the selected experiment before reading or writing protocol records.

## Evidence boundary

> A protocol documents planned work. It is **not** a result, an evaluation metric, a detector claim, or an indication that a remote job has run.

TrackLab does not prefill these fields with claims, expected values, model behaviour, or simulated data. The revision history remains empty until a researcher saves real supplied content. Returned metrics, reconstructed tracks, artifacts, and report exports remain governed by their separate validated evidence workflows.
