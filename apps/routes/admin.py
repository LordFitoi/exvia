from django import forms
from django.contrib import admin

from apps.routes.models import MAX_GROUP_PARTICIPANTS, Route, RouteGroup, RouteSummary


class RouteGroupAdminForm(forms.ModelForm):
    def clean_participants(self):
        participants = self.cleaned_data['participants']
        if len(participants) > MAX_GROUP_PARTICIPANTS:
            raise forms.ValidationError(f'A group has at most {MAX_GROUP_PARTICIPANTS} participants.')
        return participants


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'author', 'distance', 'estimated_time', 'created_at')
    search_fields = ('name', 'description', 'author__username')
    readonly_fields = ('distance', 'estimated_time', 'created_at', 'updated_at')
    autocomplete_fields = ('author',)


@admin.register(RouteSummary)
class RouteSummaryAdmin(admin.ModelAdmin):
    list_display = ('route', 'author', 'start_at', 'end_at', 'duration')
    search_fields = ('route__name', 'participants__username')
    readonly_fields = ('duration', 'created_at', 'updated_at')
    autocomplete_fields = ('route', 'author', 'participants')


@admin.register(RouteGroup)
class RouteGroupAdmin(admin.ModelAdmin):
    form = RouteGroupAdminForm
    list_display = ('id', 'route', 'author', 'created_at')
    search_fields = ('route__name', 'author__username', 'participants__username')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('route', 'author', 'participants')
