from rest_framework import serializers
from .models import CustomUser


class ContactUsSerializer(serializers.Serializer):
    names       = serializers.CharField(max_length=100)
    email       = serializers.EmailField()
    subject     = serializers.CharField(max_length=255)
    description = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model  = CustomUser
        fields = ['id', 'full_name', 'phone_number', 'email',
                  'role', 'location', 'status', 'created_at']

    def get_status(self, obj):
        return "Active" if obj.status else "Non-Active"