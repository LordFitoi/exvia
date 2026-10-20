from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.db.models import QuerySet
from django.http import HttpRequest

from apps.users.models import Contact, UserProfile, Vehicle


class ContactInline(admin.TabularInline):
    model = Contact
    extra = 0


class VehicleInline(admin.TabularInline):
    model = Vehicle
    extra = 0


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'blood_type', 'created_at', 'updated_at')
    list_filter = ('blood_type',)
    search_fields = ('user__username', 'user__email', 'description')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('user',)
    inlines = (ContactInline, VehicleInline)


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False


admin.site.unregister(User)


@admin.register(User)
class ProfileUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)
    list_display = (*UserAdmin.list_display, 'is_active')
    actions = ('approve_accounts',)

    @admin.action(description='Approve selected accounts')
    def approve_accounts(self, request: HttpRequest, queryset: QuerySet[User]) -> None:
        approved_count = queryset.filter(is_active=False).update(is_active=True)
        self.message_user(request, f'Approved {approved_count} account(s).', messages.SUCCESS)

    def get_inline_instances(self, request: HttpRequest, obj: User | None = None) -> list:
        """Hide the profile on the add form: the signal creates it on save."""
        if obj is None:
            return []
        return super().get_inline_instances(request, obj)
