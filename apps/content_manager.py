from typing import Self
from apps.e7_utils.hero_manager import HeroManager
from apps.e7_utils.user_manager import UserManager
from apps.e7_utils.season_details import get_rta_seasons_df
import jsonpickle
import pandas as pd
        

class ContentManager:

    def __init__(self):
        self.HeroManager     : HeroManager  = HeroManager()
        self.UserManager    : UserManager  = UserManager()
        self.SeasonDetails  : pd.DataFrame = get_rta_seasons_df()

    @classmethod
    def decode(cls, str) -> Self:
        obj = jsonpickle.decode(str)
        assert isinstance(obj, ContentManager), "Json did not decode to a ContentManager"
        return obj

    def encode(self) -> str:
        return jsonpickle.encode(self)
    

        
    

    
    

    
    
        
            

    
        