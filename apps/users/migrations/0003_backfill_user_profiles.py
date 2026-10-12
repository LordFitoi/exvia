from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def create_missing_profiles(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('users', 'UserProfile')
    users_without_profile = User.objects.filter(profile__isnull=True)
    UserProfile.objects.bulk_create(
        UserProfile(user=user) for user in users_without_profile.iterator()
    )


class Migration(migrations.Migration):
    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('users', '0002_profile_verbose_name'),
    ]

    operations = [
        migrations.RunPython(create_missing_profiles, migrations.RunPython.noop),
    ]
