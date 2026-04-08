TRANSLATIONS = {
    'en': {
        # Contract creation
        'contract_created': 'Contract created successfully.',
        'contract_not_found': 'Contract not found.',
        'contract_updated': 'Contract updated successfully.',
        'contract_deleted': 'Contract deleted successfully.',
        'contract_accepted': 'Contract accepted.',
        'contract_rejected': 'Contract rejected.',
        'contract_confirmed': 'Contract confirmed by admin.',
        'contract_completed': 'Contract marked as completed.',
        'contract_failed': 'Contract marked as failed.',
        'only_party_can_create': 'Only the buyer or farmer can create a contract.',
        
        # Status messages
        'already_accepted': 'You have already accepted this contract.',
        'already_rejected': 'You have already rejected this contract.',
        'cannot_accept': 'Only the farmer or buyer can accept this contract.',
        'cannot_reject': 'Only the farmer or buyer can reject this contract.',
        'cannot_complete': 'Only an admin can mark a contract as completed.',
        'cannot_fail': 'Only an admin can mark a contract as failed.',
        'cannot_delete': 'You do not have permission to delete this contract.',
        'cannot_update': 'You do not have permission to update this contract.',
        'cannot_make_payment': 'Contract must be confirmed by admin before payments can be made.',
        'cannot_start_delivery': 'Contract must be confirmed and payment started before delivery.',
        
        # Payment messages
        'payment_exceeds_balance': 'This payment exceeds the remaining balance.',
        'payment_added': 'Payment recorded successfully.',
        'payment_confirmed': 'Payment confirmed successfully.',
        'payment_rejected': 'Payment rejected.',
        'payment_not_found': 'Payment record not found.',
        'payment_already_resolved': 'This payment has already been confirmed or rejected.',
        
        # Delivery messages
        'delivery_started': 'Delivery process started.',
        'delivery_completed': 'Delivery completed successfully.',
        'delivery_failed': 'Delivery marked as failed.',
        'delivery_not_in_progress': 'Delivery is not in progress.',
        
        # Permission messages
        'no_permission': 'You do not have permission to perform this action.',
        'invalid_data': 'Invalid data provided.',
        'contract_already_done': 'This contract is already completed or failed.',
        
        # Party messages
        'farmer_accepted': 'Farmer has accepted the contract.',
        'buyer_accepted': 'Buyer has accepted the contract.',
        'farmer_rejected': 'Farmer has rejected the contract.',
        'buyer_rejected': 'Buyer has rejected the contract.',
        
        # Notification titles and bodies
        'notif_contract_created_title': 'New Contract Created',
        'notif_contract_created_body': 'A new contract #{id} for {crop} has been created by {creator} ({role}). Quantity: {quantity}kg at {price}/kg. Total: {total}.',
        
        'notif_contract_updated_title': 'Contract Updated',
        'notif_contract_updated_body': 'Contract #{id} for {crop} has been updated. Changes: {changes}.',
        
        'notif_contract_deleted_title': 'Contract Cancelled',
        'notif_contract_deleted_body': 'Contract #{id} for {crop} has been cancelled.',
        
        'notif_contract_both_accepted_title': 'Contract Awaiting Admin Confirmation',
        'notif_contract_both_accepted_body': 'Contract #{id} for {crop} has been accepted by both parties and is awaiting admin confirmation.',
        
        'notif_contract_confirmed_title': 'Contract Confirmed',
        'notif_contract_confirmed_body': 'Contract #{id} for {crop} has been confirmed by admin. You can now make payments.',
        
        'notif_contract_completed_title': 'Contract Completed',
        'notif_contract_completed_body': 'Contract #{id} for {crop} has been marked as completed.',
        
        'notif_contract_failed_title': 'Contract Failed',
        'notif_contract_failed_body': 'Contract #{id} for {crop} has been marked as failed. Reason: {reason}.',
        
        'notif_contract_fully_paid_title': 'Contract Fully Paid',
        'notif_contract_fully_paid_body': 'Contract #{id} for {crop} has been fully paid.',
        
        # Accept/Reject notifications
        'notif_farmer_accepted_title': 'Farmer Accepted Contract',
        'notif_farmer_accepted_body': 'The farmer has accepted contract #{id} for {crop}.',
        'notif_buyer_accepted_title': 'Buyer Accepted Contract',
        'notif_buyer_accepted_body': 'The buyer has accepted contract #{id} for {crop}.',
        'notif_farmer_rejected_title': 'Farmer Rejected Contract',
        'notif_farmer_rejected_body': 'The farmer has rejected contract #{id} for {crop}.',
        'notif_buyer_rejected_title': 'Buyer Rejected Contract',
        'notif_buyer_rejected_body': 'The buyer has rejected contract #{id} for {crop}.',
        
        # Payment notifications
        'notif_payment_submitted_title': 'Payment Submitted',
        'notif_payment_submitted_body': 'A payment of {amount} has been submitted for contract #{id} ({crop}). Remaining balance: {balance}.',
        'notif_payment_confirmed_title': 'Payment Confirmed',
        'notif_payment_confirmed_body': 'Your payment of {amount} for contract #{id} ({crop}) has been confirmed. Remaining balance: {balance}.',
        'notif_payment_rejected_title': 'Payment Rejected',
        'notif_payment_rejected_body': 'Your payment of {amount} for contract #{id} ({crop}) was rejected. Reason: {reason}.',
        
        # Delivery notifications
        'notif_delivery_started_title': 'Delivery Started',
        'notif_delivery_started_body': 'The delivery for contract #{id} ({crop}) has started.',
        'notif_delivery_completed_title': 'Delivery Completed',
        'notif_delivery_completed_body': 'The delivery for contract #{id} ({crop}) has been completed.',
        'notif_delivery_failed_title': 'Delivery Failed',
        'notif_delivery_failed_body': 'The delivery for contract #{id} ({crop}) has failed. Reason: {reason}.',
    },
    
    "fr": {
        "contract_created": "Contrat créé avec succès.",
        "contract_not_found": "Contrat non trouvé.",
        "contract_updated": "Contrat mis à jour avec succès.",
        "contract_deleted": "Contrat supprimé avec succès.",
        "contract_accepted": "Contrat accepté.",
        "contract_rejected": "Contrat rejeté.",
        "contract_confirmed": "Contrat confirmé par l'administrateur.",
        "contract_completed": "Contrat marqué comme terminé.",
        "contract_failed": "Contrat marqué comme échoué.",
        "only_party_can_create": "Seul l'acheteur ou l'agriculteur peut créer un contrat.",
        
        "already_accepted": "Vous avez déjà accepté ce contrat.",
        "already_rejected": "Vous avez déjà rejeté ce contrat.",
        "cannot_accept": "Seul l'agriculteur ou l'acheteur peut accepter ce contrat.",
        "cannot_reject": "Seul l'agriculteur ou l'acheteur peut rejeter ce contrat.",
        "cannot_complete": "Seul un administrateur peut marquer un contrat comme terminé.",
        "cannot_fail": "Seul un administrateur peut marquer un contrat comme échoué.",
        "cannot_delete": "Vous n'avez pas la permission de supprimer ce contrat.",
        "cannot_update": "Vous n'avez pas la permission de mettre à jour ce contrat.",
        "cannot_make_payment": "Le contrat doit être confirmé par l'administrateur avant que les paiements puissent être effectués.",
        "cannot_start_delivery": "Le contrat doit être confirmé et le paiement commencé avant la livraison.",
        
        "payment_exceeds_balance": "Ce paiement dépasse le solde restant.",
        "payment_added": "Paiement enregistré avec succès.",
        "payment_confirmed": "Paiement confirmé avec succès.",
        "payment_rejected": "Paiement rejeté.",
        "payment_not_found": "Enregistrement de paiement non trouvé.",
        "payment_already_resolved": "Ce paiement a déjà été confirmé ou rejeté.",
        
        "delivery_started": "Processus de livraison démarré.",
        "delivery_completed": "Livraison terminée avec succès.",
        "delivery_failed": "Livraison marquée comme échouée.",
        "delivery_not_in_progress": "La livraison n'est pas en cours.",
        
        "no_permission": "Vous n'avez pas la permission d'effectuer cette action.",
        "invalid_data": "Données fournies invalides.",
        "contract_already_done": "Ce contrat est déjà terminé ou a échoué.",
        
        "farmer_accepted": "L'agriculteur a accepté le contrat.",
        "buyer_accepted": "L'acheteur a accepté le contrat.",
        "farmer_rejected": "L'agriculteur a rejeté le contrat.",
        "buyer_rejected": "L'acheteur a rejeté le contrat.",
        
        "notif_contract_created_title": "Nouveau contrat créé",
        "notif_contract_created_body": "Un nouveau contrat #{id} pour {crop} a été créé par {creator} ({role}). Quantité: {quantity}kg à {price}/kg. Total: {total}.",
        
        "notif_contract_updated_title": "Contrat mis à jour",
        "notif_contract_updated_body": "Le contrat #{id} pour {crop} a été mis à jour. Modifications: {changes}.",
        
        "notif_contract_deleted_title": "Contrat annulé",
        "notif_contract_deleted_body": "Le contrat #{id} pour {crop} a été annulé.",
        
        "notif_contract_both_accepted_title": "Contrat en attente de confirmation admin",
        "notif_contract_both_accepted_body": "Le contrat #{id} pour {crop} a été accepté par les deux parties et attend la confirmation de l'administrateur.",
        
        "notif_contract_confirmed_title": "Contrat confirmé",
        "notif_contract_confirmed_body": "Le contrat #{id} pour {crop} a été confirmé par l'administrateur. Vous pouvez maintenant effectuer des paiements.",
        
        "notif_contract_completed_title": "Contrat terminé",
        "notif_contract_completed_body": "Le contrat #{id} pour {crop} a été marqué comme terminé.",
        
        "notif_contract_failed_title": "Contrat échoué",
        "notif_contract_failed_body": "Le contrat #{id} pour {crop} a été marqué comme échoué. Raison: {reason}.",
        
        "notif_contract_fully_paid_title": "Contrat entièrement payé",
        "notif_contract_fully_paid_body": "Le contrat #{id} pour {crop} a été entièrement payé.",
        
        "notif_farmer_accepted_title": "L'agriculteur a accepté le contrat",
        "notif_farmer_accepted_body": "L'agriculteur a accepté le contrat #{id} pour {crop}.",
        "notif_buyer_accepted_title": "L'acheteur a accepté le contrat",
        "notif_buyer_accepted_body": "L'acheteur a accepté le contrat #{id} pour {crop}.",
        "notif_farmer_rejected_title": "L'agriculteur a rejeté le contrat",
        "notif_farmer_rejected_body": "L'agriculteur a rejeté le contrat #{id} pour {crop}.",
        "notif_buyer_rejected_title": "L'acheteur a rejeté le contrat",
        "notif_buyer_rejected_body": "L'acheteur a rejeté le contrat #{id} pour {crop}.",
        
        "notif_payment_submitted_title": "Paiement soumis",
        "notif_payment_submitted_body": "Un paiement de {amount} a été soumis pour le contrat #{id} ({crop}). Solde restant: {balance}.",
        "notif_payment_confirmed_title": "Paiement confirmé",
        "notif_payment_confirmed_body": "Votre paiement de {amount} pour le contrat #{id} ({crop}) a été confirmé. Solde restant: {balance}.",
        "notif_payment_rejected_title": "Paiement rejeté",
        "notif_payment_rejected_body": "Votre paiement de {amount} pour le contrat #{id} ({crop}) a été rejeté. Raison: {reason}.",
        
        "notif_delivery_started_title": "Livraison commencée",
        "notif_delivery_started_body": "La livraison pour le contrat #{id} ({crop}) a commencé.",
        "notif_delivery_completed_title": "Livraison terminée",
        "notif_delivery_completed_body": "La livraison pour le contrat #{id} ({crop}) a été terminée.",
        "notif_delivery_failed_title": "Livraison échouée",
        "notif_delivery_failed_body": "La livraison pour le contrat #{id} ({crop}) a échoué. Raison: {reason}."
    },
    
    "sw": {
        "contract_created": "Mkataba umeundwa kwa mafanikio.",
        "contract_not_found": "Mkataba haukupatikana.",
        "contract_updated": "Mkataba umesasishwa kwa mafanikio.",
        "contract_deleted": "Mkataba umefutwa kwa mafanikio.",
        "contract_accepted": "Mkataba umekubaliwa.",
        "contract_rejected": "Mkataba umekataliwa.",
        "contract_confirmed": "Mkataba umethibitishwa na msimamizi.",
        "contract_completed": "Mkataba umewekwa alama kuwa umekamilika.",
        "contract_failed": "Mkataba umewekwa alama kuwa umeshindikana.",
        "only_party_can_create": "Ni mnunuzi au mkulima pekee ndiye anaweza kuunda mkataba.",
        
        "already_accepted": "Tayari umekubali mkataba huu.",
        "already_rejected": "Tayari umekataa mkataba huu.",
        "cannot_accept": "Ni mkulima au mnunuzi pekee ndiye anaweza kukubali mkataba huu.",
        "cannot_reject": "Ni mkulima au mnunuzi pekee ndiye anaweza kukataa mkataba huu.",
        "cannot_complete": "Ni msimamizi pekee ndiye anaweza kuweka alama ya mkataba kuwa umekamilika.",
        "cannot_fail": "Ni msimamizi pekee ndiye anaweza kuweka alama ya mkataba kuwa umeshindikana.",
        "cannot_delete": "Huna ruhusa ya kufuta mkataba huu.",
        "cannot_update": "Huna ruhusa ya kusasisha mkataba huu.",
        "cannot_make_payment": "Mkataba lazima uthibitishwe na msimamizi kabla ya malipo kufanywa.",
        "cannot_start_delivery": "Mkataba lazima uthibitishwe na malipo yaanze kabla ya utoaji.",
        
        "payment_exceeds_balance": "Malipo haya yanazidi salio lililobaki.",
        "payment_added": "Malipo yamerekodiwa kwa mafanikio.",
        "payment_confirmed": "Malipo yamethibitishwa kwa mafanikio.",
        "payment_rejected": "Malipo yamekataliwa.",
        "payment_not_found": "Rekodi ya malipo haikupatikana.",
        "payment_already_resolved": "Malipo haya tayari yamethibitishwa au kukataliwa.",
        
        "delivery_started": "Mchakato wa utoaji umeanza.",
        "delivery_completed": "Utoaji umekamilika kwa mafanikio.",
        "delivery_failed": "Utoaji umewekwa alama kuwa umeshindikana.",
        "delivery_not_in_progress": "Utoaji haujaendelea.",
        
        "no_permission": "Huna ruhusa ya kufanya kitendo hiki.",
        "invalid_data": "Data iliyotolewa si sahihi.",
        "contract_already_done": "Mkataba huu tayari umekamilika au umeshindikana.",
        
        "farmer_accepted": "Mkulima amekubali mkataba.",
        "buyer_accepted": "Mnunuzi amekubali mkataba.",
        "farmer_rejected": "Mkulima amekataa mkataba.",
        "buyer_rejected": "Mnunuzi amekataa mkataba.",
        
        "notif_contract_created_title": "Mkataba Mpya Umeundwa",
        "notif_contract_created_body": "Mkataba mpya #{id} wa {crop} umeundwa na {creator} ({role}). Kiasi: {quantity}kg kwa {price}/kg. Jumla: {total}.",
        
        "notif_contract_updated_title": "Mkataba Umesasishwa",
        "notif_contract_updated_body": "Mkataba #{id} wa {crop} umesasishwa. Mabadiliko: {changes}.",
        
        "notif_contract_deleted_title": "Mkataba Umefutwa",
        "notif_contract_deleted_body": "Mkataba #{id} wa {crop} umefutwa.",
        
        "notif_contract_both_accepted_title": "Mkataba Unasubiri Uthibitisho wa Msimamizi",
        "notif_contract_both_accepted_body": "Mkataba #{id} wa {crop} umekubaliwa na pande zote mbili na unasubiri uthibitisho wa msimamizi.",
        
        "notif_contract_confirmed_title": "Mkataba Umethibitishwa",
        "notif_contract_confirmed_body": "Mkataba #{id} wa {crop} umethibitishwa na msimamizi. Sasa unaweza kufanya malipo.",
        
        "notif_contract_completed_title": "Mkataba Umekamilika",
        "notif_contract_completed_body": "Mkataba #{id} wa {crop} umewekwa alama kuwa umekamilika.",
        
        "notif_contract_failed_title": "Mkataba Umeshindikana",
        "notif_contract_failed_body": "Mkataba #{id} wa {crop} umewekwa alama kuwa umeshindikana. Sababu: {reason}.",
        
        "notif_contract_fully_paid_title": "Mkataba Umelipwa Kikamilifu",
        "notif_contract_fully_paid_body": "Mkataba #{id} wa {crop} umelipwa kikamilifu.",
        
        "notif_farmer_accepted_title": "Mkulima Amekubali Mkataba",
        "notif_farmer_accepted_body": "Mkulima amekubali mkataba #{id} wa {crop}.",
        "notif_buyer_accepted_title": "Mnunuzi Amekubali Mkataba",
        "notif_buyer_accepted_body": "Mnunuzi amekubali mkataba #{id} wa {crop}.",
        "notif_farmer_rejected_title": "Mkulima Amekataa Mkataba",
        "notif_farmer_rejected_body": "Mkulima amekataa mkataba #{id} wa {crop}.",
        "notif_buyer_rejected_title": "Mnunuzi Amekataa Mkataba",
        "notif_buyer_rejected_body": "Mnunuzi amekataa mkataba #{id} wa {crop}.",
        
        "notif_payment_submitted_title": "Malipo Yamewasilishwa",
        "notif_payment_submitted_body": "Malipo ya {amount} yamewasilishwa kwa mkataba #{id} ({crop}). Salio lililobaki: {balance}.",
        "notif_payment_confirmed_title": "Malipo Yamethibitishwa",
        "notif_payment_confirmed_body": "Malipo yako ya {amount} kwa mkataba #{id} ({crop}) yamethibitishwa. Salio lililobaki: {balance}.",
        "notif_payment_rejected_title": "Malipo Yamekataliwa",
        "notif_payment_rejected_body": "Malipo yako ya {amount} kwa mkataba #{id} ({crop}) yamekataliwa. Sababu: {reason}.",
        
        "notif_delivery_started_title": "Utoaji Umeanza",
        "notif_delivery_started_body": "Utoaji wa mkataba #{id} ({crop}) umeanza.",
        "notif_delivery_completed_title": "Utoaji Umekamilika",
        "notif_delivery_completed_body": "Utoaji wa mkataba #{id} ({crop}) umekamilika.",
        "notif_delivery_failed_title": "Utoaji Umeshindikana",
        "notif_delivery_failed_body": "Utoaji wa mkataba #{id} ({crop}) umeshindikana. Sababu: {reason}."
    },
    
    "rw": {
        "contract_created": "Amasezerano yashizweho neza.",
        "contract_not_found": "Amasezerano ntaboneka.",
        "contract_updated": "Amasezerano yahinduwe neza.",
        "contract_deleted": "Amasezerano yasibwe neza.",
        "contract_accepted": "Amasezerano yemewe.",
        "contract_rejected": "Amasezerano yanzwe.",
        "contract_confirmed": "Amasezerano yemejwe n'umuyobozi.",
        "contract_completed": "Amasezerano yashyizweho nk'arangiye.",
        "contract_failed": "Amasezerano yashyizweho nk'arananiranye.",
        "only_party_can_create": "Umuguzi cyangwa umuhinzi niwe ushobora gushyiraho amasezerano.",
        
        "already_accepted": "Uramaze kwemera aya masezerano.",
        "already_rejected": "Uramaze kwanga aya masezerano.",
        "cannot_accept": "Umuhinzi cyangwa umuguzi niwe ushobora kwemera aya masezerano.",
        "cannot_reject": "Umuhinzi cyangwa umuguzi niwe ushobora kwanga aya masezerano.",
        "cannot_complete": "Umuyobozi niwe ushobora gushyira amasezerano nk'arangiye.",
        "cannot_fail": "Umuyobozi niwe ushobora gushyira amasezerano nk'arananiranye.",
        "cannot_delete": "Ntabwo ubyemerewe gusiba aya masezerano.",
        "cannot_update": "Ntabwo ubyemerewe guhindura aya masezerano.",
        "cannot_make_payment": "Amasezerano agomba kwemezwa n'umuyobozi mbere y'uko amafaranga atangwa.",
        "cannot_start_delivery": "Amasezerano agomba kwemezwa kandi amafaranga atangwe mbere y'uko itangwa ritangira.",
        
        "payment_exceeds_balance": "Iki cyishyuza kirenze icyasigaye.",
        "payment_added": "Ishyuza ryanditswe neza.",
        "payment_confirmed": "Ishyuza ryemejwe neza.",
        "payment_rejected": "Ishyuza ryanzwe.",
        "payment_not_found": "Inyandiko y'ishyuza ntaboneka.",
        "payment_already_resolved": "Iki cyishyuza kirazemejwe cyangwa kikanzwe.",
        
        "delivery_started": "Itangwa ryatangiye.",
        "delivery_completed": "Itangwa ryarangiye neza.",
        "delivery_failed": "Itangwa ryashyizweho nk'ryananiwe.",
        "delivery_not_in_progress": "Itangwa ntirikomeza.",
        
        "no_permission": "Ntabwo ubyemerewe gukora iki gikorwa.",
        "invalid_data": "Amakuru yatanzwe ntabwo ari yo.",
        "contract_already_done": "Aya masezerano arangiye cyangwa arananiranye.",
        
        "farmer_accepted": "Umuhinzi yemeye amasezerano.",
        "buyer_accepted": "Umuguzi yemeye amasezerano.",
        "farmer_rejected": "Umuhinzi yanze amasezerano.",
        "buyer_rejected": "Umuguzi yanze amasezerano.",
        
        "notif_contract_created_title": "Amasezerano Mashya Yashizweho",
        "notif_contract_created_body": "Amasezerano mashya #{id} ya {crop} yashizweho na {creator} ({role}). Ingano: {quantity}kg kuri {price}/kg. Igiteranyo: {total}.",
        
        "notif_contract_updated_title": "Amasezerano Yahinduwe",
        "notif_contract_updated_body": "Amasezerano #{id} ya {crop} yahinduwe. Ibyahinduwe: {changes}.",
        
        "notif_contract_deleted_title": "Amasezerano Yasibwe",
        "notif_contract_deleted_body": "Amasezerano #{id} ya {crop} yasibwe.",
        
        "notif_contract_both_accepted_title": "Amasezerano Ategereje Kwemezwa N'umuyobozi",
        "notif_contract_both_accepted_body": "Amasezerano #{id} ya {crop} yemewe n'impande zombi kandi ategereje kwemezwa n'umuyobozi.",
        
        "notif_contract_confirmed_title": "Amasezerano Yemejwe",
        "notif_contract_confirmed_body": "Amasezerano #{id} ya {crop} yemejwe n'umuyobozi. Ushobora noneho gutanga amafaranga.",
        
        "notif_contract_completed_title": "Amasezerano Arangiye",
        "notif_contract_completed_body": "Amasezerano #{id} ya {crop} yashyizweho nk'arangiye.",
        
        "notif_contract_failed_title": "Amasezerano Arananiranye",
        "notif_contract_failed_body": "Amasezerano #{id} ya {crop} yashyizweho nk'arananiranye. Impamvu: {reason}.",
        
        "notif_contract_fully_paid_title": "Amasezerano Yarishyuwe Burundu",
        "notif_contract_fully_paid_body": "Amasezerano #{id} ya {crop} yarishyuwe burundu.",
        
        "notif_farmer_accepted_title": "Umuhinzi Yemeye Amasezerano",
        "notif_farmer_accepted_body": "Umuhinzi yemeye amasezerano #{id} ya {crop}.",
        "notif_buyer_accepted_title": "Umuguzi Yemeye Amasezerano",
        "notif_buyer_accepted_body": "Umuguzi yemeye amasezerano #{id} ya {crop}.",
        "notif_farmer_rejected_title": "Umuhinzi Yanze Amasezerano",
        "notif_farmer_rejected_body": "Umuhinzi yanze amasezerano #{id} ya {crop}.",
        "notif_buyer_rejected_title": "Umuguzi Yanze Amasezerano",
        "notif_buyer_rejected_body": "Umuguzi yanze amasezerano #{id} ya {crop}.",
        
        "notif_payment_submitted_title": "Ishyuza Ryatanzwe",
        "notif_payment_submitted_body": "Ishyuza rya {amount} ryatanzwe kuri masezerano #{id} ({crop}). Ikisigaye: {balance}.",
        "notif_payment_confirmed_title": "Ishyuza Ryemejwe",
        "notif_payment_confirmed_body": "Ishyuza ryawe rya {amount} kuri masezerano #{id} ({crop}) ryemejwe. Ikisigaye: {balance}.",
        "notif_payment_rejected_title": "Ishyuza Ryanzwe",
        "notif_payment_rejected_body": "Ishyuza ryawe rya {amount} kuri masezerano #{id} ({crop}) ryanzwe. Impamvu: {reason}.",
        
        "notif_delivery_started_title": "Itangwa Ryatangiye",
        "notif_delivery_started_body": "Itangwa ry'amasezerano #{id} ({crop}) ryatangiye.",
        "notif_delivery_completed_title": "Itangwa Ryarangiye",
        "notif_delivery_completed_body": "Itangwa ry'amasezerano #{id} ({crop}) ryarangiye.",
        "notif_delivery_failed_title": "Itangwa Ryananiwe",
        "notif_delivery_failed_body": "Itangwa ry'amasezerano #{id} ({crop}) ryananiwe. Impamvu: {reason}."
    }
    
}

def ct(key, lang='en', *args, **kwargs):
    """
    Get translation with optional formatting using positional or keyword arguments.
    
    Usage:
        ct('contract_created', 'en')
        ct('notif_contract_created_body', 'en', 
           crop='Maize', quantity=100, price=500, total=50000, id=1, creator='John', role='buyer')
    """
    lang_dict = TRANSLATIONS.get(lang, TRANSLATIONS.get('en', {}))
    text = lang_dict.get(key, key)
    
    # Try formatting with kwargs first, then positional args
    if kwargs and text != key:
        try:
            return text.format(**kwargs)
        except (KeyError, ValueError):
            pass
    
    if args and text != key:
        try:
            return text.format(*args)
        except (KeyError, ValueError, IndexError):
            pass
    
    return text

