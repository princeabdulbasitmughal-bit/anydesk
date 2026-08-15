# Assistant Route Performance Audit

## Objective

The research assistant uses markdown rendering that carries substantial client-side code. The assistant page is now loaded only when a researcher visits `/assistant`, preserving the same authenticated and grounded assistant behavior while reducing the initial dashboard payload.

## Production Build Measurement

| Measurement | Before route split | After route split | Change |
|---|---:|---:|---:|
| Initial `index-*.js` payload | 2,190,295 bytes | 1,263,188 bytes | 927,107 bytes smaller (42.32%) |
| Assistant-specific chunk | Included in initial payload | 920,230-byte `Assistant-*.js` chunk | Loaded only on assistant route |

## Safeguards

The assistant remains within `ResearchPage`, retaining the same authentication, researcher authorization, selected-experiment context, no-fabrication guidance, and error handling. The lazy route includes an accessible loading state with `aria-busy` and `aria-live`.

## Validation

The assistant-route loading contract is covered by the automated suite. The complete test suite, TypeScript check, and production build passed after the split. Desktop visual review confirms both the command-center route and the assistant route render correctly after navigation.
