"""
Translation dictionary for market matching app notifications and messages.
"""

TRANSLATIONS = {
    # English
    'en': {
        # Match notifications for farmers
        'new_matches_found_title': "🎯 New Market Matches Found!",
        'new_matches_found_desc': "We found {count} potential buyer{plural} for your {product} stock. Check them out!",
        'high_quality_match_title': "⭐ High-Quality Match Alert!",
        'high_quality_match_desc': "Excellent match found for your {product} with buyer {buyer_name}. Match score: {score}%",
        'price_advantage_title': "💰 Price Advantage!",
        'price_advantage_desc': "Buyer {buyer_name} is offering {price} RWF/kg for {product}, which is {difference} RWF above your price!",
        
        # Match notifications for buyers
        'buyer_matches_found_title': "🎯 Potential Suppliers Found!",
        'buyer_matches_found_desc': "We found {count} farmer{plural} with {product} matching your criteria.",
        'buyer_high_quality_title': "⭐ Quality Stock Alert!",
        'buyer_high_quality_desc': "Farmer {farmer_name} has premium quality {product} ({grade}) matching your requirements.",
        'buyer_price_advantage_title': "💰 Competitive Price Found!",
        'buyer_price_advantage_desc': "Farmer {farmer_name} offers {product} at {price} RWF/kg, {difference} RWF below your budget!",
        
        # Admin notifications
        'admin_new_matches_title': "📊 New Market Matches Generated",
        'admin_new_matches_desc': "System generated {count} new market matches between farmers and buyers.",
        
        # Common messages
        'welcome_back': "Welcome back, {name}!",
        'matches_ready': "Your market matches are ready to review",
        'no_matches': "No matches found matching your criteria",
        'filter_applied': "Filters applied successfully",
        'match_score_info': "Match score: {score}% - {description}",
        
        # Error messages
        'farmer_only': "This endpoint is only available for farmers",
        'buyer_only': "This endpoint is only available for buyers",
        'admin_only': "This endpoint is only available for administrators",
        'invalid_filters': "Invalid filter parameters provided",
        'server_error': "An error occurred while processing your request",
        
        # Match score descriptions
        'score_perfect': "Perfect match - all criteria exactly match",
        'score_excellent': "Excellent match - minor differences only",
        'score_good': "Good match - most criteria match",
        'score_fair': "Fair match - some criteria match",
        'score_basic': "Basic match - minimum requirements met",
    },
    
    # French
    'fr': {
        'new_matches_found_title': "🎯 Nouvelles Correspondances Trouvées!",
        'new_matches_found_desc': "Nous avons trouvé {count} acheteur{plural} potentiel{plural} pour votre stock de {product}. Consultez-les!",
        'high_quality_match_title': "⭐ Alerte Correspondance de Qualité!",
        'high_quality_match_desc': "Excellente correspondance trouvée pour votre {product} avec l'acheteur {buyer_name}. Score: {score}%",
        'price_advantage_title': "💰 Avantage de Prix!",
        'price_advantage_desc': "L'acheteur {buyer_name} offre {price} RWF/kg pour {product}, soit {difference} RWF de plus que votre prix!",
        
        'buyer_matches_found_title': "🎯 Fournisseurs Potentiels Trouvés!",
        'buyer_matches_found_desc': "Nous avons trouvé {count} agriculteur{plural} avec {product} correspondant à vos critères.",
        'buyer_high_quality_title': "⭐ Alerte Stock de Qualité!",
        'buyer_high_quality_desc': "L'agriculteur {farmer_name} a du {product} de qualité premium ({grade}) correspondant à vos besoins.",
        'buyer_price_advantage_title': "💰 Prix Compétitif Trouvé!",
        'buyer_price_advantage_desc': "L'agriculteur {farmer_name} offre {product} à {price} RWF/kg, {difference} RWF de moins que votre budget!",
        
        'admin_new_matches_title': "📊 Nouvelles Correspondances Générées",
        'admin_new_matches_desc': "Le système a généré {count} nouvelles correspondances entre agriculteurs et acheteurs.",
        
        'welcome_back': "Bon retour, {name}!",
        'matches_ready': "Vos correspondances sont prêtes à être consultées",
        'no_matches': "Aucune correspondance trouvée",
        'filter_applied': "Filtres appliqués avec succès",
        'match_score_info': "Score de correspondance: {score}% - {description}",
        
        'farmer_only': "Ce service est réservé aux agriculteurs",
        'buyer_only': "Ce service est réservé aux acheteurs",
        'admin_only': "Ce service est réservé aux administrateurs",
        'invalid_filters': "Paramètres de filtre invalides",
        'server_error': "Une erreur est survenue",
        
        'score_perfect': "Correspondance parfaite",
        'score_excellent': "Correspondance excellente",
        'score_good': "Bonne correspondance",
        'score_fair': "Correspondance acceptable",
        'score_basic': "Correspondance de base",
    },
    
    # Swahili
    'sw': {
        'new_matches_found_title': "🎯 Mechi Mpya za Soko Zimapatikana!",
        'new_matches_found_desc': "Tumepata {count} mnunuzi{plural} wa {product} wanaolingana na hisa yako. Angalia sasa!",
        'high_quality_match_title': "⭐ Tahadhari ya Mechi Bora!",
        'high_quality_match_desc': "Mechi bora imepatikana kwa {product} yako na mnunuzi {buyer_name}. Alama: {score}%",
        'price_advantage_title': "💰 Faida ya Bei!",
        'price_advantage_desc': "Mnunuzi {buyer_name} anatoa {price} RWF/kg kwa {product}, ambayo ni {difference} RWF zaidi ya bei yako!",
        
        'buyer_matches_found_title': "🎯 Wauzaji Wanaowezekana Wamepatikana!",
        'buyer_matches_found_desc': "Tumepata {count} mkulima{plural} wenye {product} wanaolingana na vigezo vyako.",
        'buyer_high_quality_title': "⭐ Tahadhari ya Hisa Bora!",
        'buyer_high_quality_desc': "Mkulima {farmer_name} ana {product} bora ({grade}) inayolingana na mahitaji yako.",
        'buyer_price_advantage_title': "💰 Bei Nzuri Imepatikana!",
        'buyer_price_advantage_desc': "Mkulima {farmer_name} anatoa {product} kwa {price} RWF/kg, {difference} RWF chini ya bajeti yako!",
        
        'admin_new_matches_title': "📊 Mechi Mpya za Soko Zimezalishwa",
        'admin_new_matches_desc': "Mfumo umezalisha {count} mechi mpya kati ya wakulima na wanunuzi.",
        
        'welcome_back': "Karibu tena, {name}!",
        'matches_ready': "Mechi zako za soko ziko tayari kukaguliwa",
        'no_matches': "Hakuna mechi zilizopatikana",
        'filter_applied': "Vichujio vimetumika kwa mafanikio",
        'match_score_info': "Alama ya mechi: {score}% - {description}",
        
        'farmer_only': "Huduma hii ni kwa wakulima pekee",
        'buyer_only': "Huduma hii ni kwa wanunuzi pekee",
        'admin_only': "Huduma hii ni kwa wasimamizi pekee",
        'invalid_filters': "Vigezo batili vya kuchuja",
        'server_error': "Hitilafu imetokea",
        
        'score_perfect': "Mechi kamili",
        'score_excellent': "Mechi bora sana",
        'score_good': "Mechi nzuri",
        'score_fair': "Mechi ya kutosha",
        'score_basic': "Mechi ya msingi",
    },
    
    # Kinyarwanda
    'rw': {
        'new_matches_found_title': "🎯 Habari Nzuri! Hubonetse Abaguzi Bashya!",
        'new_matches_found_desc': "Twabonye {count} umuguzi{plural} ushobora kugura {product} yawe. Reba noneho!",
        'high_quality_match_title': "⭐ Iherezo ry'Ikirenga!",
        'high_quality_match_desc': "Twabonye umuguzi {buyer_name} ushaka {product} yawe. Amanota: {score}%",
        'price_advantage_title': "💰 Inyungu ku giciro!",
        'price_advantage_desc': "Umuguzi {buyer_name} atanga {price} RWF kwa {product}, hejuru ya {difference} RWF y'igiciro cyawe!",
        
        'buyer_matches_found_title': "🎯 Abahinzi Bishoboka Barabonetse!",
        'buyer_matches_found_desc': "Twabonye {count} umuhinzi{plural} ufite {product} ikwiranye n'ibyo ushaka.",
        'buyer_high_quality_title': "⭐ Iherezo ry'Ikirenga!",
        'buyer_high_quality_desc': "Umuhinzi {farmer_name} afite {product} y'ikirenga ({grade}) ikwiranye n'ibyo ushaka.",
        'buyer_price_advantage_title': "💰 Igiciro Cyiza Cyabonetse!",
        'buyer_price_advantage_desc': "Umuhinzi {farmer_name} atanga {product} ku giciro cya {price} RWF, {difference} RWF munsi y'igiciro wari uteganye!",
        
        'admin_new_matches_title': "📊 Guhuzagurisha Hashya Byakozwe",
        'admin_new_matches_desc': "Sisitemu yakoze {count} guhuzagurisha hagati y'abahinzi n'abaguzi.",
        
        'welcome_back': "Murakaza neza, {name}!",
        'matches_ready': "Guhuzagurisha kwawe kwiteguye",
        'no_matches': "Nta guhuzagurisha kwabonetse",
        'filter_applied': "Imyungururo yakoreshejwe",
        'match_score_info': "Amanota: {score}% - {description}",
        
        'farmer_only': "Ubu buryo ni ubw'abahinzi gusa",
        'buyer_only': "Ubu buryo ni ubw'abaguzi gusa",
        'admin_only': "Ubu buryo ni ubw'abarangira gusa",
        'invalid_filters': "Imyungururo itemewe",
        'server_error': "Habaye ikibazo",
        
        'score_perfect': "Guhuza byuzuye",
        'score_excellent': "Guhuza neza cyane",
        'score_good': "Guhuza neza",
        'score_fair': "Guhuza hagati",
        'score_basic': "Guhuza by'ibanze",
    }
}


def nt(key, lang='en', **kwargs):
    """
    Get notification text in the specified language.
    
    Args:
        key: The translation key
        lang: Language code (en, fr, sw, rw)
        **kwargs: Format parameters for the string
    
    Returns:
        Translated and formatted string
    """
    # Fallback chain: requested lang -> en -> key itself
    translations = TRANSLATIONS.get(lang, TRANSLATIONS['en'])
    text = translations.get(key, TRANSLATIONS['en'].get(key, key))
    
    try:
        return text.format(**kwargs)
    except (KeyError, ValueError):
        # If formatting fails, return the unformatted text
        return text