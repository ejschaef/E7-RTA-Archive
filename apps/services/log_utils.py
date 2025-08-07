import json
import apps.config as config
import os
import logging
import atexit

MAIN_LOG = "e7_rta_analyzer.jsonl"

def get_log_content():
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
    LOG_DIR = "logs/"
    for file in os.listdir(LOG_DIR):
        if file.endswith(".jsonl") and file != MAIN_LOG:
            path = os.path.join(LOG_DIR, file)
            os.remove(path)
        elif file == MAIN_LOG:
            path = os.path.join(LOG_DIR, file)
            os.truncate(path, 0)

def get_logger(): 
    return logging.getLogger(config.Config.LOGGER_NAME)

def stop_listener(queue_handler: logging.handlers.QueueHandler):
    queue_handler.listener.stop()
    print("Stopping Queue Listener")

def setup_logging():
    with open('apps/logging_config.json') as f:
        data = json.load(f)
    logging.config.dictConfig(data)
    queue_handler = logging.getHandlerByName('queue_handler')
    if queue_handler is not None:
        print("Starting Queue Listener")
        queue_handler.listener.start()
        atexit.register(lambda: stop_listener(queue_handler))
    else:
        print("No Queue Listener Found")


