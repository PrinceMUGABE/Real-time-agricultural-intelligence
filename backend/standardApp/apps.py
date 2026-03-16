from django.apps import AppConfig


class CropstandardappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'standardApp'
    verbose_name = 'Crop Standards Management'

    def ready(self):
        import standardApp.signals