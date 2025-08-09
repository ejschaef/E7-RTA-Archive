import hmac
import hashlib
import time
import os
from apps.services.api_key_names import ApiKeyNames

class SERVICES_HEADERS:
    API_KEY_ID   = "X-API-Key-ID"
    TIMESTAMP = "X-Timestamp"
    SIGNATURE = "X-Signature"

    HEADERS = [
        API_KEY_ID,
        TIMESTAMP,
        SIGNATURE
    ]

def generate_services_headers(api_key_id, body=""):
    """
    Generates service headers with a timestamp and a signature.

    Args:
        api_key_id (str): The environment variable name for the API key.
        body (str, optional): The request body used in generating the signature. Defaults to an empty string.

    Returns:
        dict: A dictionary containing the timestamp and signature headers.
    """
    assert api_key_id in ApiKeyNames.KEY_MAP, f"Unknown API Key ID: {api_key_id}"
    api_key_name = ApiKeyNames.KEY_MAP[api_key_id]
    key = os.getenv(api_key_name, "default_services_key")
    timestamp = str(int(time.time()))
    message = f"{key}{timestamp}{body}"
    signature = hmac.new(key.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).hexdigest()
    return {
        SERVICES_HEADERS.API_KEY_ID   : api_key_id,
        SERVICES_HEADERS.TIMESTAMP : timestamp,
        SERVICES_HEADERS.SIGNATURE : signature
    }
