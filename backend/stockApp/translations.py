"""
Stock app translations for multi-language support.
Languages: English (en), French (fr), Swahili (sw), Kinyarwanda (rw)
"""

TRANSLATIONS = {
    # Stock management
    'stock_created': {
        'en': 'Stock created successfully',
        'fr': 'Stock créé avec succès',
        'sw': 'Hisa imeundwa kwa mafanikio',
        'rw': 'Igitonyanga cyashizweho neza',
    },
    'stock_updated': {
        'en': 'Stock updated successfully',
        'fr': 'Stock mis à jour avec succès',
        'sw': 'Hisa imesasishwa kwa mafanikio',
        'rw': 'Igitonyanga cyavuguruwe neza',
    },
    'stock_deleted': {
        'en': 'Stock deleted successfully',
        'fr': 'Stock supprimé avec succès',
        'sw': 'Hisa imefutwa kwa mafanikio',
        'rw': 'Igitonyanga cyakuweho neza',
    },
    'stock_not_found': {
        'en': 'Stock not found',
        'fr': 'Stock non trouvé',
        'sw': 'Hisa haikupatikana',
        'rw': 'Igitonyanga ntikiboneka',
    },
    
    # Movement messages
    'movement_created': {
        'en': 'Stock movement recorded successfully',
        'fr': 'Mouvement de stock enregistré avec succès',
        'sw': 'Mwendo wa hisa umeandikwa kwa mafanikio',
        'rw': 'Urugendo rwigitonyanga rwanditswe neza',
    },
    'movement_updated': {
        'en': 'Stock movement updated successfully',
        'fr': 'Mouvement de stock mis à jour avec succès',
        'sw': 'Mwendo wa hisa umesasishwa kwa mafanikio',
        'rw': 'Urugendo rwigitonyanga rwavuguruwe neza',
    },
    'movement_deleted': {
        'en': 'Stock movement deleted successfully',
        'fr': 'Mouvement de stock supprimé avec succès',
        'sw': 'Mwendo wa hisa umefutwa kwa mafanikio',
        'rw': 'Urugendo rwigitonyanga rwakuweho neza',
    },
    'movement_not_found': {
        'en': 'Stock movement not found',
        'fr': 'Mouvement de stock non trouvé',
        'sw': 'Mwendo wa hisa haukupatikana',
        'rw': 'Urugendo rwigitonyanga ntiruboneka',
    },
    
    # Validation errors
    'quantity_required': {
        'en': 'Quantity is required',
        'fr': 'La quantité est requise',
        'sw': 'Kiasi kinahitajika',
        'rw': 'Ingano irakenewe',
    },
    'quantity_positive': {
        'en': 'Quantity must be greater than zero',
        'fr': 'La quantité doit être supérieure à zéro',
        'sw': 'Kiasi lazima kiwe kikubwa kuliko sifuri',
        'rw': 'Ingano igomba kuba iruta zeru',
    },
    'insufficient_stock': {
        'en': 'Insufficient stock. Only {available}kg available',
        'fr': 'Stock insuffisant. Seulement {available}kg disponible',
        'sw': 'Hisa haitoshi. {available}kg tu inapatikana',
        'rw': 'Igitonyanga gitoze. {available}kg gusa iraboneka',
    },
    'location_required': {
        'en': 'Complete location information is required',
        'fr': 'Les informations de localisation complètes sont requises',
        'sw': 'Maelezo kamili ya eneo yanahitajika',
        'rw': 'Aho uherereye byuzuye birakenewe',
    },
    
    # Permission errors
    'not_owner': {
        'en': 'You can only modify your own stocks',
        'fr': 'Vous ne pouvez modifier que vos propres stocks',
        'sw': 'Unaweza kubadilisha hisa zako tu',
        'rw': 'Ushobora guhindura ibitonyanga byawe gusa',
    },
    'farmer_only': {
        'en': 'Only farmers can create stocks',
        'fr': 'Seuls les agriculteurs peuvent créer des stocks',
        'sw': 'Wakulima pekee wanaweza kuunda hisa',
        'rw': 'Abahinzi gusa bashobora gushyiraho ibitonyanga',
    },
    
    # Notifications
    'stock_movement_out_title': {
        'en': 'Stock Removal',
        'fr': 'Retrait de Stock',
        'sw': 'Uondoaji wa Hisa',
        'rw': 'Gukuramo Igitonyanga',
    },
    'stock_movement_out_desc': {
        'en': '{quantity}kg of {product} has been removed from your stock',
        'fr': '{quantity}kg de {product} ont été retirés de votre stock',
        'sw': '{quantity}kg ya {product} imetolewa kwenye hisa yako',
        'rw': '{quantity}kg bya {product} byakuwe mu gitonyanga cyawe',
    },
    'stock_movement_in_title': {
        'en': 'Stock Addition',
        'fr': 'Ajout de Stock',
        'sw': 'Nyongeza ya Hisa',
        'rw': 'Ongeraho Igitonyanga',
    },
    'stock_movement_in_desc': {
        'en': '{quantity}kg of {product} has been added to your stock',
        'fr': '{quantity}kg de {product} ont été ajoutés à votre stock',
        'sw': '{quantity}kg ya {product} imeongezwa kwenye hisa yako',
        'rw': '{quantity}kg bya {product} byongewe mu gitonyanga cyawe',
    },
    'stock_movement_transfer_title': {
        'en': 'Stock Transfer',
        'fr': 'Transfert de Stock',
        'sw': 'Uhamisho wa Hisa',
        'rw': 'Kwimura Igitonyanga',
    },
    'stock_movement_transfer_desc': {
        'en': '{quantity}kg of {product} transferred to {destination}',
        'fr': '{quantity}kg de {product} transférés vers {destination}',
        'sw': '{quantity}kg ya {product} imehamishwa kwenda {destination}',
        'rw': '{quantity}kg bya {product} byimuwe i {destination}',
    },
    'stock_movement_adjustment_title': {
        'en': 'Stock Adjustment',
        'fr': 'Ajustement de Stock',
        'sw': 'Marekebisho ya Hisa',
        'rw': 'Guhindura Igitonyanga',
    },
    'stock_movement_adjustment_desc': {
        'en': 'Your {product} stock has been adjusted',
        'fr': 'Votre stock de {product} a été ajusté',
        'sw': 'Hisa yako ya {product} imerekebishwa',
        'rw': 'Igitonyanga cyawe cya {product} cyarahinduwe',
    },
    
    # Low stock alerts
    'low_stock_alert': {
        'en': 'Low Stock Alert',
        'fr': 'Alerte Stock Faible',
        'sw': 'Tahadhari ya Hisa Kidogo',
        'rw': 'Iburira ry\'Igitonyanga Gito',
    },
    'low_stock_message': {
        'en': 'Your {product} stock is low ({quantity}kg remaining)',
        'fr': 'Votre stock de {product} est faible ({quantity}kg restants)',
        'sw': 'Hisa yako ya {product} iko chini ({quantity}kg imebaki)',
        'rw': 'Igitonyanga cyawe cya {product} ni gito ({quantity}kg gasigaye)',
    },
    
    # Server errors
    'server_error': {
        'en': 'An error occurred. Please try again later',
        'fr': 'Une erreur est survenue. Veuillez réessayer plus tard',
        'sw': 'Hitilafu imetokea. Tafadhali jaribu tena baadaye',
        'rw': 'Habaye ikosa. Ongera ugerageze nyuma',
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