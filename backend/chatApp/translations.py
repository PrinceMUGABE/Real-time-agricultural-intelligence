# chatApp/translations.py

"""
chatApp/translations.py - User-facing messages for chat functionality
"""

CHAT_MESSAGES = {
    # Success messages
    "chats_retrieved": {
        "en": "Chats retrieved successfully",
        "fr": "Chats récupérés avec succès",
        "sw": "Gumzo zimepatikana kwa mafanikio",
        "rw": "Ibiganiro byakuwe neza",
    },
    "chat_created": {
        "en": "Chat room created successfully",
        "fr": "Salon de discussion créé avec succès",
        "sw": "Chumba cha gumzo kimeundwa kwa mafanikio",
        "rw": "Ibiganiro byashyizweho neza",
    },
    "chat_exists": {
        "en": "Chat room already exists",
        "fr": "Le salon de discussion existe déjà",
        "sw": "Chumba cha gumzo tayari kipo",
        "rw": "Ibiganiho biracyariho",
    },
    "message_sent": {
        "en": "Message sent successfully",
        "fr": "Message envoyé avec succès",
        "sw": "Ujumbe umetumwa kwa mafanikio",
        "rw": "Ubutumwa bwoherejwe neza",
    },
    "message_deleted": {
        "en": "Message deleted successfully",
        "fr": "Message supprimé avec succès",
        "sw": "Ujumbe umefutwa kwa mafanikio",
        "rw": "Ubutumwa bwasibwe neza",
    },
    "message_marked_read": {
        "en": "Message marked as read",
        "fr": "Message marqué comme lu",
        "sw": "Ujumbe umewekwa alama ya kusomwa",
        "rw": "Ubutumwa bwashyizweho ikimenyetso cyo gusomwa",
    },
    "all_marked_read": {
        "en": "All messages marked as read",
        "fr": "Tous les messages marqués comme lus",
        "sw": "Ujumbe wote umewekwa alama ya kusomwa",
        "rw": "Ubutumwa bwose bwashyizweho ikimenyetso cyo gusomwa",
    },
    "settings_updated": {
        "en": "Chat settings updated successfully",
        "fr": "Paramètres du chat mis à jour avec succès",
        "sw": "Mipangilio ya gumzo imesasishwa kwa mafanikio",
        "rw": "Igenamiterere ryahinduwe neza",
    },
    "participant_added": {
        "en": "Participant added successfully",
        "fr": "Participant ajouté avec succès",
        "sw": "Mshiriki ameongezwa kwa mafanikio",
        "rw": "Uwitabiri yongewemo neza",
    },
    "participant_removed": {
        "en": "Participant removed successfully",
        "fr": "Participant retiré avec succès",
        "sw": "Mshiriki ameondolewa kwa mafanikio",
        "rw": "Uwitabiri yakurwemo neza",
    },
    "user_blocked": {
        "en": "User blocked successfully",
        "fr": "Utilisateur bloqué avec succès",
        "sw": "Mtumiaji amezuiliwa kwa mafanikio",
        "rw": "Umutumiaji yahagaritswe neza",
    },
    "user_unblocked": {
        "en": "User unblocked successfully",
        "fr": "Utilisateur débloqué avec succès",
        "sw": "Mtumiaji ameachiliwa kwa mafanikio",
        "rw": "Umutumiaji yagaruriwe neza",
    },
    
    # Error messages
    "validation_error": {
        "en": "Validation error",
        "fr": "Erreur de validation",
        "sw": "Hitilafu ya uthibitishaji",
        "rw": "Ikosa ry'ubwuzuzanye",
    },
    "permission_denied": {
        "en": "Permission denied",
        "fr": "Permission refusée",
        "sw": "Ruhusa imekataliwa",
        "rw": "Uburenganzira bwanzwe",
    },
    "server_error": {
        "en": "An unexpected error occurred. Please try again later.",
        "fr": "Une erreur inattendue s'est produite. Veuillez réessayer plus tard.",
        "sw": "Hitilafu isiyotarajiwa imetokea. Tafadhali jaribu tena baadaye.",
        "rw": "Ikibazo kitazwi cyabaye. Nyamuneka gerageza nyuma.",
    },
    "invalid_data": {
        "en": "Invalid data provided",
        "fr": "Données invalides fournies",
        "sw": "Data batili imetolewa",
        "rw": "Amakuru atemewe yatanzwe",
    },
    "invalid_message": {
        "en": "Invalid message data",
        "fr": "Données de message invalides",
        "sw": "Data ya ujumbe batili",
        "rw": "Amakuru y'ubutumwa atemewe",
    },
    "invalid_settings": {
        "en": "Invalid settings data",
        "fr": "Paramètres invalides",
        "sw": "Mipangilio batili",
        "rw": "Igenamiterere ritari ryo",
    },
    "invalid_action": {
        "en": "Invalid action specified",
        "fr": "Action spécifiée invalide",
        "sw": "Kitendo batili kimebainishwa",
        "rw": "Igikorwa cyatanzwe nticyemewe",
    },
    "admin_required": {
        "en": "Admin access required",
        "fr": "Accès administrateur requis",
        "sw": "Ufikiaji wa msimamizi unahitajika",
        "rw": "Uburenganzira bw'umuyobozi busabwa",
    },
    "action_user_required": {
        "en": "Action and user_id are required",
        "fr": "Action et user_id sont requis",
        "sw": "Kitendo na user_id vinahitajika",
        "rw": "Igikorwa na user_id bisabwa",
    },
    "not_participant": {
        "en": "You are not a participant in this chat",
        "fr": "Vous n'êtes pas participant à cette discussion",
        "sw": "Wewe si mshiriki katika gumzo hili",
        "rw": "Ntabwo uri mu biganiro",
    },
    "cannot_send_message": {
        "en": "You are not allowed to send messages in this chat",
        "fr": "Vous n'êtes pas autorisé à envoyer des messages dans ce chat",
        "sw": "Hauruhusiwi kutuma ujumbe kwenye gumzo hili",
        "rw": "Nturemewe kohereza ubutumwa muri iki biganiro",
    },
    "cannot_delete": {
        "en": "You are not allowed to delete this message",
        "fr": "Vous n'êtes pas autorisé à supprimer ce message",
        "sw": "Huruhusiwi kufuta ujumbe huu",
        "rw": "Nturemewe gusiba ubu butumwa",
    },
    "cannot_view_message": {
        "en": "You cannot view this message",
        "fr": "Vous ne pouvez pas voir ce message",
        "sw": "Huwezi kuona ujumbe huu",
        "rw": "Ntushobora kubona ubu butumwa",
    },
    "user_blocked_error": {
        "en": "You have been blocked from this chat",
        "fr": "Vous avez été bloqué de cette discussion",
        "sw": "Umezuiwa kwenye gumzo hili",
        "rw": "Wahagaritswe muri iki biganiro",
    },
    
    "chat_type_required": {
        "en": "Chat type is required",
        "fr": "Le type de chat est requis",
        "sw": "Aina ya gumzo inahitajika",
        "rw": "Ubwoko bw'ikiganiro burakenewe",
    },
    "invalid_chat_type": {
        "en": "Invalid chat type",
        "fr": "Type de chat invalide",
        "sw": "Aina ya gumzo si sahihi",
        "rw": "Ubwoko bw'ikiganiro ntibwemewe",
    },
    "user_id_required": {
        "en": "User ID is required",
        "fr": "L'ID utilisateur est requis",
        "sw": "Kitambulisho cha mtumiaji kinahitajika",
        "rw": "Indangamuntu irakenewe",
    },
    "user_not_found": {
        "en": "User not found",
        "fr": "Utilisateur non trouvé",
        "sw": "Mtumiaji hakupatikana",
        "rw": "Umukoresha ntabonetse",
    },
    "user_id_role_required": {
        "en": "User ID and role are required",
        "fr": "L'ID utilisateur et le rôle sont requis",
        "sw": "Kitambulisho cha mtumiaji na jukumu vinahitajika",
        "rw": "Indangamuntu n'inshingano birakenewe",
    },
    "invalid_role": {
        "en": "Invalid role. Valid roles are: admin, member, observer",
        "fr": "Rôle invalide. Les rôles valides sont : admin, membre, observateur",
        "sw": "Jukumu si sahihi. Majukumu halali ni: msimamizi, mwanachama, mtazamaji",
        "rw": "Inshingano ntiyemewe. Inshingano zemewe ni: umuyobozi, unyamuryango, ureba gusa",
    },
    "participant_role_updated": {
        "en": "Participant role updated successfully",
        "fr": "Rôle du participant mis à jour avec succès",
        "sw": "Jukumu la mshiriki limesasishwa kwa mafanikio",
        "rw": "Inshingano z'uwitabiriye zahinduwe neza",
    },
    
    # Statistics
    "chat_statistics": {
        "en": "Chat Statistics",
        "fr": "Statistiques du Chat",
        "sw": "Takwimu za Gumzo",
        "rw": "Imibare y'Ikiganiro",
    },
    "total_participants": {
        "en": "Total Participants",
        "fr": "Total des Participants",
        "sw": "Jumla ya Washiriki",
        "rw": "Ababitabiriye Bose",
    },
    "blocked_participants": {
        "en": "Blocked Participants",
        "fr": "Participants Bloqués",
        "sw": "Washiriki Waliozuiwa",
        "rw": "Ababitabiriye Bahagariwe",
    },
    "messages_last_7_days": {
        "en": "Messages (Last 7 Days)",
        "fr": "Messages (7 derniers jours)",
        "sw": "Ujumbe (Siku 7 zilizopita)",
        "rw": "Ubutumwa (mu minsi 7 ishize)",
    },
    "top_contributors": {
        "en": "Top Contributors",
        "fr": "Principaux Contributeurs",
        "sw": "Wachangiaji Wakuu",
        "rw": "Abatanze Umusanzwe Bakuru",
    },
    
    # Success messages
    "chat_deleted": {
        "en": "Chat deleted successfully",
        "fr": "Chat supprimé avec succès",
        "sw": "Gumzo limefutwa kwa mafanikio",
        "rw": "Ikiganiro cyasibwe neza",
    },
    
    # Error messages
    "failed_to_fetch_chats": {
        "en": "Failed to fetch chats",
        "fr": "Échec de la récupération des chats",
        "sw": "Imeshindwa kupata gumzo",
        "rw": "Kubona ibiganiro byananiwe",
    },
    "failed_to_create_chat": {
        "en": "Failed to create chat",
        "fr": "Échec de la création du chat",
        "sw": "Imeshindwa kuunda gumzo",
        "rw": "Gutangiza ikiganiro byananiwe",
    },
    "failed_to_update_settings": {
        "en": "Failed to update settings",
        "fr": "Échec de la mise à jour des paramètres",
        "sw": "Imeshindwa kusasisha mipangilio",
        "rw": "Kuvugurura igenamiterere byananiwe",
    },
    "failed_to_update_participant": {
        "en": "Failed to update participant",
        "fr": "Échec de la mise à jour du participant",
        "sw": "Imeshindwa kusasisha mshiriki",
        "rw": "Kuvugurura uwitabiriye byananiwe",
    },
    "failed_to_block_user": {
        "en": "Failed to block user",
        "fr": "Échec du blocage de l'utilisateur",
        "sw": "Imeshindwa kumzuia mtumiaji",
        "rw": "Kuhagarika umukoresha byananiwe",
    },
    "failed_to_delete_chat": {
        "en": "Failed to delete chat",
        "fr": "Échec de la suppression du chat",
        "sw": "Imeshindwa kufuta gumzo",
        "rw": "Gusiba ikiganiro byananiwe",
    },
    
    "media_uploaded": {
        "en": "Media files uploaded successfully",
        "fr": "Fichiers médias téléchargés avec succès",
        "sw": "Faili za media zimepakiwa kwa mafanikio",
        "rw": "Dosiye za media zashyizwe neza",
    },
    "media_deleted": {
        "en": "Media file deleted successfully",
        "fr": "Fichier média supprimé avec succès",
        "sw": "Faili ya media imefutwa kwa mafanikio",
        "rw": "Dosiye ya media yasibwe neza",
    },
    "media_deleted_permanent": {
        "en": "Media file permanently deleted",
        "fr": "Fichier média supprimé définitivement",
        "sw": "Faili ya media imefutwa kabisa",
        "rw": "Dosiye ya media yasibwe burundu",
    },
    "media_hidden": {
        "en": "Media hidden from your view",
        "fr": "Média masqué de votre vue",
        "sw": "Media imefichwa kutoka kwenye mtazamo wako",
        "rw": "Media yahishwe mu buryo bwawe",
    },
    "chat_room_id_required": {
        "en": "Chat room ID is required",
        "fr": "L'ID du salon de discussion est requis",
        "sw": "Kitambulisho cha chumba cha gumzo kinahitajika",
        "rw": "Indangamuntu y'ikiganiro irakenewe",
    },
    "no_files_uploaded": {
        "en": "No files were uploaded",
        "fr": "Aucun fichier n'a été téléchargé",
        "sw": "Hakuna faili zilizopakiwa",
        "rw": "Nta dosiye yashyizweho",
    },
    "messages_retrieved": {
        "en": "Messages retrieved successfully",
        "fr": "Messages récupérés avec succès",
        "sw": "Ujumbe umepatikana kwa mafanikio",
        "rw": "Ubutumwa bwakuwe neza",
    },
    "media_retrieved": {
        "en": "Media files retrieved successfully",
        "fr": "Fichiers médias récupérés avec succès",
        "sw": "Faili za media zimepatikana kwa mafanikio",
        "rw": "Dosiye za media zakuwe neza",
    },
    "invalid_media_type": {
        "en": "Invalid media type specified",
        "fr": "Type de média spécifié invalide",
        "sw": "Aina ya media iliyobainishwa si sahihi",
        "rw": "Ubwoko bwa media bwatanzwe nticyemewe",
    },
    "unsupported_file_type": {
        "en": "Unsupported file type",
        "fr": "Type de fichier non supporté",
        "sw": "Aina ya faili haitumiki",
        "rw": "Ubwoko bwa dosiye ntibushyigikiwe",
    },
}

SUPPORTED_LANGUAGES = {"en", "fr", "sw", "rw"}
DEFAULT_LANGUAGE = "en"


def ct(key: str, lang: str = DEFAULT_LANGUAGE, **kwargs) -> str:
    """
    Translate a chat message key into the requested language.
    
    Args:
        key: Message key from CHAT_MESSAGES dict
        lang: Language code (en/fr/sw/rw)
        **kwargs: Format parameters
    
    Returns:
        Translated string
    """
    lang = lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE
    msg_map = CHAT_MESSAGES.get(key, {})
    text = msg_map.get(lang) or msg_map.get(DEFAULT_LANGUAGE, key)
    
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    
    return text