.DEFAULT_GOAL := help

PGDATABASE ?= exvia
PGUSER ?= exvia
PGPASSWORD ?= exvia
PGHOST ?= localhost
PGPORT ?= 5432

export PGDATABASE PGUSER PGPASSWORD PGHOST PGPORT

.PHONY: help db_setup db_migrate run_server create_app

help: ## Show this list of available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

db_setup: ## Install PostgreSQL if missing and create the project database
	@command -v psql >/dev/null 2>&1 || sudo apt-get install -y postgresql
	@sudo service postgresql start
	@sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$(PGUSER)'" | grep -q 1 \
		|| sudo -u postgres psql -c "CREATE USER $(PGUSER) WITH PASSWORD '$(PGPASSWORD)' CREATEDB;"
	@sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$(PGDATABASE)'" | grep -q 1 \
		|| sudo -u postgres psql -c "CREATE DATABASE $(PGDATABASE) OWNER $(PGUSER);"

db_migrate: ## Run Django database migrations
	poetry run python manage.py migrate

run_server: ## Run the Django development server
	poetry run python manage.py runserver

create_app: ## Create a new Django app under apps/ (usage: make create_app name=<app_name>)
	@if [ -z "$(name)" ]; then echo "Usage: make create_app name=<app_name>"; exit 1; fi
	@mkdir -p apps/$(name)
	poetry run python manage.py startapp $(name) apps/$(name)
	@sed -i "s/name = '$(name)'/name = 'apps.$(name)'/" apps/$(name)/apps.py
	@grep -q "'apps.$(name)'" config/settings.py \
		|| sed -i "/INSTALLED_APPS = \[/a\\    'apps.$(name)'," config/settings.py
