from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    sender_name   = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    is_read       = serializers.SerializerMethodField()

    class Meta:
        model  = Notification
        fields = [
            'id',
            'notification_type',
            'audience',
            'sender_name',
            'receiver_name',
            'title',
            'description',
            'status',
            'is_read',
            'read_at',
            'created_at',
        ]

    def get_sender_name(self, obj):
        return obj.sender.full_name if obj.sender else 'System'

    def get_receiver_name(self, obj):
        if obj.receiver:
            return obj.receiver.full_name
        if obj.audience:
            return f'Broadcast → {obj.audience}'
        return None

    def get_is_read(self, obj):
        return obj.status == Notification.STATUS_READ