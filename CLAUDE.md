# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Mandatory Style Rules

Every rule in `docs/base/*.md` applies to all work in this repo, with no
exceptions. Read the relevant files before writing or editing code, and
follow them over any pattern already present in the codebase:

- [docs/base/core.md](docs/base/core.md) — always applies: function/file
  size limits, naming, architecture, error handling, anti-over-engineering
- [docs/base/git.md](docs/base/git.md) — always applies: commit message
  format and commit rules
- [docs/base/python.md](docs/base/python.md) — always applies: this is a
  Python/Django project
- [docs/base/typescript.md](docs/base/typescript.md) — applies to any `.ts`/`.tsx` code
- [docs/base/next.md](docs/base/next.md) — applies to any Next.js code
  (`frontend/`)
- [docs/base/react.md](docs/base/react.md) — applies to any React components
- [docs/base/css.md](docs/base/css.md) — applies to any vanilla CSS/SCSS/CSS Modules
- [docs/base/html.md](docs/base/html.md) — applies to any HTML templates
- [docs/base/ux-laws.md](docs/base/ux-laws.md) — applies to any UX/UI work
  (components, layouts, styling): all 30 Laws of UX with definition,
  violation signals, and code fix
- [docs/base/ux-code-pattern.md](docs/base/ux-code-pattern.md) — applies to
  any UX/UI work: maps each component type (form, dashboard, modal, etc.)
  to the UX laws that apply, with code patterns per law

`core.md` takes precedence if any rule conflicts with existing code style.

## Frontend Style Guide

All frontend UI (`frontend/`) must follow the style guide in
[docs/ui-ux/](docs/ui-ux/) (overview in
[docs/design/ui-ux-style-guide.md](docs/design/ui-ux-style-guide.md)). Read
the relevant guide pages before building or changing any component, screen,
or style:

- Use the design tokens from [tokens.css](docs/ui-ux/tokens.css) (colors,
  type, spacing, radius, elevation) instead of hard-coded values.
- Reuse the documented components and patterns (buttons, forms, cards,
  lists, navigation, sheets, dialogs, full screens in
  [patterns.html](docs/ui-ux/patterns.html)) rather than inventing new
  ones. If a needed component is missing, add it to the style guide first,
  then use it.
- Keep it mobile-first, with the 44px minimum hit area, and support light
  and dark themes.
- The style guide takes precedence over ad-hoc styling already in
  `frontend/`. The UX law docs above still apply on top of it.

## Design Docs

Every feature worked on must have a corresponding markdown design file
under `docs/design/`, describing how it works (architecture, data model,
key decisions):

- New feature (e.g. a new Django app, a major module): create a new design
  file at `docs/design/<feature-name>.md`.
- Change to an existing feature: update its existing design file in place
  instead of creating a new one. Only create a new file if no equivalent
  design file exists yet for that feature.

## Project Overview

A minimal Django template (`config/`) plus a Next.js app (`frontend/`),
deployed on Railway as infrastructure-as-code (see
[.railway/railway.ts](.railway/railway.ts) and
[docs/design/frontend.md](docs/design/frontend.md)): the backend migrates,
collects static files, then serves ASGI (HTTP + WebSockets) with uvicorn.

- Python 3.11 ([runtime.txt](runtime.txt))
- Dependencies managed with Poetry ([pyproject.toml](pyproject.toml))
- Static files served via whitenoise
- No Django apps exist yet — `config/urls.py` only routes `admin/`. New apps
  live under `apps/`. When adding one, register it in `INSTALLED_APPS`
  ([config/settings.py](config/settings.py)) and wire its URLs into
  `config/urls.py`.

## Common Commands

```bash
poetry install
python manage.py migrate
make run_server  # uvicorn config.asgi:application --reload
```

`DATABASES` in [config/settings.py](config/settings.py) always connects to
Postgres via `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT`, and
`CHANNEL_LAYERS` to Redis via `REDIS_URL` — these are read with
`os.environ[...]` (no default, no SQLite fallback), so every `manage.py`
command fails with a `KeyError` unless all six are exported first. The
Makefile exports local defaults (`make redis_setup` installs Redis, `make run_redis` starts it, `make stop_redis` stops it).
