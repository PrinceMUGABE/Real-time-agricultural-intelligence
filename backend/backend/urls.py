
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('userApp.urls')),
    path('notifications/', include('notificationApp.urls')),
    path('stock/', include('stockApp.urls')),
    path('standard/', include('standardApp.urls')),
    path('chat/', include('chatApp.urls')),
    path('contract/', include('contractApp.urls')),
    path('market-matching/', include('marketMatchingApp.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
