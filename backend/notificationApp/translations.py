"""
notificationApp/translations.py  –  All user-facing API response messages for
the notification system, in 4 languages.

Supported language codes:
    en  – English   (default)
    fr  – French
    sw  – Swahili
    rw  – Kinyarwanda

Usage:
    from .translations import nt
    return Response({"error": nt("title_required", lang)}, status=400)
"""

NOTIFICATION_MESSAGES = {

    # ── Generic / shared ─────────────────────────────────────────────────
    "server_error": {
        "en": "An unexpected error occurred. Please try again later.",
        "fr": "Une erreur inattendue s'est produite. Veuillez réessayer plus tard.",
        "sw": "Hitilafu isiyotarajiwa imetokea. Tafadhali jaribu tena baadaye.",
        "rw": "Ikibazo kitazwi cyabaye. Nyamuneka gerageza nyuma.",
    },
    "admin_required": {
        "en": "Admin access required.",
        "fr": "Accès administrateur requis.",
        "sw": "Ufikiaji wa msimamizi unahitajika.",
        "rw": "Uburenganzira bw'umuyobozi busabwa.",
    },
    "not_found": {
        "en": "Notification not found.",
        "fr": "Notification introuvable.",
        "sw": "Arifa haikupatikana.",
        "rw": "Imenyesha ntiboneka.",
    },

    # ── Validation ────────────────────────────────────────────────────────
    "title_required": {
        "en": "Title is required.",
        "fr": "Le titre est obligatoire.",
        "sw": "Kichwa kinahitajika.",
        "rw": "Umutwe usabwa.",
    },
    "description_required": {
        "en": "Description is required.",
        "fr": "La description est obligatoire.",
        "sw": "Maelezo yanahitajika.",
        "rw": "Ibisobanuro bisabwa.",
    },
    "receiver_or_audience_required": {
        "en": "Either 'receiver_id' or 'audience' must be provided.",
        "fr": "'receiver_id' ou 'audience' doit être fourni.",
        "sw": "'receiver_id' au 'audience' lazima itolewe.",
        "rw": "'receiver_id' cyangwa 'audience' bisabwa.",
    },
    "audience_invalid": {
        "en": "Invalid audience. Choose: all, farmers, buyers, admins.",
        "fr": "Audience invalide. Choisissez : all, farmers, buyers, admins.",
        "sw": "Hadhira batili. Chagua: all, farmers, buyers, admins.",
        "rw": "Ababoneza batemewe. Hitamo: all, farmers, buyers, admins.",
    },
    "receiver_not_found": {
        "en": "Receiver user not found.",
        "fr": "L'utilisateur destinataire est introuvable.",
        "sw": "Mtumiaji mpokeaji hakupatikana.",
        "rw": "Umutumiaji uhabwa ntaboneka.",
    },
    "cannot_notify_self": {
        "en": "You cannot send a notification to yourself.",
        "fr": "Vous ne pouvez pas vous envoyer une notification.",
        "sw": "Huwezi kujitumia arifa.",
        "rw": "Ntushobora kwiyohereza imenyesha.",
    },

    # ── Send / create ─────────────────────────────────────────────────────
    "notification_sent": {
        "en": "Notification sent successfully.",
        "fr": "Notification envoyée avec succès.",
        "sw": "Arifa imetumwa kwa mafanikio.",
        "rw": "Imenyesha ryoherejwe neza.",
    },
    "broadcast_sent": {
        "en": "Broadcast notification sent to {count} user(s).",
        "fr": "Notification diffusée envoyée à {count} utilisateur(s).",
        "sw": "Arifa ya matangazo imetumwa kwa watumiaji {count}.",
        "rw": "Imenyesha ryoherejwe ku batumiaji {count}.",
    },

    # ── Read / unread ─────────────────────────────────────────────────────
    "already_read": {
        "en": "Notification is already marked as read.",
        "fr": "La notification est déjà marquée comme lue.",
        "sw": "Arifa tayari imewekwa alama ya kusomwa.",
        "rw": "Imenyesha ryasomwe kale.",
    },
    "marked_as_read": {
        "en": "Notification marked as read.",
        "fr": "Notification marquée comme lue.",
        "sw": "Arifa imewekwa alama ya kusomwa.",
        "rw": "Imenyesha rishyizweho ikimenyetso cyo gusomwa.",
    },
    "all_marked_as_read": {
        "en": "All notifications marked as read.",
        "fr": "Toutes les notifications marquées comme lues.",
        "sw": "Arifa zote zimewekwa alama ya kusomwa.",
        "rw": "Imenyesha ryose rishyizweho ikimenyetso cyo gusomwa.",
    },

    # ── Delete ────────────────────────────────────────────────────────────
    "delete_unread_forbidden": {
        "en": "Only read notifications can be deleted.",
        "fr": "Seules les notifications lues peuvent être supprimées.",
        "sw": "Arifa zilizosomwa tu zinaweza kufutwa.",
        "rw": "Imenyesha ryasomwe gusa ni ryo rushobora gusibwa.",
    },
    "notification_deleted": {
        "en": "Notification deleted successfully.",
        "fr": "Notification supprimée avec succès.",
        "sw": "Arifa imefutwa kwa mafanikio.",
        "rw": "Imenyesha ryasibwe neza.",
    },
    "forbidden": {
        "en": "You do not have permission to perform this action.",
        "fr": "Vous n'avez pas la permission d'effectuer cette action.",
        "sw": "Huna ruhusa ya kufanya kitendo hiki.",
        "rw": "Nta burenganzira bwo gukora iki gikorwa.",
    },

    # ── System notification titles (auto-generated) ───────────────────────
    "sys_title_registered": {
        "en": "Welcome to FMMROP!",
        "fr": "Bienvenue sur FMMROP !",
        "sw": "Karibu FMMROP!",
        "rw": "Murakaza neza kuri FMMROP!",
    },
    "sys_body_registered": {
        "en": "Your account has been successfully created. Welcome, {name}!",
        "fr": "Votre compte a été créé avec succès. Bienvenue, {name} !",
        "sw": "Akaunti yako imeundwa kwa mafanikio. Karibu, {name}!",
        "rw": "Konti yawe yashyizweho neza. Murakaza neza, {name}!",
    },
    "sys_title_admin_new_user": {
        "en": "New User Registered",
        "fr": "Nouvel utilisateur inscrit",
        "sw": "Mtumiaji Mpya Amesajiliwa",
        "rw": "Umutumiaji Mushya Yiyandikishije",
    },
    "sys_body_admin_new_user": {
        "en": "A new {role} '{name}' ({phone}) has registered on the platform.",
        "fr": "Un nouveau {role} '{name}' ({phone}) s'est inscrit sur la plateforme.",
        "sw": "Mtumiaji mpya wa {role} '{name}' ({phone}) amesajiliwa kwenye jukwaa.",
        "rw": "Umutumiaji mushya wa {role} '{name}' ({phone}) yiyandikishije ku mbuga.",
    },
    "sys_title_password_changed": {
        "en": "Password Changed",
        "fr": "Mot de passe modifié",
        "sw": "Nenosiri Imebadilishwa",
        "rw": "Ijambo Banga Ryahinduwe",
    },
    "sys_body_password_changed": {
        "en": "Your password was changed successfully. If this was not you, contact support immediately.",
        "fr": "Votre mot de passe a été modifié avec succès. Si ce n'était pas vous, contactez le support immédiatement.",
        "sw": "Nenosiri yako imebadilishwa kwa mafanikio. Kama hukufanya hilo, wasiliana na msaada mara moja.",
        "rw": "Ijambo banga ryawe ryahinduwe neza. Niba utibyukoreye, vugana n'inkunga ako kanya.",
    },
    "sys_title_password_reset": {
        "en": "Password Reset Successfully",
        "fr": "Mot de passe réinitialisé avec succès",
        "sw": "Nenosiri Imewekwa Upya",
        "rw": "Ijambo Banga Ryasuwe Neza",
    },
    "sys_body_password_reset": {
        "en": "Your password has been reset. You can now log in with your new password.",
        "fr": "Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
        "sw": "Nenosiri yako imewekwa upya. Sasa unaweza kuingia na nenosiri yako mpya.",
        "rw": "Ijambo banga ryawe ryasuwe. Ubu ushobora kwinjira ukoresheje ijambo banga rishya.",
    },
    "sys_title_profile_updated": {
        "en": "Profile Updated",
        "fr": "Profil mis à jour",
        "sw": "Wasifu Umesasishwa",
        "rw": "Umwirondoro Wahinduwe",
    },
    "sys_body_profile_updated": {
        "en": "Your profile information has been updated successfully.",
        "fr": "Les informations de votre profil ont été mises à jour avec succès.",
        "sw": "Taarifa za wasifu wako zimesasishwa kwa mafanikio.",
        "rw": "Amakuru y'umwirondoro wawe yahinduwe neza.",
    },
    "sys_title_account_activated": {
        "en": "Account Activated",
        "fr": "Compte activé",
        "sw": "Akaunti Imewezeshwa",
        "rw": "Konti Ifunguwe",
    },
    "sys_body_account_activated": {
        "en": "Your account has been activated. You can now access all platform features.",
        "fr": "Votre compte a été activé. Vous pouvez maintenant accéder à toutes les fonctionnalités.",
        "sw": "Akaunti yako imewezeshwa. Sasa unaweza kufikia vipengele vyote vya jukwaa.",
        "rw": "Konti yawe ifunguwe. Ubu ushobora gukoresha ibikorwa byose bya mbuga.",
    },
    "sys_title_account_deactivated": {
        "en": "Account Deactivated",
        "fr": "Compte désactivé",
        "sw": "Akaunti Imezimwa",
        "rw": "Konti Ifunzwe",
    },
    "sys_body_account_deactivated": {
        "en": "Your account has been deactivated. Please contact support if you believe this is an error.",
        "fr": "Votre compte a été désactivé. Veuillez contacter le support si vous pensez que c'est une erreur.",
        "sw": "Akaunti yako imezimwa. Tafadhali wasiliana na msaada ikiwa unaamini hii ni kosa.",
        "rw": "Konti yawe ifunzwe. Nyamuneka vugana n'inkunga niba ubona ari ikosa.",
    },
    "sys_title_admin_user_created": {
        "en": "New User Created by Admin",
        "fr": "Nouvel utilisateur créé par l'administrateur",
        "sw": "Mtumiaji Mpya Ameundwa na Msimamizi",
        "rw": "Umutumiaji Mushya Ashyizweho n'Umuyobozi",
    },
    "sys_body_admin_user_created": {
        "en": "Your account on FMMROP has been created by an administrator. Please log in and change your password.",
        "fr": "Votre compte FMMROP a été créé par un administrateur. Veuillez vous connecter et changer votre mot de passe.",
        "sw": "Akaunti yako kwenye FMMROP imeundwa na msimamizi. Tafadhali ingia na ubadilishe nenosiri yako.",
        "rw": "Konti yawe kuri FMMROP yashyizweho n'umuyobozi. Nyamuneka injira uhindure ijambo banga.",
    },
    "sys_title_admin_user_updated": {
        "en": "Your Account Was Updated",
        "fr": "Votre compte a été mis à jour",
        "sw": "Akaunti Yako Imesasishwa",
        "rw": "Konti Yawe Yahinduwe",
    },
    "sys_body_admin_user_updated": {
        "en": "An administrator has updated your account information.",
        "fr": "Un administrateur a mis à jour les informations de votre compte.",
        "sw": "Msimamizi amesasisha taarifa za akaunti yako.",
        "rw": "Umuyobozi yahinduye amakuru ya konti yawe.",
    },
    "sys_title_admin_user_deleted": {
        "en": "Account Deleted",
        "fr": "Compte supprimé",
        "sw": "Akaunti Imefutwa",
        "rw": "Konti Yasibwe",
    },
    "sys_body_admin_user_deleted": {
        "en": "Your FMMROP account has been permanently deleted.",
        "fr": "Votre compte FMMROP a été définitivement supprimé.",
        "sw": "Akaunti yako ya FMMROP imefutwa kabisa.",
        "rw": "Konti yawe ya FMMROP yasibwe burundu.",
    },
    "sys_title_login": {
        "en": "New Login Detected",
        "fr": "Nouvelle connexion détectée",
        "sw": "Kuingia Mpya Kumegunduliwa",
        "rw": "Kwinjira Gushya Bigukundwe",
    },
    "sys_body_login": {
        "en": "A new login was detected on your account. If this was not you, change your password immediately.",
        "fr": "Une nouvelle connexion a été détectée sur votre compte. Si ce n'était pas vous, changez votre mot de passe immédiatement.",
        "sw": "Kuingia mpya kumegunduliwa kwenye akaunti yako. Kama hukufanya hilo, badilisha nenosiri yako mara moja.",
        "rw": "Kwinjira gushya bigukundwe kuri konti yawe. Niba utibyukoreye, hindura ijambo banga ako kanya.",
    },
    
    "market_alert_urgent": {
        "en": "🚨 Market Alert: Urgent Selling Opportunity",
        "fr": "🚨 Alerte Marché: Opportunité de Vente Urgente",
        "sw": "🚨 Tahadhari ya Soko: Fursa ya Kuuza kwa Haraka",
        "rw": "🚨 Itangazo ry'Isoko: Amahirwe yo Kugurisha Vuba",
    },
    "market_alert_urgent_desc": {
        "en": "Market prices for {products} are predicted to drop. Consider selling soon to maximize your returns.",
        "fr": "Les prix du marché pour {products} devraient baisser. Envisagez de vendre bientôt pour maximiser vos rendements.",
        "sw": "Bei za soko za {products} zinatarajiwa kushuka. Fikiria kuuza hivi karibuni ili kuongeza mapato yako.",
        "rw": "Ibiciro by'isoko bya {products} biteganijwe kugabanuka. Tekereza kugurisha vuba kugirango wongere inyungu zawe.",
    },
    "buying_opportunity_title": {
        "en": "💰 Buying Opportunity Detected!",
        "fr": "💰 Opportunité d'Achat Détectée!",
        "sw": "💰 Fursa ya Kununua Imepatikana!",
        "rw": "💰 Amahirwe yo Kugura Abonetse!",
    },
    "buying_opportunity_desc": {
        "en": "Good time to buy {products}. Prices are favorable based on market trends.",
        "fr": "Bon moment pour acheter {products}. Les prix sont favorables selon les tendances du marché.",
        "sw": "Muda mzuri wa kununua {products}. Bei ni nzuri kulingana na mwenendo wa soko.",
        "rw": "Igihe cyiza cyo kugura {products}. Ibiciro birashimishije ukurikije imikorere y'isoko.",
    },
    

    # ── Market Prediction Messages ────────────────────────────────────────────────
    "market_insufficient_data": {
        "en": "Not enough market data for reliable prediction at this time.",
        "fr": "Pas assez de données de marché pour une prédiction fiable pour le moment.",
        "sw": "Hakuna data ya kutosha ya soko kwa utabiri wa kuaminika kwa wakati huu.",
        "rw": "Ntakiboneka cyihagije cy'isoko kugirango hanywe byizere muri iki gihe.",
    },
    "market_need_more_data": {
        "en": "We need more completed contracts to analyze {crop} market trends.",
        "fr": "Nous avons besoin de plus de contrats complétés pour analyser les tendances du marché {crop}.",
        "sw": "Tunahitaji kandarasi zaidi zilizokamilika kuchambua mwenendo wa soko la {crop}.",
        "rw": "Dukeneye amasezerano yarangiye kugirango dusuzume imikorere y'isoko rya {crop}.",
    },
    "market_hold_rising": {
        "en": "Market is rising strongly (+{change}%). Consider holding for better returns.",
        "fr": "Le marché est en forte hausse (+{change}%). Envisagez de conserver pour de meilleurs rendements.",
        "sw": "Soko linaongezeka kwa kasi (+{change}%). Fikiria kushikilia kwa mapato bora.",
        "rw": "Isoko rirazamuka cyane (+{change}%). Tekereza guhagarika kugirango ubone inyungu nyinshi.",
    },
    "market_sell_after_rise": {
        "en": "Price increased {change}% recently but predicted to stabilize. Good time to sell.",
        "fr": "Le prix a augmenté de {change}% récemment mais devrait se stabiliser. Bon moment pour vendre.",
        "sw": "Bei imeongezeka kwa {change}% hivi karibuni lakini inatarajiwa kutulia. Mzuri wa kuuza.",
        "rw": "Igiciro cyazamutseho {change}% vuba aha keretse kigabanuka. Igihe cyiza cyo kugurisha.",
    },
    "market_sell_urgent_declining": {
        "en": "⚠️ Market declining ({change}% drop). Prices predicted to fall further. Consider selling now!",
        "fr": "⚠️ Le marché est en baisse (baisse de {change}%). Les prix devraient encore baisser. Envisagez de vendre maintenant!",
        "sw": "⚠️ Soko linashuka (kushuka kwa {change}%). Bei zinatarajiwa kushuka zaidi. Fikiria kuuza sasa!",
        "rw": "⚠️ Isoko riragabanuka (kugabanuka kwa {change}%). Ibiciro biteganijwe kugabanuka. Tekereza kugurisha ubu!",
    },
    "market_hold_recovering": {
        "en": "Market declined but showing signs of recovery. Might be worth holding.",
        "fr": "Le marché a baissé mais montre des signes de reprise. Cela vaut peut-être la peine de conserver.",
        "sw": "Soko lilishuka lakini linaonyesha dalili za kupona. Inaweza kuwa ya thamani kushikilia.",
        "rw": "Isoko ryagabanutse ariko ryerekana ibimenyetso byo gukira. Gushobora kuba ingirakamaro guhagarika.",
    },
    "market_hold_upward": {
        "en": "Market showing upward trend (+{change}%). Good time to monitor prices.",
        "fr": "Le marché montre une tendance à la hausse (+{change}%). Bon moment pour surveiller les prix.",
        "sw": "Soko linaonyesha mwelekeo wa kupanda (+{change}%). Muda mzuri wa kufuatilia bei.",
        "rw": "Isoko ryerekana imikorere yizamuka (+{change}%). Igihe cyiza cyo gukurikira ibiciro.",
    },
    "market_sell_downward": {
        "en": "Market showing downward trend ({change}% drop). Consider selling soon.",
        "fr": "Le marché montre une tendance à la baisse (baisse de {change}%). Envisagez de vendre bientôt.",
        "sw": "Soko linaonyesha mwelekeo wa kushuka (kushuka kwa {change}%). Fikiria kuuza hivi karibuni.",
        "rw": "Isoko ryerekana imikorere yigabanuka (kugabanuka kwa {change}%). Tekereza kugurisha vuba.",
    },
    "market_stable": {
        "en": "Market stable. No immediate action recommended.",
        "fr": "Marché stable. Aucune action immédiate recommandée.",
        "sw": "Soko ni sawa. Hakuna hatua ya haraka iliyopendekezwa.",
        "rw": "Isoko rirahagaze. Ntagikorwa gihita gisabwe.",
    },
    "market_neutral": {
        "en": "Market conditions are neutral at this time.",
        "fr": "Les conditions du marché sont neutres pour le moment.",
        "sw": "Hali ya soko ni ya upande wowote kwa wakati huu.",
        "rw": "Ibimeze by'isoko ntibyibagije muri iki gihe.",
    },
    "market_disclaimer": {
        "en": "⚠️ These predictions are based on historical data and market trends. Past performance does not guarantee future results.",
        "fr": "⚠️ Ces prédictions sont basées sur des données historiques et les tendances du marché. Les performances passées ne garantissent pas les résultats futurs.",
        "sw": "⚠️ Utabiri huu unategemea data ya kihistoria na mwenendo wa soko. Utendaji wa zamani hauhakikishi matokeo ya baadaye.",
        "rw": "⚠️ Ibi biteganijwe bishingiye ku makuru y'ahise n'imikorere y'isoko. Ibigezweho ntibisimbuza ibizaza.",
    },

    # ── Buyer Specific Messages ───────────────────────────────────────────────────
    "buyer_wait_prices_falling": {
        "en": "Prices are falling ({change}% trend). Expected to drop further. Consider waiting.",
        "fr": "Les prix baissent (tendance de {change}%). Devrait encore baisser. Envisagez d'attendre.",
        "sw": "Bei zinashuka (mwelekeo wa {change}%). Inatarajiwa kushuka zaidi. Fikiria kungoja.",
        "rw": "Ibiciro biragabanuka (imikorere ya {change}%). Biteganijwe kugabanuka. Tekereza gutegereza.",
    },
    "buyer_buy_now_recovering": {
        "en": "📈 Prices have dropped but predicted to recover. Good buying opportunity!",
        "fr": "📈 Les prix ont baissé mais devraient se rétablir. Bonne opportunité d'achat!",
        "sw": "📈 Bei zimeshuka lakini zinatarajiwa kupona. Fursa nzuri ya kununua!",
        "rw": "📈 Ibiciro byaragabanutse ariko biteganijwe kuzamuka. Amahirwe meza yo kugura!",
    },
    "buyer_buy_now_rising": {
        "en": "📈 Prices rising ({change}% increase). Buy now before prices go higher!",
        "fr": "📈 Les prix augmentent (augmentation de {change}%). Achetez maintenant avant que les prix n'augmentent!",
        "sw": "📈 Bei zinaongezeka (ongezeko la {change}%). Nunua sasa kabla bei hazijapanda zaidi!",
        "rw": "📈 Ibiciro biriyongera (kwiyongera kwa {change}%). Kugura ubu mbere y'uko ibiciro rizamuka!",
    },
    "buyer_wait_stabilizing": {
        "en": "Prices increased but predicted to stabilize soon. Consider waiting.",
        "fr": "Les prix ont augmenté mais devraient se stabiliser bientôt. Envisagez d'attendre.",
        "sw": "Bei zimeongezeka lakini zinatarajiwa kutulia hivi karibuni. Fikiria kungoja.",
        "rw": "Ibiciro byazamutse ariko biteganijwe guhagarara. Tekereza gutegereza.",
    },
    "buyer_monitor_market": {
        "en": "Market stable. Monitor prices for good opportunities.",
        "fr": "Marché stable. Surveillez les prix pour de bonnes opportunités.",
        "sw": "Soko ni sawa. Fuatilia bei kwa fursa nzuri.",
        "rw": "Isoko rirahagaze. Kurikirana ibiciro kugirango ubone amahirwe.",
    },
    "buyer_daily_advice": {
        "en": "Check back daily for updated market predictions and buying opportunities!",
        "fr": "Revenez quotidiennement pour des prévisions de marché mises à jour et des opportunités d'achat!",
        "sw": "Angalia kila siku kwa utabiri wa soko uliosasishwa na fursa za ununuzi!",
        "rw": "Gerageza buri munsi kugirango ubone ibyitezwe by'isoko byavuguruwe n'amahirwe yo kugura!",
    },

    # ── Farmer Specific Messages ──────────────────────────────────────────────────
    "farmer_recommendations_summary": {
        "en": "Based on market analysis, here are recommendations for your active stocks.",
        "fr": "Sur la base de l'analyse du marché, voici les recommandations pour vos stocks actifs.",
        "sw": "Kulingana na uchambuzi wa soko, hapa kuna mapendekezo kwa hisa zako zinazotumika.",
        "rw": "Ushingiye ku isesengura ry'isoko, dore ibyifuzo ku bubiko bwawe bukora.",
    },
    "farmer_no_stocks": {
        "en": "You don't have any active stocks. Add stocks to get market recommendations.",
        "fr": "Vous n'avez pas de stocks actifs. Ajoutez des stocks pour obtenir des recommandations de marché.",
        "sw": "Huna hisa yoyote inayotumika. Ongeza hisa ili kupata mapendekezo ya soko.",
        "rw": "Nta bubiko ukora. Ongeraho ububiko kugirango ubone ibyifuzo by'isoko.",
    },
    "farmer_stock_label": {
        "en": "Your Stock",
        "fr": "Votre Stock",
        "sw": "Hisa Yako",
        "rw": "Ububiko Bwawe",
    },
    "farmer_current_value_label": {
        "en": "Current Value (RWF)",
        "fr": "Valeur Actuelle (RWF)",
        "sw": "Thamani ya Sasa (RWF)",
        "rw": "Agaciro K'ubu (RWF)",
    },
    "farmer_predicted_value_label": {
        "en": "Predicted Future Value (RWF)",
        "fr": "Valeur Future Prévue (RWF)",
        "sw": "Thamani ya Baadaye Iliyotabiriwa (RWF)",
        "rw": "Agaciro Kazaza Kitezwe (RWF)",
    },
    "farmer_urgency_label": {
        "en": "Urgency",
        "fr": "Urgence",
        "sw": "Haraka",
        "rw": "Igitabaza",
    },
    "farmer_action_taken": {
        "en": "Recommended Action",
        "fr": "Action Recommandée",
        "sw": "Hatua Iliyopendekezwa",
        "rw": "Igikorwa Gisabwe",
    },

    # ── Stock Specific Messages ───────────────────────────────────────────────────
    "storage_warning_days": {
        "en": "⚠️ This stock has been stored for {days} days. Quality may be degrading.",
        "fr": "⚠️ Ce stock a été stocké pendant {days} jours. La qualité peut se dégrader.",
        "sw": "⚠️ Hisa hii imehifadhiwa kwa siku {days}. Ubora unaweza kuzorota.",
        "rw": "⚠️ Ubu bubiko bubikwe iminsi {days}. Ubwoko bushobora kugabanuka.",
    },
    "storage_info_days": {
        "en": "Stock stored for {days} days. Monitor quality regularly.",
        "fr": "Stock stocké depuis {days} jours. Surveillez régulièrement la qualité.",
        "sw": "Hisa imehifadhiwa kwa siku {days}. Fuatilia ubora mara kwa mara.",
        "rw": "Ububiko bubikwe iminsi {days}. Kurikirana ubwoko buri gihe.",
    },
    "stock_not_found": {
        "en": "Stock not found or you don't have permission to view it.",
        "fr": "Stock introuvable ou vous n'avez pas la permission de le voir.",
        "sw": "Hisa haikupatikana au huna ruhusa ya kuiangalia.",
        "rw": "Ububiko ntibuboneka cyangwa nta burenganzira ubufite bwo kureba.",
    },
    "stock_current_value": {
        "en": "Current Estimated Value",
        "fr": "Valeur Estimée Actuelle",
        "sw": "Thamini ya Sasa Inayokadiriwa",
        "rw": "Agaciro K'ubu Giteganijwe",
    },
    "stock_future_value": {
        "en": "Predicted Future Value",
        "fr": "Valeur Future Prévue",
        "sw": "Thamani ya Baadaye Iliyotabiriwa",
        "rw": "Agaciro Kazaza Kitezwe",
    },
    "stock_potential_change": {
        "en": "Potential Gain/Loss",
        "fr": "Gain/Pertes Potentiel",
        "sw": "Faida/Hasara Inayowezekana",
        "rw": "Inyungu/Igihombo Gishoboka",
    },
    "stock_advice": {
        "en": "Our Advice",
        "fr": "Notre Conseil",
        "sw": "Ushauri Wetu",
        "rw": "Inama Yacu",
    },
    "market_insufficient_data_stock": {
        "en": "Not enough market data available for {product} to provide reliable predictions.",
        "fr": "Pas assez de données de marché disponibles pour {product} pour fournir des prédictions fiables.",
        "sw": "Hakuna data ya kutosha ya soko inapatikana kwa {product} kutoa utabiri wa kuaminika.",
        "rw": "Ntakiboneka gihagije cy'isoko kiboneka kuri {product} kugirango habeho ibyitezwe byizewe.",
    },

    # ── Price Comparison Messages ────────────────────────────────────────────────
    "price_higher_than_before": {
        "en": "{amount} RWF higher than your previous purchase",
        "fr": "{amount} RWF plus élevé que votre achat précédent",
        "sw": "{amount} RWF juu kuliko ununuzi wako wa awali",
        "rw": "{amount} RWF hejuru y'iguzi ryawe rya kera",
    },
    "price_lower_than_before": {
        "en": "{amount} RWF lower than your previous purchase",
        "fr": "{amount} RWF inférieur à votre achat précédent",
        "sw": "{amount} RWF chini kuliko ununuzi wako wa awali",
        "rw": "{amount} RWF hasi y'iguzi ryawe rya kera",
    },
    "price_same_as_before": {
        "en": "Same price as your previous purchase",
        "fr": "Même prix que votre achat précédent",
        "sw": "Bei sawa na ununuzi wako wa awali",
        "rw": "Igiciro kimwe n'iguzi ryawe rya kera",
    },

    # ── Urgency Levels ───────────────────────────────────────────────────────────
    "urgency_high": {
        "en": "High - Take action soon",
        "fr": "Élevée - Agissez bientôt",
        "sw": "Kubwa - Chukua hatua hivi karibuni",
        "rw": "Ikabije - Kora ikintu vuba",
    },
    "urgency_medium": {
        "en": "Medium - Consider acting",
        "fr": "Moyenne - Envisagez d'agir",
        "sw": "Kati - Fikiria kuchukua hatua",
        "rw": "Hagati - Tekereza gukora ikintu",
    },
    "urgency_low": {
        "en": "Low - Monitor only",
        "fr": "Faible - Surveiller uniquement",
        "sw": "Chini - Fuatilia tu",
        "rw": "Ntaga remake - Kurikirana gusa",
    },

    # ── Endpoint Access Messages ─────────────────────────────────────────────────
    "farmers_only_endpoint": {
        "en": "This endpoint is only accessible to farmers.",
        "fr": "Ce point d'accès est uniquement accessible aux agriculteurs.",
        "sw": "Kipengele hiki kinapatikana kwa wakulima pekee.",
        "rw": "Iyi nzira iboneka gusa ku bahinzi.",
    },
    "buyers_only_endpoint": {
        "en": "This endpoint is only accessible to buyers.",
        "fr": "Ce point d'accès est uniquement accessible aux acheteurs.",
        "sw": "Kipengele hiki kinapatikana kwa wanunuzi pekee.",
        "rw": "Iyi nzira iboneka gusa ku baguzi.",
    },

    # ── Market Labels for Frontend ───────────────────────────────────────────────
    "market_current_price": {
        "en": "Current Average Price (RWF/kg)",
        "fr": "Prix Moyen Actuel (RWF/kg)",
        "sw": "Bei ya Sasa ya Wastani (RWF/kg)",
        "rw": "Igiciro K'ubu Kigereranije (RWF/kg)",
    },
    "market_price_range": {
        "en": "Price Range (RWF/kg)",
        "fr": "Gamme de Prix (RWF/kg)",
        "sw": "Masafa ya Bei (RWF/kg)",
        "rw": "Ibyiciro by'Igiciro (RWF/kg)",
    },
    "market_price_change": {
        "en": "30-Day Price Change",
        "fr": "Variation de Prix sur 30 Jours",
        "sw": "Mabadiliko ya Bei ya Siku 30",
        "rw": "Impinduka z'Igiciro mu Minsi 30",
    },
    "market_trend": {
        "en": "Market Trend",
        "fr": "Tendance du Marché",
        "sw": "Mwelekeo wa Soko",
        "rw": "Imikorere y'Isoko",
    },
    "market_predicted_price": {
        "en": "Predicted Future Price (RWF/kg)",
        "fr": "Prix Futur Prévu (RWF/kg)",
        "sw": "Bei ya Baadaye Iliyotabiriwa (RWF/kg)",
        "rw": "Igiciro Kazaza Kitezwe (RWF/kg)",
    },
    "market_total_volume": {
        "en": "Total Volume Sold",
        "fr": "Volume Total Vendu",
        "sw": "Jumla ya Kiasi Kilichouzwa",
        "rw": "Ingano Yose Yagurishijwe",
    },
    "market_transactions": {
        "en": "Number of Transactions",
        "fr": "Nombre de Transactions",
        "sw": "Idadi ya Miamala",
        "rw": "Umubare w'Ibikorwa",
    },
    "market_recommendation": {
        "en": "Recommendation",
        "fr": "Recommandation",
        "sw": "Mapendekezo",
        "rw": "Icyifuzo",
    },
    "market_confidence": {
        "en": "Prediction Confidence",
        "fr": "Confiance de Prédiction",
        "sw": "Ujasiri wa Utabiri",
        "rw": "Ubudashyikirwa bw'Ibyitezwe",
    },
    "market_crop_label": {
        "en": "Crop",
        "fr": "Culture",
        "sw": "Zao",
        "rw": "Ihingwa",
    },
    "market_prediction_label": {
        "en": "4-Week Prediction",
        "fr": "Prédiction 4 Semaines",
        "sw": "Utabiri wa Wiki 4",
        "rw": "Ibyitezwe mu Byumweru 4",
    },
    "buyer_product_label": {
        "en": "Product",
        "fr": "Produit",
        "sw": "Bidhaa",
        "rw": "Igicuruzwa",
    },
    "buyer_action_label": {
        "en": "Suggested Action",
        "fr": "Action Suggérée",
        "sw": "Hatua Iliyopendekezwa",
        "rw": "Igikorwa Gisabwe",
    },
}

SUPPORTED_LANGUAGES = {"en", "fr", "sw", "rw"}
DEFAULT_LANGUAGE    = "en"


def nt(key: str, lang: str = DEFAULT_LANGUAGE, **kwargs) -> str:
    """
    Translate a notification message key into the requested language.

    Args:
        key:      Key from NOTIFICATION_MESSAGES dict.
        lang:     ISO language code – en / fr / sw / rw.
        **kwargs: Optional placeholders, e.g. name="Alice", count=5.

    Returns:
        Translated string, falling back to English if key/lang is missing.
    """
    lang    = lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE
    msg_map = NOTIFICATION_MESSAGES.get(key, {})
    text    = msg_map.get(lang) or msg_map.get(DEFAULT_LANGUAGE, key)
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    return text