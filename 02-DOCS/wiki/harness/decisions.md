# Harness decisions

- Accepted plan `d8666e0879ea9fec163b1a53b9b35d5fa65ba340884b49f9d5863e80cf29f58e`.
- Project kind: software.
- SDD: selected.

## 2026-11-24 — Constitution v1.0.0 ratified

- **Requirements**: Small Node.js/Express 5/SQLite app with direct-to-`main` workflow and a vanilla web UI in `public/`.
- **Choices**:
  - Quality bar: `npm test` must pass on every change, with new tests in `tests/` for features and bug fixes (vs. no new-test rule or adding ESLint/Prettier now).
  - Branching: keep direct-to-`main` (`--workflow main`) gated by `npm test` (vs. feature branches + PRs).
  - Accessibility: enforce keyboard navigation, visible focus, and WCAG 2.2 AA contrast in `public/` (vs. omitting UI floor).
- **Why**: Keeps the ruleset proportional to a small local app while protecting test coverage, SQLite integrity, and basic UI accessibility.
