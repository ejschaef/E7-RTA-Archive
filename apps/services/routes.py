from apps.services import blueprint
from flask import request, jsonify
from apps import config
from apps.models import *
from apps.tasks import *
import logging
import apps.services.log_utils as log_utils
import os


LOGGER = logging.getLogger(config.Config.LOGGER_NAME)

KEY = os.environ.get('SERVICES_KEY', 'default_services_key')

@blueprint.route('/services/dump_logs', methods=['GET'])
def dump_logs():
    key = request.headers.get('Services-Key')
    if key != KEY:
        LOGGER.warning("Attempted unauthorized access to /services/dump_logs")
        return jsonify({ 'error' : "Unauthorized" }), 403
    try:
        log_content = log_utils.get_log_content()
        LOGGER.info("Fetched logs")
        return jsonify({ "logs" : log_content }), 200
    except Exception as e:
        LOGGER.exception(f"Error when fetching logs: {str(e)}")
        return jsonify({ 'error' : str(e) }), 500
    
@blueprint.route('/services/delete_logs', methods=['GET'])
def delete_logs():
    key = request.headers.get('Services-Key')
    if key != KEY:
        LOGGER.warning("Attempted unauthorized access to /services/delete_logs")
        return jsonify({ 'error' : "Unauthorized" }), 403
    try:
        log_utils.delete_logs()
        LOGGER.info("Deleted logs")
        return jsonify({ "success" : True }), 200
    except Exception as e:
        LOGGER.exception(f"Error when deleting logs: {str(e)}")
        return jsonify({ 'error' : str(e) }), 500