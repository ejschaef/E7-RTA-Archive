import hmac
import hashlib
import time
from apps.services.references import SERVICES_HEADERS
import os

def generate_services_headers(body=""):
    timestamp = str(int(time.time()))
    key = os.getenv("SERVICES_KEY", "default_services_key")
    message = f"{key}{timestamp}{body}"
    signature = hmac.new(key.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).hexdigest()
    return {
        SERVICES_HEADERS.API_KEY : key,
        SERVICES_HEADERS.TIMESTAMP : timestamp,
        SERVICES_HEADERS.SIGNATURE : signature
    }
