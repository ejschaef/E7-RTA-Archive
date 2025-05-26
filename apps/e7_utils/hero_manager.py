# -*- coding: utf-8 -*-
"""
Created on Fri Mar 14 17:33:01 2025

@author: Grant
"""

import apps.e7_utils.utils as utils
import sympy


HERO_JSON_URL = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_hero.json"

PRIMES = list(sympy.primerange(1, 1000000))


def get_hero_data(lang="en"):
    """
    Use in order to get a json of all the heroes in the game and their hero codes. JSON will be organized by language codes
    """
    file =  utils.load_json_from_url(HERO_JSON_URL)
    if lang is None:
        return file
    else:
        return file[lang]
    
def get_int_to_hero_dict(lang="en"):
    heroes = get_hero_data(lang=lang)
    int_to_hero = {int(hero['code'][1:]) : hero['name'] for hero in heroes}
    int_to_hero[777777] = "other"
    int_to_hero[7777770] = "Empty"
    int_to_hero[7777771] = "Fodder"
    return int_to_hero

class Hero:
    
    __slots__ = 'sg_id', 'name', 'prime', 'index', 'str_id'
    
    def __init__(self, sg_id, hero_name, index):
        
        self.sg_id = sg_id
        self.name = hero_name
        self.prime = PRIMES[index]
        self.index = index
        self.str_id = "c" + str(self.sg_id)
        
    def __repr__(self):
        return f"<{self.name}, {self.sg_id}>"
    
    def __eq__(self, hero):
        return self.sg_id == hero.sg_id
    
    def __hash__(self):
        return hash(self.prime)
    

class HeroManager:
    
    def __init__(self):
        
        self.int_to_hero_dict = get_int_to_hero_dict()
        
        self.heroes = [Hero(*key_item_pair, i) for i, key_item_pair in enumerate(self.int_to_hero_dict.items())]

        self.make_dicts()
        
        self.num_heroes = len(self.heroes)

    
    def check_key_type(self):
        for key in self.sg_id_dict:
            break
        if not isinstance(key, int):
            raise RuntimeError(f"Expected <Int>, got <{type(key)}>")
        print("KEY CHECK PASSED")
        
        
    def make_dicts(self):
        self.sg_id_dict = {}
        self.prime_dict = {}
        self.name_dict = {}
        self.index_dict = {}
        self.str_id_dict = {}
        self.str_name_map = {}
        self.name_str_map = {}
        for h in self.heroes:
            self.sg_id_dict[str(h.sg_id)] = h 
            self.prime_dict[str(h.prime)] = h
            self.name_dict[h.name.lower()] = h
            self.index_dict[str(h.index)] = h
            self.str_id_dict[h.str_id] = h
            self.str_name_map[h.str_id] = h.name
            self.name_str_map[h.name] = h.str_id
       
        
    @property
    def hero_names(self):
        for h in self.heroes:
            yield h.name
        
    def get_from_id(self, sg_id: int) -> Hero:
        """
        The sg_id is the numerical id associated with the hero
        """
        return self.sg_id_dict[str(sg_id)]
        
    def get_from_prime(self, prime: int) -> Hero:
        return self.prime_dict[str(prime)]
    
    def get_from_name(self, name: int) -> Hero:
        return self.name_dict[name.lower()]
    
    def get_from_index(self, index: int) -> Hero:
        return self.index_dict[str(index)]
    
    def get_from_str_id(self, string_id: str) -> Hero:
        """
        the string id is just the sg_id but prefixed with 'c'
        """
        try:
            return self.str_id_dict[string_id]
        except KeyError:
            if "m" in string_id:
                return self.get_from_name("Fodder")
            elif string_id == "":
                return self.get_from_name("Empty")
            else:
                raise RuntimeError(f"Unrecognized string_id passed to HeroManager: {string_id}")
        
    

if __name__ == "__main__":
    
    mngr = HeroManager()
    
    
    
        



        
    
        
        