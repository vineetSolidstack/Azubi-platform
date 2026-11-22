# Azubi-platform

Learning platform for Azubis in German technical trades: content in Lernfeld order, a PLC trainer with automatically graded tasks, and a quiz with explained answers. Independent practice tool; all content is in `draft` status.

## Try it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine, task and quiz tests
npm run build      # production build
```

No account and no database are needed yet. Progress and your programs are saved in the browser (localStorage).

## Layout

| Path | What |
|---|---|
| `src/engine/plc/` | PLC engine, pure TypeScript, no UI: SCL parser (`scl.ts`), scan-cycle runtime with IEC 61131-3 timers and counters (`runtime.ts`), ladder model (`ladder.ts`), station models (`stations.ts`), grader (`grader.ts`), task format (`task.ts`) |
| `content/tasks/` | PLC tasks as JSON: variable table, test cases, reference and wrong solutions |
| `content/quiz/` | Quiz questions as JSON |
| `content/curriculum.ts` | Lernfelder per trade mapped to modules |
| `src/quiz/` | Deterministic answer checking |
| `src/lib/progress.ts` | Progress store interface (localStorage today, Supabase later) |
| `src/components/`, `src/app/` | Next.js UI |
| `docs/DECISIONS.md` | Decision log |

## Adding a task

Copy a file in `content/tasks/m07/`, register it in `content/tasks/index.ts` and run `npm test`. The test suite checks every task file: all reference solutions must pass every test case, every wrong solution must fail.
