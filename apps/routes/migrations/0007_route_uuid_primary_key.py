import uuid

import django.db.models.deletion
from django.db import migrations, models
from django.db.models import F


def fill_route_uuids(apps, schema_editor) -> None:
    """Gives every existing route its own UUID, and every ride the UUID of its route."""
    Route = apps.get_model('routes', 'Route')
    RouteSummary = apps.get_model('routes', 'RouteSummary')
    for route in Route.objects.all():
        route.uuid = uuid.uuid4()
        route.save(update_fields=['uuid'])
    for summary in RouteSummary.objects.select_related('route'):
        summary.route_uuid = summary.route.uuid
        summary.save(update_fields=['route_uuid'])


def point_rides_at_routes(apps, schema_editor) -> None:
    """Fills the new `route` foreign key from the UUID saved in `route_uuid`."""
    RouteSummary = apps.get_model('routes', 'RouteSummary')
    RouteSummary.objects.update(route_id=F('route_uuid'))
    # Settle the foreign key checks now: PostgreSQL refuses to alter a table with checks pending.
    schema_editor.execute('SET CONSTRAINTS ALL IMMEDIATE')


class Migration(migrations.Migration):
    """Replaces the integer primary key of Route by a UUID, keeping every ride attached to its route.

    The UUIDs are drawn into a spare column first, the integer `id` is dropped and the spare
    column takes its place. Rides keep the old foreign key until their UUID is saved beside it.
    Not reversible: the integer ids are gone once it has run.
    """

    dependencies = [
        ('routes', '0006_routesummary_is_finished'),
    ]

    operations = [
        migrations.AddField(
            model_name='route',
            name='uuid',
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.AddField(
            model_name='routesummary',
            name='route_uuid',
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.RunPython(fill_route_uuids),
        migrations.RemoveField(model_name='routesummary', name='route'),
        migrations.RemoveField(model_name='route', name='id'),
        migrations.RenameField(model_name='route', old_name='uuid', new_name='id'),
        migrations.AlterField(
            model_name='route',
            name='id',
            field=models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        migrations.AddField(
            model_name='routesummary',
            name='route',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='summaries',
                to='routes.route',
            ),
        ),
        migrations.RunPython(point_rides_at_routes),
        migrations.AlterField(
            model_name='routesummary',
            name='route',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='summaries',
                to='routes.route',
            ),
        ),
        migrations.RemoveField(model_name='routesummary', name='route_uuid'),
    ]
