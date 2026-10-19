.DEFAULT_GOAL := help

PGDATABASE ?= exvia
PGUSER ?= exvia
PGPASSWORD ?= exvia
PGHOST ?= localhost
PGPORT ?= 5432
REDIS_URL ?= redis://localhost:6379

export PGDATABASE PGUSER PGPASSWORD PGHOST PGPORT REDIS_URL

STYLEGUIDE = docs/ui-ux/index.html

.PHONY: help install railway_install railway_login db_setup redis_setup db_migrate db_shell db_seed run_redis stop_redis run_server run_frontend vapid_keys open_styleguide railway_plan railway_apply create_app

##@ Help

help: ## Show this list of available commands
	@awk 'BEGIN {FS = ":.*?## "} \
		/^##@/ {printf "\n\033[1m%s\033[0m\n", substr($$0, 5)} \
		/^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

##@ Setup

install: ## Install Poetry dependencies
	poetry install

##@ Database

db_setup: ## Install PostgreSQL if missing and create the project database
	@command -v psql >/dev/null 2>&1 || sudo apt-get install -y postgresql
	@sudo service postgresql start
	@sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$(PGUSER)'" | grep -q 1 \
		|| sudo -u postgres psql -c "CREATE USER $(PGUSER) WITH PASSWORD '$(PGPASSWORD)' CREATEDB;"
	@sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$(PGDATABASE)'" | grep -q 1 \
		|| sudo -u postgres psql -c "CREATE DATABASE $(PGDATABASE) OWNER $(PGUSER);"

redis_setup: ## Install Redis if missing (WebSocket channel layer)
	@command -v redis-server >/dev/null 2>&1 || sudo apt-get install -y redis-server

db_migrate: ## Run Django database migrations
	poetry run python manage.py migrate

db_shell: ## Open a psql shell on the project database
	PGPASSWORD=$(PGPASSWORD) psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d $(PGDATABASE)

db_seed: ## Seed the database with baseline records (e.g. default admin user)
	poetry run python manage.py seed

##@ Run

run_redis: ## Start the local Redis service (WebSocket channel layer)
	@sudo service redis-server start

stop_redis: ## Stop the local Redis service
	@sudo service redis-server stop

run_server: ## Run the ASGI development server (HTTP + WebSockets) with auto-reload
	poetry run uvicorn config.asgi:application --reload

run_frontend: ## Run the Next.js development server (frontend/)
	cd frontend && corepack pnpm dev

vapid_keys: ## Generate a VAPID key pair for Web Push (export it as VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)
	@poetry run python manage.py generate_vapid_keys

open_styleguide: ## Open the UI/UX style guide (docs/ui-ux/) in the browser
	@if command -v wslview >/dev/null 2>&1; then wslview $(STYLEGUIDE); \
	elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$$(wslpath -w $(STYLEGUIDE))" || true; \
	elif command -v xdg-open >/dev/null 2>&1; then xdg-open $(STYLEGUIDE); \
	elif command -v open >/dev/null 2>&1; then open $(STYLEGUIDE); \
	else echo "No browser opener found. Open $(CURDIR)/$(STYLEGUIDE) manually."; exit 1; fi

##@ Railway

RAILWAY = .railway/node_modules/.bin/railway

railway_install: ## Install the Railway CLI and IaC SDK into .railway/
	cd .railway && corepack pnpm install

railway_login: railway_install ## Log in to Railway (browserless) and link this directory to a project
	$(RAILWAY) login --browserless
	$(RAILWAY) link

railway_plan: railway_install ## Preview Railway infrastructure changes (.railway/railway.ts)
	cd .railway && corepack pnpm run plan

railway_apply: railway_install ## Apply Railway infrastructure changes (.railway/railway.ts)
	cd .railway && corepack pnpm run apply

##@ Scaffolding

create_app: ## Create a new Django app under apps/ (usage: make create_app name=<app_name>)
	@if [ -z "$(name)" ]; then echo "Usage: make create_app name=<app_name>"; exit 1; fi
	@mkdir -p apps/$(name)
	poetry run python manage.py startapp $(name) apps/$(name)
	@sed -i "s/name = '$(name)'/name = 'apps.$(name)'/" apps/$(name)/apps.py
	@grep -q "'apps.$(name)'" config/settings.py \
		|| sed -i "/INSTALLED_APPS = \[/a\\    'apps.$(name)'," config/settings.py
