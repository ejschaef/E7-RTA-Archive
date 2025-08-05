from apps.services import blueprint
from flask import render_template, request, redirect, url_for, session, jsonify
from apps import config
from apps.models import *
from apps.tasks import *
from apps.services.get_log_content import get_log_content
import importlib
import logging

LOG_KEY = None

try:
    module = importlib.import_module('apps.services.log_key')
    LOG_KEY = module.LOG_KEY
except ModuleNotFoundError:
    print("No module named 'apps.services.log_key' ; using default LOG_KEY")
    LOG_KEY = "default"


LOGGER = logging.getLogger(config.Config.LOGGER_NAME)

@blueprint.route('/services/dump_logs/<log_key>', methods=['GET'])
def dump_logs(log_key):
    if log_key != LOG_KEY:
        return dump_logs_unauthorized()
    try:
        log_content = get_log_content()
        LOGGER.info("Fetched logs")
        return jsonify({ "logs" : log_content }), 200
    except Exception as e:
        LOGGER.exception(f"Error when fetching logs: {str(e)}")
        return jsonify({ 'error' : str(e) }), 500
    
@blueprint.route('/services/dump_logs', methods=['GET'])
def dump_logs_unauthorized():
    LOGGER.warning("Attempted unauthorized access to /services/dump_logs")
    return jsonify({ 'error' : "Unauthorized" }), 403