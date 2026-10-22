from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.clans.models import ClanGroup, ClanInvitation, ClanNotice
from apps.routes.models import Route

PASSWORD = 's3cr3t-pass'
ROUTE_POINTS = [[-3.7038, 40.4168], [-3.6912, 40.4221]]


def create_clan(owner: User, name: str = 'Night Riders') -> ClanGroup:
    clan = ClanGroup.objects.create(name=name, description='Night rides.', owner=owner)
    clan.users.add(owner)
    return clan


class ClanApiTestCase(TestCase):
    def setUp(self) -> None:
        self.member = User.objects.create_user('member', password=PASSWORD)
        self.outsider = User.objects.create_user('outsider', password=PASSWORD)
        self.clan = create_clan(self.member)
        self.client = APIClient()
        self.client.force_authenticate(self.member)


class ClanCreationTests(ClanApiTestCase):
    def test_create_makes_caller_owner_and_member(self) -> None:
        response = self.client.post(
            reverse('clans:clan_list'), {'name': 'Dawn Patrol', 'description': 'Early.'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        clan = ClanGroup.objects.get(pk=response.data['id'])
        self.assertEqual(clan.owner, self.member)
        self.assertIn(self.member, clan.users.all())

    def test_create_requires_name_and_description(self) -> None:
        response = self.client.post(reverse('clans:clan_list'), {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {'name', 'description'})

    def test_list_only_has_clans_of_caller(self) -> None:
        create_clan(self.outsider, name='Elsewhere')

        response = self.client.get(reverse('clans:clan_list'))

        self.assertEqual([clan['name'] for clan in response.data], ['Night Riders'])

    def test_detail_lists_members_and_hides_foreign_clans(self) -> None:
        foreign = create_clan(self.outsider, name='Elsewhere')

        own = self.client.get(reverse('clans:clan_detail', args=[self.clan.pk]))
        other = self.client.get(reverse('clans:clan_detail', args=[foreign.pk]))

        self.assertEqual([member['username'] for member in own.data['members']], ['member'])
        self.assertEqual(other.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_is_rejected(self) -> None:
        response = APIClient().get(reverse('clans:clan_list'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class NoticeApiTests(ClanApiTestCase):
    def test_member_posts_notice_as_author(self) -> None:
        response = self.client.post(
            reverse('clans:clan_notice_list', args=[self.clan.pk]),
            {'title': 'Fuel stop', 'description': 'North station.'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        notice = ClanNotice.objects.get()
        self.assertEqual((notice.clan, notice.author), (self.clan, self.member))
        self.assertEqual(response.data['clan_name'], 'Night Riders')

    def test_non_member_can_neither_read_nor_post(self) -> None:
        self.client.force_authenticate(self.outsider)
        url = reverse('clans:clan_notice_list', args=[self.clan.pk])

        read = self.client.get(url)
        write = self.client.post(url, {'title': 'x', 'description': 'y'}, format='json')

        self.assertEqual(read.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(write.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(ClanNotice.objects.exists())

    def test_clan_notices_are_newest_first(self) -> None:
        for title in ('first', 'second'):
            ClanNotice.objects.create(clan=self.clan, author=self.member, title=title, description='x')

        response = self.client.get(reverse('clans:clan_notice_list', args=[self.clan.pk]))

        self.assertEqual([notice['title'] for notice in response.data], ['second', 'first'])

    def test_feed_has_notices_of_every_subscribed_clan_only(self) -> None:
        second = create_clan(self.outsider, name='Dawn Patrol')
        second.users.add(self.member)
        foreign = create_clan(self.outsider, name='Elsewhere')
        for clan in (self.clan, second, foreign):
            ClanNotice.objects.create(clan=clan, author=self.outsider, title=clan.name, description='x')

        response = self.client.get(reverse('clans:feed_notice_list'))

        self.assertEqual([notice['title'] for notice in response.data], ['Dawn Patrol', 'Night Riders'])


class NoticeRouteTests(ClanApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.route = Route.objects.create(name='Sunday loop', points=ROUTE_POINTS, author=self.member)
        self.foreign_route = Route.objects.create(name='Theirs', points=ROUTE_POINTS, author=self.outsider)
        self.list_url = reverse('clans:clan_notice_list', args=[self.clan.pk])

    def test_member_attaches_own_route_when_posting(self) -> None:
        response = self.client.post(
            self.list_url, {'title': 'Ride', 'description': 'Join.', 'route_id': str(self.route.pk)}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ClanNotice.objects.get().route, self.route)
        self.assertEqual(response.data['route']['name'], 'Sunday loop')
        self.assertEqual(set(response.data['route']), {'id', 'name', 'distance', 'estimated_time'})

    def test_cannot_attach_a_route_of_someone_else(self) -> None:
        response = self.client.post(
            self.list_url,
            {'title': 'Ride', 'description': 'Join.', 'route_id': str(self.foreign_route.pk)}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('route_id', response.data)
        self.assertFalse(ClanNotice.objects.exists())

    def test_notice_without_route_has_none(self) -> None:
        response = self.client.post(self.list_url, {'title': 'Hi', 'description': 'All.'}, format='json')

        self.assertIsNone(response.data['route'])

    def test_deleting_the_route_keeps_the_notice(self) -> None:
        notice = ClanNotice.objects.create(
            clan=self.clan, author=self.member, title='Ride', description='x', route=self.route,
        )

        self.route.delete()

        notice.refresh_from_db()
        self.assertIsNone(notice.route)


class NoticeUpdateTests(ClanApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.notice = ClanNotice.objects.create(
            clan=self.clan, author=self.member, title='Old', description='Old text.',
        )
        self.route = Route.objects.create(name='Sunday loop', points=ROUTE_POINTS, author=self.member)
        self.url = reverse('clans:clan_notice_update', args=[self.clan.pk, self.notice.pk])

    def test_author_edits_text_and_attaches_a_route(self) -> None:
        response = self.client.patch(
            self.url, {'title': 'New', 'description': 'New text.', 'route_id': str(self.route.pk)}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notice.refresh_from_db()
        self.assertEqual((self.notice.title, self.notice.description), ('New', 'New text.'))
        self.assertEqual(self.notice.route, self.route)
        self.assertEqual(response.data['route']['id'], str(self.route.pk))

    def test_author_detaches_the_route_with_null(self) -> None:
        self.notice.route = self.route
        self.notice.save()

        response = self.client.patch(self.url, {'route_id': None}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notice.refresh_from_db()
        self.assertIsNone(self.notice.route)

    def test_edit_cannot_move_the_notice_or_change_its_author(self) -> None:
        other_clan = create_clan(self.member, name='Other')

        self.client.patch(self.url, {'clan': other_clan.pk, 'author': self.outsider.pk}, format='json')

        self.notice.refresh_from_db()
        self.assertEqual((self.notice.clan, self.notice.author), (self.clan, self.member))

    def test_other_member_cannot_edit(self) -> None:
        self.clan.users.add(self.outsider)
        self.client.force_authenticate(self.outsider)

        response = self.client.patch(self.url, {'title': 'Hijacked'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.notice.refresh_from_db()
        self.assertEqual(self.notice.title, 'Old')

    def test_non_member_gets_404(self) -> None:
        self.client.force_authenticate(self.outsider)

        response = self.client.patch(self.url, {'title': 'Hijacked'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_notice_of_another_clan_is_404_under_this_clan(self) -> None:
        other_clan = create_clan(self.member, name='Other')
        url = reverse('clans:clan_notice_update', args=[other_clan.pk, self.notice.pk])

        response = self.client.patch(url, {'title': 'x'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_notice_is_not_deletable_or_replaceable(self) -> None:
        self.assertEqual(self.client.delete(self.url).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.put(self.url, {}, format='json').status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class InvitationApiTests(ClanApiTestCase):
    def _invite(self, username: str) -> object:
        return self.client.post(
            reverse('clans:clan_invitation_create', args=[self.clan.pk]), {'username': username}, format='json',
        )

    def test_member_invites_user_by_username(self) -> None:
        response = self._invite('outsider')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invitation = ClanInvitation.objects.get()
        self.assertEqual((invitation.invitee, invitation.invited_by), (self.outsider, self.member))
        self.assertEqual(response.data['invitee']['username'], 'outsider')

    def test_rejects_unknown_member_and_duplicate(self) -> None:
        self._invite('outsider')

        for username in ('nobody', 'member', 'outsider'):
            with self.subTest(username=username):
                response = self._invite(username)

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('username', response.data)
        self.assertEqual(ClanInvitation.objects.count(), 1)

    def test_non_member_cannot_invite(self) -> None:
        self.client.force_authenticate(self.outsider)

        response = self._invite('outsider')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invitee_sees_and_accepts_invitation(self) -> None:
        invitation = ClanInvitation.objects.create(clan=self.clan, invited_by=self.member, invitee=self.outsider)
        self.client.force_authenticate(self.outsider)

        listed = self.client.get(reverse('clans:invitation_list'))
        accepted = self.client.post(reverse('clans:invitation_accept', args=[invitation.pk]))

        self.assertEqual(listed.data[0]['clan_name'], 'Night Riders')
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertIn(self.outsider, self.clan.users.all())
        self.assertFalse(ClanInvitation.objects.exists())

    def test_invitee_declines_invitation(self) -> None:
        invitation = ClanInvitation.objects.create(clan=self.clan, invited_by=self.member, invitee=self.outsider)
        self.client.force_authenticate(self.outsider)

        response = self.client.delete(reverse('clans:invitation_decline', args=[invitation.pk]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertNotIn(self.outsider, self.clan.users.all())
        self.assertFalse(ClanInvitation.objects.exists())

    def test_others_cannot_answer_an_invitation(self) -> None:
        invitation = ClanInvitation.objects.create(clan=self.clan, invited_by=self.member, invitee=self.outsider)

        accept = self.client.post(reverse('clans:invitation_accept', args=[invitation.pk]))
        decline = self.client.delete(reverse('clans:invitation_decline', args=[invitation.pk]))

        self.assertEqual(accept.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(decline.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ClanInvitation.objects.exists())
