from django.contrib import admin

from apps.places.models import PlaceLocation


@admin.register(PlaceLocation)
class PlaceLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'author', 'lat', 'lng', 'created_at')
    list_filter = ('category',)
    search_fields = ('name', 'author__username')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('author',)
