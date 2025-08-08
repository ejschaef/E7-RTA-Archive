from apps.services import blueprint
from flask import request, jsonify
from apps.models import *
from apps.tasks import *
import apps.services.log_utils as log_utils
import os
import hmac
import hashlib
import time
from apps.services.references import SERVICES_HEADERS

LOGGER = log_utils.get_logger()

ALLOWED_TIMESTAMP_DRIFT = 10 # seconds

KEY = os.environ.get('SERVICES_KEY', 'default_services_key')

class ROUTES:
    DUMP_LOGS = "/services/dump_logs"
    DELETE_LOGS = "/services/delete_logs"

def unauthorized(route: str) -> tuple[str, int]:
    LOGGER.warning(f"Attempted unauthorized access to {route}")
    return jsonify({ 'error' : "Unauthorized" }), 403

def validate_signature(key: str, timestamp: int, signature: str, request_body: str) -> bool:
    message = f"{key}{timestamp}{request_body}"
    expected_signature = hmac.new(key.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_signature, signature)

def validate_timestamp(timestamp: str) -> bool:
    try:
        timestamp = int(timestamp)
    except ValueError:
        return False
    drift = int(time.time()) - timestamp
    return abs(drift) < ALLOWED_TIMESTAMP_DRIFT

def get_services_headers() -> list[str]:
    return [request.headers.get(header) for header in SERVICES_HEADERS.HEADERS]

def validate_request() -> bool:
    [key, timestamp, signature] = get_services_headers()
    validations = [
        lambda: all([key, timestamp, signature]),
        lambda: validate_timestamp(timestamp),
        lambda: validate_signature(key, timestamp, signature, '')
    ]
    return all(validation() for validation in validations)

@blueprint.route(ROUTES.DUMP_LOGS, methods=['GET'])
def dump_logs() -> tuple[str, int]:
    if validate_request() is False:
        return unauthorized(ROUTES.DUMP_LOGS)
    try:
        log_content = log_utils.get_log_content()
        LOGGER.info("Fetched logs")
        return jsonify({ "logs" : log_content }), 200
    except Exception as e:
        LOGGER.exception(f"Error when fetching logs: {str(e)}")
        return jsonify({ 'error' : str(e) }), 500
    
@blueprint.route('/services/delete_logs', methods=['GET'])
def delete_logs() -> tuple[str, int]:
    if validate_request() is False:
        return unauthorized(ROUTES.DELETE_LOGS)
    try:
        log_utils.delete_logs()
        LOGGER.info("Deleted logs")
        return jsonify({ "success" : True }), 200
    except Exception as e:
        LOGGER.exception(f"Error when deleting logs: {str(e)}")
        return jsonify({ 'error' : str(e) }), 500