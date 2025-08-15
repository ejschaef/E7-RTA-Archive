# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""
import json
from apps.config import *

from celery import Celery
from celery.utils.log import get_task_logger
from celery.schedules import crontab
from celery.signals import worker_ready

from apps.content_manager import ContentManager
import apps.references.cached_var_keys as KEYS
from apps.redis_manager import GLOBAL_DB

import uuid
import time

GLOBAL_CLIENT = GLOBAL_DB.get_client()

logger = get_task_logger(__name__)

celery_app = Celery(Config.CELERY_HOSTMACHINE, 
                    backend=Config.CELERY_RESULT_BACKEND, 
                    broker=Config.CELERY_BROKER_URL,
                    broker_connection_retry_on_startup=Config.CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP
                    )

celery_app.conf.beat_schedule = {
    'run_celery_beat_test_every_minute': {
        'task': 'celery_beat_test',
        'schedule': crontab(minute='*/45'),  # Runs every 45 minutes
        'args': (json.dumps({'test': 'data'}),)
    },
    'load_reference_content' : {
        'task': 'load_reference_content',
        'schedule': crontab(minute=0, hour='3'),  # Runs once per day at hour 3
        'args': ()
    },
}
celery_app.conf.timezone = 'UTC'

# periodic task set up
@worker_ready.connect
def run_start_up_tasks(sender, **kwargs):
    backend = celery_app.backend
    if hasattr(backend, 'client'):  # Redis backend
        redis_client = backend.client
        keys = redis_client.keys("celery-task-meta-*")

        lock_key = "startup_lock"
        lock_ttl = 1  # seconds
        lock_value = str(uuid.uuid4()) 

        lock_acquired = redis_client.set(lock_key, lock_value, nx=True, ex=lock_ttl)

        if lock_acquired:
            try:
                print("Main process; running startup tasks.")

                # Run reference data load task
                sender.app.send_task("load_reference_content")
            finally:
                time.sleep(lock_ttl)  # wait for lock to expire
                if redis_client.get(lock_key) == lock_value:
                    redis_client.delete(lock_key)
        else:
            print("Another worker has already handled startup tasks.")
            if keys:
                print("Clearing Keys")
                redis_client.delete(*keys)



@celery_app.task(name="celery_beat_test", bind=True)
def celery_beat_test( self, task_input ):
    task_json = {'info': 'Beat is running'}
    print("/n-----------------BEAT IS RUNNING-------------------/n")
    return task_json

@celery_app.task(name="load_reference_content", bind=True)
def load_reference_content( self):
    print("Updating E7 reference content")
    key = KEYS.CONTENT_MNGR_KEY
    serialized_data = (ContentManager().encode())
    GLOBAL_CLIENT.set(key, serialized_data)
    print("E7 reference content Updated")
    return None
