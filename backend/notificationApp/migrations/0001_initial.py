from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(
                    choices=[('system', 'System'), ('broadcast', 'Broadcast'), ('direct', 'Direct')],
                    default='system',
                    max_length=20,
                )),
                ('audience', models.CharField(
                    blank=True,
                    choices=[('all', 'All Users'), ('farmers', 'Farmers Only'), ('buyers', 'Buyers Only'), ('admins', 'Admins Only')],
                    help_text='Only relevant for broadcast notifications.',
                    max_length=20,
                    null=True,
                )),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('status', models.CharField(
                    choices=[('unread', 'Unread'), ('read', 'Read')],
                    default='unread',
                    max_length=10,
                )),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('sender', models.ForeignKey(
                    blank=True,
                    help_text='Null for system-generated notifications.',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sent_notifications',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('receiver', models.ForeignKey(
                    blank=True,
                    help_text='Null for broadcast notifications.',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='received_notifications',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]