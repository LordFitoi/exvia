from datetime import datetime, timezone

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus

RECEIVED_AT = datetime(2026, 10, 18, 9, 30, tzinfo=timezone.utc)
RIDER_ID = 7


class CleanPositionTests(SimpleTestCase):
    def test_keeps_the_fields_and_stamps_the_reception_time(self) -> None:
        position = group_meta.clean_position(
            {'lng': -3.7, 'lat': 40.4, 'heading': 90, 'speed': 25.5, 'accuracy': 8, 'extra': 'dropped'},
            RECEIVED_AT,
        )
        self.assertEqual(position, {
            'lng': -3.7, 'lat': 40.4, 'heading': 90, 'speed': 25.5, 'accuracy': 8,
            'recorded_at': '2026-10-18T09:30:00+00:00',
        })

    def test_optional_fields_default_to_none(self) -> None:
        position = group_meta.clean_position({'lng': 0, 'lat': 0}, RECEIVED_AT)
        self.assertEqual([position['heading'], position['speed'], position['accuracy']], [None] * 3)

    def test_rejects_bad_positions(self) -> None:
        bad_positions = [
            'here', {'lng': 0}, {'lng': 181, 'lat': 0}, {'lng': 0, 'lat': True},
            {'lng': 0, 'lat': 0, 'heading': 361}, {'lng': 0, 'lat': 0, 'speed': -1},
            {'lng': 0, 'lat': 0, 'accuracy': 'high'},
        ]
        for raw in bad_positions:
            with self.subTest(raw=raw), self.assertRaises(ValidationError):
                group_meta.clean_position(raw, RECEIVED_AT)


class ValidateGroupMetaTests(SimpleTestCase):
    def test_accepts_an_empty_group_and_a_full_one(self) -> None:
        position = group_meta.clean_position({'lng': 1, 'lat': 2}, RECEIVED_AT)
        group_meta.validate_group_meta({})
        group_meta.validate_group_meta({
            'version': 1,
            'participants': {
                '1': {'status': 'accepted', 'position': position},
                '2': {'status': 'invited', 'position': None},
            },
        })

    def test_rejects_malformed_meta(self) -> None:
        valid_position = group_meta.clean_position({'lng': 1, 'lat': 2}, RECEIVED_AT)
        malformed = [
            [], {'version': 2}, {'participants': []}, {'participants': {'x': {'status': 'invited'}}},
            {'participants': {'1': 'invited'}}, {'participants': {'1': {'status': 'gone'}}},
            {'participants': {'1': {'status': 'invited', 'position': {'lng': 1, 'lat': 2}}}},
            {'participants': {'1': {'status': 'invited', 'position': {**valid_position, 'lat': 99}}}},
        ]
        for meta in malformed:
            with self.subTest(meta=meta), self.assertRaises(ValidationError):
                group_meta.validate_group_meta(meta)


class MetaHelpersTests(SimpleTestCase):
    def test_set_status_adds_the_user_without_a_position(self) -> None:
        meta: dict = {}
        group_meta.set_status(meta, RIDER_ID, ParticipantStatus.INVITED)
        self.assertEqual(meta, {
            'version': 1, 'participants': {'7': {'status': 'invited', 'position': None}},
        })
        group_meta.validate_group_meta(meta)

    def test_set_status_keeps_the_position(self) -> None:
        meta: dict = {}
        group_meta.set_status(meta, RIDER_ID, ParticipantStatus.ACCEPTED)
        position = group_meta.clean_position({'lng': 1, 'lat': 2}, RECEIVED_AT)
        group_meta.set_position(meta, RIDER_ID, position)
        group_meta.set_status(meta, RIDER_ID, ParticipantStatus.REJECTED)
        self.assertEqual(group_meta.get_status(meta, RIDER_ID), ParticipantStatus.REJECTED)
        self.assertEqual(group_meta.get_positions(meta), {'7': position})

    def test_get_status_of_an_unknown_user_is_none(self) -> None:
        self.assertIsNone(group_meta.get_status({}, RIDER_ID))

    def test_set_position_of_an_unknown_user_raises(self) -> None:
        with self.assertRaises(KeyError):
            group_meta.set_position({'participants': {}}, RIDER_ID, {})

    def test_positions_skip_participants_without_one(self) -> None:
        meta: dict = {}
        group_meta.set_status(meta, 1, ParticipantStatus.INVITED)
        self.assertEqual(group_meta.get_positions(meta), {})
