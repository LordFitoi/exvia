from django.contrib import admin

from apps.routes.models import Route


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'author', 'distance', 'estimated_time', 'created_at')
    search_fields = ('name', 'description', 'author__username')
    readonly_fields = ('distance', 'estimated_time', 'created_at', 'updated_at')
    autocomplete_fields = ('author',)
