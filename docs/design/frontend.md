# Frontend

Next.js web client, separate from the Django backend. It lives in
[frontend/](../../frontend/) and implements the mobile screens described in
[frontend-screens.md](frontend-screens.md): login, signup, home, clans and
profile, with a bottom tab bar once logged in. It talks to the backend for
authentication, for saving routes (see [map.md](map.md#route-creator)) and for
listing and riding them (see [ride.md](ride.md)). It is an installable, full-screen PWA; see
[frontend-pwa.md](frontend-pwa.md).

## Stack

- Next.js (App Router, `src/` directory), React, TypeScript
- Tailwind CSS is installed (preferred by [react.md](../base/react.md)), but
  screens are styled with the style guide's own CSS classes; see
  [frontend-screens.md](frontend-screens.md#styling)
- ESLint with `eslint-config-next`
- Import alias `@/*` maps to `frontend/src/*`
- `src/views/<feature>/` holds each screen and the pieces only it uses;
  `src/components/` is for shared components only (`form`, `feedback`, `layout`)
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
- `frontend` declares the `exvia.up.railway.app` service domain and is the
  only public service; `Server` is reachable only through the private network
  (`server.railway.internal:8000`). See
  [Single domain](#single-domain).
- `postgres()` in the SDK defaults to a plain `postgres:18` image, while the
  live database has no image set. `railway.ts` clears `db.source` so applying
  does not redeploy the database with a different image.
- Deployment itself is triggered by pushes to `main` on the connected GitHub
  repo; the IaC file only declares what is deployed and how.

### Single domain

Backend and frontend share `exvia.up.railway.app`. The domain points at
`frontend`, and [next.config.ts](../../frontend/next.config.ts) rewrites these
paths to Django (`BACKEND_URL`, default `http://localhost:8000` locally and
`http://server.railway.internal:8000` on Railway):

| Public path | Served by |
|-------------|-----------|
| `/api/...`, `/admin/...` | Django (proxied) |
| `/static/...` | Django + whitenoise (admin assets) |
| everything else | Next.js |

- `trailingSlash: true` with `skipTrailingSlashRedirect: true`: Next strips
  the trailing slash before rewriting by default, and Django routes require it
  (a stripped slash turns POSTs into redirects). Next pages still resolve with
  or without a slash.
- `BACKEND_URL` is read when `next.config.ts` is evaluated and rewrites are
  baked into the build, so it must be set as a build-time variable as well.
- Next forwards `X-Forwarded-Host`/`X-Forwarded-Proto` from the Railway edge;
  [settings.py](../../config/settings.py) trusts them
  (`USE_X_FORWARDED_HOST`, `SECURE_PROXY_SSL_HEADER`) so CSRF and absolute
  URLs use the public host. Safe because `Server` has no public domain.
- `railway config plan/apply` does not move an existing domain between
  services: remove `exvia.up.railway.app` from `Server` and add it to
  `frontend` (Settings → Networking) once, then redeploy both.
- Browser code should call the API with relative URLs (`/api/auth/token/`),
  which also removes the need for CORS.
- Locally, run Django on `:8000` and `make run_frontend` on `:3000`.

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
  whitenoise; it is its own Railway service that proxies to Django. Because
  the browser only talks to one origin, no CORS is needed. Local development
  through `http://localhost:3000` is same-origin too; only direct requests to
  `:8000` from a page on `:3000` would need `CSRF_TRUSTED_ORIGINS` additions.
