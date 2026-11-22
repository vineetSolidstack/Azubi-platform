# Decisions

Date, decision, reason. Newest at the bottom.

| Date | Decision | Reason |
|---|---|---|
| 2026-11-22 | Repo started from scratch. | The repo contained only a README; no earlier SPS-Trainer code was present to reuse. |
| 2026-11-22 | No Supabase, accounts or paywall yet. Progress is stored in localStorage behind the `ProgressStore` interface in `src/lib/progress.ts`. | Owner wants to try the app first and connect Supabase later. |
| 2026-11-22 | One execution engine: ladder (KOP) is translated to SCL text, SCL is parsed and run by the scan-cycle runtime. | One place for instruction behaviour and tests; the learner can see their ladder as SCL. |
| 2026-11-22 | Fixed cycle time of 10 ms; timers use PLC time, not wall-clock time. | Deterministic grading; same result in browser, tests and grader. |
| 2026-11-22 | Grading is behavioural only: input changes over time, expected values at given moments, plus "never" conditions. | Any correct program must pass; no comparison with a model solution. |
| 2026-11-22 | Test expectations sit at least 100 ms away from a switching moment. | Leaves room for correct programs that need a few extra cycles (step chains, edge flags). |
| 2026-11-22 | Writing to an input variable is a compile error. | Helps beginners; open point: real controllers allow it. Revisit if a correct program is ever rejected. |
| 2026-11-22 | `F_TRIG` gives no pulse in the first scan. | Deviates from the letter of IEC 61131-3 to avoid a confusing start-up pulse. |
| 2026-11-22 | Ladder editor model: a rung is a series of groups, a group is a set of parallel branches. Counters and comparisons are SCL only for now. | Covers the first tasks with a small editor; FUP view and GRAFCET display are still open. |
| 2026-11-22 | All content is `draft`. The footer and each item say so. | Content rules: nothing is reviewed by a qualified person yet. |
| 2026-11-22 | Every task has an `explanation` (why the reference solution is built that way). The complete solution and the explanation can be opened at any time, not only after failed attempts; the solution can be loaded into the editor. | Owner's request: try several times, then reveal the full answer and the reasoning, and experiment from there. |
