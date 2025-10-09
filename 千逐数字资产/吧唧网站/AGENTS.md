# Repository Guidelines

## Project Structure & Module Organization
- Root houses product docs such as `CLAUDE.md` and `Prd.md`; all runtime code lives under `web/`.
- `web/app/` uses the Next.js App Router—`app/page.tsx` is the primary UI and `app/api/*` hosts mock quota, generate, and lead endpoints.
- Reusable UI primitives are in `web/components/ui/` and imported via the `@/components/...` alias; update globals in `web/app/globals.css`.
- Static assets belong in `web/public/`; configuration lives in `package.json`, `tsconfig.json`, and `.env.example` (copy to `.env.local`).

## Build, Test, and Development Commands
- `npm run dev` — launch the Turbopack dev server on http://localhost:3000.
- `npm run build` — create a production bundle; fails fast on TypeScript or ESLint issues.
- `npm run start` — serve the compiled `.next` output locally for smoke checks.
- `npm run lint` — run ESLint with `next/core-web-vitals`; run before every commit.

## Coding Style & Naming Conventions
- TypeScript with React 19 client components; prefer functional patterns and hooks.
- Keep two-space indentation and default Next.js formatting; avoid unused exports and opt into strict typing.
- Name shared components with kebab-case filenames (`badge.tsx`); page directories mirror route segments.
- Use the `@/` alias over deep relative paths and keep Tailwind v4 utility groups ordered layout → spacing → color → state.

## Testing Guidelines
- Automated tests are not yet wired; validate changes with `npm run lint` until a runner is introduced.
- For new suites, place component specs in `web/__tests__/` or alongside files as `.test.tsx` using Vitest + React Testing Library, and document the setup in your PR.
- Mock fetches against `app/api/*` to keep tests deterministic and avoid external calls; assert primary UI states and API edge cases.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes found in history (`feat`, `docs`, `feat(ci)`); include scopes when changing isolated areas (`feat(api): ...`).
- PRs must include a summary, screenshots or clips for UI changes, test commands executed, and links to issues or product docs.
- Rebase onto `main` before merge and ensure lint/build scripts pass locally and in CI.

## Configuration & Security Notes
- Copy `.env.example` to `.env.local` for local secrets; never commit `.env*` files.
- `NEXT_PUBLIC_*` variables (e.g., `NEXT_PUBLIC_WX_QR_URL`) are exposed client-side—keep sensitive keys server-only.
- Clear stale build artifacts by removing `web/.next` before publishing deploy previews or handing off bundles.
