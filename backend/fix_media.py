
from chatApp.models import MediaFile

stale = MediaFile.objects.filter(
    file_type='video',
    file_name__startswith='voice-'
)
count = stale.count()
stale.update(file_type='voice_note')
print(f"Fixed {count} voice note(s) that were stored as 'video'")

stale2 = MediaFile.objects.filter(
    file_type='video'
).exclude(file_name__startswith='voice-')
print(f"{stale2.count()} non-voice video files left untouched")