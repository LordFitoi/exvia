from django.db import migrations, models

import apps.routes.validators


def _to_structured(pair: list[float]) -> dict[str, object]:
    lng, lat = pair
    return {'lng': lng, 'lat': lat, 'name': '', 'category': None}


def _to_pair(waypoint: dict[str, object]) -> list[object]:
    return [waypoint['lng'], waypoint['lat']]


def structure_waypoints(apps, schema_editor) -> None:
    Route = apps.get_model('routes', 'Route')
    for route in Route.objects.exclude(waypoints=[]).only('waypoints'):
        route.waypoints = [_to_structured(pair) for pair in route.waypoints]
        route.save(update_fields=['waypoints'])


def flatten_waypoints(apps, schema_editor) -> None:
    Route = apps.get_model('routes', 'Route')
    for route in Route.objects.exclude(waypoints=[]).only('waypoints'):
        route.waypoints = [_to_pair(waypoint) for waypoint in route.waypoints]
        route.save(update_fields=['waypoints'])


class Migration(migrations.Migration):

    dependencies = [
        ('routes', '0012_routesummary_route_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='route',
            name='waypoints',
            field=models.JSONField(blank=True, default=list, help_text='The points the rider chose, in order, each with its `name` and the `category` of the saved place there; `points` is the street path through them.', validators=[apps.routes.validators.validate_waypoints]),
        ),
        migrations.RunPython(structure_waypoints, flatten_waypoints),
    ]
