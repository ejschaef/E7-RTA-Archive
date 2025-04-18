from flask import current_app, session
from apps.e7_utils import hero_manager, user_manager, battle_manager, season_details
from apps.references import cached_var_keys as KEYS
import jsonpickle
import pandas as pd


CONTENT_TYPE_MAP = {
    KEYS.USER_MANAGER : user_manager.UserManager,
    KEYS.HERO_MANAGER : hero_manager.HeroManager,
    KEYS.SEASON_DETAILS : season_details.get_rta_seasons_df,
}

class ContentManager:

    def __init__(self):
        self.content = set()

    @property
    def HeroManager(self) -> hero_manager.HeroManager:
        key = KEYS.HERO_MANAGER
        return self.__set_and_retrieve(key, deserialize=True)
    
    @property
    def UserManager(self) -> user_manager.UserManager:
        key = KEYS.USER_MANAGER
        return self.__set_and_retrieve(key, deserialize=True)
    
    @property
    def SeasonDetails(self) -> pd.DataFrame:
        key = KEYS.SEASON_DETAILS
        return self.__set_and_retrieve(key, deserialize=True)
    
    def delete(self, key):
        if key in session:
            del session[key]

    def delete_all(self):
        for key in self.content:
            self.delete(key)

    def pop(self, key, deserialize=True):
        content = self.__retrieve(key, deserialize)
        self.content.remove(key)
        session.pop(key)
        return content
    
    def __set_and_retrieve(self, key, deserialize=True):
        if key in self.content:
            return self.__retrieve(key, deserialize)
        else:
            assert key in CONTENT_TYPE_MAP, f"{key} not found in CONTENT_TYPE_MAP"
            self.content.add(key)
            obj = CONTENT_TYPE_MAP[key]()
            if deserialize:
                session[key] = jsonpickle.encode(obj)
            else:
                session[key] = obj
            return obj

    def __retrieve(self, key, deserialize=True):
        if deserialize:
            return jsonpickle.decode(session[key])
        else:
            return session[key]

        
    
        
            

    
        