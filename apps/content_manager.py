from typing import Self
from apps.e7_utils.hero_manager import HeroManager
from apps.e7_utils.user_manager import UserManager
from apps.e7_utils.season_details import get_rta_seasons_df
from apps.e7_utils.utils import load_pickle, save_pickle
from apps.e7_utils.artifact_manager import get_artifacts
from apps.references.cached_var_keys import CONTENT_MNGR_KEY
import pickle
import pandas as pd
from apps.redis_manager import GLOBAL_DB
from apps.config import *
from datetime import datetime
import json
import time

GLOBAL_CLIENT = GLOBAL_DB.get_client()

# reference_cache.py
_reference_obj = None
_reference_loaded_at = 0

HERO_MANAGER_PICKLE_PATH = os.path.join(Config.APP_DATA_PATH, 'hero_manager.pickle')
USER_MANAGER_PICKLE_PATH = os.path.join(Config.APP_DATA_PATH, 'user_manager.pickle')
SEASON_DETAILS_PICKLE_PATH = os.path.join(Config.APP_DATA_PATH, 'season_details.pickle')
ARTIFACT_JSON_PICKLE_PATH = os.path.join(Config.APP_DATA_PATH, 'artifact_json.pickle')

def try_load(obj_name, fetch_fn, pickle_path):
     # load from pickle if backup is recent
    if os.path.exists(pickle_path):
        modified_time = os.path.getmtime(pickle_path)
        modified_datetime = datetime.fromtimestamp(modified_time)
        age = datetime.now() - modified_datetime

        if age < timedelta(days=1):
            print(f"{obj_name} Loading From Recent Pickle Backup (Last updated: {modified_datetime})")
            return load_pickle(pickle_path)

    try:
        # raise Exception("USING BACKUPS: MUST REMOVE WHEN DEPLOYING PROD INSTANCE")
        obj = fetch_fn()
        if obj is None:
            raise Exception("Object is None")
        print(f"{obj_name} Loaded From E7 API")
        save_pickle(obj, pickle_path)
        print(f"{obj_name} Saved To Pickle Backup")
        return obj
    except Exception as e:
        print(f"ERROR LOADING FROM E7 API: {str(e)}")
        obj = load_pickle(pickle_path)
        modified_datetime = datetime.fromtimestamp(os.path.getmtime(pickle_path))
        print(f"{obj_name} Loaded From Pickle Backup last updated: {modified_datetime}")
        return obj

class ContentManager:

    def __init__(self):
        print("Initializing ContentManager")
        self.HeroManager       : HeroManager  = try_load("HeroManager", lambda: HeroManager(), HERO_MANAGER_PICKLE_PATH)
        self.UserManager       : UserManager  = try_load("UserManager", lambda: UserManager(load_all=True), USER_MANAGER_PICKLE_PATH)
        self.SeasonDetails     : pd.DataFrame = try_load("SeasonDetails", get_rta_seasons_df, SEASON_DETAILS_PICKLE_PATH)
        self.SeasonDetailsJSON : str          = self.get_season_details_json()
        self.ArtifactJson      : str          = try_load("ArtifactJson", lambda: json.dumps(get_artifacts(), default=str), ARTIFACT_JSON_PICKLE_PATH)

    @classmethod
    def decode(cls, str) -> Self:
        obj = pickle.loads(str)
        assert isinstance(obj, ContentManager), "Json did not decode to a ContentManager"
        return obj

    def encode(self) -> str:
        return pickle.dumps(self)
    
    def get_season_details_json(self) -> str:
        return self.SeasonDetails.to_json(orient='records')
    
def get_mngr_from_redis() -> object:
    return GLOBAL_CLIENT.get(CONTENT_MNGR_KEY)

MANAGER_REFRESH_INTERVAL = 3600 * 2 + 60 # 2 hours and 1 minute

def get_mngr() -> ContentManager:
    global _reference_obj, _reference_loaded_at
    now = time.time()
    # Refresh every 2 hours and 1 minute (3600s), or if not loaded yet
    if _reference_obj is None or now - _reference_loaded_at > MANAGER_REFRESH_INTERVAL:
        print("Refreshing ContentManager global from Redis")
        raw = get_mngr_from_redis()
        if raw:
            _reference_obj = pickle.loads(raw)
            _reference_loaded_at = now
            print("   ContentManager refreshed from Redis")
    return _reference_obj

        
    

    
    

    
    
        
            

    
        