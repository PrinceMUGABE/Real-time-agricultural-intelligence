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