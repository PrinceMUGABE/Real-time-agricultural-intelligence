from django.urls import path
from userApp import views

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────
    path('register/',                   views.register_user),
    path('register/verify-otp/',        views.verify_register_otp),
    path('register/resend-otp/',        views.resend_register_otp),
    path('login/',                      views.login_user),
    path('logout/',                     views.logout_user),
    path('token/verify/',               views.verify_token),
    path('token/refresh/',              views.refresh_token),

    # ── Password ───────────────────────────────────────────────────────────
    path('forget-password/',            views.forget_password),
    path('forget-password/verify-otp/', views.verify_forget_password_otp),
    path('forget-password/resend-otp/', views.resend_forget_password_otp),

    # ── Profile ────────────────────────────────────────────────────────────
    path('profile/',                         views.get_profile),
    path('profile/update/',                  views.update_profile),
    path('profile/change-password/',         views.change_password),
    path('profile/language/',                views.set_language),   # ← NEW

    # ── Admin ──────────────────────────────────────────────────────────────
    path('users/',                     views.list_all_users),
    path('users/buyers/',              views.list_all_buyers),  # ← NEW
    path('users/create/',              views.admin_create_user),
    path('users/<int:user_id>/',       views.get_user_by_id),
    path('users/<int:user_id>/update/', views.update_user),
    path('users/<int:user_id>/activate/',   views.activate_user),
    path('users/<int:user_id>/deactivate/', views.deactivate_user),
    path('users/<int:user_id>/delete/', views.delete_user),

    # ── Contact ────────────────────────────────────────────────────────────
    path('contact/',                         views.contact_us),
]