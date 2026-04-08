from django.urls import path
from . import views

urlpatterns = [
    # ── Contract CRUD ─────────────────────────────────────────────────────
    path('create/', views.create_contract, name='contract-create'),
    path('<int:contract_id>/', views.get_contract, name='contract-detail'),
    path('<int:contract_id>/update/', views.update_contract, name='contract-update'),
    path('<int:contract_id>/delete/', views.delete_contract, name='contract-delete'),

    # ── Contract lists ───────────────────────────────────────────────────
    path('contracts/', views.get_all_contracts, name='contract-list-admin'),
    path('my/', views.get_my_contracts, name='contract-list-mine'),

    # ── Contract actions ─────────────────────────────────────────────────
    path('<int:contract_id>/accept/', views.accept_contract, name='contract-accept'),
    path('<int:contract_id>/reject/', views.reject_contract, name='contract-reject'),
    path('<int:contract_id>/confirm/', views.confirm_contract, name='contract-confirm'),
    path('<int:contract_id>/complete/', views.complete_contract, name='contract-complete'),
    path('<int:contract_id>/fail/', views.fail_contract, name='contract-fail'),

    # ── Delivery management ──────────────────────────────────────────────
    path('<int:contract_id>/delivery/', views.get_delivery_status, name='contract-delivery-status'),
    path('<int:contract_id>/delivery/start/', views.start_delivery, name='contract-delivery-start'),
    path('<int:contract_id>/delivery/complete/', views.complete_delivery, name='contract-delivery-complete'),
    path('<int:contract_id>/delivery/fail/', views.fail_delivery, name='contract-delivery-fail'),
    path('<int:contract_id>/delivery/update/', views.update_delivery, name='contract-delivery-update'),
    

    # ── Payment management ───────────────────────────────────────────────
    path('<int:contract_id>/payments/', views.get_contract_payments, name='contract-payments'),
    path('<int:contract_id>/payments/add/', views.add_payment, name='contract-payment-add'),
    path('payments/<int:payment_id>/confirm/', views.confirm_payment, name='payment-confirm'),
    path('payments/<int:payment_id>/reject/', views.reject_payment, name='payment-reject'),

    # ── Activity log ─────────────────────────────────────────────────────
    path('<int:contract_id>/activities/', views.get_contract_activities, name='contract-activities'),
]