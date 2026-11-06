# 2026-11-06 textbook reorder

`plan-before-reorder.json` and `app-before-reorder.js` preserve the prior generic
site source. They contain no personal browser state. `textbook-catalogue.json`
contains the existing checked textbook chapter catalogue.

From the repository root, regenerate with:

```
node scripts/reorder-plan.cjs
node scripts/patch-reorder-runtime.cjs
node scripts/test-reorder.cjs
node scripts/test-existing-features.cjs
python scripts/package-reorder.py
python build.py
```

The two browser tests use the already installed local Playwright and Chrome.
The first checks scope, chronology, source task IDs, corrections, subject
rotation, daily load, actual recall grouping, migration, notes and history. The
second checks the existing politics queue, moves, materials, backup and restore.

The runtime preserves task IDs, completed records, notes, checks and sessions.
Unfinished professional-task moves from the old plan follow the new schedule;
their previous moves and tentative memory remain in a recovery snapshot.
Completed retired reviews remain visible on their historical dates. No user
completion is inferred from the new schedule. Actual recalls contain at most
three questions per group; at most four pending professional recall groups are
scheduled per working day. Later recall intervals may extend beyond the plan
when users finish late or complete extra tasks; the deadline is a target, not a
claim that all questions or four recall intervals have been completed.

The static archive is still the Render build source. Packaging updates its
checksum in `build.py`; deployment keeps the existing sync configuration.
