from rest_framework import serializers

from apps.places.models import PlaceLocation


class PlaceLocationSerializer(serializers.ModelSerializer):
    """A saved place; the client sends `name`, `notes`, `category`, `lat` and `lng`."""

    lat = serializers.DecimalField(
        max_digits=9, decimal_places=6, min_value=-90, max_value=90, coerce_to_string=False,
    )
    lng = serializers.DecimalField(
        max_digits=9, decimal_places=6, min_value=-180, max_value=180, coerce_to_string=False,
    )

    class Meta:
        model = PlaceLocation
        fields = ('id', 'name', 'notes', 'category', 'lat', 'lng', 'created_at')
        read_only_fields = ('id', 'created_at')
