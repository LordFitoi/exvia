from datetime import datetime, timezone

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase
from django.urls import reverse

from apps.clans.models import ClanGroup, ClanNotice, ScheduledEvent
from apps.clans.validators import validate_social_links


class SocialLinksValidatorTests(SimpleTestCase):
    def test_accepts_whatsapp_and_instagram_links(self) -> None:
        validate_social_links([
            'https://chat.whatsapp.com/abc123',
            'https://wa.me/5511999999999',
            'https://www.instagram.com/exvia',
        ])

    def test_accepts_empty_list(self) -> None:
        validate_social_links([])

    def test_rejects_other_hosts(self) -> None:
        with self.assertRaises(ValidationError):
            validate_social_links(['https://facebook.com/exvia'])

    def test_rejects_lookalike_host(self) -> None:
        with self.assertRaises(ValidationError):
            validate_social_links(['https://instagram.com.evil.io/exvia'])

    def test_rejects_invalid_url(self) -> None:
        with self.assertRaises(ValidationError):
            validate_social_links(['not a url'])

    def test_rejects_non_list_value(self) -> None:
        with self.assertRaises(ValidationError):
            validate_social_links({'instagram': 'https://instagram.com/exvia'})

    def test_rejects_non_string_entry(self) -> None:
        with self.assertRaises(ValidationError):
            validate_social_links([42])


class ClanModelTests(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user(username='owner', password='s3cr3t-pass')
        self.clan = ClanGroup.objects.create(
            name='Night Riders', description='Night rides.', group_image='clans/x.png',
            owner=self.owner,
        )
        self.event = ScheduledEvent.objects.create(
            clan=self.clan, created_by=self.owner, title='Sunday ride', description='Coast road.',
            scheduled_at=datetime(2026, 11, 1, 9, tzinfo=timezone.utc),
        )

    def test_reverse_relations_expose_notices_and_events(self) -> None:
        notice = ClanNotice.objects.create(
            clan=self.clan, author=self.owner, title='Welcome', description='Hi.',
            event=self.event,
        )

        self.assertEqual(list(self.clan.events.all()), [self.event])
        self.assertEqual(list(self.clan.notices.all()), [notice])

    def test_users_are_many_to_many(self) -> None:
        member = User.objects.create_user(username='member', password='s3cr3t-pass')
        self.clan.users.add(member, self.owner)

        self.assertEqual(list(member.clans.all()), [self.clan])

    def test_notice_rejects_event_from_another_clan(self) -> None:
        other_clan = ClanGroup.objects.create(
            name='Other', description='Other.', group_image='clans/y.png', owner=self.owner,
        )
        notice = ClanNotice(
            clan=other_clan, author=self.owner, title='Mismatch', description='x',
            event=self.event,
        )

        with self.assertRaises(ValidationError) as context:
            notice.full_clean()

        self.assertIn('event', context.exception.message_dict)

    def test_deleting_event_keeps_notice(self) -> None:
        notice = ClanNotice.objects.create(
            clan=self.clan, author=self.owner, title='Ride news', description='x',
            event=self.event,
        )
        self.event.delete()
        notice.refresh_from_db()

        self.assertIsNone(notice.event)


class ClanAdminTests(TestCase):
    def setUp(self) -> None:
        self.admin_user = User.objects.create_superuser(username='admin', password='s3cr3t-pass')
        self.client.force_login(self.admin_user)
        self.clan = ClanGroup.objects.create(
            name='Night Riders', description='Night rides.', group_image='clans/x.png',
            owner=self.admin_user,
        )
        self.event = ScheduledEvent.objects.create(
            clan=self.clan, created_by=self.admin_user, title='Sunday ride', description='Coast road.',
            scheduled_at=datetime(2026, 11, 1, 9, tzinfo=timezone.utc),
        )
        ClanNotice.objects.create(
            clan=self.clan, author=self.admin_user, title='Welcome', description='Hi.',
            event=self.event,
        )

    def test_changelist_and_change_pages_render(self) -> None:
        for model in ('clangroup', 'scheduledevent', 'clannotice'):
            with self.subTest(model=model):
                changelist = self.client.get(reverse(f'admin:clans_{model}_changelist'))
                add = self.client.get(reverse(f'admin:clans_{model}_add'))

                self.assertEqual(changelist.status_code, 200)
                self.assertEqual(add.status_code, 200)

    def test_clan_change_page_shows_event_inline(self) -> None:
        response = self.client.get(reverse('admin:clans_clangroup_change', args=[self.clan.pk]))

        self.assertContains(response, 'Sunday ride')
