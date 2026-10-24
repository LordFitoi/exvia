import apps.routes.validators
from django.db import migrations, models


def add_address(apps, schema_editor) -> None:
    Route = apps.get_model('routes', 'Route')
    for route in Route.objects.exclude(waypoints=[]).only('waypoints'):
        route.waypoints = [{**waypoint, 'address': ''} for waypoint in route.waypoints]
        route.save(update_fields=['waypoints'])


def remove_address(apps, schema_editor) -> None:
    Route = apps.get_model('routes', 'Route')
    for route in Route.objects.exclude(waypoints=[]).only('waypoints'):
        route.waypoints = [
            {key: value for key, value in waypoint.items() if key != 'address'} for waypoint in route.waypoints
        ]
        route.save(update_fields=['waypoints'])


class Migration(migrations.Migration):

    dependencies = [
        ('routes', '0013_structured_waypoints'),
    ]

    operations = [
        migrations.AlterField(
            model_name='route',
            name='waypoints',
            field=models.JSONField(blank=True, default=list, help_text='The points the rider chose, in order, each with its `name`, its `address` and the `category` of the saved place there; `points` is the street path through them.', validators=[apps.routes.validators.validate_waypoints]),
        ),
        migrations.RunPython(add_address, remove_address),
    ]
