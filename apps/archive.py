CONTENT_TYPE_MAP = {
    KEYS.USER_MANAGER : UserManager,
    KEYS.HERO_MANAGER : HeroManager,
    KEYS.SEASON_DETAILS : get_rta_seasons_df,
}

class ContentManager:

    def __init__(self):
        self.content = set()

    @property
    def HeroManager(self) -> HeroManager:
        key = KEYS.HERO_MANAGER
        return self.__set_and_retrieve(key, deserialize=True)
    
    @property
    def UserManager(self) -> UserManager:
        key = KEYS.USER_MANAGER
        return self.__set_and_retrieve(key, deserialize=True)
    
    @property
    def SeasonDetails(self) -> pd.DataFrame:
        key = KEYS.SEASON_DETAILS
        return self.__set_and_retrieve(key, deserialize=True)
    
    def delete(self, key):
        if key in SESSION_CLIENT:
            SESSION_CLIENT.delete(key)

    def delete_all(self):
        for key in self.content:
            self.delete(key)

    def pop(self, key, deserialize=True):
        content = self.__retrieve(key, deserialize)
        self.content.remove(key)
        SESSION_CLIENT.delete(key)
        return content
    
    def __set_and_retrieve(self, key, deserialize=True):
        if key in self.content:
            return self.__retrieve(key, deserialize)
        else:
            assert key in CONTENT_TYPE_MAP, f"{key} not found in CONTENT_TYPE_MAP"
            self.content.add(key)
            obj = CONTENT_TYPE_MAP[key]()
            if deserialize:
                SESSION_CLIENT.set(key, jsonpickle.encode(obj))
            else:
                SESSION_CLIENT.set(key, obj)
            return obj

    def __retrieve(self, key, deserialize=True):
        if deserialize:
            return jsonpickle.decode(SESSION_CLIENT.get(key))
        else:
            return SESSION_CLIENT.get(key)