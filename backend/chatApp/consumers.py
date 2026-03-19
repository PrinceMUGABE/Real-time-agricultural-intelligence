# chatApp/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser

from .models import ChatRoom, ChatParticipant, Message
from userApp.models import CustomUser
from .serializers import MessageSerializer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handle WebSocket connection"""
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        # Authenticate user
        user = await self.get_user()
        if not user:
            await self.close(code=4001)
            return
        
        self.user = user
        
        # Check if user can join
        can_join = await self.can_join_chat()
        if not can_join:
            await self.close(code=4003, reason="Access denied")
            return
        
        # Accept connection
        await self.accept()
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Notify others
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': user.id,
                'full_name': user.full_name,
                'timestamp': timezone.now().isoformat()
            }
        )

    async def disconnect(self, close_code):
        """Handle disconnection"""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            if hasattr(self, 'user'):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'user_id': self.user.id,
                        'timestamp': timezone.now().isoformat()
                    }
                )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'read_receipt':
                await self.handle_read_receipt(data)
            elif message_type == 'message_deleted':
                await self.handle_message_deleted(data)
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")

    async def handle_chat_message(self, data):
        """Handle new chat message"""
        # Check if user can send messages
        can_send = await self.can_send_message()
        if not can_send:
            await self.send_error("You cannot send messages in this chat")
            return
        
        # Save message
        message = await self.save_message(
            content=data.get('content', ''),
            message_type=data.get('message_type', 'text'),
            attachment=data.get('attachment')
        )
        
        if message:
            # Broadcast to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message
                }
            )

    async def handle_typing(self, data):
        """Handle typing indicator"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_status',
                'user_id': self.user.id,
                'full_name': self.user.full_name,
                'is_typing': data.get('is_typing', False),
                'timestamp': timezone.now().isoformat()
            }
        )

    async def handle_read_receipt(self, data):
        """Handle message read receipt"""
        message_id = data.get('message_id')
        if message_id:
            await self.mark_message_read(message_id)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'read_receipt',
                    'message_id': message_id,
                    'user_id': self.user.id,
                    'full_name': self.user.full_name,
                    'timestamp': timezone.now().isoformat()
                }
            )

    async def handle_message_deleted(self, data):
        """Handle message deletion"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_deleted',
                'message_id': data.get('message_id'),
                'deleted_by': self.user.id,
                'delete_type': data.get('delete_type', 'for_me'),
                'timestamp': timezone.now().isoformat()
            }
        )

    # Message handlers for group sends
    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))

    async def typing_status(self, event):
        """Send typing status to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'typing_status',
            'user_id': event['user_id'],
            'full_name': event['full_name'],
            'is_typing': event['is_typing'],
            'timestamp': event['timestamp']
        }))

    async def read_receipt(self, event):
        """Send read receipt to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'full_name': event['full_name'],
            'timestamp': event['timestamp']
        }))

    async def message_deleted(self, event):
        """Send message deletion notification"""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'deleted_by': event['deleted_by'],
            'delete_type': event['delete_type'],
            'timestamp': event['timestamp']
        }))

    async def user_joined(self, event):
        """Send user joined notification"""
        await self.send(text_data=json.dumps({
            'type': 'user_joined',
            'user_id': event['user_id'],
            'full_name': event['full_name'],
            'timestamp': event['timestamp']
        }))

    async def user_left(self, event):
        """Send user left notification"""
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'timestamp': event['timestamp']
        }))

    async def send_error(self, message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))

    # Database operations
    @database_sync_to_async
    def get_user(self):
        """Get user from token in query string"""
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            query_string = self.scope['query_string'].decode()
            params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
            token = params.get('token')
            
            if token:
                access_token = AccessToken(token)
                return CustomUser.objects.get(id=access_token['user_id'])
        except Exception as e:
            print(f"Auth error: {e}")
        return None

    @database_sync_to_async
    def can_join_chat(self):
        """Check if user can join this chat room"""
        try:
            chat_room = ChatRoom.objects.get(id=self.room_id, is_active=True)
            participant = chat_room.chat_participants.filter(user=self.user).first()
            
            if not participant:
                # Admin can join any chat
                return self.user.role == 'admin'
            
            # Check if blocked
            if participant.is_blocked:
                return False
            
            return True
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def can_send_message(self):
        """Check if user can send messages"""
        try:
            chat_room = ChatRoom.objects.get(id=self.room_id)
            
            # Admin can always send
            if self.user.role == 'admin':
                return True
            
            # Check participant status
            participant = chat_room.chat_participants.filter(user=self.user).first()
            if not participant or participant.is_blocked:
                return False
            
            # Check chat settings
            try:
                settings = chat_room.settings
                if settings.allowed_senders == 'admins_only':
                    return False
            except:
                pass
            
            return True
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content, message_type='text', attachment=None):
        """Save message to database"""
        try:
            chat_room = ChatRoom.objects.get(id=self.room_id)
            
            message = Message.objects.create(
                chat_room=chat_room,
                sender=self.user,
                message_type=message_type,
                content=content
            )
            
            # Update chat room timestamp
            chat_room.updated_at = timezone.now()
            chat_room.save()
            
            # Serialize for response
            serializer = MessageSerializer(message)
            return serializer.data
            
        except Exception as e:
            print(f"Error saving message: {e}")
            return None

    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Mark message as read"""
        try:
            message = Message.objects.get(id=message_id)
            message.read_by.add(self.user)
        except Message.DoesNotExist:
            pass


class UserNotificationConsumer(AsyncWebsocketConsumer):
    """Consumer for user-specific notifications"""
    
    async def connect(self):
        """Handle connection"""
        self.user = await self.get_user()
        if not self.user:
            await self.close(code=4001)
            return
        
        self.group_name = f"user_{self.user.id}"
        
        await self.accept()
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

    async def disconnect(self, close_code):
        """Handle disconnection"""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming messages (not used)"""
        pass

    async def notification(self, event):
        """Send notification to user"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data']
        }))

    async def call_incoming(self, event):
        """Send incoming call notification"""
        await self.send(text_data=json.dumps({
            'type': 'call_incoming',
            'data': event['data']
        }))

    @database_sync_to_async
    def get_user(self):
        """Get user from token"""
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            query_string = self.scope['query_string'].decode()
            params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
            token = params.get('token')
            
            if token:
                access_token = AccessToken(token)
                return CustomUser.objects.get(id=access_token['user_id'])
        except Exception as e:
            print(f"Auth error: {e}")
        return None