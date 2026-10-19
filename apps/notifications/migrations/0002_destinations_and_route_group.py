import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def copy_destination_to_destinations(apps, schema_editor) -> None:
    """Gives every event its single destination as the first of its destinations."""
    NotificationEvent = apps.get_model('notifications', 'NotificationEvent')
    for event in NotificationEvent.objects.all():
        event.destinations.add(event.destination_id)


def copy_first_destination_back(apps, schema_editor) -> None:
    """Keeps one destination per event; the others are lost on the way back."""
    NotificationEvent = apps.get_model('notifications', 'NotificationEvent')
    for event in NotificationEvent.objects.all():
        first = event.destinations.order_by('pk').first()
        if first is None:
            event.delete()
            continue
        event.destination_id = first.pk
        event.save(update_fields=['destination'])


class Migration(migrations.Migration):
    """Turns the single `destination` of an event into many `destinations`, and links an event to its group.

    The old column gives up the `notification_events` reverse name first, so the many-to-many can
    take it over while the rows are copied across.
    """

    dependencies = [
        ('notifications', '0001_notificationevent'),
        ('routes', '0008_routegroup'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='notificationevent',
            name='destination',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='+',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='notificationevent',
            name='destinations',
            field=models.ManyToManyField(
                help_text='Everyone who receives this notification.',
                related_name='notification_events',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='notificationevent',
            name='route_group',
            field=models.ForeignKey(
                blank=True,
                help_text='The group this event is about, for route invitations.',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='notification_events',
                to='routes.routegroup',
            ),
        ),
        migrations.RunPython(copy_destination_to_destinations, copy_first_destination_back),
        migrations.RemoveField(model_name='notificationevent', name='destination'),
    ]
