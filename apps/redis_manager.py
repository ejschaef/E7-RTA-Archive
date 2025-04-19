import redis
from apps.references.cached_var_keys import CONTENT_MNGR_KEY
from apps.content_manager import ContentManager
from celery.result import AsyncResult

class Redis_DB:

    def __init__(self, host, port, db):
        self.str = f"redis://{host}:{port}//{db}"
        self.host = host
        self.port = port
        self.db = db

    def get_client(self):
        return redis.Redis(host=self.host, port=self.port, db=self.db)

# redis dbs
CELERY_BROKER_DB = Redis_DB("localhost", 6379, 1)
CELERY_BACKEND_DB = Redis_DB("localhost", 6379, 2)
SESSION_DB = Redis_DB("localhost", 6379, 3)
GLOBAL_DB = Redis_DB("localhost", 6379, 4)

class RedisManager:

    def __init__(self, db: Redis_DB):
        self.client = db.get_client()

    def set(self, key, value):
        self.client.set(key, value)

    def get(self, key):
        self.client.get(key)

    def delete(self, key):
        self.client.delete(key)


class GlobalRedisManager(RedisManager):

    def __init__(self):
        self.client = GLOBAL_DB.get_client()

    @property
    def ContentManager(self) -> ContentManager:
        return ContentManager.decode(self.get(CONTENT_MNGR_KEY))

    