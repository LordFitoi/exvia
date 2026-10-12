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

The whole Railway project is declared in
[.railway/railway.ts](../../.railway/railway.ts) (Railway
infrastructure-as-code, TypeScript SDK `railway/iac`). It replaces the
deprecated `railway.json` config-as-code files, which were deleted.

| Resource | Source | Build | Pre-deploy | Start |
|----------|--------|-------|------------|-------|
| `Postgres` (database) + `postgres-volume` | Railway Postgres | n/a | n/a | n/a |
| `Server` (Django backend) | repo root, `main` | Railpack | `python manage.py migrate` | `python manage.py collectstatic --noinput && gunicorn config.wsgi` |
| `frontend` | `frontend/` root directory, `main` | Railpack, `pnpm build` | n/a | `pnpm start` |

`Postgres` and `Server` are grouped under the existing `Django` canvas group.
The resource names are the ones that already exist in the Railway project;
renaming one would delete it and create a new one.

- `Server` receives `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGHOST` and
  `PGPORT` as references to `Postgres`, which is what `DATABASES` in
  [settings.py](../../config/settings.py) reads. `PORT=8000` and
  `DISABLE_COLLECTSTATIC=1` were already set on the service and are kept.
  `DISABLE_COLLECTSTATIC` stops Railpack from running `collectstatic` at build
  time, when the database variables are not usable.
- Migrations run in the pre-deploy step so a failing migration stops the
  release. `collectstatic` stays in the start command because pre-deploy
  runs in a separate container and its files would not reach the running one.
- `Server` declares its existing `exvia.up.railway.app` service domain.
  `frontend` declares no domain; generate one with `railway domain`.
- `postgres()` in the SDK defaults to a plain `postgres:18` image, while the
  live database has no image set. `railway.ts` clears `db.source` so applying
  does not redeploy the database with a different image.
- Deployment itself is triggered by pushes to `main` on the connected GitHub
  repo; the IaC file only declares what is deployed and how.

### Tooling

[.railway/package.json](../../.railway/package.json) holds the `railway` SDK,
TypeScript, the `@railway/cli` binary and two scripts, `plan` and `apply`.
The CLI evaluates `railway.ts` with `node --experimental-strip-types`, but
the distro Node on this machine is built without TypeScript support.
`pnpm.executionEnv.nodeVersion` makes pnpm run those scripts with an official
Node build. The scripts `cd ..` so the CLI runs from the linked repo root, and
set `_` to the CLI path because the SDK checks the CLI version by running
`$_ --version`, which pnpm's shell does not set.

### Applying changes

The Railway CLI (`@railway/cli`, 5.42.1+ is required for IaC) is a dev
dependency of [.railway/package.json](../../.railway/package.json), so no
global install is needed. Every target below installs it first.

```bash
make railway_login   # one-time: browserless login, then link to the project
make railway_plan    # preview the diff against the linked environment
make railway_apply   # apply it (asks before destructive changes)
```

In CI, set `RAILWAY_TOKEN` (a project token) instead of logging in.

Anything not in the file is deleted on apply. Run `make railway_plan` first
and read the diff; `railway config pull --json` shows the live state. Services still managed by `railway.json` must be migrated before
IaC can manage them, which removing those files does.

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
