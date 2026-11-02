# Contributing — Cerulea

## Supported environment
- Windows 11 is the primary development environment.
- VS Code is the recommended editor.

## Project surfaces to keep in mind
Cerulea includes multiple user-facing surfaces:
- Public site (homepage and marketing pages)
- Authentication system
- Dashboard (authenticated)
- Documentation pages
- Cerulea Studio (on `studio.<domain>`)

Changes should respect these boundaries.

## Install dependencies
Use the package manager that matches the repo lockfile:
- package-lock.json → npm
- pnpm-lock.yaml → pnpm
- yarn.lock → yarn

Prefer reproducible installs:
- npm: `npm ci`
- pnpm: `pnpm install --frozen-lockfile` (if used)
- yarn: `yarn install --frozen-lockfile` (if used)

## Run
Run only the app you need (especially in a monorepo).
Typical patterns:
- Root: `npm run dev`
- Or per app: `npm run dev` inside `apps/<app-name>`

## Build and lint
Before pushing:
- `npm run build`
- `npm run lint`
- `npm run typecheck` (if present)

## Testing
If tests exist:
- `npm run test`

If tests don’t exist yet:
- Build + lint + typecheck are the minimum safety checks.

## Local artifacts and generated files
- Do not commit local databases, caches, or generated runtime artifacts.
- Ensure `.gitignore` includes local-only artifacts.

## Coding conventions
### TypeScript / React
- Avoid `any` unless unavoidable.
- No placeholders. All code must be complete and fully thought out.
- Prefer shared components/utilities instead of duplicating patterns across pages/steps.
- Keep page components focused on composition; move heavy logic to modules.

### MUI
- Use theme tokens where possible.
- Centralize shared UI patterns (especially Studio Next/Back controls).

## Rules for every contribution (important)
Every change:
- is complete and runnable, with no placeholder (e.g., TODO, “implement later”, fake data) unless explicitly requested
- documents any architecture change in DECISIONS.md
- proves safety before deleting files (build/lint must pass)
