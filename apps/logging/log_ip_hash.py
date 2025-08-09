import hashlib
import os

SALT_STRING = os.getenv("SALT_STRING", "default")

def hash_ip(ip: str, salt: str = SALT_STRING, bits: int = 256) -> str:
    if bits % 4 != 0:
        raise ValueError("bits must be a multiple of 4")
    data = (salt + ip).encode("utf-8")
    return hashlib.sha256(data).hexdigest()[:bits // 4]