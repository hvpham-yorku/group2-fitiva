from django.conf import settings
from repository.db_repository import DBRepository
from repository.stub_repository import StubRepository

_repo = None

def get_repository():
    global _repo
    if _repo is None:
        _repo = StubRepository() if getattr(settings, 'USE_STUB_DB', False) else DBRepository()
    return _repo