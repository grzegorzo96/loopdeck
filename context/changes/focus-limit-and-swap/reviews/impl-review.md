<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Focus limit and swap

- **Plan**: context/changes/focus-limit-and-swap/plan.md
- **Scope**: All 3 phases
- **Date**: 2026-09-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Add-form at limit did not open swap modal

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/tasks/TaskApp.tsx:17-28
- **Detail**: Plan requires intercepting 409 from PATCH/POST focus attempts. Backlog path opened SwapModal; create-with-focus path showed inline error only.
- **Fix**: Create task with setFocus:false on limit, then open SwapModal with new task id.
- **Decision**: FIXED

### F2 — Swap is two sequential UPDATEs without transaction

- **Severity**: 👁 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/task-queries.ts:181-188
- **Detail**: Unset then set in separate queries; set failure after unset temporarily frees a slot. F-01 advisory lock mitigates concurrent races; partial failure still possible.
- **Fix**: Wrap in Postgres RPC/transaction in a follow-up hardening change.
- **Decision**: ACCEPTED — acceptable MVP risk; document for future hardening
