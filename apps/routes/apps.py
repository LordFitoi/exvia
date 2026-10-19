from django.apps import AppConfig


class RoutesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.routes'

    def ready(self) -> None:
        from apps.routes import signals  # noqa: F401
