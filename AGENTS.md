# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/`; keep clear entrypoints like `src/main` or `src/app`.
- Tests mirror modules in `tests/` (e.g., `tests/module/test_feature.*`).
- Supporting folders: `scripts/` (dev/build tasks), `config/` (env, app settings), `docs/`, `assets/`.
- Example:
  - `src/`, `tests/`, `scripts/`, `config/`, `docs/`, `assets/`.

## Build, Test, and Development Commands
- Node (if applicable): `npm i`, `npm run dev` (watch), `npm test`, `npm run build`.
- Python (if applicable): `python -m venv .venv && source .venv/bin/activate`, `pip install -r requirements.txt`, `pytest -q`, `python -m src`.
- Makefile (optional): `make dev`, `make test`, `make lint`, `make build`.
- Document any project-specific commands in `README.md` as they’re added.

## Coding Style & Naming Conventions
- Python: 4-space indent, snake_case for files/functions, PascalCase for classes; format with `black` (or `ruff format`) and lint with `ruff`.
- JS/TS: 2-space indent, camelCase for variables/functions, PascalCase for components/types; format with `prettier`, lint with `eslint`.
- Keep modules small and cohesive; prefer explicit exports; max line length 100.

## Testing Guidelines
- Frameworks: `pytest` for Python or `jest/vitest` for JS/TS.
- Name tests by feature: `test_*.py` or `*.spec.ts` adjacent to or mirroring sources.
- Aim for ≥80% coverage for new/changed code; add regression tests with fixes.
- Coverage examples: `pytest --cov=src` or `npm run test:coverage`.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`.
- Keep commits small and focused; include rationale in body when non-trivial.
- PRs: link issues, describe changes and impact, include screenshots for UI, update docs/tests, and pass CI.

## Security & Configuration Tips
- Never commit secrets; use `.env` and add `.env.example` with safe defaults.
- Add `.gitignore` for `.venv`, `node_modules`, build artifacts, caches, and `.env*`.

## Agent-Specific Instructions
- Prefer incremental, minimal patches; avoid unrelated changes.
- Use fast search (`rg`) and read files in small chunks; keep edits scoped.
- Reflect behavior changes with matching tests and docs in the same PR.
