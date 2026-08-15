# Experiment Entry Interaction Audit

## Scope

The **New experiment** control is the only creation entry point for a fresh research record. This refinement improves its keyboard and mobile behavior without changing the experiment schema, authorization checks, stored data, or downstream research workflows.

## Interaction Contract

| Event | Expected behavior |
|---|---|
| Open New experiment | The Title field receives keyboard focus after the form becomes available. |
| Press Escape while the form is open | The form closes and focus returns to the New experiment control. |
| Select Cancel | The form closes and focus returns to the New experiment control. |
| Successfully create an experiment | The form closes, fields reset, the experiment list refreshes, and focus returns to the trigger. |

## Validation

The dashboard accessibility contract regression suite now covers focus placement, Escape handling, cancel behavior, and trigger focus return. The complete automated suite reports **27 passing tests**; TypeScript and the production build pass. The overview and dataset routes retain clear, mobile-readable experiment-entry controls at a 390 px viewport.
