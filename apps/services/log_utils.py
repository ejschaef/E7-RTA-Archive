import json
from flask import current_app
import os

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


