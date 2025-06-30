from typing import Self
from apps.e7_utils.hero_manager import HeroManager
from apps.e7_utils.user_manager import UserManager
from apps.e7_utils.season_details import get_rta_seasons_df
from apps.references.cached_var_keys import CONTENT_MNGR_KEY
import pickle
import pandas as pd
from apps.redis_manager import GLOBAL_DB

GLOBAL_CLIENT = GLOBAL_DB.get_client()

# reference_cache.py
_reference_obj = None
_reference_loaded_at = 0

class ContentManager:

    def __init__(self):
        print("Initializing ContentManager")
        self.HeroManager     : HeroManager  = HeroManager()
        print("Hero Manager Loaded")
        self.UserManager    : UserManager  = UserManager(load_all=True)
        print("User Manager Loaded")
        self.SeasonDetails  : pd.DataFrame = get_rta_seasons_df()
        print("Season Details Loaded")
        self.SeasonDetailsJSON = self.get_season_details_json()

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

def get_mngr() -> ContentManager:
    global _reference_obj, _reference_loaded_at

    import time
    now = time.time()
    # Refresh every 2 hours and 1 minute (3600s), or if not loaded yet
    if _reference_obj is None or now - _reference_loaded_at > 3600 * 2 + 60:
        print("Refreshing ContentManager global from Redis")
        raw = get_mngr_from_redis()
        if raw:
            _reference_obj = pickle.loads(raw)
            _reference_loaded_at = now
            print("   ContentManager refreshed from Redis")
    return _reference_obj

        
    

    
    

    
    
        
            

    
        