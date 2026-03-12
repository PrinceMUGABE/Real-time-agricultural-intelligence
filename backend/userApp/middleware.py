"""
middleware.py  –  Language detection middleware.

Priority order for language resolution:
    1. `Accept-Language` HTTP header  (e.g.  Accept-Language: rw)
    2. Authenticated user's saved `language` field
    3. Default: "en"

The resolved code is attached to `request.lang` so every view can do:
    from .translations import t
    t("some_key", request.lang)
"""

from .translations import SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE


class LanguageMiddleware:
    """Attach `request.lang` to every request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.lang = self._resolve(request)
        return self.get_response(request)

    # ── private ──────────────────────────────────────────────────────────────

    @staticmethod
    def _resolve(request) -> str:
        # 1. Explicit header  (highest priority – lets frontend override anything)
        header_lang = request.headers.get("Accept-Language", "").strip().lower()
        if header_lang in SUPPORTED_LANGUAGES:
            return header_lang

        # 2. Authenticated user's saved preference
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            saved = getattr(user, "language", "")
            if saved in SUPPORTED_LANGUAGES:
                return saved

        return DEFAULT_LANGUAGE