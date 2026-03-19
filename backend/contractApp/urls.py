from django.urls import path
from . import views

urlpatterns = [
    # ── Contract CRUD ─────────────────────────────────────────────────────
    path('contracts/create/',                   views.create_contract,        name='contract-create'),
    path('contracts/<int:contract_id>/',         views.get_contract,           name='contract-detail'),
    path('contracts/<int:contract_id>/update/',  views.update_contract,        name='contract-update'),
    path('contracts/<int:contract_id>/delete/',  views.delete_contract,        name='contract-delete'),

    # ── Admin list ────────────────────────────────────────────────────────
    path('contracts/',                           views.get_all_contracts,      name='contract-list-admin'),

    # ── User's own contracts ──────────────────────────────────────────────
    path('contracts/my/',                        views.get_my_contracts,       name='contract-list-mine'),

    # ── Status actions ────────────────────────────────────────────────────
    path('contracts/<int:contract_id>/accept/',   views.accept_contract,       name='contract-accept'),
    path('contracts/<int:contract_id>/reject/',   views.reject_contract,       name='contract-reject'),
    path('contracts/<int:contract_id>/complete/', views.complete_contract,     name='contract-complete'),
    path('contracts/<int:contract_id>/fail/',     views.fail_contract,         name='contract-fail'),

    # ── Delivery ──────────────────────────────────────────────────────────
    path('contracts/<int:contract_id>/delivery/',        views.get_delivery_status,    name='contract-delivery-status'),
    path('contracts/<int:contract_id>/delivery/update/', views.update_delivery_status, name='contract-delivery-update'),

    # ── Payments ──────────────────────────────────────────────────────────
    path('contracts/<int:contract_id>/payments/',        views.get_contract_payments,  name='contract-payments'),
    path('contracts/<int:contract_id>/payments/add/',    views.add_payment,            name='contract-payment-add'),
    path('payments/<int:payment_id>/confirm/',           views.confirm_payment,        name='payment-confirm'),
    path('payments/<int:payment_id>/reject/',            views.reject_payment,         name='payment-reject'),
]