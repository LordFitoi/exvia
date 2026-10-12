# Frontend

Next.js web client, separate from the Django backend. It lives in
[frontend/](../../frontend/) and currently contains only the stock
`create-next-app` starter page; no API calls to the backend exist yet.

## Stack

- Next.js (App Router, `src/` directory), React, TypeScript
- Tailwind CSS for styling (preferred by [react.md](../base/react.md))
- ESLint with `eslint-config-next`
- Import alias `@/*` maps to `frontend/src/*`
- Package manager: pnpm, pinned through `packageManager` in
  [package.json](../../frontend/package.json)

## Running

`make run_frontend` starts the dev server on <http://localhost:3000>. The
target runs `corepack pnpm dev` inside `frontend/`, so it needs a Node
install that ships `corepack` (Node 16.9+) and does not need a global
`pnpm`. Corepack downloads the pinned pnpm version on first use.

Run `corepack pnpm install` inside `frontend/` once before the first start.

## Deployment (Railway)

The repo deploys as two Railway services:

| Service | Root directory | Config file | Start command |
|---------|----------------|-------------|---------------|
| Django backend | `/` | [railway.json](../../railway.json) | migrate, collectstatic, gunicorn |
| Next.js frontend | `/frontend` | [frontend/railway.json](../../frontend/railway.json) | `pnpm start` |

The frontend builds with Railpack (`pnpm build`) and `next start` listens
on the `PORT` that Railway injects. Railpack reads the pnpm version from
`packageManager` and the lockfile from `pnpm-lock.yaml`.

One-time setup in the Railway dashboard (not expressible in code):

1. In the project, add a new service from this same GitHub repo.
2. Service Settings > Source > Root Directory: `/frontend`.
3. Service Settings > Config-as-code > Railway Config File:
   `/frontend/railway.json`. Railway does not look for the config file
   inside the root directory on its own, so this path is required.
4. Service Settings > Networking > Generate Domain.

## Key decisions

- **pnpm instead of npm**: on this WSL setup the `npm` on `PATH` is the
  Windows one, which fails on `\\wsl.localhost` paths, and the Linux Node
  install has no npm. Corepack is bundled with the Linux Node, so pnpm
  works without installing anything system-wide. The pinned version is
  9.15.x because corepack cannot launch pnpm 12.
- **Separate from `config/`**: the frontend is not served by Django or
  whitenoise and is not part of the Railway deploy in
  [railway.json](../../railway.json). Talking to the API will need CORS
  and CSRF settings on the Django side (`CSRF_TRUSTED_ORIGINS` in
  [settings.py](../../config/settings.py) only lists the Railway host
  today, not `http://localhost:3000`).
