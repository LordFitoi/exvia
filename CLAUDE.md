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
- [docs/base/react.md](docs/base/react.md) — applies to any React components
- [docs/base/css.md](docs/base/css.md) — applies to any vanilla CSS/SCSS/CSS Modules
- [docs/base/html.md](docs/base/html.md) — applies to any HTML templates

`core.md` takes precedence if any rule conflicts with existing code style.

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

A minimal Django template (`config/`) configured for deployment on Railway
(see [railway.json](railway.json)): migrate, collectstatic, then serve with
gunicorn.

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
python manage.py runserver
```

`DATABASES` in [config/settings.py](config/settings.py) always connects to
Postgres via `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT` — these
are read with `os.environ[...]` (no default, no SQLite fallback), so every
`manage.py` command fails with a `KeyError` unless all five are exported
first.
