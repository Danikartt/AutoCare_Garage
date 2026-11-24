# Code Review Guide — AutoCare_Garage

Read `02-DOCS/wiki/sdd/constitution.md` (v1.0.0) alongside this file before reviewing any diff.

## Summary format

Always start every review with a total count before any detail:
`"<N> findings: <X> blockers, <Y> nits"` (or `"0 findings"`).

## What failure looks like here

- Unparameterized SQLite queries (SQL injection risk).
- Schema or migration changes in `src/data/db.js` that break or lose existing vehicle/service records.
- Incorrect preventive alert calculations (mileage intervals or ITV due dates).
- Staging or committing `data/*.db`, `*.log`, or any secret/credential.
- Breaking changes to `/api/v1/*` JSON contracts without updating `public/app.js` and `tests/`.

## Paths to skip

- `node_modules/`
- `data/`
- `.rsc/backups/`

## Nit cap

Report at most **3** nits per review; drop any additional minor style remarks.

## Always-human paths

Changes to these paths must always be reviewed by a human before shipping:
- `src/data/db.js` (SQLite schema and initialization)
- `.gitignore` (local database and log exclusions)

*(Informational here; to enforce via `rsc risk`, add these paths to `.rsc/sello-config.json` under `risk.raise`.)*
