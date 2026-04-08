from django.apps import AppConfig


class ReportAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reportApp'
    verbose_name = 'Reports & Analytics'

    def ready(self):
        import reportApp.report_services