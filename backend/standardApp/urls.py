from django.urls import path
from . import views

urlpatterns = [
    # Buyer endpoints
    path('buyer/standards/create/', views.create_crop_standard, name='create_crop_standard'),
    path('buyer/standards/', views.get_buyer_standards, name='get_buyer_standards'),
    path('buyer/standards/summary/', views.get_buyer_standards_summary, name='get_buyer_standards_summary'),
    path('buyer/standards/<int:standard_id>/', views.get_buyer_standard_detail, name='get_buyer_standard_detail'),
    path('buyer/standards/<int:standard_id>/update/', views.update_crop_standard, name='update_crop_standard'),
    path('buyer/standards/<int:standard_id>/delete/', views.delete_crop_standard, name='delete_crop_standard'),

    # Admin endpoints
    path('admin/standards/create/', views.admin_create_crop_standard, name='admin_create_crop_standard'),
    path('admin/standards/', views.admin_list_standards, name='admin_list_standards'),
    path('admin/standards/summary/', views.admin_get_standards_summary, name='admin_get_standards_summary'),
    path('admin/standards/<int:standard_id>/', views.admin_get_standard_detail, name='admin_get_standard_detail'),
    path('admin/standards/<int:standard_id>/update/', views.admin_update_crop_standard, name='admin_update_crop_standard'),
    path('admin/standards/<int:standard_id>/delete/', views.admin_delete_crop_standard, name='admin_delete_crop_standard'),

    # Public endpoints (for farmers)
    path('standards/active/', views.get_active_standards, name='get_active_standards'),
]