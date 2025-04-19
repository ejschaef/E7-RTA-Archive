import redis
from references.cached_var_keys import CONTENT_MNGR_KEY

GLOBAL_CLIENT = redis.Redis(host="localhost", port=6379, db=4)

print(GLOBAL_CLIENT.get("TESTKEY"))