"""
Crop Standard app translations for multi-language support.
Languages: English (en), French (fr), Swahili (sw), Kinyarwanda (rw)
"""

TRANSLATIONS = {
    # Success messages
    'standard_created': {
        'en': 'Crop standard created successfully',
        'fr': 'Norme de culture créée avec succès',
        'sw': 'Kiwango cha mazao kimeundwa kwa mafanikio',
        'rw': 'Igipimo cy\'imyaka cyashizweho neza',
    },
    'standard_updated': {
        'en': 'Crop standard updated successfully',
        'fr': 'Norme de culture mise à jour avec succès',
        'sw': 'Kiwango cha mazao kimesasishwa kwa mafanikio',
        'rw': 'Igipimo cy\'imyaka cyavuguruwe neza',
    },
    'standard_deleted': {
        'en': 'Crop standard deleted successfully',
        'fr': 'Norme de culture supprimée avec succès',
        'sw': 'Kiwango cha mazao kimefutwa kwa mafanikio',
        'rw': 'Igipimo cy\'imyaka cyakuweho neza',
    },
    'standard_not_found': {
        'en': 'Crop standard not found',
        'fr': 'Norme de culture non trouvée',
        'sw': 'Kiwango cha mazao hakikupatikana',
        'rw': 'Igipimo cy\'imyaka ntikiboneka',
    },

    # Validation errors
    'crop_name_required': {
        'en': 'Crop name is required',
        'fr': 'Le nom de la culture est requis',
        'sw': 'Jina la zao linahitajika',
        'rw': 'Izina ry\'imyaka rirakenewe',
    },
    'invalid_harvest_year': {
        'en': 'Harvest year must be between {min_year} and {max_year}',
        'fr': 'L\'année de récolte doit être comprise entre {min_year} et {max_year}',
        'sw': 'Mwaka wa mavuno lazima uwe kati ya {min_year} na {max_year}',
        'rw': 'Umwaka w\'isarura ugomba kuba hagati ya {min_year} na {max_year}',
    },
    'price_positive': {
        'en': 'Price per kilogram must be greater than zero',
        'fr': 'Le prix par kilogramme doit être supérieur à zéro',
        'sw': 'Bei kwa kilo lazima iwe kubwa kuliko sifuri',
        'rw': 'Igiciro kuri kilogaramo kigomba kuba kiruta zeru',
    },
    'price_required': {
        'en': 'Valid price per kilogram is required',
        'fr': 'Un prix valide par kilogramme est requis',
        'sw': 'Bei halali kwa kilo inahitajika',
        'rw': 'Igiciro gikwiye kuri kilogaramo kirakenewe',
    },
    'min_quantity_positive': {
        'en': 'Minimum quantity must be greater than zero',
        'fr': 'La quantité minimale doit être supérieure à zéro',
        'sw': 'Kiasi cha chini lazima kiwe kikubwa kuliko sifuri',
        'rw': 'Ingano ntoya igomba kuba iruta zeru',
    },
    'max_less_than_min': {
        'en': 'Maximum quantity cannot be less than minimum quantity',
        'fr': 'La quantité maximale ne peut être inférieure à la quantité minimale',
        'sw': 'Kiasi cha juu hakiwezi kuwa chini ya kiasi cha chini',
        'rw': 'Ingano nini ntishobora kuba ntoya kurenza ingano ntoya',
    },
    'quantity_required': {
        'en': 'Valid quantity is required',
        'fr': 'Une quantité valide est requise',
        'sw': 'Kiasi halali kinahitajika',
        'rw': 'Ingano ikwiye irakenewe',
    },
    'duplicate_standard': {
        'en': 'You already have an active standard for {crop} in {season} {year}',
        'fr': 'Vous avez déjà une norme active pour {crop} en {season} {year}',
        'sw': 'Tayari una kiwango kinachotumika kwa {crop} katika {season} {year}',
        'rw': 'Ufite igipimo gikora cya {crop} muri {season} {year}',
    },

    # Permission errors
    'not_owner': {
        'en': 'You can only modify your own crop standards',
        'fr': 'Vous ne pouvez modifier que vos propres normes de culture',
        'sw': 'Unaweza kubadilisha viwango vyako tu vya mazao',
        'rw': 'Ushobora guhindura ibipimo byawe gusa',
    },
    'buyer_only': {
        'en': 'Only buyers can create crop standards',
        'fr': 'Seuls les acheteurs peuvent créer des normes de culture',
        'sw': 'Wanunuzi pekee wanaweza kuunda viwango vya mazao',
        'rw': 'Abaguzi gusa bashobora gushyiraho ibipimo',
    },
    'admin_required': {
        'en': 'Admin access required',
        'fr': 'Accès administrateur requis',
        'sw': 'Ufikiaji wa msimamizi unahitajika',
        'rw': 'Uruhusha rwa admin rurakenewe',
    },

    # Notifications
    'standard_created_title': {
        'en': 'Crop Standard Created',
        'fr': 'Norme de Culture Créée',
        'sw': 'Kiwango cha Mazao Kimeundwa',
        'rw': 'Igipimo cy\'Imyaka Cyashizweho',
    },
    'standard_created_desc': {
        'en': 'You have created a new standard for {crop} at {price} RWF/kg',
        'fr': 'Vous avez créé une nouvelle norme pour {crop} à {price} RWF/kg',
        'sw': 'Umeunda kiwango kipya cha {crop} kwa {price} RWF/kg',
        'rw': 'Washyizeho igipimo gishya cya {crop} ku giciro cya {price} RWF/kg',
    },
    'standard_updated_title': {
        'en': 'Crop Standard Updated',
        'fr': 'Norme de Culture Mise à Jour',
        'sw': 'Kiwango cha Mazao Kimesasishwa',
        'rw': 'Igipimo cy\'Imyaka Cyavuguruwe',
    },
    'standard_updated_desc': {
        'en': 'Your standard for {crop} has been updated',
        'fr': 'Votre norme pour {crop} a été mise à jour',
        'sw': 'Kiwango chako cha {crop} kimesasishwa',
        'rw': 'Igipimo cyawe cya {crop} cyavuguruwe',
    },
    'standard_deleted_title': {
        'en': 'Crop Standard Deleted',
        'fr': 'Norme de Culture Supprimée',
        'sw': 'Kiwango cha Mazao Kimefutwa',
        'rw': 'Igipimo cy\'Imyaka Cyakuweho',
    },
    'standard_deleted_desc': {
        'en': 'Your standard for {crop} has been deleted',
        'fr': 'Votre norme pour {crop} a été supprimée',
        'sw': 'Kiwango chako cha {crop} kimefutwa',
        'rw': 'Igipimo cyawe cya {crop} cyakuweho',
    },
    'standard_expired_title': {
        'en': 'Crop Standard Expired',
        'fr': 'Norme de Culture Expirée',
        'sw': 'Kiwango cha Mazao Kimeisha Muda',
        'rw': 'Igipimo cy\'Imyaka Kirangiye',
    },
    'standard_expired_desc': {
        'en': 'Your standard for {crop} in {season} {year} has expired',
        'fr': 'Votre norme pour {crop} en {season} {year} a expiré',
        'sw': 'Kiwango chako cha {crop} katika {season} {year} kimeisha muda',
        'rw': 'Igipimo cyawe cya {crop} muri {season} {year} cyarangiye',
    },
    
    # Admin notifications
    'admin_standard_created_title': {
        'en': 'New Crop Standard Created',
        'fr': 'Nouvelle Norme de Culture Créée',
        'sw': 'Kiwango Kipya cha Mazao Kimeundwa',
        'rw': 'Igipimo Gishya cy\'Imyaka Cyashizweho',
    },
    'admin_standard_created_desc': {
        'en': 'Buyer {buyer} created a new standard for {crop}',
        'fr': 'L\'acheteur {buyer} a créé une nouvelle norme pour {crop}',
        'sw': 'Mnunuzi {buyer} ameunda kiwango kipya cha {crop}',
        'rw': 'Umuguzi {buyer} yashyizeho igipimo gishya cya {crop}',
    },
    'admin_standard_updated_title': {
        'en': 'Crop Standard Updated',
        'fr': 'Norme de Culture Mise à Jour',
        'sw': 'Kiwango cha Mazao Kimesasishwa',
        'rw': 'Igipimo cy\'Imyaka Cyavuguruwe',
    },
    'admin_standard_updated_desc': {
        'en': 'Buyer {buyer} updated their standard for {crop}',
        'fr': 'L\'acheteur {buyer} a mis à jour sa norme pour {crop}',
        'sw': 'Mnunuzi {buyer} amesasisha kiwango chake cha {crop}',
        'rw': 'Umuguzi {buyer} yavuguruye igipimo cye cya {crop}',
    },
    'admin_standard_deleted_title': {
        'en': 'Crop Standard Deleted',
        'fr': 'Norme de Culture Supprimée',
        'sw': 'Kiwango cha Mazao Kimefutwa',
        'rw': 'Igipimo cy\'Imyaka Cyakuweho',
    },
    'admin_standard_deleted_desc': {
        'en': 'Buyer {buyer} deleted their standard for {crop}',
        'fr': 'L\'acheteur {buyer} a supprimé sa norme pour {crop}',
        'sw': 'Mnunuzi {buyer} amefuta kiwango chake cha {crop}',
        'rw': 'Umuguzi {buyer} yakuyeho igipimo cye cya {crop}',
    },

    # Server errors
    'server_error': {
        'en': 'An error occurred. Please try again later',
        'fr': 'Une erreur est survenue. Veuillez réessayer plus tard',
        'sw': 'Hitilafu imetokea. Tafadhali jaribu tena baadaye',
        'rw': 'Habaye ikosa. Ongera ugerageze nyuma',
    },

    # Dashboard messages
    'welcome_back': {
        'en': 'Welcome back, {name}!',
        'fr': 'Bon retour, {name} !',
        'sw': 'Karibu tena, {name}!',
        'rw': 'Murakaza neza, {name}!',
    },
}


def nt(key, lang='en', **kwargs):
    """
    Get translated text for a given key and language.
    
    Args:
        key: Translation key
        lang: Language code (en/fr/sw/rw)
        **kwargs: Format parameters
    
    Returns:
        Translated string
    """
    if key not in TRANSLATIONS:
        return key
    
    translation = TRANSLATIONS[key].get(lang, TRANSLATIONS[key]['en'])
    
    if kwargs:
        try:
            return translation.format(**kwargs)
        except KeyError:
            return translation
    
    return translation