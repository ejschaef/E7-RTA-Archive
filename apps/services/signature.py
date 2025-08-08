import hmac
import hashlib
import time
from apps.services.references import SERVICES_HEADERS
import os

def generate_services_headers(api_key, body=""):
    """
    Generates service headers with a timestamp and a signature.

    Args:
        api_key (str): The environment variable name for the API key.
        body (str, optional): The request body used in generating the signature. Defaults to an empty string.

    Returns:
        dict: A dictionary containing the timestamp and signature headers.
    """

    timestamp = str(int(time.time()))
    key = os.getenv(api_key, "default_services_key")
    message = f"{key}{timestamp}{body}"
    signature = hmac.new(key.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).hexdigest()
    return {
        SERVICES_HEADERS.API_KEY   : api_key,
        SERVICES_HEADERS.TIMESTAMP : timestamp,
        SERVICES_HEADERS.SIGNATURE : signature
    }
