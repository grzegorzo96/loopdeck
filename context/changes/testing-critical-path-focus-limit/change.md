---
change_id: testing-critical-path-focus-limit
title: Critical-path tests for focus limit (Phase 1)
status: implemented
created: 2026-09-14
updated: 2026-09-14
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Critical-path: focus limit".
Risks covered: #1 (4th focus silently accepted), #5 (completion frees slot), #6 (backlog completion bypass).
Test types planned: unit + integration.
Risk response intent:
- Risk #1: prove 4th focus attempt returns refusal with rule copy, swap works, state stays at ≤3; challenge "UI disable is enough"; avoid UI-only assertions and mirroring count logic in test.
- Risk #5: prove after completion slot count still 3 and 4th focus remains blocked; challenge "complete frees capacity"; avoid testing completion UI without asserting slot count.
- Risk #6: prove complete-from-backlog is rejected with explanatory error; challenge "any open task can be completed"; avoid only testing the focus completion path.
