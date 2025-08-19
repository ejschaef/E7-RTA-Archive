import hashlib
import os

SALT_STRING = os.getenv("SALT_STRING", "default")

def hash_ip(ip: str, salt: str = SALT_STRING, bits: int = 256) -> str:
    """
    Hashes an IP address and returns a portion of the SHA256 hash.
    
    :param ip: The IP address to hash.
    :type ip: str
    :param salt: A string to add to the hash (default: SALT_STRING).
    :type salt: str
    :param bits: The number of bits to keep from the hash (default: 256). Must be a multiple of 4.
    :type bits: int
    :return: A portion of the SHA256 hash of the IP address and salt.
    :rtype: str
    :raises ValueError: If bits is not a multiple of 4.
    """
    if bits % 4 != 0:
        raise ValueError("bits must be a multiple of 4")
    data = (salt + ip).encode("utf-8")
    return hashlib.sha256(data).hexdigest()[:bits // 4]