import json
import apps.config as config
import os
import logging
import logging.config
import atexit


MAIN_LOG_FILE = "e7_rta_analyzer.jsonl"
CELERY_LOG_FILE = "e7_rta_celery.jsonl"

BASE_LOG_FILES = [MAIN_LOG_FILE, CELERY_LOG_FILE]

def get_log_content() -> dict[str, list[dict]]:
    """
    Reads all log files in the LOG_DIR directory (default is "logs/"),
    parses them as JSON, and returns a dictionary of log files to their
    corresponding lists of log entries.

    :return: A dictionary of log file names to their corresponding lists of log entries.
    :rtype: dict[str, list[dict]]
    """
    LOG_DIR = "logs/"
    logs = {}
    for file in os.listdir(LOG_DIR):
        if file.endswith(".jsonl"):
            path = os.path.join(LOG_DIR, file)
            with open(path, "r") as f:
                lines = list(f.readlines())
                logs[file] = [json.loads(line) for line in lines if line.strip() != ""]
    return logs

def delete_logs():
    """
    Deletes all logs except for the main log file (e7_rta_analyzer.jsonl), and truncates the main log file to 0 bytes.

    This function is intended to be called by the delete_logs endpoint.
    """
    LOG_DIR = "logs/"
    for file in os.listdir(LOG_DIR):
        if file.endswith(".jsonl") and file not in BASE_LOG_FILES:
            path = os.path.join(LOG_DIR, file)
            os.remove(path)
        elif file in BASE_LOG_FILES:
            path = os.path.join(LOG_DIR, file)
            os.truncate(path, 0)

def get_logger(): 
    return logging.getLogger(config.Config.LOGGER_NAME)

def stop_listener(queue_handler: logging.handlers.QueueHandler):
    queue_handler.listener.stop()
    print("Stopping Queue Listener")

def setup_logging():
    with open('apps/log_management/logging_config.json') as f:
        data = json.load(f)
    logging.config.dictConfig(data)
    queue_handler = logging.getHandlerByName('queue_handler')
    if queue_handler is not None:
        print("Starting Queue Listener")
        queue_handler.listener.start()
        atexit.register(lambda: stop_listener(queue_handler))
    else:
        print("No Queue Listener Found")


CELERY_LOGGER_NAME = "e7-rta-celery-logger"

def get_celery_logger():
    return logging.getLogger(CELERY_LOGGER_NAME)

def setup_celery_logging():
    with open('apps/log_management/logging_config.json') as f:
        data = json.load(f)
    logging.config.dictConfig(data)


