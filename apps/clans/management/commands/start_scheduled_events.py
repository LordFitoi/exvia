import time
from argparse import ArgumentParser
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.clans.event_service import start_due_events


class Command(BaseCommand):
    help = (
        'Starts the clan events whose time has come. Once by default; with --interval it keeps running and '
        'looks again every that many seconds. Several copies at once are safe.'
    )

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument('--interval', type=int, default=None, help='Seconds between checks; omit to run once.')

    def handle(self, *args: Any, **options: Any) -> None:
        while True:
            started = start_due_events(timezone.now())
            self.stdout.write(f'Started {started} event(s).')
            if options['interval'] is None:
                return
            time.sleep(options['interval'])
