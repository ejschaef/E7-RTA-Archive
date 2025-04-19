# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

import json, time, jsonpickle, pickle
import pandas as pd
from datetime import datetime
from io import StringIO


from apps.config import *

from celery import Celery
from celery.utils.log import get_task_logger
from celery.schedules import crontab
from celery.signals import worker_ready

from apps.e7_utils.battle_manager import BattleManager, to_raw_dataframe, RAW_TYPE_DICT
from apps.e7_utils.query_user_battles import get_battles, build_hero_stats
from apps.e7_utils.plots import make_rank_plot
from apps.content_manager import ContentManager
from apps.references.cached_var_keys import CONTENT_MNGR_KEY

GLOBAL_CLIENT = redis.Redis(host="localhost", port=6379, db=4)

logger = get_task_logger(__name__)

celery_app = Celery(Config.CELERY_HOSTMACHINE, 
                    backend=Config.CELERY_RESULT_BACKEND, 
                    broker=Config.CELERY_BROKER_URL
                    )

celery_app.conf.beat_schedule = {
    # 'run_celery_beat_test_every_minute': {
    #     'task': 'celery_beat_test',
    #     'schedule': crontab(minute='*/1'),  # Runs every 1 minute
    #     'args': (json.dumps({'test': 'data'}),)
    # },
    'load_reference_content' : {
        'task': 'load_reference_content',
        'schedule': crontab(minute='*/1'),  # Runs every 5 minutes
        'args': ()
    },
}
celery_app.conf.timezone = 'UTC'

# periodic task set up
@worker_ready.connect
def run_start_up_tasks(sender, **kwargs):
    # Run the task immediately
    load_reference_content.delay()

# task used for tests
@celery_app.task(name="celery_test", bind=True)
def celery_test( self, task_input ):

    task_json = json.loads( task_input )

    logger.info( '*** Started' )
    logger.info( ' > task_json:' + str( task_json ) )

    task_json['result'] = 'NA'
    task_json['ts_start'] = datetime.now()

    # get current task id
    task_id = celery_app.current_task.request.id

    # ######################################################
    # Task is STARTING (prepare the task)

    # Update Output JSON
    task_json['state'] = 'STARTING'
    task_json['info'] = 'Task is starting'

    self.update_state(state='STARTING',
                      meta={ 'info':'Task is starting' })

    time.sleep(1) 

    # ######################################################
    # Task is RUNNING (execute MAIN stuff)

    # Update Output JSON
    task_json['state'] = 'RUNNING'
    task_json['info'] = 'Task is running'

    self.update_state(state='RUNNING',
                      meta={ 'info':'Task is running' })

    time.sleep(1)

    # ######################################################
    # Task is CLOSING (task cleanUP)

    # Update Output JSON
    task_json['state'] = 'CLOSING'
    task_json['info'] = 'Task is closing'

    self.update_state(state='CLOSING',
                    meta={ 'info':'Task is running the cleanUP' })

    task_json['ts_end'] = datetime.now()

    time.sleep(1) 

    # ######################################################
    # Task is FINISHED (task cleanUP)

    # Update Output JSON
    task_json['state'] = 'FINISHED'
    task_json['info'] = 'Task is finished'
    task_json['result'] = 'SUCCESS'

    self.update_state(state='FINISHED',
                    meta={ 'info':'Task is finished' })    

    return task_json


@celery_app.task(name="celery_beat_test", bind=True)
def celery_beat_test( self, task_input ):
    task_json = {'info': 'Beat is running'}
    print("/n-----------------BEAT IS RUNNING-------------------/n")
    return task_json

@celery_app.task(name="load_reference_content", bind=True)
def load_reference_content( self):
    print("Updating E7 reference content")
    key = CONTENT_MNGR_KEY
    serialized_data = (ContentManager().encode())
    GLOBAL_CLIENT.set(key, serialized_data)
    print("E7 reference content Updated")
    return None

@celery_app.task(name="load_user_data", bind=True)
def load_user_data( self, user, HM, uploaded_battles=None):
    print("TASK STARTED")
    self.update_state(state='STARTED')
    user = jsonpickle.decode(user)
    HM = jsonpickle.decode(HM)

    battles = get_battles(user)

    # merge user uploaded battles with queried battles
    if uploaded_battles is not None:
        battles_df = pd.read_json(StringIO(uploaded_battles))
        battles_df = to_raw_dataframe(battles_df, HM)
        battles_df = battles_df.astype(RAW_TYPE_DICT)
        BM = BattleManager.from_df(battles_df)
        battles.merge(BM)


    player_hero_stats, enemy_hero_stats, battles = build_hero_stats(battles, HM)

    player_hero_stats = [elt for elt in player_hero_stats if elt['games_appeared'] > 0]
    enemy_hero_stats = [elt for elt in enemy_hero_stats if elt['games_appeared'] > 0]

    pretty_df = battles.to_pretty_dataframe(HM)

    plot_html = make_rank_plot(battles, user)

    task_json = {
        'player_hero_stats' : player_hero_stats,
        'enemy_hero_stats'  : enemy_hero_stats,
        'rank_plot'         : plot_html,
        'battles_data'      : pretty_df.to_dict(orient='records'),
    }
    self.update_state(state='FINISHED')
    return task_json
