"""
translations.py  –  All user-facing API response messages in 5 languages.

Supported language codes:
    en  – English   (default)
    fr  – French
    sw  – Swahili
    rw  – Kinyarwanda

Usage:
    from .translations import t
    return Response({"error": t("phone_required", lang)}, status=400)
"""

MESSAGES = {

    # ── Generic / shared ────────────────────────────────────────────────────
    "server_error": {
        "en": "An unexpected error occurred. Please try again later.",
        "fr": "Une erreur inattendue s'est produite. Veuillez réessayer plus tard.",
        "sw": "Hitilafu isiyotarajiwa imetokea. Tafadhali jaribu tena baadaye.",
        "rw": "Ikibazo kitazwi cyabaye. Nyamuneka gerageza nyuma.",
    },

    # ── Registration ────────────────────────────────────────────────────────
    "full_name_required": {
        "en": "Full name is required.",
        "fr": "Le nom complet est obligatoire.",
        "sw": "Jina kamili linahitajika.",
        "rw": "Amazina yose asabwa.",
    },
    "phone_required": {
        "en": "Phone number is required.",
        "fr": "Le numéro de téléphone est obligatoire.",
        "sw": "Nambari ya simu inahitajika.",
        "rw": "Numero ya telefone irasabwa.",
    },
    "email_required": {
        "en": "Email is required.",
        "fr": "L'adresse e-mail est obligatoire.",
        "sw": "Barua pepe inahitajika.",
        "rw": "Imeri irasabwa.",
    },
    "role_required": {
        "en": "Role is required.",
        "fr": "Le rôle est obligatoire.",
        "sw": "Jukumu linahitajika.",
        "rw": "Uruhare rusabwa.",
    },
    "role_invalid": {
        "en": "Invalid role. Choose farmer, buyer, or admin.",
        "fr": "Rôle invalide. Choisissez agriculteur, acheteur ou administrateur.",
        "sw": "Jukumu batili. Chagua mkulima, mnunuzi, au msimamizi.",
        "rw": "Uruhare rutemewe. Hitamo umuhinzi, umuguzi, cyangwa umuyobozi.",
    },
    "role_not_supported": {
        "en": "The system does not support your role.",
        "fr": "Le système ne prend pas en charge votre rôle.",
        "sw": "Mfumo haukubaliani na jukumu lako.",
        "rw": "Sisitemu ntishyigikira uruhare rwawe.",
    },
    "password_required": {
        "en": "Password and confirm password are required.",
        "fr": "Le mot de passe et sa confirmation sont obligatoires.",
        "sw": "Nenosiri na uthibitisho wake vinahitajika.",
        "rw": "Ijambo banga n'inyemeza yabyo bisabwa.",
    },
    "passwords_no_match": {
        "en": "Passwords do not match.",
        "fr": "Les mots de passe ne correspondent pas.",
        "sw": "Manenosiri hayalingani.",
        "rw": "Amagambo banga ntahuye.",
    },
    "email_invalid": {
        "en": "Invalid email format.",
        "fr": "Format d'e-mail invalide.",
        "sw": "Muundo wa barua pepe si sahihi.",
        "rw": "Imeri ntemewe.",
    },
    "phone_exists": {
        "en": "A user with this phone number already exists.",
        "fr": "Un utilisateur avec ce numéro de téléphone existe déjà.",
        "sw": "Mtumiaji mwenye nambari hii ya simu tayari yupo.",
        "rw": "Umutumiaji ufite iyo numero ya telefone asanzwe ahari.",
    },
    "email_exists": {
        "en": "A user with this email already exists.",
        "fr": "Un utilisateur avec cet e-mail existe déjà.",
        "sw": "Mtumiaji mwenye barua pepe hii tayari yupo.",
        "rw": "Umutumiaji ufite iyo meri asanzwe ahari.",
    },
    "otp_sent": {
        "en": "OTP sent to your email. Please verify within 1 minute.",
        "fr": "OTP envoyé à votre e-mail. Veuillez vérifier dans 1 minute.",
        "sw": "OTP imetumwa kwa barua pepe yako. Tafadhali thibitisha ndani ya dakika 1.",
        "rw": "OTP yoherejwe kuri meri yawe. Nyamuneka emeza mu minota 1.",
    },
    "otp_send_failed": {
        "en": "Failed to send OTP email. Please try again.",
        "fr": "Échec de l'envoi de l'e-mail OTP. Veuillez réessayer.",
        "sw": "Imeshindwa kutuma barua pepe ya OTP. Tafadhali jaribu tena.",
        "rw": "Kwohereza imeri ya OTP byanze. Nyamuneka gerageza nanone.",
    },

    # ── OTP verification ────────────────────────────────────────────────────
    "session_id_otp_required": {
        "en": "session_id and otp are required.",
        "fr": "session_id et otp sont obligatoires.",
        "sw": "session_id na otp vinahitajika.",
        "rw": "session_id na otp bisabwa.",
    },
    "session_invalid": {
        "en": "Invalid or expired session. Please register again.",
        "fr": "Session invalide ou expirée. Veuillez vous réinscrire.",
        "sw": "Kipindi batili au kimekwisha muda. Tafadhali jisajili tena.",
        "rw": "Igihe cy'ibikorwa kitemewe cyangwa kirangiye. Nyamuneka iyandikishe nanone.",
    },
    "otp_expired": {
        "en": "OTP has expired. Please register again.",
        "fr": "L'OTP a expiré. Veuillez vous réinscrire.",
        "sw": "OTP imekwisha muda. Tafadhali jisajili tena.",
        "rw": "OTP irarangiye. Nyamuneka iyandikishe nanone.",
    },
    "otp_expired_reset": {
        "en": "OTP has expired. Please request a new one.",
        "fr": "L'OTP a expiré. Veuillez en demander un nouveau.",
        "sw": "OTP imekwisha muda. Tafadhali omba mpya.",
        "rw": "OTP irarangiye. Nyamuneka saba indi.",
    },
    "too_many_attempts": {
        "en": "Too many incorrect attempts. Session ended. Please register again.",
        "fr": "Trop de tentatives incorrectes. Session terminée. Veuillez vous réinscrire.",
        "sw": "Majaribio mengi mabaya. Kipindi kimekwisha. Tafadhali jisajili tena.",
        "rw": "Gerageza byinshi bibi. Igihe cy'ibikorwa kirangiye. Nyamuneka iyandikishe nanone.",
    },
    "too_many_attempts_reset": {
        "en": "Too many incorrect attempts. Session ended.",
        "fr": "Trop de tentatives incorrectes. Session terminée.",
        "sw": "Majaribio mengi mabaya. Kipindi kimekwisha.",
        "rw": "Gerageza byinshi bibi. Igihe cy'ibikorwa kirangiye.",
    },
    "otp_incorrect": {
        "en": "Incorrect OTP. {remaining} attempt(s) remaining.",
        "fr": "OTP incorrect. {remaining} tentative(s) restante(s).",
        "sw": "OTP si sahihi. Majaribio {remaining} yaliyobaki.",
        "rw": "OTP si yo. Gerageza {remaining} zasigaye.",
    },
    "phone_already_registered": {
        "en": "Phone number already registered.",
        "fr": "Numéro de téléphone déjà enregistré.",
        "sw": "Nambari ya simu tayari imesajiliwa.",
        "rw": "Numero ya telefone isanzwe yanditswe.",
    },
    "email_already_registered": {
        "en": "Email already registered.",
        "fr": "E-mail déjà enregistré.",
        "sw": "Barua pepe tayari imesajiliwa.",
        "rw": "Imeri isanzwe yanditswe.",
    },
    "registration_success": {
        "en": "Registration successful.",
        "fr": "Inscription réussie.",
        "sw": "Usajili umefanikiwa.",
        "rw": "Kwiyandikisha byagenze neza.",
    },

    # ── OTP resend ──────────────────────────────────────────────────────────
    "session_id_required": {
        "en": "session_id is required.",
        "fr": "session_id est obligatoire.",
        "sw": "session_id inahitajika.",
        "rw": "session_id irasabwa.",
    },
    "session_invalid_register": {
        "en": "Invalid session. Please register again.",
        "fr": "Session invalide. Veuillez vous réinscrire.",
        "sw": "Kipindi batili. Tafadhali jisajili tena.",
        "rw": "Igihe cy'ibikorwa kitemewe. Nyamuneka iyandikishe nanone.",
    },
    "resend_limit_reached": {
        "en": "Maximum resend limit reached. Please register again.",
        "fr": "Limite maximale de renvoi atteinte. Veuillez vous réinscrire.",
        "sw": "Kikomo cha juu cha kutuma tena kimefikwa. Tafadhali jisajili tena.",
        "rw": "Umupaka wo kohereza nanone ugezweho. Nyamuneka iyandikishe nanone.",
    },
    "resend_limit_reached_reset": {
        "en": "Maximum resend limit reached. Please start over.",
        "fr": "Limite maximale de renvoi atteinte. Veuillez recommencer.",
        "sw": "Kikomo cha juu kimefikwa. Tafadhali anza upya.",
        "rw": "Umupaka ugezweho. Nyamuneka tangira nanone.",
    },
    "otp_resent": {
        "en": "OTP resent. {remaining} resend(s) remaining.",
        "fr": "OTP renvoyé. {remaining} renvoi(s) restant(s).",
        "sw": "OTP imetumwa tena. Matumio {remaining} yaliyobaki.",
        "rw": "OTP yoherejwe nanone. Kohereza {remaining} zasigaye.",
    },
    "otp_resend_failed": {
        "en": "Failed to send OTP. Please try again.",
        "fr": "Échec de l'envoi de l'OTP. Veuillez réessayer.",
        "sw": "Imeshindwa kutuma OTP. Tafadhali jaribu tena.",
        "rw": "Kwohereza OTP byanze. Nyamuneka gerageza nanone.",
    },

    # ── Login ────────────────────────────────────────────────────────────────
    "identifier_password_required": {
        "en": "Email/phone and password are required.",
        "fr": "E-mail/téléphone et mot de passe sont obligatoires.",
        "sw": "Barua pepe/simu na nenosiri vinahitajika.",
        "rw": "Imeri/telefone n'ijambo banga bisabwa.",
    },
    "account_not_found": {
        "en": "No account found with this email or phone number.",
        "fr": "Aucun compte trouvé avec cet e-mail ou numéro de téléphone.",
        "sw": "Hakuna akaunti iliyopatikana na barua pepe au nambari hii ya simu.",
        "rw": "Nta konti ibonetse ufite iyo meri cyangwa numero ya telefone.",
    },
    "password_incorrect": {
        "en": "Incorrect password.",
        "fr": "Mot de passe incorrect.",
        "sw": "Nenosiri si sahihi.",
        "rw": "Ijambo banga si ryo.",
    },
    "account_disabled": {
        "en": "This account has been disabled.",
        "fr": "Ce compte a été désactivé.",
        "sw": "Akaunti hii imezimwa.",
        "rw": "Konti iyi ifunzwe.",
    },
    "login_success": {
        "en": "Login successful.",
        "fr": "Connexion réussie.",
        "sw": "Kuingia kumefanikiwa.",
        "rw": "Kwinjira byagenze neza.",
    },

    # ── Forgot password ─────────────────────────────────────────────────────
    "otp_sent_if_exists": {
        "en": "If an account with that email exists, an OTP has been sent.",
        "fr": "Si un compte avec cet e-mail existe, un OTP a été envoyé.",
        "sw": "Ikiwa akaunti yenye barua pepe hiyo ipo, OTP imetumwa.",
        "rw": "Niba konti ifite iyo meri ibaho, OTP yoherejwe.",
    },
    "otp_sent_reset": {
        "en": "OTP sent to your email. Valid for 1 minute.",
        "fr": "OTP envoyé à votre e-mail. Valide pendant 1 minute.",
        "sw": "OTP imetumwa kwa barua pepe yako. Halali kwa dakika 1.",
        "rw": "OTP yoherejwe kuri meri yawe. Irafite agaciro mu minota 1.",
    },
    "new_password_required": {
        "en": "new_password and confirmPassword are required.",
        "fr": "new_password et confirmPassword sont obligatoires.",
        "sw": "new_password na confirmPassword vinahitajika.",
        "rw": "new_password na confirmPassword bisabwa.",
    },
    "session_invalid_reset": {
        "en": "Invalid or expired session.",
        "fr": "Session invalide ou expirée.",
        "sw": "Kipindi batili au kimekwisha muda.",
        "rw": "Igihe cy'ibikorwa kitemewe cyangwa kirangiye.",
    },
    "account_not_found_reset": {
        "en": "Account not found.",
        "fr": "Compte introuvable.",
        "sw": "Akaunti haikupatikana.",
        "rw": "Konti ntiboneka.",
    },
    "password_reset_success": {
        "en": "Password reset successfully.",
        "fr": "Mot de passe réinitialisé avec succès.",
        "sw": "Nenosiri imewekwa upya kwa mafanikio.",
        "rw": "Ijambo banga ryasuwe neza.",
    },
    "session_invalid_otp": {
        "en": "Invalid session. Please request a new OTP.",
        "fr": "Session invalide. Veuillez demander un nouvel OTP.",
        "sw": "Kipindi batili. Tafadhali omba OTP mpya.",
        "rw": "Igihe cy'ibikorwa kitemewe. Nyamuneka saba OTP nshya.",
    },
    "otp_resend_failed_reset": {
        "en": "Failed to resend OTP.",
        "fr": "Échec du renvoi de l'OTP.",
        "sw": "Imeshindwa kutuma tena OTP.",
        "rw": "Kohereza OTP nanone byanze.",
    },

    # ── Profile ──────────────────────────────────────────────────────────────
    "full_name_empty": {
        "en": "Full name cannot be empty.",
        "fr": "Le nom complet ne peut pas être vide.",
        "sw": "Jina kamili haliwezi kuwa tupu.",
        "rw": "Amazina yose ntashobora kuba ubusa.",
    },
    "email_in_use": {
        "en": "Email already in use by another account.",
        "fr": "E-mail déjà utilisé par un autre compte.",
        "sw": "Barua pepe tayari inatumika na akaunti nyingine.",
        "rw": "Imeri isanzwe ikoreshwa n'indi konti.",
    },
    "phone_in_use": {
        "en": "Phone number already in use.",
        "fr": "Numéro de téléphone déjà utilisé.",
        "sw": "Nambari ya simu tayari inatumika.",
        "rw": "Numero ya telefone isanzwe ikoreshwa.",
    },
    "profile_updated": {
        "en": "Profile updated successfully.",
        "fr": "Profil mis à jour avec succès.",
        "sw": "Wasifu umesasishwa kwa mafanikio.",
        "rw": "Umwirondoro wahinduwe neza.",
    },

    # ── Change password ──────────────────────────────────────────────────────
    "all_password_fields_required": {
        "en": "All three password fields are required.",
        "fr": "Les trois champs de mot de passe sont obligatoires.",
        "sw": "Sehemu zote tatu za nenosiri zinahitajika.",
        "rw": "Imikorere yose itatu y'ijambo banga irasabwa.",
    },
    "current_password_incorrect": {
        "en": "Current password is incorrect.",
        "fr": "Le mot de passe actuel est incorrect.",
        "sw": "Nenosiri ya sasa si sahihi.",
        "rw": "Ijambo banga rya ubu si ryo.",
    },
    "new_password_same": {
        "en": "New password must differ from the current password.",
        "fr": "Le nouveau mot de passe doit être différent du mot de passe actuel.",
        "sw": "Nenosiri mpya lazima iwe tofauti na ya sasa.",
        "rw": "Ijambo banga rishya rigomba gutandukana n'irya ubu.",
    },
    "password_changed": {
        "en": "Password changed successfully.",
        "fr": "Mot de passe modifié avec succès.",
        "sw": "Nenosiri imebadilishwa kwa mafanikio.",
        "rw": "Ijambo banga ryahinduwe neza.",
    },

    # ── Password validation ──────────────────────────────────────────────────
    "pwd_too_short": {
        "en": "Password must be at least 8 characters long.",
        "fr": "Le mot de passe doit comporter au moins 8 caractères.",
        "sw": "Nenosiri lazima iwe na herufi angalau 8.",
        "rw": "Ijambo banga rigomba kuba rifite nibura inyuguti 8.",
    },
    "pwd_no_digit": {
        "en": "Password must include at least one number.",
        "fr": "Le mot de passe doit contenir au moins un chiffre.",
        "sw": "Nenosiri lazima iwe na nambari angalau moja.",
        "rw": "Ijambo banga rigomba kuba rifite nibura umubare umwe.",
    },
    "pwd_no_upper": {
        "en": "Password must include at least one uppercase letter.",
        "fr": "Le mot de passe doit contenir au moins une lettre majuscule.",
        "sw": "Nenosiri lazima iwe na herufi kubwa angalau moja.",
        "rw": "Ijambo banga rigomba kuba rifite nibura inyuguti nkuru imwe.",
    },
    "pwd_no_lower": {
        "en": "Password must include at least one lowercase letter.",
        "fr": "Le mot de passe doit contenir au moins une lettre minuscule.",
        "sw": "Nenosiri lazima iwe na herufi ndogo angalau moja.",
        "rw": "Ijambo banga rigomba kuba rifite nibura inyuguti nto imwe.",
    },
    "pwd_no_special": {
        "en": "Password must include at least one special character (!@#$%^&* etc.).",
        "fr": "Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&* etc.).",
        "sw": "Nenosiri lazima iwe na herufi maalum angalau moja (!@#$%^&* n.k.).",
        "rw": "Ijambo banga rigomba kuba rifite nibura ikirango cyihariye kimwe (!@#$%^&* n.s.n.).",
    },

    # ── Admin – user management ──────────────────────────────────────────────
    "admin_required": {
        "en": "Admin access required.",
        "fr": "Accès administrateur requis.",
        "sw": "Ufikiaji wa msimamizi unahitajika.",
        "rw": "Uburenganzira bw'umuyobozi busabwa.",
    },
    "user_not_found": {
        "en": "User not found.",
        "fr": "Utilisateur introuvable.",
        "sw": "Mtumiaji hakupatikana.",
        "rw": "Umutumiaji ntaboneka.",
    },
    "user_created": {
        "en": "User created successfully.",
        "fr": "Utilisateur créé avec succès.",
        "sw": "Mtumiaji ameundwa kwa mafanikio.",
        "rw": "Umutumiaji arashyizweho neza.",
    },
    "user_updated": {
        "en": "User updated successfully.",
        "fr": "Utilisateur mis à jour avec succès.",
        "sw": "Mtumiaji amesasishwa kwa mafanikio.",
        "rw": "Umutumiaji yahinduwe neza.",
    },
    "user_already_active": {
        "en": "Account is already active.",
        "fr": "Le compte est déjà actif.",
        "sw": "Akaunti tayari iko hai.",
        "rw": "Konti isanzwe irakora.",
    },
    "user_activated": {
        "en": "User activated successfully.",
        "fr": "Utilisateur activé avec succès.",
        "sw": "Mtumiaji amewezeshwa kwa mafanikio.",
        "rw": "Umutumiaji yafunguwe neza.",
    },
    "user_already_inactive": {
        "en": "Account is already inactive.",
        "fr": "Le compte est déjà inactif.",
        "sw": "Akaunti tayari haiko hai.",
        "rw": "Konti isanzwe ntikora.",
    },
    "user_deactivated": {
        "en": "User deactivated successfully.",
        "fr": "Utilisateur désactivé avec succès.",
        "sw": "Mtumiaji amezimwa kwa mafanikio.",
        "rw": "Umutumiaji afunzwe neza.",
    },
    "user_deleted": {
        "en": "User deleted successfully.",
        "fr": "Utilisateur supprimé avec succès.",
        "sw": "Mtumiaji amefutwa kwa mafanikio.",
        "rw": "Umutumiaji asibwe neza.",
    },
    "role_invalid_admin": {
        "en": "Valid role (farmer, buyer, admin) is required.",
        "fr": "Un rôle valide (agriculteur, acheteur, administrateur) est requis.",
        "sw": "Jukumu halali (mkulima, mnunuzi, msimamizi) linahitajika.",
        "rw": "Uruhare rufite agaciro (umuhinzi, umuguzi, umuyobozi) rusabwa.",
    },
    "role_invalid_update": {
        "en": "Invalid role.",
        "fr": "Rôle invalide.",
        "sw": "Jukumu batili.",
        "rw": "Uruhare rutemewe.",
    },
    "phone_already_used": {
        "en": "Phone number already used.",
        "fr": "Numéro de téléphone déjà utilisé.",
        "sw": "Nambari ya simu tayari imetumika.",
        "rw": "Numero ya telefone isanzwe ikoreshejwe.",
    },
    "email_already_used": {
        "en": "Email already used.",
        "fr": "E-mail déjà utilisé.",
        "sw": "Barua pepe tayari imetumika.",
        "rw": "Imeri isanzwe ikoreshejwe.",
    },
    "no_email_password_warning": {
        "en": "No email provided. Share this password securely with the user.",
        "fr": "Aucun e-mail fourni. Partagez ce mot de passe en toute sécurité avec l'utilisateur.",
        "sw": "Hakuna barua pepe iliyotolewa. Shiriki nenosiri hii kwa usalama na mtumiaji.",
        "rw": "Nta meri itanzwe. Sangira ijambo banga iri mu mutekano n'umutumiaji.",
    },

    # ── Token / Auth ─────────────────────────────────────────────────────────
    "token_valid": {
        "en": "Token is valid.",
        "fr": "Le jeton est valide.",
        "sw": "Tokeni ni halali.",
        "rw": "Ikimenyetso gifite agaciro.",
    },
    "refresh_token_required": {
        "en": "Refresh token is required.",
        "fr": "Le jeton de rafraîchissement est obligatoire.",
        "sw": "Tokeni ya kusasisha inahitajika.",
        "rw": "Ikimenyetso cyo gusubiramo girasabwa.",
    },
    "token_wrong_user": {
        "en": "Token does not belong to the current user.",
        "fr": "Le jeton n'appartient pas à l'utilisateur actuel.",
        "sw": "Tokeni haihusu mtumiaji wa sasa.",
        "rw": "Ikimenyetso ntiki cy'umutumiaji uyu.",
    },
    "token_refreshed": {
        "en": "Token refreshed successfully.",
        "fr": "Jeton rafraîchi avec succès.",
        "sw": "Tokeni imesasishwa kwa mafanikio.",
        "rw": "Ikimenyetso cyasubiwemo neza.",
    },
    "token_invalid": {
        "en": "Invalid or expired refresh token: {detail}",
        "fr": "Jeton de rafraîchissement invalide ou expiré : {detail}",
        "sw": "Tokeni ya kusasisha batili au imekwisha muda: {detail}",
        "rw": "Ikimenyetso cyo gusubiramo kitemewe cyangwa kirangiye: {detail}",
    },
    "token_refresh_failed": {
        "en": "Token refresh failed: {detail}",
        "fr": "Échec du rafraîchissement du jeton : {detail}",
        "sw": "Kusasisha tokeni kumeshindwa: {detail}",
        "rw": "Gusubira ikimenyetso byanze: {detail}",
    },
    "logout_success": {
        "en": "Logged out successfully.",
        "fr": "Déconnexion réussie.",
        "sw": "Umetoka kwa mafanikio.",
        "rw": "Gusohoka byagenze neza.",
    },
    "logout_failed": {
        "en": "Logout failed: {detail}",
        "fr": "Déconnexion échouée : {detail}",
        "sw": "Kutoka kumeshindwa: {detail}",
        "rw": "Gusohoka byanze: {detail}",
    },

    # ── Contact us ───────────────────────────────────────────────────────────
    "contact_field_empty": {
        "en": "{label} cannot be empty.",
        "fr": "{label} ne peut pas être vide.",
        "sw": "{label} haiwezi kuwa tupu.",
        "rw": "{label} ntishobora kuba ubusa.",
    },
    "contact_sent": {
        "en": "Message sent successfully.",
        "fr": "Message envoyé avec succès.",
        "sw": "Ujumbe umetumwa kwa mafanikio.",
        "rw": "Ubutumwa bwoherejwe neza.",
    },
    "contact_failed": {
        "en": "Failed to send message. Please try again later.",
        "fr": "Échec de l'envoi du message. Veuillez réessayer plus tard.",
        "sw": "Imeshindwa kutuma ujumbe. Tafadhali jaribu tena baadaye.",
        "rw": "Kohereza ubutumwa byanze. Nyamuneka gerageza nyuma.",
    },

    # ── Language ─────────────────────────────────────────────────────────────
    "language_updated": {
        "en": "Language preference updated.",
        "fr": "Préférence de langue mise à jour.",
        "sw": "Upendeleo wa lugha umesasishwa.",
        "rw": "Icyifuzo cy'ururimi cyahinduwe.",
    },
    "language_invalid": {
        "en": "Unsupported language. Choose: en, fr, sw, rw.",
        "fr": "Langue non supportée. Choisissez : en, fr, sw, rw.",
        "sw": "Lugha haitegemewi. Chagua: en, fr, sw, rw.",
        "rw": "Ururimi rutashyigikiwe. Hitamo: en, fr, sw, rw.",
    },
}

SUPPORTED_LANGUAGES = {"en", "fr", "sw", "rw"}
DEFAULT_LANGUAGE = "en"


def t(key: str, lang: str = DEFAULT_LANGUAGE, **kwargs) -> str:
    """
    Translate a message key into the requested language.

    Args:
        key:    Key from the MESSAGES dict above.
        lang:   ISO language code – en / fr / sw / rw.
        **kwargs: Optional placeholders, e.g. remaining=3, label="Name".

    Returns:
        Translated string, falling back to English if key/lang is missing.
    """
    lang = lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE
    msg_map = MESSAGES.get(key, {})
    text = msg_map.get(lang) or msg_map.get(DEFAULT_LANGUAGE, key)
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    return text