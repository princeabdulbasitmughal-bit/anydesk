# Route-Aware Research-Gate Audit

## Purpose

This refinement replaces the former generic pre-experiment message with **route-aware guidance** for the existing TrackLab research workflow. It does not create research records, sample metrics, illustrative reconstructed tracks, or synthetic run output.

## Verified Interface Behavior

| Protected route | Visible pre-experiment focus | Integrity boundary communicated |
|---|---|---|
| Overview | Traceable reconstruction record | No downstream artifact exists until an experiment owns it. |
| Datasets | Dataset registration | Only CSV, JSON, or HDF5 inputs are recorded as managed experiment references. |
| Models | Configuration provenance | Model revision, dataset revision, seed, and command remain researcher-provided evidence. |
| Runs | Execution lifecycle | Runs are tied to a dataset and configuration, with the exact four allowed statuses. |
| Results | Evaluation evidence | Metrics appear only when returned by an authorized run; no synthetic values are shown. |
| Tracks | Reconstruction evidence | Plots require stored inference coordinates; illustrative tracks are not substituted. |
| Findings | Scientific record | Notes and Markdown/PDF exports remain connected to experiment evidence. |
| Assistant | Grounded analysis | Responses use stored experiment context and must not invent missing data. |

## Visual Review Finding

The shared empty-state panel now uses a restrained **detector-grid and trajectory motif**, page-specific research language, and small evidence markers. It preserves the dark scientific command-center visual system while giving each route a distinct research purpose before the first experiment is created.

## Validation Status

The regression suite includes dedicated coverage for route-specific content, no-fabrication language for results and track views, and the unknown-route fallback. The platform-wide automated suite, TypeScript check, production build, and all eight desktop research-route screenshots completed successfully in this refinement cycle.
