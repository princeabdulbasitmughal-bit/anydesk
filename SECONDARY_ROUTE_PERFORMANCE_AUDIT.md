# Secondary Route Performance Audit

## Objective

The command center is the primary entry surface. Dataset, model, run, result, track, and findings workspaces now load only when a researcher navigates to them, while preserving the existing authenticated dashboard shell and route-level empty-state safeguards.

## Production Build Measurement

| Measurement | Before secondary split | After secondary split | Change |
|---|---:|---:|---:|
| Initial `index-*.js` payload | 1,278,182 bytes | 786,406 bytes | 491,776 bytes smaller (38.47%) |
| Command-center delivery | Includes secondary pages | Keeps the command center eager | Lower initial workload |
| Secondary routes | Included at initial load | Route-loaded behind accessible fallback | Loaded on navigation |

## Validation

The route-loading contract covers each of the six secondary research pages and verifies that the command center remains eager. The automated suite reports **39 passing tests**, and TypeScript plus the production build pass. Desktop navigation review confirms datasets, models, runs, results, tracks, findings, and assistant routes retain the dashboard shell and their route-specific research guidance.
